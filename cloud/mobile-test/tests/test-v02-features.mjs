import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root=new URL('../../',import.meta.url);
const pwa=new URL('mobile-test/web/',root);
const win=new URL('desktop-test/src/',root);
const migration=new URL('supabase/migrations/20261015000300_product_images.sql',root);
const mJs=readFileSync(new URL('app.js',pwa),'utf8');
const mHtml=readFileSync(new URL('index.html',pwa),'utf8');
const mCss=readFileSync(new URL('styles.css',pwa),'utf8');
const wJs=readFileSync(new URL('app.js',win),'utf8');
const wHtml=readFileSync(new URL('index.html',win),'utf8');
const wCss=readFileSync(new URL('styles.css',win),'utf8');
const sql=readFileSync(migration,'utf8');
test('both app entrypoints contain image capture in new article form',()=>{
 for(const name of ['articleCamera','articleGallery','articleImagePreview'])assert.ok(mHtml.includes(name),name);
 for(const name of ['productPicture','cameraStart','cameraShot','productImagePreview'])assert.ok(wHtml.includes(name),name);
 assert.ok(mJs.includes('uploadProductPhoto(id,articleImageFile)'));
 assert.ok(wJs.includes('uploadProductPicture(id,productPhotoFile)'));
 assert.ok(mJs.includes('articleImageFile'));
 assert.ok(wJs.includes('cameraStream'));
});
test('product images are independent of purchase lots',()=>{
 for(const src of [mJs,wJs]) {
  assert.ok(src.includes('tc_product_images'),'Missing product image table');
  assert.ok(src.includes('productImages'),'Missing product image state');
  assert.ok(src.includes('/products/'),'Images must use owner/product storage path');
 }
 assert.ok(sql.includes('unique (product_id)'));
 assert.ok(sql.includes('row level security'));
 assert.ok(sql.includes('trummcards_private.is_owner()'));
 assert.ok(sql.includes('on delete cascade'));
});
test('inventory thumbnail plus full view for both platforms',()=>{
 for(const name of ['data-thumb','data-photo-open','privateImageUrl','imageViewer'])assert.ok(mJs.includes(name)||mHtml.includes(name),name);
 for(const name of ['data-inventory-thumb','data-open-product-image','desktopImageViewer','createSignedUrl'])assert.ok(wJs.includes(name)||wHtml.includes(name),name);
 assert.ok(mCss.includes('.list-image-button'));
 assert.ok(wCss.includes('.inventory-thumb'));
});
test('sale quantity control renders with an accessible minimum-width input',()=>{
 assert.ok(mHtml.includes('id="saleQty"'));
 assert.ok(mHtml.includes('id="saleQtyMinus"'));
 assert.ok(mHtml.includes('id="saleQtyPlus"'));
 assert.ok(mCss.includes('minmax(0,1fr)'));
 assert.ok(mCss.includes('.sale-date-qty'));
});
test('original supplied logo used on both platforms',()=>{
 assert.ok(mHtml.includes('src="./logo.webp"'));
 assert.ok(wHtml.includes('src="logo.webp"'));
});
test('source parses in Node without syntax errors',()=>{
 for(const url of [new URL('app.js',pwa),new URL('app.js',win)]){
  const result=spawnSync(process.execPath,['--check',url.pathname],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||url.pathname);
 }
});
