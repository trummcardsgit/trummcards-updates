import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const roots=['cloud/desktop-production/src/','cloud/mobile-production/web/'];
const read=p=>fs.readFileSync(p,'utf8');
function helper(base){
 const win={};vm.runInNewContext(read(base+'image-link12.js'),{window:win,setTimeout,clearTimeout},{filename:base+'image-link12.js'});
 return win.TrummImageLink12;
}
test('Both clients package exactly the same image resolver and load it before catalog picker',()=>{
 assert.equal(read(roots[0]+'image-link12.js'),read(roots[1]+'image-link12.js'));
 for(const base of roots){
  const html=read(base+'index.html');
  const pos=html.indexOf('image-link12.js'),picker=html.indexOf('catalog11-ui.js');
  assert.ok(pos>=0&&picker>pos);
  const app=read(base+'app.js'),ui=read(base+'catalog11-ui.js');
  assert.match(ui,/await window\.TrummImageLink12\?\.resolve/);
  assert.match(app,/findInventoryCatalogImage/);
  assert.match(app,/recoverableProductImage\(p\)/);
  assert.match(app,/img\.onload=/);
  assert.match(app,/img\.onerror=/);
  assert.match(ui,/sourceField\.value=''/);
  assert.ok(!ui.includes("['name','set_name','card_number','language']"),
   'Editing the display title should not erase the verified catalog card link');
 }
 const pkg=JSON.parse(read('cloud/desktop-production/package.json'));
 assert.ok(pkg.build.files.includes('src/image-link12.js'));
});
test('Recover older Japanese 151 Charmander collector number 168 without guessing other sets',()=>{
 for(const base of roots){
  const m=helper(base);
  assert.equal(m.recoverableId({name:'Glumanda 168/165',set_name:'ポケモンカード151',language:'Japanisch',card_number:'168'}),'sv2a-168');
  assert.equal(m.recoverableId({catalog_card_id:'sv2a-168',set_name:'Andere',language:'Japanisch'}),'sv2a-168');
  assert.equal(m.recoverableId({name:'Glumanda',set_name:'Pokémon 151',language:'Deutsch',card_number:'168'}),'');
  assert.equal(m.recoverableId({name:'Glurak',set_name:'Team Rocket',language:'Japanisch',card_number:'168'}),'');
  assert.equal(m.recoverableId({name:'Glumanda',set_name:'ポケモンカード151',language:'Japanisch',card_number:'?'}),'');
 }
});
test('Validate actual image loading; fallback to same card ID in English and retain original identity',async()=>{
 for(const base of roots){
  const m=helper(base);
  const lang=[],links=[];
  const catalog={getPokemonCard:async({id,language})=>{
   lang.push(language);
   if(language==='ja')return {id,imageCandidate:'https://assets.tcgdex.net/ja/sv/sv2a/168'};
   if(language==='en')return {id,imageCandidate:'https://assets.tcgdex.net/en/sv/sv2a/168'};
   return {id,imageCandidate:null};
  }};
  const linked=await m.resolve({catalog,id:'sv2a-168',language:'ja',
   probe:async url=>{links.push(url);return url==='https://assets.tcgdex.net/en/sv/sv2a/168/low.webp';}});
  assert.equal(linked?.id,'sv2a-168');assert.equal(linked?.language,'en');
  assert.equal(linked?.root,'https://assets.tcgdex.net/en/sv/sv2a/168');
  assert.deepEqual(lang.slice(0,2),['ja','en']);
  assert.equal(links.length,2);
 }
});
test('Never link an unrelated card, external host, or unverified image',async()=>{
 for(const base of roots){
  const m=helper(base);
  const catalog={getPokemonCard:async({id})=>({id:id+'-other',imageCandidate:'https://assets.tcgdex.net/en/sv/invalid/168'})};
  const linked=await m.resolve({catalog,id:'sv2a-168',language:'ja',imageCandidate:'https://other-site.example/168',probe:async()=>true});
  assert.equal(linked,null);
  assert.equal(m.imageUrl('https://evil.example/card'),'');
  assert.equal(m.imageUrl('javascript:alert(1)'),'');
 }
});
