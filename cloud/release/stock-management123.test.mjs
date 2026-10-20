import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const base=['cloud/desktop-production/src/','cloud/mobile-production/web/'];
const read=file=>fs.readFileSync(file,'utf8');
const sql=read('cloud/supabase/migrations/20261020000100_stock_corrections_archive.sql');

function harness(directory,{isMobile=false,answers=['2','Inventurkorrektur'],confirmResult=true,archived=false,writes=true}={}){
 const source=read(directory+'app.js');
 const fn=source.split('\n').find(l=>/^\s*async function manageInventoryStock\(/.test(l));
 assert.ok(fn,'stock handler missing: '+directory);
 const activity={calls:[],notices:[],refreshed:0,confirmed:0};
 const p={id:'product-1',name:'Glurak',archived_at:archived?'2026-10-20':null};
 const values=[...answers];
 const ctx={
  WRITES_ENABLED:writes,NO_WRITES:'Read only',REQUIRE_GO_LIVE_MESSAGE:'Read only',
  selectedProduct:id=>id===p.id?p:null,productById:id=>id===p.id?p:null,
  totalAvailable:()=>5,available:()=>5,
  prompt:()=>values.shift()??null,
  confirm:()=>{activity.confirmed++;return confirmResult;},
  flash:(message,type)=>activity.notices.push({message,type}),
  notice:(message,type)=>activity.notices.push({message,type}),
  withBusy:async action=>action(),withSaving:async action=>action(),
  sb:{rpc:async(name,args)=>{activity.calls.push({name,args});return {error:null};}},
  rpc:async(name,args)=>{activity.calls.push({name,args});return true;},
  refreshAll:async()=>{activity.refreshed++;}
 };
 const run=vm.runInNewContext('('+fn.trim()+')',ctx);
 return {run,activity};
}

test('Windows and PWA: corrections go through owner-scoped RPC and update UI',async()=>{
 for(const directory of base){
  const h=harness(directory);
  await h.run('product-1');
  assert.equal(h.activity.calls.length,1,directory);
  assert.equal(h.activity.calls[0].name,'tc_adjust_inventory');
  assert.equal(h.activity.calls[0].args.p_expected_qty,5);
  assert.equal(h.activity.calls[0].args.p_target_qty,2);
  assert.equal(h.activity.calls[0].args.p_reason,'Inventurkorrektur');
  assert.equal(h.activity.activity,undefined);
  assert.equal(h.activity.refreshed,1);
  assert.equal(h.activity.notices.at(-1).type,'success');
 }
});

test('Windows and PWA: remove archives, not destructive delete',async()=>{
 for(const directory of base){
  const h=harness(directory,{answers:['Umzug']});
  await h.run('product-1',true);
  assert.equal(h.activity.calls.length,1);
  assert.equal(h.activity.calls[0].name,'tc_archive_product');
  assert.deepEqual(Object.keys(h.activity.calls[0].args).sort(),['p_expected_qty','p_product_id','p_reason']);
  assert.equal(h.activity.refreshed,1);
 }
});

test('Windows and PWA: reject invalid numbers, cancelled dialogs and archived items',async()=>{
 for(const directory of base){
  for(const answers of [['-1'],['2.5'],['abc'],['1000001'],[null]]){
   const h=harness(directory,{answers});await h.run('product-1');
   assert.equal(h.activity.calls.length,0,directory+' '+String(answers));
  }
  const h=harness(directory,{archived:true});await h.run('product-1');
  assert.equal(h.activity.calls.length,0);
  const k=harness(directory,{writes:false});await k.run('product-1');
  assert.equal(k.activity.calls.length,0);
  const denied=harness(directory,{confirmResult:false});await denied.run('product-1');
  assert.equal(denied.activity.calls.length,0);
 }
});

test('Windows and PWA: archive filter applies to inventory, sales choices and Vinted',()=>{
 for(const directory of base){
  const s=read(directory+'app.js');
  assert.match(s,/archived_at/);
  assert.match(s,/getProducts:\(\)=>state\.products\.filter\(p=>!p\.archived_at\)/);
  assert.match(s,/data-stock-adjust/);
  assert.match(s,/data-stock-archive/);
  assert.match(s,/p_expected_qty:before/);
  assert.doesNotMatch(s,/await guard\(/);
 }
});

test('Both finance views exclude inventory corrections from real purchase expenses',()=>{
 for(const directory of base){
  const window={};
  vm.runInNewContext(read(directory+'finance11.js'),{window});
  const api=window.TrummFinance11;
  const purchaseLots=[
   {id:'p',source:'Cardmarket',bought_on:'2026-10-18',purchased_qty:2,purchase_total:18,extra_cost:2,product_id:'prod'},
   {id:'c',source:'Bestandskorrektur',bought_on:'2026-10-20',purchased_qty:1,purchase_total:150,extra_cost:0,product_id:'prod'}
  ];
  assert.equal(api.summarizeFinance({purchaseLots}).purchaseSpending,20);
  const csv=api.financeCsv({purchaseLots,productName:()=> 'Glurak'});
  const correction=csv.split('\r\n').find(line=>line.includes('Bestandskorrektur'));
  assert.ok(correction);
  assert.ok(!correction.includes('150,00'),'Correction must not be a cash expense');
 }
});

test('Migration preserves historic records, RLS and RPC access control',()=>{
 assert.match(sql,/create table if not exists public\.tc_inventory_corrections/i);
 assert.match(sql,/enable row level security/i);
 assert.match(sql,/create policy tc_inventory_corrections_read/i);
 assert.match(sql,/trummcards_private\.is_owner\(\)/);
 assert.match(sql,/for update/);
 assert.match(sql,/v_before <> p_expected_qty/);
 assert.match(sql,/create or replace function public\.tc_adjust_inventory/i);
 assert.match(sql,/create or replace function public\.tc_archive_product/i);
 assert.match(sql,/create trigger tc_reactivate_on_stock_return/i);
 assert.match(sql,/create trigger tc_reactivate_on_new_lot/i);
 assert.doesNotMatch(sql,/delete from public\.tc_products/i);
});
