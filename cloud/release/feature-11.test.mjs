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

test('Pokemon catalog is accessible from both apps and never auto-uploads third-party assets',()=>{
 const source=read('cloud/features/tcgdex11.mjs');
 const pkg=JSON.parse(read('cloud/desktop-production/package.json'));
 for(const [html,app,base] of [
  [wh,win,'cloud/desktop-production/src/'],
  [mh,mobile,'cloud/mobile-production/web/']
 ]){
  for(const name of ['catalog11.js','catalog11-ui.js']){
   assert.ok(html.includes(name),'missing '+name+' in html');
   const browser=read(base+name);
   assert.ok(browser.includes('TrummCatalog'),'browser helper missing');
  }
  for(const name of ['catalogSearchForm','catalogSearchResults','catalogSearchStatus','catalogSelected'])assert.ok(html.includes('id="'+name+'"'),name);
  assert.ok(app.includes('catalog_card_id'),'selected catalog ID is stored');
  assert.ok(app.includes('TrummCatalogUI11'),'picker connected');
 }
 assert.ok(wh.includes('https://api.tcgdex.net'),'desktop CSP allows public API only');
 assert.ok(wh.includes('https://assets.tcgdex.net'),'desktop image preview allowed');
 assert.ok(pkg.build.files.includes('src/catalog11.js'));
 assert.ok(pkg.build.files.includes('src/catalog11-ui.js'));
 assert.ok(source.includes('price:null'),'catalog module must not invent market prices');
 const picker=read('cloud/mobile-production/web/catalog11-ui.js');
 assert.ok(!picker.includes('sb.storage'),'third-party image must not auto-upload');
 assert.ok(picker.includes('low.webp'),'preview uses supported TCGdex URL');
});
test('Finance dashboard & safe CSV export are wired to both Cloud apps',()=>{
 const pkg=JSON.parse(read('cloud/desktop-production/package.json'));
 for(const [html,app,base] of [
  [wh,win,'cloud/desktop-production/src/'],
  [mh,mobile,'cloud/mobile-production/web/']
 ]){
  for(const name of ['finance11.js','finance11-ui.js'])assert.ok(html.includes(name));
  for(const id of ['financePeriod','financeSummary','financeMonths','financePlatforms','financeExport'])assert.ok(html.includes('id="'+id+'"'),id);
  assert.ok(app.includes('TrummFinanceUI11'),'dashboard must subscribe to state');
  assert.ok(app.includes('state.sales'),'finance from real synchronized sales');
  assert.ok(read(base+'finance11-ui.js').includes('financeCsv'),'export button must use checked calculation');
 }
 assert.ok(pkg.build.files.includes('src/finance11.js'));
 assert.ok(pkg.build.files.includes('src/finance11-ui.js'));
 assert.ok(wh.includes('data-tab="finance"'));
 assert.ok(mh.includes('data-go="finance"'));
});


test('Shipment editor is shipped in both clients without modifying FIFO sale booking',()=>{
 const schema=read('cloud/release/sql/cloud11_sale_shipments_staging.sql');
 const pkg=JSON.parse(read('cloud/desktop-production/package.json'));
 assert.ok(schema.includes('create table public.tc_sale_shipments'),'separate shipping table');
 assert.ok(schema.includes('alter table public.tc_sale_shipments enable row level security'));
 assert.ok(schema.includes('foreign key (sale_id,owner_id) references public.tc_sales(id,owner_id)'));
 assert.ok(schema.includes('create policy tc_shipments_update'));
 assert.ok(!schema.includes('alter table public.tc_sales'),'sale ledger must not change');
 assert.ok(!read('.github/workflows/cloud-production-release.yml').includes('cloud11_sale_shipments_staging.sql'));
 for(const [html,app,base] of [[wh,win,'cloud/desktop-production/src/'],[mh,mobile,'cloud/mobile-production/web/']]){
  for(const file of ['shipping11.js','shipping11-ui.js'])assert.ok(html.includes(file),'missing '+file);
  for(const field of ['shipping_status','carrier','tracking_number','order_reference','shipped_on','tracking_url'])
   assert.ok(html.includes('name="'+field+'"'),'shipping field '+field);
  for(const id of ['shipmentPanel','shipmentForm','shipmentSale','shipmentSave','shipmentStatus'])
   assert.ok(html.includes('id="'+id+'"'),'shipment id '+id);
  assert.ok(app.includes('tc_sale_shipments'),'client must synchronize shipments');
  assert.ok(app.includes('TrummShippingUI11?.bind'),'client must wire UI');
  assert.ok(app.includes('data-shipping-sale'),'sales list entry point');
  assert.ok(app.includes('saveShipment11'),'shipping persistence');
  const js=read(base+'shipping11-ui.js');
  assert.ok(js.includes('shippingRecord'),'form inputs validated');
  assert.ok(!js.includes('tc_book_sale'),'must not rebook or change FIFO');
 }
 for(const path of ['cloud/backup/restore-check.mjs','cloud/backup/business-flow-check.mjs'])
  assert.ok(read(path).includes('cloud11_sale_shipments_staging.sql'),'local PG tests must load shipping');
 assert.ok(pkg.build.files.includes('src/shipping11.js'));
 assert.ok(pkg.build.files.includes('src/shipping11-ui.js'));
});
test('Encrypted Cloud 1.1 shipment backups have v2 snapshot, retain v1 restore support',()=>{
 const backup=read('cloud/release/sql/cloud11_backup_snapshot_v2_staging.sql');
 const validator=read('cloud/backup/validate.mjs');
 assert.ok(backup.includes('trummcards-cloud-backup-v2'));
 assert.ok(backup.includes("'tc_sale_shipments'"));
 assert.ok(validator.includes('tablesForSnapshot'));
 assert.ok(validator.includes('tc_sale_shipments'));
 assert.ok(validator.includes('tc_platform_fee_profiles'));
 assert.ok(backup.includes("'tc_platform_fee_profiles'"));
 assert.ok(validator.includes('trummcards-cloud-backup-v1'));
 assert.ok(validator.includes('trummcards-cloud-backup-v2'));
 assert.ok(read('cloud/backup/backup.test.mjs').includes('old v1 backups remain restorable'));
});


