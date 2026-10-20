import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

for(const file of ['cloud/desktop-production/src/app.js','cloud/mobile-production/web/app.js']){
 const script=readFileSync(file,'utf8');
 const path=file.includes('/desktop-')?'desktop':'mobile';
 test(path+': catalog language mirrors preserve exact set/card ID',()=>{
  const m=script.match(/function inventoryCatalogCandidates\(productId,quality='low'\)\{[\s\S]*?\n(?:  )?\}/);
  assert.ok(m,'missing catalog candidate function');
  const stub=path==='desktop'?'const selectedProduct=()=>({catalog_image_url:"https://assets.tcgdex.net/ja/SV/SV2a/168"});':'const productById=()=>({catalog_image_url:"https://assets.tcgdex.net/ja/SV/SV2a/168"});';
  const context={};
  runInNewContext(stub+'\n'+m[0]+'\nthis.lookup=inventoryCatalogCandidates;',context);
  const got=context.lookup('x');
  assert.equal(got[0],'https://assets.tcgdex.net/ja/SV/SV2a/168/low.webp');
  assert.ok(got.includes('https://assets.tcgdex.net/en/SV/SV2a/168/low.webp'));
  assert.ok(!got.some(x=>x.includes('/169/')));
  assert.ok(got.length<=6);
 });
 test(path+': thumbnail waits for load and retries on image error',async()=>{
  const m=script.match(/function loadPictureWithFallback\(img,urls\)\{[\s\S]*?\n(?:  )?\}/);
  assert.ok(m,'missing image loader');
  const ctx={};
  runInNewContext(m[0]+'\nthis.load=loadPictureWithFallback;',ctx);
  const seen=[];
  const placeholder={hidden:false};
  const img={isConnected:true,hidden:true,nextElementSibling:placeholder,
   set src(value){seen.push(value);queueMicrotask(()=>{if(value==='broken')this.onerror();else this.onload();});}
  };
  const ok=await ctx.load(img,['broken','working']);
  assert.equal(ok,true);assert.equal(img.hidden,false);assert.equal(placeholder.hidden,true);
  assert.deepEqual(seen,['broken','working']);
 });
 test(path+': inventory and enlarged-view both use fallback',()=>{
  assert.match(script,/loadPictureWithFallback\(img,\[first,\.\.\.(?:fallbacks|inventoryCatalogCandidates\(id\))\]\)/);
  assert.match(script,/loadPictureWithFallback\([^\n]*\[first,\.\.\.inventoryCatalogCandidates\(id,'high'\)\]\)/);
 });
}
