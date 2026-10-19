#!/usr/bin/env node
// Disposable PostgreSQL 17 business-flow integration drill.
// All IDs, cards, amounts and images are FAKE. NO Supabase connection, credentials or writes.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import pg from 'pg';

const connection=process.env.PG_RESTORE_URL;
if(process.env.GITHUB_ACTIONS!=='true')throw Error('Business E2E runs only in GitHub Actions.');
if(!connection)throw Error('Missing disposable PostgreSQL connection URL.');
const u=new URL(connection);
if(!['127.0.0.1','localhost','::1'].includes(u.hostname)||u.pathname!=='/trummcards_restore')
 throw Error('Business E2E REFUSED: only local trummcards_restore database allowed.');
const root=fileURLToPath(new URL('../../',import.meta.url));
const files=[
 'cloud/backup/local-supabase-stubs.sql',
 'cloud/supabase/migrations/20261014000100_phase1_schema.sql',
 'cloud/supabase/migrations/20261015000200_cloud_test_session.sql',
 'cloud/supabase/migrations/20261015000300_product_images.sql',
 'cloud/supabase/migrations/20261016000400_backup_snapshot.sql',
 'cloud/release/sql/harden_product_images_owner.sql',
 'cloud/supabase/migrations/20261019000100_cloud_11_card_metadata.sql',
 'cloud/release/sql/cloud11_sale_shipments_staging.sql'
];
const owner='123e4567-e89b-12d3-a456-426614174000';
const stranger='123e4567-e89b-12d3-a456-426614174999';
let product;
const image='523e4567-e89b-12d3-a456-426614174000';
const firstKey='623e4567-e89b-12d3-a456-426614174000';
const secondKey='623e4567-e89b-12d3-a456-426614174001';
const saleKey='723e4567-e89b-12d3-a456-426614174000';
const toNum=x=>Number(x);
const c=new pg.Client({connectionString:connection,connectionTimeoutMillis:10000});
await c.connect();
try{
 const exists=await c.query("select to_regclass('public.tc_products') as t");
 if(exists.rows[0].t!==null)throw Error('Business E2E needs a fresh throwaway DB.');
 for(const file of files)await c.query(await readFile(path.join(root,file),'utf8'));
 // Supabase Auth/Storage own these grants in live projects; stub them only locally.
 await c.query("grant usage on schema auth,storage to authenticated, anon");
 await c.query("grant select,insert,delete on storage.objects to authenticated");
 await c.query('insert into auth.users(id) values($1),($2)',[owner,stranger]);
 await c.query('insert into trummcards_private.owner_guard(user_id) values($1)',[owner]);
 await c.query('set role authenticated');
 await c.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
 assert.equal((await c.query('select public.tc_is_authorized() as authorized')).rows[0].authorized,true);
 product=(await c.query('insert into public.tc_products(owner_id,sku,name) values($1,$2,$3) returning id',[owner,'DEMO-FAKE-001','Fiktive Pokémon-Karte'])).rows[0].id;
 // 1.1 migration smoke: all extended columns persist under owner RLS.
 await c.query("update public.tc_products set card_number=$1,rarity=$2,card_variant=$3,storage_location=$4,grading_company=$5,grading_grade=$6,grading_certificate=$7 where id=$8",
 ['025/165','Illustration Rare','Holo','Box 2 / Fach 4','PSA','9','DEMO-NOT-REAL',product]);
 const meta=(await c.query('select card_number,rarity,storage_location,grading_grade from public.tc_products where id=$1',[product])).rows[0];
 assert.deepEqual(meta,{card_number:'025/165',rarity:'Illustration Rare',storage_location:'Box 2 / Fach 4',grading_grade:'9'});
 await assert.rejects(()=>c.query("update public.tc_products set storage_location=repeat('X',161) where id=$1",[product]),/tc_products_11_storage_len/);
 const purchase=async(date,qty,total,key)=>{
   const r=await c.query("select public.tc_book_purchase($1,$2,$3,$4,$5,$6,$7,$8) as id",
     [product,date,qty,total,'0.00','Nur lokaler CI-Test','Nicht real',key]);
   return r.rows[0].id;
 };
 const lot1=await purchase('2026-10-01',3,'30.00',firstKey);
 const lot2=await purchase('2026-10-10',2,'50.00',secondKey);
 assert.equal(await purchase('2026-10-01',3,'30.00',firstKey),lot1,'Purchase idempotency');
 assert.equal(toNum((await c.query('select available_qty from public.tc_inventory where product_id=$1',[product])).rows[0].available_qty),5);
 const sale=async(qty,key)=> (await c.query(
  "select public.tc_book_sale($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) as id",
  [product,'2026-10-11',qty,'100.00','5.00','3.00','7.00','2.00','CI-Test','Keine echten Daten',key]
 )).rows[0].id;
 const saleId=await sale(4,saleKey);
 assert.equal(await sale(4,saleKey),saleId,'Sale idempotency');
 const booking=(await c.query('select qty,cogs_total,price,shipping_income,shipping_cost,fees,other_cost,status from public.tc_sales where id=$1',[saleId])).rows[0];
 assert.equal(toNum(booking.qty),4);
 assert.equal(toNum(booking.cogs_total),55,'FIFO cost 3*10 + 1*25');
 assert.equal(toNum(booking.price)+toNum(booking.shipping_income)-toNum(booking.shipping_cost)-toNum(booking.fees)-toNum(booking.other_cost)-toNum(booking.cogs_total),38,'Net sale profit');
 assert.equal(booking.status,'booked');
 // Shipping is independent per-sale metadata. Authorized owner can insert and edit it;
 // no stock, FIFO or sale-money fields are ever directly updated.
 await c.query(`insert into public.tc_sale_shipments
   (sale_id,owner_id,shipping_status,carrier,tracking_number,order_reference,shipped_on,tracking_url)
   values ($1,$2,'verpackt','Österreichische Post','','ORDER-TEST-1',null,'')`,[saleId,owner]);
 assert.equal((await c.query('select shipping_status from public.tc_sale_shipments where sale_id=$1',[saleId])).rows[0].shipping_status,'verpackt');
 await c.query("update public.tc_sale_shipments set shipping_status='versendet',tracking_number='TEST-123',shipped_on='2026-10-19' where sale_id=$1",[saleId]);
 assert.equal((await c.query('select tracking_number from public.tc_sale_shipments where sale_id=$1',[saleId])).rows[0].tracking_number,'TEST-123');
 await assert.rejects(()=>c.query("insert into public.tc_sale_shipments (sale_id,owner_id) values ($1,$2)",['723e4567-e89b-12d3-a456-426614174999',owner]),/foreign key/);
 const bookedAfterShipping=(await c.query('select qty,cogs_total,status from public.tc_sales where id=$1',[saleId])).rows[0];
 assert.deepEqual(bookedAfterShipping,{qty:4,cogs_total:'55.00',status:'booked'});
 const left=await c.query('select id,available_qty,allocated_cost from public.tc_purchase_lots where product_id=$1',[product]);
 const map=new Map(left.rows.map(row=>[row.id,row]));
 assert.equal(toNum(map.get(lot1).available_qty),0);
 assert.equal(toNum(map.get(lot2).available_qty),1);
 assert.equal(toNum(map.get(lot1).allocated_cost),30);
 assert.equal(toNum(map.get(lot2).allocated_cost),25);
 const allocations=await c.query('select sum(qty)::int as qty, sum(cost_amount) as amount, count(*)::int as n from public.tc_sale_allocations where sale_id=$1',[saleId]);
 assert.deepEqual([allocations.rows[0].qty,toNum(allocations.rows[0].amount),allocations.rows[0].n],[4,55,2]);
 const rows=(await c.query('select available_qty,remaining_cost from public.tc_inventory where product_id=$1',[product])).rows[0];
 assert.equal(toNum(rows.available_qty),1);
 assert.equal(toNum(rows.remaining_cost),25);
 await assert.rejects(()=>sale(2,'723e4567-e89b-12d3-a456-426614174111'),/Nicht genügend Bestand/,'Overselling blocked');
 await assert.rejects(()=>sale(3,saleKey),/Buchungsschlüssel/,'Reused request key mismatch blocked');
 assert.equal((await c.query('select public.tc_void_sale($1) as result',[saleId])).rows[0].result,true,'Storno');
 assert.equal((await c.query('select public.tc_void_sale($1) as result',[saleId])).rows[0].result,false,'Storno idempotence');
 assert.equal((await c.query('select shipping_status from public.tc_sale_shipments where sale_id=$1',[saleId])).rows[0].shipping_status,'versendet','Historical shipment preserved after cancellation');
 const after=(await c.query('select available_qty,remaining_cost from public.tc_inventory where product_id=$1',[product])).rows[0];
 assert.equal(toNum(after.available_qty),5);
 assert.equal(toNum(after.remaining_cost),80);
 const movements=await c.query('select movement_type, count(*)::int as n from public.tc_stock_movements group by movement_type');
 assert.deepEqual(Object.fromEntries(movements.rows.map(row=>[row.movement_type,row.n])),{purchase:2,sale:2,sale_void:2});
 // One private hero photo: test SQL metadata plus storage owner access.
 const imagePath=owner+'/products/'+product+'/'+image+'.jpg';
 await c.query('insert into public.tc_product_images(id,owner_id,product_id,storage_path,mime_type) values($1,$2,$3,$4,$5)',[image,owner,product,imagePath,'image/jpeg']);
 await c.query('insert into storage.objects(bucket_id,name) values($1,$2)',['trummcards-lot-images',imagePath]);
 assert.equal((await c.query('select count(*)::int as n from public.tc_product_images')).rows[0].n,1);
 assert.equal((await c.query("select count(*)::int as n from storage.objects where bucket_id='trummcards-lot-images'")).rows[0].n,1);
 // A different authenticated account is not allowed to inspect/write even with the valid IDs.
 await c.query("select set_config('request.jwt.claim.sub',$1,false)",[stranger]);
 assert.equal((await c.query('select public.tc_is_authorized() as authorized')).rows[0].authorized,false);
 for(const name of ['tc_products','tc_purchase_lots','tc_sales','tc_sale_shipments','tc_product_images']){
   const res=await c.query('select count(*)::int as n from public.'+name);
   assert.equal(res.rows[0].n,0,'Foreign account leaked '+name);
 }
 assert.equal((await c.query('select count(*)::int as n from storage.objects')).rows[0].n,0);
 await assert.rejects(()=>c.query("insert into public.tc_sale_shipments(sale_id,owner_id) values ($1,$2)",[saleId,stranger]),/row-level security|permission denied|foreign key/i,'Foreign account cannot add shipment to owner sale');
 assert.equal((await c.query("update public.tc_sale_shipments set shipping_status='zugestellt' where sale_id=$1 returning sale_id",[saleId])).rowCount,0,'Foreign account cannot edit shipment');
 await assert.rejects(()=>purchase('2026-10-13',1,'10.00','623e4567-e89b-12d3-a456-426614174777'),/Nicht autorisiert/);
 await c.query('reset role');
 const totals=await c.query('select (select count(*) from public.tc_products) products,(select count(*) from public.tc_purchase_lots) lots,(select count(*) from public.tc_sales) sales');
 assert.deepEqual(totals.rows[0],{products:'1',lots:'2',sales:'1'});
 console.log('CI isolated business E2E: OWNER, FIFO (55.00), NET 38.00, sale/void/idempotency, oversell and foreign-account/image RLS PASS.');
 console.log('Only synthetic fixture data in disposable local PostgreSQL; Production and TEST unchanged.');
}finally{await c.end();}
