#!/usr/bin/env node
// Restore drill in a THROWAWAY, local PostgreSQL instance only.
// Never point PG_RESTORE_URL at Supabase or a production service.
import fs,{promises as fsp} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {decryptLines} from './secure-archive.mjs';
import {createVerifier,validateSnapshot,sha256,TABLES} from './validate.mjs';

const {Client}=pg,archive=process.argv[2],passphrase=process.env.TC_BACKUP_PASSPHRASE;
const connection=process.env.PG_RESTORE_URL;
if(!archive||!passphrase||!connection)throw Error('Local Restore benötigt Archiv, Passphrase und PG_RESTORE_URL.');
const url=new URL(connection);
if(!['localhost','127.0.0.1','::1'].includes(url.hostname))
 throw Error('Restore-Sperre: Nur lokale temporäre PostgreSQL-Datenbank erlaubt.');
if(url.pathname!=='/trummcards_restore')throw Error('Restore-Sperre: Nur Datenbank trummcards_restore erlaubt.');

const directory=await fsp.mkdtemp(path.join(os.tmpdir(),'tc-restore-check-'));
let snapshot,checked;
const verifier=createVerifier(),saved=new Map();
try{
 await decryptLines(archive,passphrase,item=>{
  verifier.accept(item);
  if(item.type==='snapshot')snapshot=item.data;
  if(item.type==='image'){
   const data=Buffer.from(item.base64,'base64');
   const filename=path.join(directory,sha256(item.path)+'.bin');
   fs.writeFileSync(filename,data,{flag:'wx',mode:0o600});
   saved.set(item.path,{filename,size:data.length,hash:item.sha256});
  }
 });
 checked=verifier.report();
 const root=fileURLToPath(new URL('../../',import.meta.url));
 const scripts=[
  'cloud/backup/local-supabase-stubs.sql',
  'cloud/supabase/migrations/20261014000100_phase1_schema.sql',
  'cloud/supabase/migrations/20261015000200_cloud_test_session.sql',
  'cloud/supabase/migrations/20261015000300_product_images.sql',
  'cloud/supabase/migrations/20261016000400_backup_snapshot.sql'
 ];
 const client=new Client({connectionString:connection,connectionTimeoutMillis:10000});
 await client.connect();
 try{
  const pre=await client.query("SELECT to_regclass('public.tc_products') AS existing");
  if(pre.rows[0].existing!==null)throw Error('Zieldatenbank ist nicht frisch/leer.');
  for(const file of scripts)await client.query(await fsp.readFile(path.join(root,file),'utf8'));
  await client.query('BEGIN');
  await client.query('INSERT INTO auth.users(id) VALUES ($1)',[snapshot.owner_id]);
  await client.query('INSERT INTO trummcards_private.owner_guard(user_id) VALUES ($1)',[snapshot.owner_id]);

  for(const name of TABLES){
   for(const row of snapshot.tables[name]){
    const columns=Object.keys(row);
    if(columns.some(k=>!/^[a-z][a-z0-9_]*$/.test(k)))throw Error('Ungültiger Spaltenname.');
    const col=columns.map(k=>'"'+k+'"').join(',');
    const marks=columns.map((_,i)=>'$'+(i+1)).join(',');
    const identity=name==='tc_stock_movements'?' OVERRIDING SYSTEM VALUE':'';
    await client.query('INSERT INTO public."'+name+'" ('+col+')'+identity+' VALUES ('+marks+')',
      columns.map(k=>row[k]));
   }
  }
  for(const [imagePath,value] of saved){
   const bytes=await fsp.readFile(value.filename);
   if(bytes.length!==value.size||sha256(bytes)!==value.hash)throw Error('Wiederhergestelltes Bild beschädigt.');
   const meta=[...snapshot.tables.tc_lot_images,...snapshot.tables.tc_product_images].find(x=>x.storage_path===imagePath);
   if(!meta)throw Error('Bild ohne DB-Metadaten.');
   await client.query('INSERT INTO storage.objects(id,bucket_id,name,restored_sha256,restored_bytes) VALUES ($1,$2,$3,$4,$5)',
     [meta.id,'trummcards-lot-images',imagePath,value.hash,value.size]);
  }
  const {counts}=validateSnapshot(snapshot);
  for(const name of TABLES){
   const r=await client.query('SELECT count(*)::int AS n FROM public."'+name+'"');
   if(r.rows[0].n!==counts[name])throw Error('Restore zählt falsche Datensätze in '+name);
  }
  const store=await client.query("SELECT count(*)::int AS n FROM storage.objects WHERE bucket_id='trummcards-lot-images'");
  if(store.rows[0].n!==saved.size)throw Error('Bilder fehlen nach der Wiederherstellung.');
  const actual=await client.query('SELECT coalesce(sum(available_qty),0)::bigint AS pieces FROM public.tc_purchase_lots');
  const expected=snapshot.tables.tc_purchase_lots.reduce((s,r)=>s+Number(r.available_qty),0);
  if(Number(actual.rows[0].pieces)!==expected)throw Error('Bestandsmenge nach Restore abweichend.');
  await client.query('COMMIT');
  console.log('LOKALER PostgreSQL-17-RESTORE OK: '+TABLES.length+' Tabellen, '+saved.size+' Bilder, '+expected+' lagernde Stück; PROD/TEST unverändert.');
 }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}
 finally{await client.end();}
}finally{await fsp.rm(directory,{recursive:true,force:true});}
