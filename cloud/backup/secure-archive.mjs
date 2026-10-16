import {randomBytes,scryptSync,createCipheriv,createDecipheriv} from 'node:crypto';
import {createReadStream,createWriteStream,promises as fs} from 'node:fs';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createGzip,createGunzip} from 'node:zlib';
import path from 'node:path';
import {StringDecoder} from 'node:string_decoder';

// v1: magic[8] salt[16] iv[12] tag[16] encrypted-gzip-json-lines.
const MAGIC=Buffer.from('TCBACK01'),HEADER_SIZE=52;
const kdf={N:32768,r:8,p:1,maxmem:64*1024*1024};
function key(pass,salt){
 if(typeof pass!=='string'||pass.length<24)throw Error('Backup-Passphrase mindestens 24 Zeichen.');
 return scryptSync(pass,salt,32,kdf);
}
export async function encryptLines(destination,passphrase,records){
 const salt=randomBytes(16),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(passphrase,salt),iv);
 const tmp=destination+'.partial-'+process.pid;
 await fs.mkdir(path.dirname(destination),{recursive:true});
 const out=createWriteStream(tmp,{flags:'wx',mode:0o600});
 try{
  out.write(Buffer.concat([MAGIC,salt,iv,Buffer.alloc(16)]));
  const lines=Readable.from((async function*(){for await(const item of records)yield JSON.stringify(item)+'\n';})());
  await pipeline(lines,createGzip(),cipher,out);
  const f=await fs.open(tmp,'r+');
  try{await f.write(cipher.getAuthTag(),0,16,36);await f.sync();}finally{await f.close();}
  await fs.rename(tmp,destination);
 }catch(e){await fs.rm(tmp,{force:true}).catch(()=>{});throw e;}
}
export async function decryptLines(filename,passphrase,consume){
 const file=await fs.open(filename,'r'),header=Buffer.alloc(HEADER_SIZE);
 try{const n=await file.read(header,0,HEADER_SIZE,0);if(n.bytesRead!==HEADER_SIZE)throw Error('Archiv unvollständig.');}
 finally{await file.close();}
 if(!header.subarray(0,8).equals(MAGIC))throw Error('Falsches Archivformat.');
 const decipher=createDecipheriv('aes-256-gcm',key(passphrase,header.subarray(8,24)),header.subarray(24,36));
 decipher.setAuthTag(header.subarray(36,52));
 let rest='';
 const decoder=new StringDecoder('utf8');
 const {Writable}=await import('node:stream');
 const sink=new Writable({write(chunk,_encoding,done){
  try{
   rest+=decoder.write(chunk);
   let i;
   while((i=rest.indexOf('\n'))>=0){
    const line=rest.slice(0,i);rest=rest.slice(i+1);
    if(line)consume(JSON.parse(line));
   }
   if(rest.length>35*1024*1024)throw Error('Archiv enthält zu großen Datensatz.');
   done();
  }catch(e){done(e);}
 }});
 await pipeline(createReadStream(filename,{start:HEADER_SIZE}),decipher,createGunzip(),sink);
 rest+=decoder.end();
 if(rest.trim())consume(JSON.parse(rest));
}
