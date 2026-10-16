#!/usr/bin/env node
// Only synthetic values; fixture is NOT uploaded to Supabase.
import {encryptLines} from './secure-archive.mjs';
import {PROD_REF,TABLES,sha256} from './validate.mjs';
const file=process.argv[2],pass=process.env.TC_BACKUP_PASSPHRASE;
if(!file||!pass)throw Error('Fixture: Ausgabe und Sicherungspassphrase fehlen.');
const o='123e4567-e89b-12d3-a456-426614174000';
const product='223e4567-e89b-12d3-a456-426614174000';
const lot='323e4567-e89b-12d3-a456-426614174000';
const sale='423e4567-e89b-12d3-a456-426614174000';
const pic='523e4567-e89b-12d3-a456-426614174000';
const imagePath=o+'/products/'+product+'/'+pic+'.jpg';
const t=Object.fromEntries(TABLES.map(k=>[k,[]]));
t.tc_products.push({id:product,owner_id:o,name:'Fiktive Testkarte',set_name:'Testset',language:'Deutsch',card_condition:'Near Mint',sku:'FAKE-001'});
t.tc_purchase_lots.push({id:lot,owner_id:o,product_id:product,bought_on:'2026-10-01',purchased_qty:3,available_qty:2,purchase_total:'30.00',extra_cost:'0.00',allocated_cost:'10.00',request_key:'623e4567-e89b-12d3-a456-426614174000'});
t.tc_sales.push({id:sale,owner_id:o,product_id:product,sold_on:'2026-10-02',qty:1,price:'22.00',cogs_total:'10.00',status:'booked',request_key:'723e4567-e89b-12d3-a456-426614174000'});
t.tc_sale_allocations.push({id:'823e4567-e89b-12d3-a456-426614174000',owner_id:o,sale_id:sale,product_id:product,lot_id:lot,qty:1,unit_cost_snapshot:'10.000000',cost_amount:'10.00'});
t.tc_stock_movements.push({id:1,owner_id:o,product_id:product,lot_id:lot,sale_id:null,movement_type:'purchase',quantity_delta:3,cost_delta:'30.00'});
t.tc_stock_movements.push({id:2,owner_id:o,product_id:product,lot_id:lot,sale_id:sale,movement_type:'sale',quantity_delta:-1,cost_delta:'-10.00'});
t.tc_product_images.push({id:pic,owner_id:o,product_id:product,storage_path:imagePath,mime_type:'image/jpeg'});
const data=Buffer.from('FAKE IMAGE CONTENT FOR RESTORE DRILL');
async function* records(){
 yield {type:'snapshot',project:PROD_REF,data:{format:'trummcards-cloud-backup-v1',owner_id:o,captured_at:'2026-10-16T00:00:00Z',tables:t}};
 yield {type:'image',path:imagePath,mime:'image/jpeg',bytes:data.length,sha256:sha256(data),base64:data.toString('base64')};
 yield {type:'end',imageCount:1};
}
await encryptLines(file,pass,records());
console.log('Fiktive, verschlüsselte Backup-Testdatei erzeugt.');