test('Verified EUR market quotes and custom fee profiles are fully wired in Windows and PWA',()=>{
 const pkg=JSON.parse(read('cloud/desktop-production/package.json'));
 const feesSql=read('cloud/release/sql/cloud11_fee_profiles_staging.sql');
 const quote=read('cloud/features/tcgdex11.mjs');
 assert.ok(quote.includes('euroMarketQuote'),'TCGdex quotes limited by variant and EUR');
 assert.ok(feesSql.includes('alter table public.tc_platform_fee_profiles enable row level security'));
 assert.ok(feesSql.includes('tc_platform_fee_profiles_update'));
 assert.ok(!feesSql.includes('alter table public.tc_sales'),'FIFO sale ledger must remain untouched');
 for(const [html,app,base] of [[wh,win,'cloud/desktop-production/src/'],[mh,mobile,'cloud/mobile-production/web/']]){
   for(const p of ['market11-ui.js','fees11.js','fees11-ui.js']){
     assert.ok(html.includes(p),'Missing asset '+p);
     assert.ok(read(base+p).length>100,'Missing actual browser code '+p);
   }
   for(const name of ['market_price_eur','market_price_source','market_price_checked_at']){
     assert.ok(html.includes('name="'+name+'"'),'Missing price attribute '+name);
     assert.ok(app.includes(name),'Market quote must be saved with product');
   }
   assert.ok(html.includes('id="marketPriceStatus"'));
   for(const id of ['feeProfileForm','feeProfileSave','feeProfileList','feeSuggest','feeSuggestStatus'])
     assert.ok(html.includes('id="'+id+'"'),'Fee UI missing '+id);
   assert.ok(app.includes('tc_platform_fee_profiles'),'Profile must be synchronized securely');
   assert.ok(app.includes('TrummFeesUI11?.bind'),'UI wired to application');
   assert.ok(app.includes('TrummMarketUI11?.bind'),'Manual/candidate market price editor wired');
   assert.ok(app.includes('feeProfiles'),'Profile state must be loaded');
   assert.ok(read(base+'fees11-ui.js').includes("dispatchEvent(new Event('input'"),'Fee suggestion must recalculate preview');
 }
 for(const file of ['market11-ui.js','fees11.js','fees11-ui.js'])
   assert.ok(pkg.build.files.includes('src/'+file),'Windows installer missing '+file);
 assert.ok(read('cloud/release/sql/cloud11_backup_snapshot_v2_staging.sql').includes("'tc_platform_fee_profiles'"));
 assert.ok(read('cloud/backup/validate.mjs').includes("'tc_platform_fee_profiles'"));
 assert.ok(read('cloud/backup/business-flow-check.mjs').includes('tc_platform_fee_profiles'));
 assert.ok(read('cloud/backup/restore-check.mjs').includes('cloud11_fee_profiles_staging.sql'));
 assert.ok(!read('.github/workflows/cloud-production-release.yml').includes('cloud11_fee_profiles_staging.sql'));
});


