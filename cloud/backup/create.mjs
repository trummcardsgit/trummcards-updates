#!/usr/bin/env node
// TrummCards Cloud Production: encrypted backup, never write to Supabase.
// Automated runner: Node 22, no database admin password or service-role key.
import {Buffer} from 'node:buffer';
import {encryptLines,decryptLines} from './secure-archive.mjs';
import {PROD_REF,sha256,validateSnapshot,createVerifier} from './validate.mjs';

const ROOT='https://'+PROD_REF+'.supabase.co';
const PUBLIC_KEY='sb_publishable_JDdbnEq3muaOhp3LsNhBkQ_eJZ0uYEf'; // Public browser key, NOT a privileged credential.
const email=process.env.TC_BACKUP_EMAIL;
const password=process.env.TC_BACKUP_PASSWORD;
const passphrase=process.env.TC_BACKUP_PASSPHRASE;
const destination=process.argv[2];
if(!destination||!destination.endsWith('.tcbackup')||!email||!password||!passphrase)
 throw Error('Backup nicht gestartet: Zieldatei oder GitHub-Actions-Geheimnisse fehlen.');
if(passphrase.length<24||passphrase===password)throw Error('Ein eigenes Backup-Kennwort mit mindestens 24 Zeichen ist erforderlich.');

async function api(route,opts={}){
 const headers={apikey:PUBLIC_KEY,Accept:'application/json',...opts.headers};
 const res=await fetch(ROOT+route,{...opts,headers,cache:'no-store',signal:AbortSignal.timeout(90000)});
 if(!res.ok)throw Error('Backup API-Anfrage fehlgeschlagen, Status '+res.status);
 return res;
}
const auth=await (await api('/auth/v1/token?grant_type=password',{
 method:'POST',headers:{'Content-Type':'application/json'},
 body:JSON.stringify({email,password})
})).json();
const token=auth.access_token,user=auth.user;
if(!token||!user?.id)throw Error('Backup-Anmeldung lieferte keine Sitzung.');
const request=async route=>api(route,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:'{}'});
const authorized=await (await request('/rest/v1/rpc/tc_is_authorized')).json();
if(authorized!==true)throw Error('Kein berechtigter Cloud-Eigentümer.');
const snapshot=await (await request('/rest/v1/rpc/tc_backup_snapshot')).json();
const {counts,paths}=validateSnapshot(snapshot);
if(snapshot.owner_id!==user.id)throw Error('Sicherung gehörte zum falschen Konto.');

async function* records(){
 yield {type:'snapshot',project:PROD_REF,data:snapshot};
 let counter=0;
 for(const [imagePath,mime] of paths){
  const encoded=imagePath.split('/').map(encodeURIComponent).join('/');
  const res=await api('/storage/v1/object/authenticated/trummcards-lot-images/'+encoded,{
    headers:{Authorization:'Bearer '+token,Accept:'*/*'}
  });
  const bytes=Buffer.from(await res.arrayBuffer());
  if(!bytes.length||bytes.length>10*1024*1024)throw Error('Bild unzulässig oder leer.');
  counter++;
  yield {type:'image',path:imagePath,mime,bytes:bytes.length,sha256:sha256(bytes),base64:bytes.toString('base64')};
 }
 yield {type:'end',imageCount:counter};
}

await encryptLines(destination,passphrase,records());
const verifier=createVerifier();
await decryptLines(destination,passphrase,record=>verifier.accept(record));
const report=verifier.report();
if(report.images!==paths.size)throw Error('Sicherung wurde nicht vollständig verifiziert.');
// Never log email, passwords, tokens, object paths or actual card data.
console.log('TrummCards Cloud PROD: verschlüsseltes Backup erfolgreich erstellt und geprüft.');
console.log('Tabellen: '+Object.entries(counts).map(([k,v])=>k+'='+v).join(', '));
console.log('Bilder: '+report.images+'; Verschlüsselung AES-256-GCM; Projekt separat von TEST.');
