import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const app=read('../web/app.js');
const dex=read('../web/carddex12.js');
const catalog=read('../web/catalog11.js');
const html=read('../web/index.html');
const css=read('../web/styles.css');
const baseline=read('../../supabase/migrations/20261022000100_access_collection_wishlist.sql');
const grants=read('../../supabase/migrations/20261022000200_personal_lists_for_dex.sql');
const acquire=read('../../supabase/migrations/20261022000300_wishlist_to_collection.sql');
const builder=read('../../release/build-cloud-13-test.mjs');

test('PWA JavaScript parses and keeps distinct admin and Dex navigation',()=>{
 assert.doesNotThrow(()=>new Function(app));
 assert.match(app,/cloud13Role==='dex'\s*&&\s*!\['carddex','more','collection','wishlist'\]/);
 assert.match(app,/if\(target==='stock'&&cloud13Role!=='admin'\)/);
 assert.match(app,/if\(cloud13Role!=='admin'\)/);
});
test('Dex accesses private list, not inventory synchronisation',()=>{
 assert.match(app,/if\(cloud13Role==='dex'\)\{await cloud13Refresh\(\);connected\('Online','online'\);return;\}/);
 assert.match(app,/tableGet\('tc_personal_cards'/);
 assert.match(grants,/owner_id = \(select auth\.uid\(\)\)/);
 assert.match(grants,/pwa_role\(\)\) in \('admin','dex'\)/);
 assert.match(baseline,/owner_guard/);
});
test('Transfer is server-side, signed-in-only and atomic on wishlist row',()=>{
 assert.match(app,/data-cloud13-acquire/);
 assert.match(app,/rpc\('tc_acquire_wishlist_card'/);
 assert.match(acquire,/security invoker/);
 assert.match(acquire,/owner_id = v_uid and list_type = 'wishlist'/);
 assert.match(acquire,/for update;/);
 assert.match(acquire,/p_quantity > v_row\.quantity/);
 assert.match(acquire,/quantity = quantity - p_quantity/);
 assert.match(acquire,/delete from public\.tc_personal_cards/);
 assert.doesNotMatch(acquire,/insert into public\.tc_stock_movements/i);
 assert.doesNotMatch(acquire,/insert into public\.tc_sales/i);
});
test('Import to sale stock is a draft and cannot directly book a purchase',()=>{
 assert.match(app,/resetArticle\(\);\s*const form=\$\('articleForm'\)/);
 assert.match(app,/showPage\('article'\)/);
 assert.match(app,/Artikel prüfen, speichern/);
});

test('KartenDex retains original production 1.2.6 layout, search, set browser and paging',()=>{
 assert.doesNotThrow(()=>new Function(dex));
 assert.doesNotThrow(()=>new Function(catalog));
 for(const id of ['dexSearchForm','dexQuery','dexSearchSet','dexSearchNumber','dexLanguage',
  'dexResults','dexPrev','dexNext','dexDetail','dexSetForm','dexSets',
  'dexSetCards','dexSetPrev','dexSetNext','dexMoreSets','dexDetailImage']){
  assert.match(html,new RegExp('id="'+id+'"'),id+' is required');
 }
 assert.match(dex,/card\.setName\|\|'Set wird geladen/);
 for(const cls of ['dex-card-name','dex-card-set','dex-card-number','dex-grid','dex-detail']){
  assert.match(dex+css,new RegExp(cls));
 }
 assert.match(catalog,/searchPrintedFraction/);
 assert.match(catalog,/cardNumber/);
 assert.match(css,/\.dex-card img\{height:140px/);
 assert.match(html,/carddex12\.js\?v=0\.9\.0/);
 assert.doesNotMatch(app,/cloud13DexSearch/);
});
test('Original detail panel supports collection, wishlist and admin-only sale stock actions',()=>{
 for(const target of ['dexToArticle','dexToCollection','dexToWishlist']){
  assert.match(html,new RegExp('id="'+target+'"'));
  assert.match(dex,new RegExp("'"+target+"'"));
 }
 assert.match(dex,/target:'collection'/);
 assert.match(dex,/target:'wishlist'/);
 assert.match(dex,/target:'stock'/);
 assert.match(app,/\$\('dexToArticle'\)\.hidden=isDex/);
 assert.match(app,/window\.TrummCardDex12\?\.bind\(\{onUseCard:cloud13UseCard\}\)/);
});

test('Cloud 1.3 uses the unified desktop production layout and preserves current stock/Vinted features',()=>{
 assert.match(css,/#shell\s*\{/);
 assert.match(css,/grid-template-columns:238px minmax\(0,1fr\)/);
 assert.match(css,/#shell>\.bottom-nav/);
 assert.match(html,/class="desktop-bookings-link"/);
 assert.match(html,/data-go="carddex"/);
 assert.match(html,/id="vintedDialog"/);
 assert.match(html,/image-link12\.js/);
 assert.match(html,/vinted12\.js/);
 assert.match(app,/function manageInventoryStock/);
 assert.match(app,/vintedUI12=window\.TrummVinted12\?\.bind/);
 assert.match(app,/cloud13Init\(\)/);
 assert.doesNotMatch(app,/id="page-dex"/);
 assert.match(app,/page-collection/);
});

test('Release builder isolates TEST from PROD',()=>{
 assert.match(builder,/const target=path\.resolve\('cloud\/test-13-build'\)/);
 assert.match(builder,/content=content\.replaceAll\(production,test\)\.replaceAll\(prodKey,testKey\)/);
 assert.match(builder,/trummcards-mobile-test13-session-v1/);
 assert.match(builder,/Unexpected app gate/);
});
