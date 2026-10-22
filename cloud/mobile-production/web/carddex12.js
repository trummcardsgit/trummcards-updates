/* TrummCards Cloud 1.2 KartenDex — independent read-only TCGdex search and set browser. */
(()=>{'use strict';
const $=id=>document.getElementById(id),PAGE=20,SET_PAGE=40;
// User-approved 220x330 WebP embedded locally: no second image request or CDN dependency.
const NO_IMAGE_DATA_URI='data:image/webp;base64,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';
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


/* Convert raw market fields into labels only when the TCGdex variant flags justify them. */
function filteredMarketQuote(pricing,variants){
 const quote=cardmarketValues(pricing);
 if(!quote)return null;
 const known=variants&&typeof variants==='object'&&!Array.isArray(variants)
  &&['normal','holo','reverse','firstEdition'].every(k=>typeof variants[k]==='boolean');
 const active=known?['normal','holo','reverse','firstEdition'].filter(k=>variants[k]):[];
 const both=known&&variants.normal&&variants.holo;
 const rows=[];
 if(both){
  if(quote.standard!==null)rows.push({label:'Normal (ohne Holo)',value:quote.standard});
  if(quote.holo!==null)rows.push({label:'Holo',value:quote.holo});
 }else{
  const amount=quote.standard??quote.holo;
  if(amount!==null)rows.push({
   label:'Cardmarket-Trendwert',
   value:amount
  });
 }
 const variantLabel=!known||active.length===0?'Kartenausführungen im Katalog nicht eindeutig hinterlegt.'
  :active.length===1?'Nur eine Kartenausführung laut TCGdex.'
  :'Weitere Kartenausführungen können existieren; nicht alle lassen sich anhand der Preisfelder unterscheiden.';
 const ambiguous=!both&&quote.standard!==null&&quote.holo!==null;
 const priceNote=ambiguous
  ?'TCGdex liefert mehrere Preisfelder, obwohl keine separate Normal-/Holo-Ausführung bestätigt ist. Der zusätzliche Holo-Rohwert wird ausgeblendet.'
  :!both&&quote.standard===null&&quote.holo!==null
   ?'Nur ein Holo-Preisfeld verfügbar; Zuordnung zur konkreten Karte prüfen.'
   :!both?'Ein allgemeiner Trendwert – keine gesondert belegte zweite Preisvariante.'
   :'Separate Normal- und Holo-Ausführungen sind im Katalog hinterlegt.';
 return {rows,updatedAt:quote.updatedAt,variantLabel,priceNote};
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
   // Use the exact locally shipped collector-card artwork, not a remote image.
   // Reset callbacks from earlier failed URLs to prevent stale image handlers.
   img.onload=null;
   img.onerror=()=>{
    if(active()){
     img.hidden=true;
     img.style.visibility='hidden';
     notice.textContent='Kein Kartenbild verfügbar.';
    }
   };
   img.loading='eager';
   img.alt='Kein Bild – Kein Kartenbild verfügbar';
   img.hidden=false;
   img.style.visibility='visible';
   img.src=NO_IMAGE_DATA_URI;
   notice.textContent='';
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
 function renderPrice(pricing,variants){
  const filtered=filteredMarketQuote(pricing,variants),wrap=document.createElement('div');
  wrap.className='dex-market-panel';
  const heading=document.createElement('strong');heading.textContent='Marktpreis (Cardmarket-Trend, EUR)';
  wrap.append(heading);
  if(!filtered||filtered.rows.length===0){
   const p=document.createElement('p');p.textContent='Für diese Karte ist derzeit kein verlässlicher Trendpreis verfügbar.';wrap.append(p);return wrap;
  }
  for(const rowInfo of filtered.rows){
   const row=document.createElement('div');row.className='dex-info-row';
   const label=document.createElement('span');label.textContent=rowInfo.label;
   const value=document.createElement('strong');value.textContent=new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(rowInfo.value);
   row.append(label,value);wrap.append(row);
  }
  const note=document.createElement('p');note.className='dex-status';
  const date=filtered.updatedAt?new Date(filtered.updatedAt):null;
  const stale=date&&Date.now()-date.getTime()>14*86400000;
  note.textContent='Unverbindlicher Richtwert, kein garantierter Verkaufspreis. '
   +filtered.variantLabel+' '+filtered.priceNote
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
  if(!card.id)return;
  const key=language+'/'+card.id;
  if(!setNameCache.has(key)){
   const task=limitLookup(async()=>{
    try{const detail=await catalog.getPokemonCard({id:card.id,language});return {name:detail.setName||'',official:detail.setOfficial};}catch{return {name:'',official:null};}
   });
   if(setNameCache.size>500)setNameCache.clear();
   setNameCache.set(key,task);
  }
  const value=await setNameCache.get(key);
  if(label.isConnected&&revision===searchGeneration){
   label.textContent=value.name||'Set nicht verfügbar';
   const number=label.parentElement?.querySelector('.dex-card-number');
   if(number&&card.localId&&value.official>0)number.textContent='Kartennummer: '+card.localId+'/'+value.official;
  }
 }
 function cardButton(card,revision=null){
  const b=document.createElement('button');b.type='button';b.className='dex-card';
  const img=document.createElement('img');img.alt='Pokémon-Kartenbild';img.loading='lazy';img.className='dex-card-picture';
  const notice=document.createElement('small');notice.className='dex-image-status';
  b.append(img,notice);
  // Search cards are still detached here; renderImage checks img.isConnected.
  // Start the image request only once the button has been added to the results grid.
  queueMicrotask(()=>{
   if(b.isConnected)renderImage(img,notice,card,card.catalogLanguage||lang.value,'low',()=>revision===null||revision===searchGeneration);
  });
  const name=document.createElement('strong');name.className='dex-card-name';name.textContent=card.name;
  const setLabel=document.createElement('span');setLabel.className='dex-card-set';
  setLabel.textContent=card.setName||'Set wird geladen …';
  const number=document.createElement('span');number.className='dex-card-number';
  number.textContent='Kartennummer: '+(card.localId?(card.localId+(card.setOfficial>0?'/'+card.setOfficial:'')):'Nicht verfügbar');
  b.append(name,setLabel,number);
  b.addEventListener('click',()=>{void selectCard(card.id,card.catalogLanguage||lang.value);});
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
 async function selectCard(id,detailLanguage=lang.value){
  const current=++detailGeneration;detailAbort?.abort();detailAbort=new AbortController();
  detail.hidden=false;detailTitle.textContent='Lade Kartendetails …';detailMeta.replaceChildren();
  detailImage.hidden=true;detailImage.removeAttribute('src');
  try{
   const card=await catalog.getPokemonCard({id,language:detailLanguage,signal:detailAbort.signal});
   if(current!==detailGeneration)return;
   selectedCard={id:card.id,language:detailLanguage};
   detailTitle.textContent=card.name+(card.localId?' · #'+card.localId+(card.setOfficial>0?'/'+card.setOfficial:''):'');
   const fields=[['Set',card.setName],['Kartennummer',card.localId+(card.setOfficial>0?'/'+card.setOfficial:'')],['Seltenheit',card.rarity],['Sprache',detailLanguage==='en'&&lang.value!=='en'?'Englisch (Katalog-Fallback)':lang.selectedOptions[0]?.textContent],['Katalog-ID',card.id]];
   for(const [name,value] of fields){
    const row=document.createElement('div');row.className='dex-info-row';
    const key=document.createElement('span');key.textContent=name;
    const val=document.createElement('strong');val.textContent=String(value||'Nicht angegeben');row.append(key,val);detailMeta.append(row);
   }
   const imageNotice=document.createElement('p');imageNotice.className='dex-status dex-image-status';detailMeta.append(imageNotice);
   renderImage(detailImage,imageNotice,card,detailLanguage,'high',()=>current===detailGeneration);
   detailMeta.append(renderPrice(card.pricing,card.variants));
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
  cardsBox.replaceChildren();for(const card of all.slice(start,start+PAGE))cardsBox.append(cardButton({...card,setName:selectedSet.name,setOfficial:selectedSet.officialCount}));
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
 $('dexToArticle').addEventListener('click',()=>{if(selectedCard&&typeof onUseCard==='function')onUseCard({...selectedCard,target:'stock'});});
 $('dexToCollection').addEventListener('click',()=>{if(selectedCard&&typeof onUseCard==='function')onUseCard({...selectedCard,target:'collection'});});
 $('dexToWishlist').addEventListener('click',()=>{if(selectedCard&&typeof onUseCard==='function')onUseCard({...selectedCard,target:'wishlist'});});
 setPaging();clearDetail();clearSetCards();
 return Object.freeze({clearDetail});
}
window.TrummCardDex12=Object.freeze({bind,cardmarketValues,filteredMarketQuote,noImageDataUri:NO_IMAGE_DATA_URI});
})();