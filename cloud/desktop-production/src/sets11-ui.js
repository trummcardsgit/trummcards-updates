/* Cloud 1.1: Pokémon set explorer. External catalog is read-only, inventory stays private. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const PAGE_SIZE=24,SET_PAGE_SIZE=40;
 function imageUrl(root){
  if(typeof root!=='string'||!/^https:\/\/assets\.tcgdex\.net\/[A-Za-z0-9/._-]+$/.test(root))return '';
  return root+'/low.webp';
 }
 function bind({selectCard}={}){
  const catalog=window.TrummCatalog11;
  if(!catalog||typeof selectCard!=='function')throw Error('Set-Katalog benötigt die Kartenauswahl.');
  const form=$('catalogSetsForm'),search=$('catalogSetQuery'),language=$('catalogSearchLanguage');
  const results=$('catalogSetResults'),more=$('catalogSetMore'),status=$('catalogSetStatus');
  const detail=$('catalogSetDetail'),title=$('catalogSetTitle');
  const cardFilter=$('catalogSetCardFilter'),cardsBox=$('catalogSetCards'),cardStatus=$('catalogSetCardStatus');
  const prev=$('catalogSetPrev'),next=$('catalogSetNext'),pageLabel=$('catalogSetPageLabel');
  let listRevision=0,detailRevision=0,listController=null,detailController=null;
  let sets=[],setPage=0,chosenSet=null,cardPage=1;
  const clearCards=()=>{
    detailRevision++;detailController?.abort();detailController=null;
    chosenSet=null;cardPage=1;cardFilter.value='';cardsBox.replaceChildren();detail.hidden=true;
    cardStatus.textContent='';title.textContent='Karten im Set';
  };
  const clear=()=>{
    listRevision++;listController?.abort();listController=null;
    sets=[];setPage=0;results.replaceChildren();more.hidden=true;more.disabled=false;
    status.textContent='Wähle eine Sprache und lade die Pokémon-Sets.';
    clearCards();
  };
  const cardButton=card=>{
    const button=document.createElement('button');button.type='button';button.className='catalog-item';
    const image=imageUrl(card.imageCandidate);
    if(image){const img=document.createElement('img');img.src=image;img.alt='';img.loading='lazy';button.append(img);}
    const name=document.createElement('span');name.textContent=(card.localId?'#'+card.localId+' · ':'')+card.name;
    button.append(name);button.addEventListener('click',()=>{void selectCard(card.id);});
    return button;
  };
  function renderCards(){
    cardsBox.replaceChildren();
    if(!chosenSet)return;
    const term=cardFilter.value.trim().toLocaleLowerCase('de');
    const all=chosenSet.cards.filter(card=>!term||[card.name,card.localId,card.id].some(v=>String(v||'').toLocaleLowerCase('de').includes(term)));
    const pageCount=Math.max(1,Math.ceil(all.length/PAGE_SIZE));
    cardPage=Math.min(cardPage,pageCount);
    const start=(cardPage-1)*PAGE_SIZE;
    for(const card of all.slice(start,start+PAGE_SIZE))cardsBox.append(cardButton(card));
    prev.disabled=cardPage===1;
    next.disabled=cardPage>=pageCount;
    pageLabel.textContent='Seite '+cardPage+' von '+pageCount;
    cardStatus.textContent=all.length+' von '+chosenSet.cards.length+' Karten im Set. Eine Karte auswählen, um ihre Daten zu übernehmen.';
    if(!all.length){const empty=document.createElement('p');empty.textContent='Keine Karten passen zum Suchtext.';cardsBox.append(empty);}
  }
  async function openSet(id){
    const current=++detailRevision;detailController?.abort();detailController=new AbortController();
    detail.hidden=false;title.textContent='Karten werden geladen …';
    cardStatus.textContent='Lade vollständiges Set …';cardsBox.replaceChildren();
    chosenSet=null;cardFilter.value='';cardPage=1;
    try{
      const set=await catalog.getPokemonSet({id,language:language.value,signal:detailController.signal});
      if(current!==detailRevision)return;
      chosenSet=set;title.textContent=set.name+' · '+set.cards.length+' Karten';
      renderCards();detail.scrollIntoView?.({behavior:'smooth',block:'nearest'});
    }catch(err){
      if(current!==detailRevision||err.name==='AbortError')return;
      title.textContent='Set konnte nicht geladen werden.';
      cardStatus.textContent=String(err.message||err)+' Du kannst weiterhin nach Kartennamen suchen.';
    }
  }
  function renderSets(){
    results.replaceChildren();
    for(const item of sets){
      const b=document.createElement('button');b.type='button';b.className='catalog-set-choice';
      b.textContent=item.name+(item.count!=null?' · '+item.count+' Karten':'');
      b.title='Karten aus '+item.name+' anzeigen';
      b.addEventListener('click',()=>{void openSet(item.id);});
      results.append(b);
    }
  }
  async function loadSets({reset=false}={}){
    if(reset){sets=[];setPage=0;results.replaceChildren();clearCards();}
    const page=setPage+1;
    const current=++listRevision;listController?.abort();listController=new AbortController();
    more.disabled=true;status.textContent='Pokémon-Sets werden geladen …';
    try{
      const fetched=await catalog.listPokemonSets({
        language:language.value,query:search.value.trim(),page,limit:SET_PAGE_SIZE,signal:listController.signal
      });
      if(current!==listRevision)return;
      sets.push(...fetched.filter(x=>!sets.some(old=>old.id===x.id)));
      setPage=page;renderSets();
      status.textContent=sets.length?sets.length+' Sets geladen. Set auswählen oder nach weiteren Sets suchen.':
        'Keine Sets gefunden. Bitte anderen Namen oder Sprache versuchen.';
      more.hidden=fetched.length<SET_PAGE_SIZE||page>=100;
    }catch(err){
      if(current!==listRevision||err.name==='AbortError')return;
      status.textContent='Set-Suche fehlgeschlagen: '+String(err.message||err)+'. Du kannst Karten weiterhin über den Namen finden.';
      more.hidden=true;
    }finally{if(current===listRevision)more.disabled=false;}
  }
  search.addEventListener('input',()=>{
    if(sets.length){more.hidden=true;status.textContent='Set-Suchtext geändert. Bitte erneut auf „Sets anzeigen“ klicken.';}
  });
  form.addEventListener('submit',e=>{e.preventDefault();void loadSets({reset:true});});
  more.addEventListener('click',()=>{void loadSets();});
  cardFilter.addEventListener('input',()=>{cardPage=1;renderCards();});
  prev.addEventListener('click',()=>{cardPage=Math.max(1,cardPage-1);renderCards();});
  next.addEventListener('click',()=>{cardPage++;renderCards();});
  language.addEventListener('change',clear);
  clear();
  return Object.freeze({clear});
 }
 window.TrummSetUI11=Object.freeze({bind});
})();
