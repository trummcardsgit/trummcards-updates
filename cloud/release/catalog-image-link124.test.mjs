import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const dirs=['cloud/mobile-production/web/','cloud/desktop-production/src/'];
const linked={
 id:'glumanda',name:'Glumanda 168/165',card_number:'168',
 set_name:'ポケモンカード151',language:'Japanisch',
 catalog_card_id:'SV2a-168',catalog_image_url:'https://assets.tcgdex.net/ja/SV/SV2a/168'
};
const nidoking={
 id:'nidoking',name:'Nidoking 174/165',card_number:'174',
 set_name:'ポケモンカード151',language:'Japanisch',
 catalog_card_id:'',catalog_image_url:''
};
for(const dir of dirs){
 const source=fs.readFileSync(dir+'catalog11.js','utf8');
 const context={window:{},fetch:()=>{throw Error('Must not make network requests')},URL};
 vm.runInNewContext(source,context);
 const infer=context.window.TrummCatalog11.inferCatalogImageRoot;
 test(dir+': Nidoking resolves to Japanese Pokémon 151 artwork from Glumanda',()=>{
  assert.equal(infer(nidoking,[nidoking,linked]),'https://assets.tcgdex.net/ja/SV/SV2a/174');
  assert.equal(infer(linked,[linked,nidoking]),'');
 });
 test(dir+': avoid guessing when set, language, or source is unverified',()=>{
  assert.equal(infer({...nidoking,set_name:'Other'},[linked]),'');
  assert.equal(infer({...nidoking,language:'Deutsch'},[linked]),'');
  assert.equal(infer({...nidoking,card_number:'abc'},[linked]),'');
  assert.equal(infer({...nidoking,card_number:'174/165'},[linked]),'');
  assert.equal(infer({...nidoking,catalog_card_id:'not-known'},[linked]),'');
  assert.equal(infer(nidoking,[{...linked,catalog_card_id:'bad-168'}]),'');
  assert.equal(infer(nidoking,[{...linked,catalog_image_url:'https://malicious.invalid/ja/SV/SV2a/168'}]),'');
  assert.equal(infer(nidoking,[{...linked,card_number:'167'}]),'');
  const conflict={...linked,id:'other',catalog_card_id:'OTHER-168',catalog_image_url:'https://assets.tcgdex.net/ja/SV/OTHER/168'};
  assert.equal(infer(nidoking,[linked,conflict]),'');
 });
 test(dir+': preserve card linkage after changing only display name',()=>{
  const ui=fs.readFileSync(dir+'catalog11-ui.js','utf8');
  assert.match(ui,/\['set_name','card_number','language'\]\.includes\(e\.target\?\.name\)/);
  assert.doesNotMatch(ui,/\['name','set_name','card_number','language'\]\.includes/);
 });
 test(dir+': inventory resolves missing card art and retains owner-photo priority',()=>{
  const app=fs.readFileSync(dir+'app.js','utf8');
  assert.match(app,/window\.TrummCatalog11\?\.inferCatalogImageRoot/);
  assert.ok((app.match(/inferCatalogImageRoot/g)||[]).length>=2);
  assert.match(app,/const hero=state\.productImages\.find\(/);
  assert.match(app,/return ownPhoto/);
  assert.match(app,/inventoryCatalogCandidates/);
 });
}
