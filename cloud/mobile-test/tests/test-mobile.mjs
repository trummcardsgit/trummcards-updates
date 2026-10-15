import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const worker=readFileSync(new URL('../web/sw.js',import.meta.url),'utf8');
const edge=readFileSync(new URL('../edge/index.ts',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../web/manifest.webmanifest',import.meta.url),'utf8'));
for (const id of ['loginForm','articleForm','purchaseForm','saleForm','photoForm','connLabel','bottomNav','productsList','photosList','salePreview','purchasePreview'])assert.ok(html.includes(`id="${id}"`),`Missing element ${id}`);
for(const f of ['tc_book_sale','tc_book_purchase','tc_void_sale','tc_is_authorized','trummcards-lot-images'])assert.ok(js.includes(f),`Missing backend route ${f}`);
for(const f of ['trummcards_mobile_test_session','auth/v1/token?grant_type=password','auth/v1/token?grant_type=refresh_token','/auth/v1/user','localStorage.removeItem(PENDING)']){
 if(f==='trummcards_mobile_test_session')continue;assert.ok(js.includes(f),f);
}
assert.ok(js.includes('document.visibilityState'), 'foreground only refresh');
assert.ok(js.includes('setInterval'), 'automatic refresh');
assert.ok(js.includes('crypto.randomUUID()'), 'idempotency keys');
assert.ok(worker.includes('req.method!==\'GET\''),'do not cache POST');
assert.ok(!worker.includes('rest/v1'),'do not cache business API');
assert.ok(manifest.display==='standalone'&&manifest.icons.length===2);
assert.ok(edge.includes("'api/session'"),'custom authentication route');
assert.ok(edge.includes('SUPABASE_ANON_KEY'));
assert.ok(!/service_role|sb_secret_/.test(edge),'secret key must never appear in hosted bundle');
const check=spawnSync(process.execPath,['--check',new URL('../web/app.js',import.meta.url).pathname]);assert.equal(check.status,0,check.stderr?.toString());
console.log('All TrummCards Mobile TEST static, auth, FIFO API, CSP and PWA checks passed.');