test('Full multilingual Pokemon set browser is connected to catalog and card editor in both apps',()=>{
 const catalog=read('cloud/features/tcgdex11.mjs');
 const pkg=JSON.parse(read('cloud/desktop-production/package.json'));
 assert.ok(catalog.includes("BASE+'/'+lang+'/sets?"),'paged API set list');
 assert.ok(catalog.includes("BASE+'/'+lang+'/sets/'+"),'individual set detail API');
 for(const [html,app,base] of [[wh,win,'cloud/desktop-production/src/'],[mh,mobile,'cloud/mobile-production/web/']]){
   const picker=read(base+'sets11-ui.js');
   const browser=read(base+'catalog11.js');
   assert.ok(html.includes('sets11-ui.js'),'script loaded');
   for(const id of ['catalogSetsForm','catalogSetQuery','catalogSetResults','catalogSetMore',
       'catalogSetDetail','catalogSetCards','catalogSetCardFilter','catalogSetPrev','catalogSetNext','catalogSetStatus'])
     assert.ok(html.includes('id="'+id+'"'),'missing '+id);
   for(const method of ['listPokemonSets','getPokemonSet']) {
     assert.ok(catalog.includes('function '+method),'module missing '+method);
     assert.ok(browser.includes(method),'browser bundle missing '+method);
     assert.ok(picker.includes(method),'set browser does not use '+method);
   }
   assert.ok(picker.includes("selectCard(card.id)"),'reuses checked card selection');
   assert.ok(picker.includes('AbortController'),'cancels outdated network requests');
   assert.ok(app.includes("TrummSetUI11?.bind"),'application must initialize set explorer');
   assert.ok(app.includes("setPicker11?.clear()"),'article reset clears selected set');
 }
 assert.ok(pkg.build.files.includes('src/sets11-ui.js'),'Windows installer includes set picker');
 assert.ok(!read('.github/workflows/cloud-production-release.yml').includes('sets11-ui.js'),'production deploy remains gated');
});


test('Austrian cash-flow journal works on Windows and mobile independently of booked FIFO sales',()=>{
 const pkg=JSON.parse(read('cloud/desktop-production/package.json'));
 const sql=read('cloud/release/sql/cloud11_cash_entries_staging.sql');
 const snapshot=read('cloud/release/sql/cloud11_backup_snapshot_v2_staging.sql');
 const validator=read('cloud/backup/validate.mjs');
 assert.ok(sql.includes('create table public.tc_cash_entries'));
 assert.ok(sql.includes('enable row level security'));
 assert.ok(sql.includes('tc_cash_entries_sale_owner_fk'));
 assert.ok(sql.includes('tc_cash_entries_lot_owner_fk'));
 assert.ok(sql.includes('create policy tc_cash_entries_delete'));
 assert.ok(!sql.includes('alter table public.tc_sales'));
 assert.ok(!sql.includes('alter table public.tc_purchase_lots'));
 assert.ok(!read('.github/workflows/cloud-production-release.yml').includes('cloud11_cash_entries_staging.sql'));
 assert.ok(snapshot.includes("'tc_cash_entries'"));
 assert.ok(validator.includes('tc_cash_entries'));
 for(const [html,app,base] of [[wh,win,'cloud/desktop-production/src/'],[mh,mobile,'cloud/mobile-production/web/']]){
  for(const script of ['cash11.js','cash11-ui.js']){
   assert.ok(html.includes(script),'Cash browser script missing');
   assert.ok(read(base+script).length>100);
  }
  for(const id of ['cashPanel','cashEntryForm','cashSave','cashCancel','cashYear','cashSummary','cashEntries','cashExport'])
   assert.ok(html.includes('id="'+id+'"'),'Missing payment UI '+id);
  for(const name of ['payment_on','direction','category','amount_eur','description','document_reference'])
   assert.ok(html.includes('name="'+name+'"'),'Missing payment field '+name);
  assert.ok(app.includes('tc_cash_entries'),'Real user cash transactions need cloud storage');
  assert.ok(app.includes('TrummCashUI11?.bind'),'Cash UI not initialized');
  assert.ok(app.includes('saveCash11')&&app.includes('deleteCash11'),'Payment journal CRUD required');
  assert.ok(app.includes('cashEntries'),'Payment state not synchronized');
  const ui=read(base+'cash11-ui.js');
  assert.ok(ui.includes('cashCsv'),'Cash export must use explicit payment dates');
  assert.ok(!ui.includes('tc_book_sale')&&!ui.includes('tc_book_purchase'),'Cash journal must not book FIFO items');
 }
 assert.ok(pkg.build.files.includes('src/cash11.js'));
 assert.ok(pkg.build.files.includes('src/cash11-ui.js'));
 for(const app of [win,mobile]){
  assert.ok(app.includes('data-cash-sale'),'booked sales link to actual payment recording');
  assert.ok(app.includes('data-cash-lot'),'purchases link to actual payment recording');
  assert.ok(app.includes("beginLinkedPayment('sale'"),'sale entry preselects related payment');
  assert.ok(app.includes("beginLinkedPayment('lot'"),'purchase entry preselects related payment');
 }
 for(const base of ['cloud/desktop-production/src/','cloud/mobile-production/web/'])
  assert.ok(read(base+'cash11-ui.js').includes('beginLinkedPayment'),'cash form can preselect related transaction');
 assert.ok(read('cloud/backup/restore-check.mjs').includes('cloud11_cash_entries_staging.sql'));
 assert.ok(read('cloud/backup/business-flow-check.mjs').includes('cloud11_cash_entries_staging.sql'));
});
