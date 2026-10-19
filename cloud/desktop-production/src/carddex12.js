/* TrummCards Cloud 1.2 KartenDex — independent read-only TCGdex search and set browser. */
(()=>{'use strict';
const $=id=>document.getElementById(id),PAGE=20,SET_PAGE=40;
function imageUrl(root,quality='low'){
 return typeof root==='string'&&/^https:\/\/assets\.tcgdex\.net\/[A-Za-z0-9/._-]+$/.test(root)?root+'/'+quality+'.webp':'';
}
function bind({onUseCard}={}){
 const catalog=window.TrummCatalog11;
 if(!catalog)throw Error('KartenDex benötigt den vorhandenen TCGdex-Katalog.');
 const query=$('dexQuery'),lang=$('dexLanguage'),results=$('dexResults'),searchStatus=$('dexSearchStatus');
 const prev=$('dexPrev'),next=$('dexNext'),pageLabel=$('dexPageLabel');
 const setQuery=$('dexSetQuery'),setsBox=$('dexSets'),more=$('dexMoreSets'),setStatus=$('dexSetStatus');
 const cardsBox=$('dexSetCards'),setCardsStatus=$('dexSetCardsStatus'),setPrev=$('dexSetPrev'),setNext=$('dexSetNext');
 const detail=$('dexDetail'),detailImage=$('dexDetailImage'),detailTitle=$('dexDetailTitle'),detailMeta=$('dexDetailMeta');
 let searchGeneration=0,setsGeneration=0,detailGeneration=0,setCardsGeneration=0;
 let searchAbort=null,setsAbort=null,detailAbort=null,setCardsAbort=null;
 let currentPage=0,lastCount=0,searchTerm='',searchLang='',setPage=0,sets=[],selectedSet=null,cardPage=1,selectedCard=null;
 function setPaging(){
  pageLabel.textContent=currentPage?'Seite '+currentPage:'Noch keine Suche';
  prev.disabled=currentPage<=1;next.disabled=currentPage<1||lastCount<PAGE||currentPage>=100;
 }
 function clearDetail(){selectedCard=null;detail.hidden=true;detailImage.hidden=true;detailImage.removeAttribute('src');detailMeta.replaceChildren();}
 function cardButton(card){
  const b=document.createElement('button');b.type='button';b.className='dex-card';
  const src=imageUrl(card.imageCandidate);
  if(src){const image=document.createElement('img');image.src=src;image.alt='';image.loading='lazy';b.append(image);}
  const label=document.createElement('span');label.textContent=card.name+(card.localId?' · Nr. '+card.localId:'');
  b.append(label);b.addEventListener('click',()=>{void selectCard(card.id);});return b;
 }
 async function loadCards(page,term,language){
  const current=++searchGeneration;searchAbort?.abort();searchAbort=new AbortController();
  prev.disabled=true;next.disabled=true;searchStatus.textContent='Lade Karten – Seite '+page+' …';
  try{
   const cards=await catalog.searchPokemonCards({query:term,language,page,limit:PAGE,signal:searchAbort.signal});
   if(current!==searchGeneration)return;
   if(!cards.length&&page>1){searchStatus.textContent='Keine weiteren Treffer.';setPaging();return;}
   currentPage=page;lastCount=cards.length;searchTerm=term;searchLang=language;results.replaceChildren();
   for(const c of cards)results.append(cardButton(c));
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
   const src=imageUrl(card.imageCandidate,'high');
   if(src){detailImage.src=src;detailImage.hidden=false;}
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
  cardsBox.replaceChildren();for(const card of all.slice(start,start+PAGE))cardsBox.append(cardButton(card));
  setPrev.disabled=cardPage===1;setNext.disabled=cardPage*PAGE>=all.length;
  setCardsStatus.textContent=selectedSet.name+' · '+all.length+' Karten · Seite '+cardPage+' von '+Math.max(1,Math.ceil(all.length/PAGE));
 }
 async function openSet(id){
  const current=++setCardsGeneration;setCardsAbort?.abort();setCardsAbort=new AbortController();
  clearSetCards();const request=++setCardsGeneration;
  setCardsStatus.textContent='Lade Karten des Sets …';
  try{
   const found=await catalog.getPokemonSet({id,language:lang.value,signal:setCardsAbort.signal});
   if(request!==setCardsGeneration)return;
   selectedSet=found;cardPage=1;showSetCards();
  }catch(e){if(request===setCardsGeneration&&e.name!=='AbortError')setCardsStatus.textContent='Set konnte nicht geladen werden: '+String(e.message||e);}
 }
 $('dexSearchForm').addEventListener('submit',e=>{e.preventDefault();clearDetail();void loadCards(1,query.value.trim(),lang.value);});
 prev.addEventListener('click',()=>{if(currentPage>1)void loadCards(currentPage-1,searchTerm,searchLang);});
 next.addEventListener('click',()=>{if(currentPage&&lastCount===PAGE)void loadCards(currentPage+1,searchTerm,searchLang);});
 query.addEventListener('input',()=>{searchGeneration++;searchAbort?.abort();prev.disabled=true;next.disabled=true;});
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
window.TrummCardDex12=Object.freeze({bind});
})();