import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const app=read('../web/app.js');
const baseline=read('../../supabase/migrations/20261022000100_access_collection_wishlist.sql');
const grants=read('../../supabase/migrations/20261022000200_personal_lists_for_dex.sql');
const acquire=read('../../supabase/migrations/20261022000300_wishlist_to_collection.sql');
const builder=read('../../release/build-cloud-13-test.mjs');

test('PWA JavaScript parses and keeps distinct admin and Dex navigation',()=>{
 assert.doesNotThrow(()=>new Function(app));
 assert.match(app,/cloud13Role==='dex'\s*&&\s*!\['dex','more','collection','wishlist'\]/);
 assert.match(app,/cloud13Role==='admin'\?\[\['stock'/);
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
 assert.match(app,/resetArticle\(\);const form=\$\('articleForm'\)/);
 assert.match(app,/showPage\('article'\)/);
 assert.match(app,/Bitte Artikel prüfen und speichern/);
});
test('Release builder isolates TEST from PROD',()=>{
 assert.match(builder,/const target=path\.resolve\('cloud\/test-13-build'\)/);
 assert.match(builder,/content=content\.replaceAll\(production,test\)\.replaceAll\(prodKey,testKey\)/);
 assert.match(builder,/trummcards-mobile-test13-session-v1/);
 assert.match(builder,/Unexpected app gate/);
});
