import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {encryptLines,decryptLines} from './secure-archive.mjs';
import {createVerifier,validateSnapshot,sha256,PROD_REF,TABLES} from './validate.mjs';

const password='a-private-long-backup-recovery-phrase-for-tests';
const owner='123e4567-e89b-12d3-a456-426614174000';
const pid='223e4567-e89b-12d3-a456-426614174000';
const lid='323e4567-e89b-12d3-a456-426614174000';
const iid='423e4567-e89b-12d3-a456-426614174000';
const sample=()=>{
 const tables=Object.fromEntries(TABLES.map(k=>[k,[]]));
 tables.tc_products.push({id:pid,owner_id:owner,name:'Testkarte'});
 tables.tc_purchase_lots.push({id:lid,owner_id:owner,product_id:pid,purchased_qty:2,available_qty:2});
 tables.tc_product_images.push({id:iid,owner_id:owner,product_id:pid,storage_path:owner+'/products/'+pid+'/'+iid+'.jpg',mime_type:'image/jpeg'});
 return {format:'trummcards-cloud-backup-v1',captured_at:'2026-10-16T00:00:00Z',owner_id:owner,tables};
};
test('AES-GCM backup includes complete relational snapshot and private picture, then decrypts cleanly',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'tc-backup-')),file=path.join(dir,'backup.tcbackup');
 try{
  const snapshot=sample(),data=Buffer.from('not-a-real-sensitive-photo');
  async function* records(){
   yield {type:'snapshot',project:PROD_REF,data:snapshot};
   yield {type:'image',path:snapshot.tables.tc_product_images[0].storage_path,mime:'image/jpeg',bytes:data.length,sha256:sha256(data),base64:data.toString('base64')};
   yield {type:'end',imageCount:1};
  }
  await encryptLines(file,password,records());
  const raw=await readFile(file);
  assert.ok(!raw.includes(Buffer.from('Testkarte')));
  assert.ok(!raw.includes(Buffer.from('not-a-real-sensitive-photo')));
  const verifier=createVerifier();
  await decryptLines(file,password,r=>verifier.accept(r));
  const report=verifier.report();
  assert.equal(report.tables.tc_purchase_lots,1);
  assert.equal(report.images,1);
  assert.equal(report.imageBytes,data.length);
  await assert.rejects(()=>decryptLines(file,'incorrect-but-sufficiently-long-passphrase',()=>{}));
  raw[raw.length-20]^=1;
  await writeFile(file,raw);
  await assert.rejects(()=>decryptLines(file,password,()=>{}),'tamper must fail GCM authentication');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('restore preflight catches missing picture bytes and foreign key corruption',()=>{
 const a=sample();const v=createVerifier();v.accept({type:'snapshot',project:PROD_REF,data:a});
 assert.throws(()=>v.accept({type:'end',imageCount:0}),/Bilder fehlen/);
 const corrupt=sample();corrupt.tables.tc_purchase_lots[0].product_id='ffffffff-ffff-ffff-ffff-ffffffffffff';
 assert.throws(()=>validateSnapshot(corrupt),/Verwaister/);
});
test('restore preflight refuses a different Supabase project or owner',()=>{
 const v=createVerifier();
 assert.throws(()=>v.accept({type:'snapshot',project:'cpycfxolqpidfjbhhsmr',data:sample()}),/falsches Projekt/);
 const alt=sample();alt.tables.tc_products[0].owner_id='ffffffff-ffff-ffff-ffff-ffffffffffff';
 assert.throws(()=>validateSnapshot(alt),/Eigentümer/);
});
test('never silently accept empty passwords or incomplete archive',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'tc-backup-')),file=path.join(dir,'backup.tcbackup');
 try{
  await assert.rejects(()=>encryptLines(file,'weak',[]),/mindestens 24/);
  const v=createVerifier();
  assert.throws(()=>v.report(),/unvollständig/);
 }finally{await rm(dir,{recursive:true,force:true});}
});


test('Cloud 1.1 encrypted archive includes shipment metadata; old v1 backups remain restorable',async()=>{
 const v1=sample();
 assert.equal(validateSnapshot(v1).counts.tc_sales,0);
 const v2=sample();
 v2.format='trummcards-cloud-backup-v2';
 const sid='723e4567-e89b-12d3-a456-426614174000';
 v2.tables.tc_sales.push({id:sid,owner_id:owner,product_id:pid,status:'booked'});
 v2.tables.tc_sale_shipments=[{sale_id:sid,owner_id:owner,shipping_status:'versendet',carrier:'Österreichische Post',
   tracking_number:'FAKE-123',order_reference:'FAKE-ORDER',shipped_on:'2026-10-19',tracking_url:'https://www.post.at/test'}];
 const valid=validateSnapshot(v2);
 assert.equal(valid.counts.tc_sale_shipments,1);
 const dir=await mkdtemp(path.join(os.tmpdir(),'tc-shipbackup-'));
 try{
  const file=path.join(dir,'shipping.tcbackup');
  async function* rows(){
   const img=Buffer.from('synthetic-picture-only');
   yield {type:'snapshot',project:PROD_REF,data:v2};
   yield {type:'image',path:v2.tables.tc_product_images[0].storage_path,mime:'image/jpeg',bytes:img.length,sha256:sha256(img),base64:img.toString('base64')};
   yield {type:'end',imageCount:1};
  }
  await encryptLines(file,password,rows());
  const verifier=createVerifier();await decryptLines(file,password,row=>verifier.accept(row));
  assert.equal(verifier.report().tables.tc_sale_shipments,1);
  const damaged=structuredClone(v2);
  damaged.tables.tc_sale_shipments[0].sale_id='99999999-9999-9999-9999-999999999999';
  assert.throws(()=>validateSnapshot(damaged),/Verwaister Verweis/);
  const withoutShipments=structuredClone(v2);delete withoutShipments.tables.tc_sale_shipments;
  assert.throws(()=>validateSnapshot(withoutShipments),/Backup-Tabelle fehlt/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
