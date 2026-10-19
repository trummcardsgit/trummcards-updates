import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const read=p=>readFileSync(root+p,'utf8');
const sql=read('cloud/supabase/migrations/20261019000100_cloud_11_card_metadata.sql');
const win=read('cloud/desktop-production/src/app.js');
const mobile=read('cloud/mobile-production/web/app.js');
const wh=read('cloud/desktop-production/src/index.html');
const mh=read('cloud/mobile-production/web/index.html');
const newColumns=['card_number','rarity','card_variant','storage_location','grading_company','grading_grade','grading_certificate'];
test('1.1 card metadata migration is additive and preserves 1.0 tables and owner RLS',()=>{
 assert.ok(sql.includes('alter table public.tc_products'));
 assert.ok(!/drop\s+(table|column|policy|schema)/i.test(sql));
 assert.ok(!/disable\s+row\s+level\s+security/i.test(sql));
 assert.ok(!sql.includes('service_role'));
 for(const name of newColumns) {
  assert.ok(sql.includes('add column if not exists '+name+' '),name+' migration');
  assert.ok(sql.includes('grant insert ('),name+' insert grant');
  assert.ok(sql.includes('grant update ('),name+' update grant');
  for(const body of [win,mobile,wh,mh])assert.ok(body.includes(name),name+' missing in client');
 }
 assert.ok(sql.includes('market_price_eur'),'market value groundwork for later work');
});
test('1.1 Windows and PWA both have combined search, stock filter, language filter and location sort',()=>{
 for(const html of [wh,mh]){
  for(const id of ['inventoryLanguageFilter','inventoryStockFilter','inventorySort','inventoryFilterCount'])assert.ok(html.includes('id="'+id+'"'),id);
  assert.ok(html.includes('name="after_save_purchase"'),'quick purchase flow');
 }
 assert.ok(wh.includes('id="inventorySearch"'));
 assert.ok(mh.includes('id="search"'));
 for(const js of [win,mobile]){
  assert.ok(js.includes('storage_location'));
  assert.ok(js.includes("stock==='available'"));
  assert.ok(js.includes("sort==='location'"));
  assert.ok(js.includes("after_save_purchase"));
  assert.ok(js.includes("localeCompare"));
 }
});
test('CI loads new migration only in disposable PostgreSQL, not against Production',()=>{
 for(const path of ['cloud/backup/restore-check.mjs','cloud/backup/business-flow-check.mjs']){
  assert.ok(read(path).includes('20261019000100_cloud_11_card_metadata.sql'));
 }
 assert.ok(read('cloud/backup/business-flow-check.mjs').includes('tc_products_11_storage_len'));
});
test('Feature branch keeps release 1.0 write gates and production deploy manifest unchanged',()=>{
 assert.ok(win.includes('const WRITES_ENABLED = false;'));
 assert.ok(mobile.includes('const WRITES_ENABLED=false;'));
 assert.ok(!read('.github/workflows/cloud-production-release.yml').includes('20261019000100_cloud_11_card_metadata.sql'));
});
