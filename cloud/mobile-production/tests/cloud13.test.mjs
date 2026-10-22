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
 assert.match(app,/cloud13Role==='dex'\s*&&\s*!\['carddex','more','collection','wishlist','game'\]/);
 assert.match(app,/if\(target==='stock'&&cloud13Role!=='admin'\)/);
 assert.match(app,/if\(cloud13Role!=='admin'\)/);
});
test('Dex-specific navigation places KartenDex, Sammlung, Wunschliste, then Mehr; admin stays unchanged',()=>{
 assert.match(app,/function cloud13OrderNavigation\(isDex\)/);
 assert.match(app,/\['carddex','collection','wishlist','game','more'\]/);
 assert.match(app,/\['home','purchase','sale','sales','carddex','photos','game','more','collection','wishlist'\]/);
 assert.match(app,/const buttons=Array\.from\(nav\.children\)/);
 assert.match(app,/nav\.appendChild\(button\)/);
 assert.match(app,/cloud13OrderNavigation\(isDex\)/);
 assert.match(app,/document\.createTextNode\(label\)/);
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


test('Manual forms are removed and both personal dashboards use live prices',()=>{
 assert.doesNotThrow(()=>new Function(app));
 assert.doesNotMatch(app,/cloud13CollectionForm|cloud13WishlistForm|async function cloud13LoadItem/);
 assert.match(app,/id="cloud13Total-collection"/);
 assert.match(app,/id="cloud13Total-wishlist"/);
 assert.match(app,/id="cloud13Count-collection"/);
 assert.match(app,/id="cloud13Count-wishlist"/);
 assert.match(app,/Marktpreise aktualisieren/);
 assert.match(app,/Karten im KartenDex auswählen/);
 assert.match(app,/data-cloud13-refresh/);
 assert.match(app,/const imageRoot=await cloud13CatalogImage\(card,language\)/);
 assert.match(app,/card_number:values\.card_number,language:values\.language/);
 assert.match(app,/catalog_image_url:values\.catalog_image_url/);
 assert.match(app,/prompt\('Wie viele Exemplare/);
 assert.match(app,/cloud13PaintImage\(photo,item\)/);
 assert.match(app,/zoomRoot\+'\/high\.webp'/);
 assert.match(app,/cloud13ItemQuote/);
 assert.match(app,/TrummPersonalMarket13\.summarize/);
 assert.match(app,/data-cloud13-variant/);
 assert.match(app,/method:'PATCH'/);
 assert.match(app,/cloud13QuoteTTL=10\*60\*1000/);
 assert.match(css,/\.cloud13-dashboard/);
 assert.match(css,/\.cloud13-quote/);
 assert.match(html,/personal-market13\.js\?v=0\.9\.0/);
});
test('Cardmarket valuation ignores unknown, ambiguous, undated and stale card prices',()=>{
 const window={TrummCardDex12:{
  filteredMarketQuote(pricing){
   if(!pricing)return null;
   return {rows:pricing.rows,updatedAt:pricing.updatedAt};
  }
 }};
 const market=new Function('window',read('../web/personal-market13.js')+'return window.TrummPersonalMarket13;')(window);
 const now=Date.parse('2026-10-22T08:00:00Z'),recent=new Date(now-24*3600000).toISOString();
 const detail={pricing:{updatedAt:recent,rows:[{label:'Normal (ohne Holo)',value:10},{label:'Holo',value:20}]}};
 const normal={card_variant:'Normal'},holo={card_variant:'Holo'},unset={card_variant:''};
 assert.equal(market.select(normal,detail,now).value,10);
 assert.equal(market.select(holo,detail,now).value,20);
 assert.equal(market.select(unset,detail,now).value,null,'Unknown variant must not be guessed');
 assert.equal(market.select(holo,{pricing:{...detail.pricing,updatedAt:new Date(now-31*86400000).toISOString()}},now).value,null);
 assert.equal(market.select(holo,{pricing:{...detail.pricing,updatedAt:null}},now).value,null);
 assert.equal(market.select(holo,null,now).value,null);
 const oneQuote={pricing:{updatedAt:recent,rows:[{label:'Normal (ohne Holo)',value:10}]}};
 assert.equal(market.select(unset,oneQuote,now).value,null);
 assert.equal(market.select(holo,oneQuote,now).value,null);
 assert.equal(market.select(normal,oneQuote,now).value,10);
 const items=[{list_type:'collection',quantity:2,card_variant:'Holo'},
  {list_type:'wishlist',quantity:3,card_variant:'Normal'},
  {list_type:'wishlist',quantity:1,card_variant:''}];
 const sums=market.summarize(items,item=>market.select(item,detail,now));
 assert.equal(sums.collection.value,40);
 assert.equal(sums.wishlist.value,30);
 assert.equal(sums.wishlist.priced,3);
 assert.equal(sums.wishlist.missing,1);
});
test('KartenDex directly saves fully identified card into both lists with chosen quantity',async()=>{
 const begin=app.indexOf('async function cloud13UseCard('),end=app.indexOf('function cloud13ApplyRole()',begin);
 assert.ok(begin>0&&end>begin,'Importer available');
 const impl=app.slice(begin,end);
 const saves=[],pages=[];
 const deps={
  window:{TrummCatalog11:{getPokemonCard:async()=>({
   id:'base1-4',name:'Glurak',setName:'Basis-Set',localId:'4',rarity:'Rare',
   imageCandidate:'https://assets.tcgdex.net/de/base/base1/4'
  })}},
  cloud13Role:'dex',cloud13Lang:{de:'Deutsch'},
  cloud13CatalogImage:async()=> 'https://assets.tcgdex.net/en/base/base1/4',
  cloud13Image:()=>'',resetArticle(){throw Error('not admin');},$(){throw Error('no manual forms expected');},
  f(){throw Error('no manual forms expected');},showPage:v=>pages.push(v),
  authorizedRequest:async(_url,req)=>{saves.push(JSON.parse(req.body));},
  API_HEADERS:{'Content-Type':'application/json'},
  cloud13Refresh:async()=>{},notice:()=>{},prompt:()=> '2'
 };
 const importer=new Function('d','let cloud13ImportBusy=false;const {window,cloud13Role,cloud13Lang,cloud13CatalogImage,cloud13Image,resetArticle,$,f,showPage,authorizedRequest,API_HEADERS,cloud13Refresh,notice,prompt}=d;'+impl+'return cloud13UseCard;')(deps);
 await importer({id:'base1-4',language:'de',target:'collection'});
 await importer({id:'base1-4',language:'de',target:'wishlist'});
 assert.deepEqual(pages,['collection','wishlist']);
 assert.equal(saves.length,2);
 assert.deepEqual(saves.map(x=>x.list_type),['collection','wishlist']);
 for(const saved of saves){
  assert.equal(saved.quantity,2);
  assert.equal(saved.name,'Glurak');
  assert.equal(saved.set_name,'Basis-Set');
  assert.equal(saved.card_number,'4');
  assert.equal(saved.catalog_card_id,'base1-4');
  assert.equal(saved.catalog_image_url,'https://assets.tcgdex.net/en/base/base1/4');
 }
});

test('Full-size preview and missing-image artwork remain available',()=>{
 assert.match(app,/cloud13PaintImage\(photo,item\)/);
 assert.match(app,/\$\('imageViewer'\)\.showModal\(\)/);
 assert.match(app,/cloud13EmptyImage\(\)/);
 assert.match(app,/viewerImage/);
 assert.match(css,/\.cloud13-image-button/);
 assert.match(dex,/noImageDataUri:NO_IMAGE_DATA_URI/);
 assert.equal((app.match(/class="cloud13-import-preview"/g)||[]).length,0);
});

test('Invited users can set their first password through safe TEST callback route',()=>{
 const resetPage=read('../web/reset-password.html'),reset=read('../web/reset-password.js');
 assert.doesNotThrow(()=>new Function(reset));
 assert.match(app,/\['recovery','invite'\]\.includes\(fragment\.get\('type'\)\)/);
 assert.match(reset,/!\\?\['recovery','invite'\]\.includes\(type\)/);
 assert.match(reset,/token_hash:params\.get\('token_hash'\),type/);
 assert.match(reset,/type==='invite'/);
 assert.match(reset,/password:pw/);
 assert.match(resetPage,/id="updateTitle"/);
 assert.match(resetPage,/id="updateIntro"/);
 assert.match(reset,/redirect_to=/);
});


test('Memory game uses a dedicated route for both roles and keeps stock data untouched',()=>{
 const memory=read('../web/memory13.js');
 assert.doesNotThrow(()=>new Function(memory));
 assert.match(html,/memory13\.js\?v=0\.9\.0/);
 assert.match(app,/id="page-game"/);
 assert.match(app,/memoryUI13=window\.TrummMemory13\?\.bind/);
 assert.match(app,/memoryUI13\?\.onPageChange\(name==='game'\)/);
 assert.match(app,/cloud13OrderNavigation\(isDex\)/);
 for(const id of ['memoryBoard','memoryDifficulty','memoryNew','memoryTime','memoryMoves','memoryPairs','memoryBest','memoryStatus'])
  assert.match(app,new RegExp('id="'+id+'"'));
 assert.match(css,/\.tc-memory-board/);
 assert.match(css,/\.tc-memory-card\.is-open/);
 assert.match(css,/\.tc-memory-dex-nav/);
 assert.doesNotMatch(memory,/tc_products|tc_personal_cards|tc_purchase|tc_sales|authorizedRequest|\brpc\s*\(|fetch\s*\('/);
 assert.match(memory,/getPokemonCard/);
 assert.match(memory,/localStorage\.setItem/);
 assert.match(memory,/getUserId/);
});
test('Memory engine creates unique pairs and enforces two-card turn rules',()=>{
 const context={};
 new Function('window',read('../web/memory13.js'))(context);
 const m=context.TrummMemory13;
 for(const [difficulty,pairs] of Object.entries({leicht:6,mittel:8,schwer:12})){
  const state=m.createState(difficulty,()=>0.31);
  assert.equal(state.cards.length,pairs*2);
  assert.equal(new Set(state.cards.map(c=>c.key)).size,pairs);
  assert.ok([...new Set(state.cards.map(c=>c.key))].every(key=>state.cards.filter(c=>c.key===key).length===2));
  assert.equal(state.moves,0);
  assert.equal(state.completed,false);
  const first=0,second=state.cards.findIndex((c,i)=>i!==first&&c.key!==state.cards[first].key);
  assert.equal(m.choose(state,first),'first');
  assert.equal(m.choose(state,first),'ignored');
  assert.equal(m.choose(state,second),'mismatch');
  assert.equal(state.moves,1);
  assert.equal(m.choose(state,2),'ignored','Locked board must ignore taps');
  assert.equal(m.hideMismatch(state),true);
  assert.equal(state.cards[first].shown,false);
  assert.equal(state.cards[second].shown,false);
  while(!state.completed){
   const remaining=state.cards.filter(x=>!x.matched);
   const key=remaining[0].key;
   const positions=state.cards.flatMap((c,i)=>c.key===key&&!c.matched?[i]:[]);
   assert.equal(positions.length,2);
   assert.equal(m.choose(state,positions[0]),'first');
   const result=m.choose(state,positions[1]);
   assert.ok(result==='matched'||result==='won');
  }
  assert.equal(state.matched,pairs);
  assert.equal(state.cards.every(x=>x.matched),true);
  assert.equal(m.choose(state,0),'ignored');
 }
});

test('Release builder isolates TEST from PROD',()=>{
 assert.match(builder,/const target=path\.resolve\('cloud\/test-13-build'\)/);
 assert.match(builder,/content=content\.replaceAll\(production,test\)\.replaceAll\(prodKey,testKey\)/);
 assert.match(builder,/trummcards-mobile-test13-session-v1/);
 assert.match(builder,/Unexpected app gate/);
});
