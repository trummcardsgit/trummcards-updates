import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {searchPokemonCards,getPokemonCard} from '../features/tcgdex11.mjs';

const read=p=>readFileSync(p,'utf8');
const reply=arr=>({ok:true,json:async()=>arr});
test('Pokémon name search is paged, not restricted to the first 20 matches',async()=>{
 const seen=[];
 const fetchImpl=async(url,opts)=>{
  const u=new URL(url);seen.push({url:u,opts});
  const page=Number(u.searchParams.get('pagination:page'));
  return reply(Array.from({length:20},(_,i)=>({id:'xy-'+(page*20+i),localId:String(i+1),name:'Pikachu',image:'https://assets.tcgdex.net/en/xy/xy1/'+i})));
 };
 const page1=await searchPokemonCards({query:'Pikachu',language:'en',page:1,limit:20,fetchImpl});
 const page2=await searchPokemonCards({query:'Pikachu',language:'en',page:2,limit:20,fetchImpl});
 assert.equal(page1.length,20);assert.equal(page2.length,20);
 assert.notEqual(page1[0].id,page2[0].id);
 assert.equal(seen[1].url.searchParams.get('name'),'Pikachu');
 assert.equal(seen[1].url.searchParams.get('pagination:page'),'2');
 assert.equal(seen[1].url.searchParams.get('pagination:itemsPerPage'),'20');
 assert.equal(seen[1].opts.cache,'no-store');
});
test('Reject invalid pages before accessing any external API',async()=>{
 const fetchImpl=()=>{throw Error('MUST NOT CALL');};
 for(const page of [0,-2,101,2.5,NaN,'xx']){
  await assert.rejects(()=>searchPokemonCards({query:'Pikachu',page,fetchImpl}),/Kartensuchseite/);
 }
});
test('Catalog image root is returned unchanged and no image bytes are copied',async()=>{
 const image='https://assets.tcgdex.net/de/base/base1/4';
 const d=await getPokemonCard({id:'base1-4',fetchImpl:async()=>reply({
  id:'base1-4',name:'Glurak',localId:'4',set:{name:'Basis'},image,rarity:'Rare Holo'
 })});
 assert.equal(d.imageCandidate,image);
 assert.equal(d.id,'base1-4');
 const sql=read('cloud/release/sql/cloud11_catalog_image_link_staging.sql');
 assert.ok(sql.includes('catalog_image_url'));
 assert.ok(sql.includes("assets[.]tcgdex[.]net"));
 assert.ok(!sql.includes('storage.objects'),'links are not replicated into storage');
});
test('Both Windows and PWA must save catalog picture with product and show it in lager with own photo priority',()=>{
 for(const base of ['cloud/desktop-production/src/','cloud/mobile-production/web/']){
  const app=read(base+'app.js'),html=read(base+'index.html'),picker=read(base+'catalog11-ui.js'),bundle=read(base+'catalog11.js');
  assert.ok(app.includes('catalog_image_url'),'Product read/write must include catalog image url');
  assert.ok(app.includes("catalog_image_url:getValue(")||app.includes("catalog_image_url:val("),'Product persist');
  assert.ok(html.includes('name="catalog_image_url"'),'Hidden catalog reference stored with form');
  for(const id of ['catalogSearchPrev','catalogSearchNext','catalogSearchPageLabel'])
   assert.ok(html.includes('id="'+id+'"'),'Pagination element missing: '+id);
  assert.ok(picker.includes('page:PAGE_SIZE')===false,'page number must not be hardcoded to item count');
  assert.ok(picker.includes('page,limit:PAGE_SIZE'),'Search must pass page argument to API');
  assert.ok(picker.includes("set('catalog_image_url'"),'Selected card must carry validated catalog image root');
  assert.ok(picker.includes("sourceField.value=''"),'Manual identity changes invalidate catalog image');
  assert.ok(picker.includes('selectionRevision'),'Detail loading isolated from paginated searches');
  assert.ok(bundle.includes('selectedPage'),'Browser API bundle must support later pages');
  assert.ok(app.includes('assets\\.tcgdex\\.net'),'Only whitelisted external catalog images allowed');
  assert.ok(app.includes("if(hero)return hero.storage_path"),'Own uploaded image must have precedence');
  assert.ok(app.includes('high.webp')||app.includes("'high'"),'Large card image available');
 }
});
