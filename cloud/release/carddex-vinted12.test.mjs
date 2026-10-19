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
  assert.ok(js.includes("if(b.isConnected)renderImage(img,notice,card,card.catalogLanguage||lang.value,'low'"));
  assert.ok(js.includes('queueMicrotask(()=>{'));
  assert.ok(js.indexOf('queueMicrotask(()=>{')>js.indexOf('b.append(img,notice);'));
  assert.ok(js.includes("renderImage(detailImage,imageNotice,card,detailLanguage,'high'"));
  assert.ok(js.includes("detailMeta.append(renderPrice(card.pricing,card.variants))"));
  assert.ok(!js.includes('supabase.co'));
  assert.ok(!js.includes('navigator.clipboard'));
 }
});


test('KartenDex combines Pokémon name, set name and card number in TCGdex pagination',async()=>{
 for(const root of clients){
  const env={window:{},URLSearchParams};
  runInNewContext(read(root+'catalog11.js'),env,{filename:'catalog11.js'});
  const calls=[];
  const api=async url=>{
   calls.push(new URL(url));
   return {ok:true,json:async()=>[{id:'sv03.5-9',name:'Glurak',localId:'9',image:null}]};
  };
  const cards=await env.window.TrummCatalog11.searchPokemonCards({
   query:'Glurak',set:'151',cardNumber:'009',language:'de',page:2,limit:20,fetchImpl:api
  });
  assert.equal(cards.length,1);
  const params=calls[0].searchParams;
  assert.equal(params.get('name'),'Glurak');
  assert.equal(params.get('set'),'151');
  assert.equal(params.get('localId'),'eq:9');
  assert.equal(params.get('pagination:page'),'2');
  assert.equal(params.get('pagination:itemsPerPage'),'20');
  assert.equal(calls[0].pathname,'/v2/de/cards');
  calls.length=0;
  await env.window.TrummCatalog11.searchPokemonCards({cardNumber:'9',fetchImpl:api});
  assert.equal(calls[0].searchParams.get('name'),null);
  assert.equal(calls[0].searchParams.get('localId'),'eq:9');
  await assert.rejects(env.window.TrummCatalog11.searchPokemonCards({fetchImpl:api}),/Kartenname, Set oder Kartennummer/);
 }
});

test('KartenDex retries printed leading-zero number if catalog uses original identifier',async()=>{
 for(const root of clients){
  const env={window:{},URLSearchParams};
  runInNewContext(read(root+'catalog11.js'),env,{filename:'catalog11.js'});
  const requested=[];
  const api=async url=>{
   const number=new URL(url).searchParams.get('localId');
   requested.push(number);
   return {ok:true,json:async()=>number==='eq:009'?[{id:'abc-009',localId:'009',name:'Glurak'}]:[]};
  };
  const cards=await env.window.TrummCatalog11.searchPokemonCards({set:'XY',cardNumber:'009',fetchImpl:api});
  assert.equal(cards[0].localId,'009');
  assert.deepEqual(requested,['eq:9','eq:009']);
 }
});

