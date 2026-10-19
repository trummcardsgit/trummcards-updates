/* TrummCards Cloud 1.2 KartenDex — independent read-only TCGdex search and set browser. */
(()=>{'use strict';
const $=id=>document.getElementById(id),PAGE=20,SET_PAGE=40;
function imageUrl(root,quality='low'){
 return typeof root==='string'&&/^https:\/\/assets\.tcgdex\.net\/[A-Za-z0-9/._-]+$/.test(root)?root+'/'+quality+'.webp':'';
}

function cardmarketValues(pricing){
 const data=pricing?.cardmarket;
 if(!data||data.unit!=='EUR')return null;
 const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<100000000?n:null;
 const standard=valid(data.trend),holo=valid(data['trend-holo']);
 if(standard===null&&holo===null)return null;
 const ms=Date.parse(data.updated||'');
 const updatedAt=Number.isFinite(ms)&&ms<=Date.now()+86400000?new Date(ms).toISOString():null;
 return {standard,holo,updatedAt};
}

function bind({onUseCard}={}){
 const catalog=window.TrummCatalog11;
 if(!catalog)throw Error('KartenDex benötigt den vorhandenen TCGdex-Katalog.');
 const query=$('dexQuery'),setInput=$('dexSearchSet'),numberInput=$('dexSearchNumber'),lang=$('dexLanguage'),results=$('dexResults'),searchStatus=$('dexSearchStatus');
 const prev=$('dexPrev'),next=$('dexNext'),pageLabel=$('dexPageLabel');
 const setQuery=$('dexSetQuery'),setsBox=$('dexSets'),more=$('dexMoreSets'),setStatus=$('dexSetStatus');
 const cardsBox=$('dexSetCards'),setCardsStatus=$('dexSetCardsStatus'),setPrev=$('dexSetPrev'),setNext=$('dexSetNext');
 const detail=$('dexDetail'),detailImage=$('dexDetailImage'),detailTitle=$('dexDetailTitle'),detailMeta=$('dexDetailMeta');
 let searchGeneration=0,setsGeneration=0,detailGeneration=0,setCardsGeneration=0;

 const englishCache=new Map();
 let lookups=0;
 const pending=[];
 async function limitLookup(task){
  if(lookups>=4)await new Promise(resolve=>pending.push(resolve));
  lookups++;
  try{return await task();}finally{lookups--;pending.shift()?.();}
 }
 async function englishRoot(id){
  if(!/^[A-Za-z0-9._-]{2,100}$/.test(id))return '';
  if(englishCache.has(id))return englishCache.get(id);
  const promise=limitLookup(async()=>{
   try{
    const card=await catalog.getPokemonCard({id,language:'en'});
    return card.id===id&&imageUrl(card.imageCandidate)?card.imageCandidate:'';
   }catch{return '';}
  });
  if(englishCache.size>=400)englishCache.clear();
  englishCache.set(id,promise);
  return promise;
 }
 function renderImage(img,notice,card,language,quality='low',isCurrent=()=>true){
  const active=()=>img.isConnected&&isCurrent();
  function unavailable(){
   if(!active())return;
   img.hidden=true;img.style.visibility='hidden';img.removeAttribute('src');
   notice.textContent='Kein Kartenbild verfügbar.';
  }
  function display(url,label){
   return new Promise(resolve=>{
    if(!url){resolve(false);return;}
    img.onload=()=>{
     if(active()){img.hidden=false;img.style.visibility='visible';notice.textContent=label;}
     resolve(true);
    };
    img.onerror=()=>{resolve(false);};
    // A lazy-loaded image must not stay [hidden] while waiting for its load event.
    img.hidden=false;img.style.visibility='hidden';img.src=url;
   });
  }
  void (async()=>{
   const own=imageUrl(card.imageCandidate,quality);
   if(own&&await display(own,''))return;
   if(!active())return;
   if(language==='en'){unavailable();return;}
   notice.textContent='Prüfe englisches Ersatzbild …';
   const fallback=await englishRoot(card.id);
   if(!active())return;
   if(fallback&&await display(imageUrl(fallback,quality),'Englisches Ersatzbild · Kartendaten bleiben '+language.toUpperCase()))return;
   unavailable();
  })();
 }
 function renderPrice(pricing){
  const quote=cardmarketValues(pricing),wrap=document.createElement('div');
  wrap.className='dex-market-panel';
  const heading=document.createElement('strong');heading.textContent='Marktpreis (Cardmarket-Trend, EUR)';
  wrap.append(heading);
  if(!quote){
   const p=document.createElement('p');p.textContent='Für diese Karte ist derzeit kein verlässlicher Trendpreis verfügbar.';wrap.append(p);return wrap;
  }
  for(const [label,amount] of [['Standard',quote.standard],['Holo',quote.holo]]){
   if(amount===null)continue;
   const row=document.createElement('div');row.className='dex-info-row';
   const name=document.createElement('span');name.textContent=label;
   const value=document.createElement('strong');value.textContent=new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(amount);
   row.append(name,value);wrap.append(row);
  }
  const note=document.createElement('p');note.className='dex-status';
  const date=quote.updatedAt?new Date(quote.updatedAt):null;
  const stale=date&&Date.now()-date.getTime()>14*86400000;
  note.textContent='Richtwert, nicht garantierter Verkaufspreis. Zustand und Kartenausführung beachten.'
   +(date?' Stand: '+date.toLocaleDateString('de-AT')+'.':' Preisstand nicht bekannt.')
   +(stale?' Preisquelle möglicherweise veraltet.':'');
  wrap.append(note);return wrap;
 }

 let searchAbort=null,setsAbort=null,detailAbort=null,setCardsAbort=null;
 let currentPage=0,lastCount=0,searchFilters={query:'',set:'',cardNumber:''},searchLang='',setPage=0,sets=[],selectedSet=null,cardPage=1,selectedCard=null;
 const setNameCache=new Map();
 function setPaging(){
  pageLabel.textContent=currentPage?'Seite '+currentPage:'Noch keine Suche';
  prev.disabled=currentPage<=1;next.disabled=currentPage<1||lastCount<PAGE||currentPage>=100;
 }
 function clearDetail(){detailGeneration++;detailAbort?.abort();selectedCard=null;detail.hidden=true;detailImage.hidden=true;detailImage.removeAttribute('src');detailMeta.replaceChildren();}
 async function lookUpSetName(card,language,label,revision){
  if(!card.id||!label.isConnected)return;
  const key=language+'/'+card.id;
  if(!setNameCache.has(key)){
   const task=limitLookup(async()=>{
    try{const detail=await catalog.getPokemonCard({id:card.id,language});return detail.setName||'';}catch{return '';}
   });
   if(setNameCache.size>500)setNameCache.clear();
   setNameCache.set(key,task);
  }
  const value=await setNameCache.get(key);
  if(label.isConnected&&revision===searchGeneration)label.textContent=value||'Set nicht verfügbar';
 }
 function cardButton(card,revision=null){
  const b=document.createElement('button');b.type='button';b.className='dex-card';
  const img=document.createElement('img');img.alt='Pokémon-Kartenbild';img.loading='lazy';img.className='dex-card-picture';
  const notice=document.createElement('small');notice.className='dex-image-status';
  b.append(img,notice);
  renderImage(img,notice,card,lang.value);
  const name=document.createElement('strong');name.className='dex-card-name';name.textContent=card.name;
  const setLabel=document.createElement('span');setLabel.className='dex-card-set';
  setLabel.textContent=card.setName||'Set wird geladen …';
  const number=document.createElement('span');number.className='dex-card-number';
  number.textContent='Kartennummer: '+(card.localId||'Nicht verfügbar');
  b.append(name,setLabel,number);
  b.addEventListener('click',()=>{void selectCard(card.id);});
  if(!card.setName&&revision!==null)void lookUpSetName(card,lang.value,setLabel,revision);
  return b;
 }
 async function loadCards(page,filters,language){
  const current=++searchGeneration;searchAbort?.abort();searchAbort=new AbortController();
  prev.disabled=true;next.disabled=true;searchStatus.textContent='Lade Karten – Seite '+page+' …';
  try{
   const cards=await catalog.searchPokemonCards({...filters,language,page,limit:PAGE,signal:searchAbort.signal});
   if(current!==searchGeneration)return;
   if(!cards.length&&page>1){searchStatus.textContent='Keine weiteren Treffer.';setPaging();return;}
   currentPage=page;lastCount=cards.length;searchFilters={...filters};searchLang=language;results.replaceChildren();
   for(const c of cards)results.append(cardButton(c,current));
   setPaging();searchStatus.textContent=cards.length?cards.length+' Treffer auf Seite '+page+'. Karte für Details anklicken.':'Keine Karten gefunden.';
  }catch(e){if(current===searchGeneration&&e.name!=='AbortError'){searchStatus.textContent='Suche fehlgeschlagen: '+String(e.message||e);setPaging();}}
 }
 async function selectCard(id){
  const current=++detailGeneration;detailAbort?.abort();detailAbort=new AbortController();
  detail.hidden=false;detailTitle.textContent='Lade Kartendetails …';detailMeta.replaceChildren();
  detailImage.hidden=true;detailImage.removeAttribute('src');
  try{
   const card=await catalog.getPokemonCard({id,language:lang.value,signal:detailAbort.signal});
   if(current!==detailGeneration)return;
   selectedCard={id:card.id,language:lang.value};
   detailTitle.textContent=card.name+(card.localId?' · #'+card.localId:'');
   const fields=[['Set',card.setName],['Kartennummer',card.localId],['Seltenheit',card.rarity],['Sprache',lang.selectedOptions[0]?.textContent],['Katalog-ID',card.id]];
   for(const [name,value] of fields){
    const row=document.createElement('div');row.className='dex-info-row';
    const key=document.createElement('span');key.textContent=name;
    const val=document.createElement('strong');val.textContent=String(value||'Nicht angegeben');row.append(key,val);detailMeta.append(row);
   }
   const imageNotice=document.createElement('p');imageNotice.className='dex-status dex-image-status';detailMeta.append(imageNotice);
   renderImage(detailImage,imageNotice,card,lang.value,'high',()=>current===detailGeneration);
   detailMeta.append(renderPrice(card.pricing));
   detail.scrollIntoView?.({behavior:'smooth',block:'nearest'});
  }catch(e){if(current===detailGeneration&&e.name!=='AbortError')detailTitle.textContent='Kartendetails nicht verfügbar: '+String(e.message||e);}
 }
 async function loadSets({reset=false}={}){
  if(reset){setPage=0;sets=[];setsBox.replaceChildren();clearSetCards();}
  const page=setPage+1,current=++setsGeneration;setsAbort?.abort();setsAbort=new AbortController();
  more.disabled=true;setStatus.textContent='Lade Pokémon-Sets …';
  try{
   const pageSets=await catalog.listPokemonSets({query:setQuery.value.trim(),language:lang.value,page,limit:SET_PAGE,signal:setsAbort.signal});
   if(current!==setsGeneration)return;
   setPage=page;
   sets.push(...pageSets.filter(s=>!sets.some(x=>x.id===s.id)));
   setsBox.replaceChildren();
   for(const s of sets){
    const b=document.createElement('button');b.type='button';b.className='dex-set-button';
    b.textContent=s.name+(s.count!=null?' · '+s.count+' Karten':'');b.addEventListener('click',()=>{void openSet(s.id);});setsBox.append(b);
   }
   more.hidden=pageSets.length<SET_PAGE||setPage>=100;
   setStatus.textContent=sets.length+' Sets geladen. Set auswählen, um enthaltene Karten zu sehen.';
  }catch(e){if(current===setsGeneration&&e.name!=='AbortError')setStatus.textContent='Set-Suche fehlgeschlagen: '+String(e.message||e);}
  finally{if(current===setsGeneration)more.disabled=false;}
 }
 function clearSetCards(){++setCardsGeneration;setCardsAbort?.abort();selectedSet=null;cardPage=1;cardsBox.replaceChildren();setCardsStatus.textContent='';setPrev.disabled=true;setNext.disabled=true;}
 function showSetCards(){
  if(!selectedSet)return;
  const start=(cardPage-1)*PAGE,all=selectedSet.cards;
  cardsBox.replaceChildren();for(const card of all.slice(start,start+PAGE))cardsBox.append(cardButton({...card,setName:selectedSet.name}));
  setPrev.disabled=cardPage===1;setNext.disabled=cardPage*PAGE>=all.length;
  setCardsStatus.textContent=selectedSet.name+' · '+all.length+' Karten · Seite '+cardPage+' von '+Math.max(1,Math.ceil(all.length/PAGE));
 }
 async function openSet(id){
  clearSetCards();const request=++setCardsGeneration;
  setCardsAbort=new AbortController();
  setCardsStatus.textContent='Lade Karten des Sets …';
  try{
   const found=await catalog.getPokemonSet({id,language:lang.value,signal:setCardsAbort.signal});
   if(request!==setCardsGeneration)return;
   selectedSet=found;cardPage=1;showSetCards();
  }catch(e){if(request===setCardsGeneration&&e.name!=='AbortError')setCardsStatus.textContent='Set konnte nicht geladen werden: '+String(e.message||e);}
 }
 $('dexSearchForm').addEventListener('submit',e=>{
  e.preventDefault();
  const filters={query:query.value.trim(),set:setInput.value.trim(),cardNumber:numberInput.value.trim()};
  if(!filters.query&&!filters.set&&!filters.cardNumber){
   searchStatus.textContent='Bitte mindestens einen Suchwert eingeben: Name, Set oder Kartennummer.';
   return;
  }
  clearDetail();void loadCards(1,filters,lang.value);
 });
 prev.addEventListener('click',()=>{if(currentPage>1)void loadCards(currentPage-1,searchFilters,searchLang);});
 next.addEventListener('click',()=>{if(currentPage&&lastCount===PAGE)void loadCards(currentPage+1,searchFilters,searchLang);});
 for(const field of [query,setInput,numberInput])field.addEventListener('input',()=>{
  searchGeneration++;searchAbort?.abort();prev.disabled=true;next.disabled=true;
  if(currentPage)searchStatus.textContent='Suchfilter geändert. Bitte erneut auf „Karten suchen“ klicken.';
 });
 lang.addEventListener('change',()=>{
  searchGeneration++;searchAbort?.abort();setsGeneration++;setsAbort?.abort();
  detailGeneration++;detailAbort?.abort();clearDetail();results.replaceChildren();
  currentPage=0;lastCount=0;searchStatus.textContent='Sprache geändert. Suche erneut starten.';setPaging();
  sets=[];setPage=0;setsBox.replaceChildren();more.hidden=true;clearSetCards();
 });
 $('dexSetForm').addEventListener('submit',e=>{e.preventDefault();void loadSets({reset:true});});
 more.addEventListener('click',()=>{void loadSets();});
 setPrev.addEventListener('click',()=>{if(cardPage>1){cardPage--;showSetCards();}});
 setNext.addEventListener('click',()=>{if(selectedSet&&cardPage*PAGE<selectedSet.cards.length){cardPage++;showSetCards();}});
 $('dexToArticle').addEventListener('click',()=>{if(selectedCard&&typeof onUseCard==='function')onUseCard(selectedCard);});
 setPaging();clearDetail();clearSetCards();
 return Object.freeze({clearDetail});
}
window.TrummCardDex12=Object.freeze({bind,cardmarketValues});
})();