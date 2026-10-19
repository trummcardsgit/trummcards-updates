import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(p,'utf8');
const clients=['cloud/desktop-production/src/','cloud/mobile-production/web/'];
function vintedAt(root){
 const env={window:{},document:{}};
 runInNewContext(read(root+'vinted12.js'),env,{filename:'vinted12.js'});
 return env.window.TrummVinted12;
}
test('Vinted title includes Pokémon name and card number; description has set and language',()=>{
 for(const root of clients){
  const ui=vintedAt(root);
  const ad=ui.listing({name:'Pikachu',card_number:'025/165',set_name:'151',language:'Deutsch',card_condition:'Near Mint'});
  assert.match(ad.title,/Pikachu/);assert.match(ad.title,/025\/165/);
  assert.match(ad.description,/Set: 151/);assert.match(ad.description,/Sprache: Deutsch/);
  assert.match(ad.description,/Near Mint/);
  assert.doesNotMatch(ad.description,/undefined|null/i);
 }
});
test('Vinted no fabricated card number, set, language or automated publication',()=>{
 for(const root of clients){
  const ui=vintedAt(root);
  const ad=ui.listing({name:'Glurak'});
  assert.doesNotMatch(ad.title,/#undefined|#null/i);
  assert.match(ad.description,/Set: Nicht angegeben/);
  assert.match(ad.description,/Sprache: Nicht angegeben/);
  assert.throws(()=>ui.listing({}),/Lagerartikel/);
  assert.doesNotMatch(read(root+'vinted12.js'),/vinted\.at\/api|api\.vinted|fetch\(.+vinted/i);
 }
});
test('KartenDex is independent read-only catalog with card and set pagination',()=>{
 for(const root of clients){
  const mod=read(root+'carddex12.js'),html=read(root+'index.html'),app=read(root+'app.js');
  for(const term of ['catalog.searchPokemonCards','catalog.listPokemonSets','catalog.getPokemonSet','catalog.getPokemonCard','catalog.getPokemonCard','PAGE=20','dexToArticle'])assert.ok(mod.includes(term),term);
  assert.ok(!mod.includes('supabase.co')&&!mod.includes("sb.from(")&&!mod.includes("authorizedRequest("));
  for(const id of ['dexSearchForm','dexResults','dexPrev','dexNext','dexSets','dexMoreSets','dexDetail','dexToArticle','vintedDialog','vintedTitle','vintedDescription','vintedCopyTitle','vintedCopyDescription','vintedPrice','vintedCopyPrice'])assert.ok(html.includes('id="'+id+'"'),root+id);
  assert.ok(html.includes('carddex12.js')&&html.includes('vinted12.js'));
  assert.ok(app.includes('TrummCardDex12?.bind')&&app.includes('TrummVinted12?.bind'));
  assert.ok(app.includes('data-vinted'));
 }
});
test('Desktop and PWA must expose dedicated KartenDex navigation entry',()=>{
 assert.match(read(clients[0]+'index.html'),/data-tab="carddex"/);
 assert.match(read(clients[1]+'index.html'),/data-go="carddex"/);
 assert.match(read(clients[1]+'app.js'),/carddex:'KartenDex'/);
 const pkg=JSON.parse(read('cloud/desktop-production/package.json'));
 for(const name of ['src/carddex12.js','src/vinted12.js'])assert.ok(pkg.build.files.includes(name));
});

test('KartenDex EUR quote recognizes valid standard and Holo trend prices without invented prices',()=>{
 for(const root of clients){
  const env={window:{},document:{}};
  runInNewContext(read(root+'carddex12.js'),env);
  const quote=env.window.TrummCardDex12.cardmarketValues;
  const valid=quote({cardmarket:{unit:'EUR',trend:12.75,'trend-holo':18.55,updated:'2026-10-19T08:00:00Z'}});
  assert.equal(valid.standard,12.75);
  assert.equal(valid.holo,18.55);
  assert.match(valid.updatedAt,/2026-10-19/);
  assert.equal(quote({cardmarket:{unit:'USD',trend:100}}),null);
  assert.equal(quote({cardmarket:{unit:'EUR',trend:0,'trend-holo':null}}),null);
  assert.equal(quote({cardmarket:{unit:'EUR',trend:-10,'trend-holo':22}}).standard,null);
  assert.equal(quote({cardmarket:{unit:'EUR',trend:-10,'trend-holo':22}}).holo,22);
 }
});
test('KartenDex picture fallback uses same ID in English, keeps localized card data',()=>{
 for(const root of clients){
  const js=read(root+'carddex12.js');
  assert.ok(js.includes("catalog.getPokemonCard({id,language:'en'})"));
  assert.ok(js.includes("card.id===id"));
  assert.ok(js.includes("Englisches Ersatzbild"));
  assert.ok(js.includes('renderImage(img,notice,card,lang.value)'));
  assert.ok(js.includes("renderImage(detailImage,imageNotice,card,lang.value,'high'"));
  assert.ok(js.includes("detailMeta.append(renderPrice(card.pricing))"));
  assert.ok(!js.includes('supabase.co'));
  assert.ok(!js.includes('navigator.clipboard'));
 }
});