test('KartenDex shows canonical set name then separate card number in every result',()=>{
 for(const root of clients){
  const js=read(root+'carddex12.js'),html=read(root+'index.html');
  assert.match(html,/id="dexSearchSet"/);
  assert.match(html,/id="dexSearchNumber"/);
  assert.match(js,/catalog\.getPokemonCard\(\{id:card\.id,language\}\)/);
  assert.match(js,/label\.textContent=value\.name\|\|'Set nicht verfügbar'/);
  assert.match(js,/card\.setName\|\|'Set wird geladen/);
  assert.match(js,/number\.textContent='Kartennummer: '/);
  assert.match(js,/card\.setOfficial>0/);
  assert.match(js,/setOfficial:selectedSet\.officialCount/);
  assert.match(js,/setName:selectedSet\.name/);
  assert.match(js,/searchFilters=\{\.\.\.filters\}/);
  assert.match(js,/loadCards\(currentPage\+1,searchFilters,searchLang\)/);
 }
});

test('KartenDex card details include real set total for printed number, when supplied',async()=>{
 for(const root of clients){
  const env={window:{},URLSearchParams};
  runInNewContext(read(root+'catalog11.js'),env);
  const mock=async()=>({ok:true,json:async()=>({
   id:'sv03.5-9',name:'Glurak',localId:'9',set:{id:'sv03.5',name:'151',cardCount:{official:165}}
  })});
  const result=await env.window.TrummCatalog11.getPokemonCard({id:'sv03.5-9',language:'de',fetchImpl:mock});
  assert.equal(result.setName,'151');
  assert.equal(result.setOfficial,165);
 }
});

test('KartenDex filters ghost Normal/Holo price pairs when only one print exists',()=>{
 for(const root of clients){
  const env={window:{},document:{}};
  runInNewContext(read(root+'carddex12.js'),env);
  const price=env.window.TrummCardDex12.filteredMarketQuote;
  const raw={cardmarket:{unit:'EUR',trend:174.81,'trend-holo':271.61,updated:'2026-10-19T08:00:00Z'}};
  const rainbow={normal:false,holo:true,reverse:false,firstEdition:false};
  const single=price(raw,rainbow);
  assert.equal(single.rows.length,1);
  assert.equal(single.rows[0].value,174.81);
  assert.match(single.variantLabel,/Nur eine Kartenausführung/);
  assert.match(single.priceNote,/ausgeblendet/);
  const unknown=price(raw,null);
  assert.equal(unknown.rows.length,1);
  const both=price(raw,{normal:true,holo:true,reverse:false,firstEdition:false});
  assert.equal(both.rows.length,2);
  assert.equal(both.rows[0].label,'Normal (ohne Holo)');
  assert.equal(both.rows[1].label,'Holo');
  const reverse=price(raw,{normal:true,holo:false,reverse:true,firstEdition:false});
  assert.equal(reverse.rows.length,1);
  assert.equal(price({cardmarket:{unit:'USD',trend:150}},rainbow),null);
 }
});
test('TCGdex detail returns explicit variant flags, never derives variants from pricing fields',async()=>{
 for(const root of clients){
  const env={window:{},URLSearchParams};
  runInNewContext(read(root+'catalog11.js'),env);
  const card={id:'swsh3.5-74',name:'Glurak VMAX',localId:'74',
   variants:{normal:false,holo:true,reverse:false,firstEdition:false},
   pricing:{cardmarket:{unit:'EUR',trend:174.81,'trend-holo':271.61}}};
  const fetchImpl=async()=>({ok:true,json:async()=>card});
  const detail=await env.window.TrummCatalog11.getPokemonCard({id:'swsh3.5-74',language:'de',fetchImpl});
  assert.equal(detail.variants.normal,false);
  assert.equal(detail.variants.holo,true);
  assert.equal(detail.variants.reverse,false);
  const missing=await env.window.TrummCatalog11.getPokemonCard({
   id:'swsh3.5-74',language:'de',fetchImpl:async()=>({ok:true,json:async()=>({...card,variants:undefined})})
  });
  assert.equal(missing.variants,null);
 }
});


test('Missing preview image fetches English image after search card is mounted',async()=>{
 for(const root of clients){
  function element(rootNode=false){
   const e={_root:rootNode,children:[],parentElement:null,listeners:{},
    style:{},hidden:false,value:'',textContent:'',
    append(...items){for(const item of items){item.parentElement=this;this.children.push(item);}},
    replaceChildren(...items){for(const child of this.children)child.parentElement=null;this.children=[];this.append(...items);},
    removeAttribute(name){if(name==='src')this._src='';},
    addEventListener(event,fn){this.listeners[event]=fn;},
    set src(value){this._src=value;queueMicrotask(()=>this.onload?.());},
    get src(){return this._src;},
    get isConnected(){return this._root||!!this.parentElement?.isConnected;}
   };
   return e;
  }
  const nodes=new Map();
  const get=id=>{if(!nodes.has(id))nodes.set(id,element(true));return nodes.get(id);};
  get('dexQuery').value='Glurak';
  get('dexLanguage').value='de';
  get('dexLanguage').selectedOptions=[{textContent:'Deutsch'}];
  const attempts=[];
  const catalog={
   searchPokemonCards:async()=>[{id:'base5-21',name:'Dunkles Glurak',localId:'21',setName:'Team Rocket',imageCandidate:null}],
   getPokemonCard:async({id,language})=>{attempts.push({id,language});return {
    id,language,name:'Dunkles Glurak',setName:'Team Rocket',
    imageCandidate:'https://assets.tcgdex.net/en/base/base5/21'
   };},
   listPokemonSets:async()=>[],getPokemonSet:async()=>({name:'',cards:[]})
  };
  const env={window:{TrummCatalog11:catalog},document:{getElementById:get,createElement:()=>element()},
   queueMicrotask,AbortController,Intl,Date};
  runInNewContext(read(root+'carddex12.js'),env,{filename:root+'carddex12.js'});
  env.window.TrummCardDex12.bind();
  get('dexSearchForm').listeners.submit({preventDefault(){}});
  await new Promise(resolve=>setImmediate(resolve));
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(attempts.some(v=>v.id==='base5-21'&&v.language==='en'),'No English fallback attempt on search thumbnail');
  const card=get('dexResults').children[0],picture=card.children[0],label=card.children[1];
  assert.ok(picture.isConnected);
  assert.equal(picture.src,'https://assets.tcgdex.net/en/base/base5/21/low.webp');
  assert.match(label.textContent,/Englisches Ersatzbild/);
 }
});


test('A printed number 2/132 resolves Gym Challenge Blaine\'s Charizard in English even if German catalog omits it',async()=>{
 for(const root of clients){
  const env={window:{},URLSearchParams};
  runInNewContext(read(root+'catalog11.js'),env,{filename:'catalog11.js'});
  const calls=[];
  const fetchImpl=async url=>{
   const u=new URL(url);calls.push(u);
   if(u.pathname==='/v2/en/sets')return {ok:true,json:async()=>[
    {id:'wrong-set',name:'Other set',cardCount:{official:135}},
    {id:'gym2',name:'Gym Challenge',cardCount:{official:132}}
   ]};
   if(u.pathname==='/v2/en/sets/gym2')return {ok:true,json:async()=>({
    id:'gym2',name:'Gym Challenge',cardCount:{official:132},
    cards:[{id:'gym2-2',name:"Blaine's Charizard",localId:'2',image:'https://assets.tcgdex.net/en/gym/gym2/2'},
           {id:'gym2-31',name:"Blaine's Charmeleon",localId:'31'}]
   })};
   if(u.pathname==='/v2/de/cards/gym2-2')return {ok:false,status:404,json:async()=>({})};
   if(u.pathname==='/v2/en/cards/gym2-2')return {ok:true,json:async()=>({
    id:'gym2-2',name:"Blaine's Charizard",localId:'2',set:{id:'gym2',name:'Gym Challenge',cardCount:{official:132}}
   })};
   throw Error('Unexpected URL '+url);
  };
  const results=await env.window.TrummCatalog11.searchPokemonCards({cardNumber:'2/132',language:'de',fetchImpl});
  assert.equal(results.length,1);
  assert.equal(results[0].id,'gym2-2');
  assert.equal(results[0].setName,'Gym Challenge');
  assert.equal(results[0].setOfficial,132);
  assert.equal(results[0].catalogLanguage,'en');
  assert.equal(results[0].localId,'2');
  assert.equal((await env.window.TrummCatalog11.searchPokemonCards({cardNumber:'002/132',language:'de',fetchImpl}))[0].id,'gym2-2');
  const second=await env.window.TrummCatalog11.searchPokemonCards({cardNumber:'2/132',language:'de',page:2,fetchImpl});
  assert.equal(second.length,0);
  assert.ok(calls.some(c=>c.pathname==='/v2/en/sets/gym2'));
  assert.ok(!calls.some(c=>c.pathname==='/v2/en/sets/wrong-set'));
  const detail=await env.window.TrummCatalog11.getPokemonCard({id:results[0].id,language:results[0].catalogLanguage,fetchImpl});
  assert.equal(detail.name,"Blaine's Charizard");
 }
});
test('Official set size can find a vintage match on a later page of the set catalog',async()=>{
 for(const root of clients){
  const env={window:{},URLSearchParams};
  runInNewContext(read(root+'catalog11.js'),env);
  const fetchImpl=async url=>{
   const u=new URL(url);
   if(u.pathname==='/v2/en/sets'){
    const page=Number(u.searchParams.get('pagination:page'));
    const sets=page===1?Array.from({length:100},(_,i)=>({id:'new-'+i,name:'Recent '+i,cardCount:{official:150}}))
      :[{id:'gym2',name:'Gym Challenge',cardCount:{official:132}}];
    return {ok:true,json:async()=>sets};
   }
   if(u.pathname==='/v2/en/sets/gym2')return {ok:true,json:async()=>({name:'Gym Challenge',cards:[{id:'gym2-2',localId:'2',name:"Blaine's Charizard"}]})};
   if(u.pathname==='/v2/de/cards/gym2-2')return {ok:false,status:404};
   throw Error(url);
  };
  const result=await env.window.TrummCatalog11.searchPokemonCards({cardNumber:'2/132',fetchImpl});
  assert.equal(result[0].id,'gym2-2');
 }
});


test('Selected local Kein-Bild artwork appears only when no card artwork exists, in search AND detail',async()=>{
 for(const root of clients){
  function element(rootNode=false){
   const e={_root:rootNode,children:[],parentElement:null,listeners:{},style:{},
    hidden:false,value:'',textContent:'',onload:null,onerror:null,
    append(...items){for(const item of items){item.parentElement=this;this.children.push(item);}},
    replaceChildren(...items){for(const child of this.children)child.parentElement=null;this.children=[];this.append(...items);},
    removeAttribute(name){if(name==='src')this._src='';},
    addEventListener(event,fn){this.listeners[event]=fn;},
    set src(value){this._src=value;queueMicrotask(()=>this.onload?.());},
    get src(){return this._src;},
    get isConnected(){return this._root||!!this.parentElement?.isConnected;}
   };return e;
  }
  const nodes=new Map();
  const get=id=>{if(!nodes.has(id))nodes.set(id,element(true));return nodes.get(id);};
  get('dexQuery').value='Glurak';
  get('dexLanguage').value='de';
  get('dexLanguage').selectedOptions=[{textContent:'Deutsch'}];
  const attempts=[];
  const card={id:'base5-21',name:'Dunkles Glurak',localId:'21',setName:'Team Rocket',
   imageCandidate:null,pricing:null,rarity:'Selten'};
  const catalog={
   searchPokemonCards:async()=>[card],
   getPokemonCard:async({language})=>{attempts.push(language);return {...card};},
   listPokemonSets:async()=>[],getPokemonSet:async()=>({name:'',cards:[]})
  };
  const env={window:{TrummCatalog11:catalog},document:{getElementById:get,createElement:()=>element()},
   queueMicrotask,AbortController,Intl,Date};
  runInNewContext(read(root+'carddex12.js'),env,{filename:root+'carddex12.js'});
  env.window.TrummCardDex12.bind();
  get('dexSearchForm').listeners.submit({preventDefault(){}});
  for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));
  const tile=get('dexResults').children[0],pic=tile.children[0];
  assert.match(pic.src,/^data:image\/webp;base64,UklGR/);
  assert.equal(pic.hidden,false);
  assert.equal(pic.style.visibility,'visible');
  assert.ok(attempts.includes('en'),'must try English first');
  tile.listeners.click();
  for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));
  const detail=get('dexDetailImage');
  assert.equal(detail.src,pic.src);
  assert.equal(detail.hidden,false);
  assert.equal(detail.style.visibility,'visible');
 }
});
test('Approved artwork is included in Windows package and PWA service-worker precache for offline use',()=>{
 const file='cloud/desktop-production/src/kein-bild12.webp';
 const image=readFileSync(file);
 assert.equal(image.subarray(0,4).toString(),'RIFF');
 assert.equal(image.subarray(8,12).toString(),'WEBP');
 assert.ok(image.length>4000);
 const pkg=JSON.parse(read('cloud/desktop-production/package.json'));
 assert.ok(pkg.build.files.includes('src/kein-bild12.webp'));
 const sw=read('cloud/release/prepare-cloud-12-test.mjs');
 assert.match(sw,/img\.src=NO_IMAGE_DATA_URI/);
 assert.doesNotMatch(sw,/const artworkEntry=/);
 for(const root of clients){
  const source=read(root+'carddex12.js');
  const encoded=source.match(/const NO_IMAGE_DATA_URI='data:image\/webp;base64,([^']+)'/);
  assert.ok(encoded,'Embedded fallback missing');
  assert.deepEqual(Buffer.from(encoded[1],'base64'),image);
  assert.match(source,/img\.src=NO_IMAGE_DATA_URI;/);
 }
});
