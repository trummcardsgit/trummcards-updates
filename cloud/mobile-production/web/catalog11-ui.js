/* Cloud 1.1: paged Pokémon name search + safely linked TCGdex card image. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 function catalogUrl(root,quality='low'){
   if(typeof root!=='string'||!/^https:\/\/assets\.tcgdex\.net\/[A-Za-z0-9/._-]+$/.test(root))return '';
   return root+'/'+quality+'.webp';
 }
 function bind(){
   const catalog=window.TrummCatalog11,search=$('catalogSearchForm'),results=$('catalogSearchResults');
   const form=$('productForm')||$('articleForm'),status=$('catalogSearchStatus'),selected=$('catalogSelected');
   const prev=$('catalogSearchPrev'),next=$('catalogSearchNext'),pageLabel=$('catalogSearchPageLabel');
   const sourceField=form.elements.namedItem('catalog_image_url'),cardIdField=form.elements.namedItem('catalog_card_id');
   if(!catalog||!search||!form||!prev||!next||!sourceField)throw Error('Karten-Suchmodul unvollständig.');
   const PAGE_SIZE=20;
   let searchRevision=0,selectionRevision=0,searchController=null,selectionController=null;
   let currentPage=0,activeQuery='',activeLang='',lastCount=0;
   function statusText(msg){status.textContent=msg;}
   function disablePaging(){
     prev.disabled=currentPage<2;
     next.disabled=currentPage<1||lastCount<PAGE_SIZE||currentPage>=100;
     pageLabel.textContent=currentPage?'Seite '+currentPage:'Noch keine Suche';
   }
   function hideSelection(){
     selected.hidden=true;$('catalogSelectedImage').hidden=true;
     $('catalogSelectedImage').removeAttribute('src');$('catalogSelectedInfo').textContent='';
   }
   function clear(){
     searchRevision++;selectionRevision++;searchController?.abort();selectionController?.abort();
     searchController=null;selectionController=null;
     currentPage=0;activeQuery='';activeLang='';lastCount=0;results.replaceChildren();
     hideSelection();statusText('');disablePaging();
   }
   function invalidateOnManualChange(){
     if(!cardIdField?.value&&!sourceField.value)return;
     cardIdField.value='';sourceField.value='';
     window.TrummMarketInstance11?.reset();hideSelection();
     statusText('Set, Kartennummer oder Sprache geändert – Katalogzuordnung und Bild entfernt. Eigene Fotos bleiben unverändert.');
   }
   form.addEventListener('input',e=>{
     if(['set_name','card_number','language'].includes(e.target?.name))invalidateOnManualChange();
   });
   function renderCards(cards){
     results.replaceChildren();
     for(const card of cards){
       const button=document.createElement('button');button.type='button';button.className='catalog-item';
       const image=catalogUrl(card.imageCandidate);
       if(image){const img=document.createElement('img');img.src=image;img.alt='';img.loading='lazy';button.append(img);}
       const label=document.createElement('span');label.textContent=card.name+' · #'+card.localId+' · '+card.id;
       button.append(label);button.addEventListener('click',()=>{void selectCard(card.id);});results.append(button);
     }
   }
   async function loadPage(page,query,language){
     const rev=++searchRevision;searchController?.abort();searchController=new AbortController();
     prev.disabled=true;next.disabled=true;statusText('Karten werden geladen – Seite '+page+' …');
     try{
       const cards=await catalog.searchPokemonCards({query,language,page,limit:PAGE_SIZE,signal:searchController.signal});
       if(rev!==searchRevision)return;
       if(!cards.length&&page>1){
         statusText('Keine weiteren Treffer vorhanden. Zurück zu Seite '+currentPage+'.');
         disablePaging();return;
       }
       currentPage=page;activeQuery=query;activeLang=language;lastCount=cards.length;
       renderCards(cards);disablePaging();
       statusText(cards.length?cards.length+' Treffer auf Seite '+page+'. Weitere Seiten mit den Pfeiltasten öffnen.':
         'Keine Treffer. Bitte anderen Namen oder andere Sprache versuchen.');
     }catch(err){
       if(rev!==searchRevision||err.name==='AbortError')return;
       statusText('Katalogsuche fehlgeschlagen: '+String(err.message||err));
       disablePaging();
     }
   }
   search.addEventListener('submit',e=>{
     e.preventDefault();
     void loadPage(1,$('catalogSearchQuery').value.trim(),$('catalogSearchLanguage').value);
   });
   prev.addEventListener('click',()=>{if(currentPage>1)void loadPage(currentPage-1,activeQuery,activeLang);});
   next.addEventListener('click',()=>{if(currentPage&&lastCount===PAGE_SIZE&&currentPage<100)void loadPage(currentPage+1,activeQuery,activeLang);});
   const changedSearch=()=>{
     searchRevision++;searchController?.abort();
     prev.disabled=true;next.disabled=true;
     if(currentPage)statusText('Suchtext oder Sprache geändert. Bitte „Karten suchen“ erneut ausführen.');
   };
   $('catalogSearchQuery').addEventListener('input',changedSearch);
   $('catalogSearchLanguage').addEventListener('change',changedSearch);
   async function selectCard(id){
     const rev=++selectionRevision;selectionController?.abort();selectionController=new AbortController();
     statusText('Kartendetails werden geladen …');
     try{
       const lang=$('catalogSearchLanguage').value;
       const detail=await catalog.getPokemonCard({id,language:lang,signal:selectionController.signal});
       if(rev!==selectionRevision)return;
       const set=(field,value)=>{const input=form.elements.namedItem(field);if(input)input.value=String(value||'');};
       set('name',detail.name);set('set_name',detail.setName);set('card_number',detail.localId);
       set('rarity',detail.rarity);set('catalog_card_id',detail.id);
       const languages={de:'Deutsch',en:'Englisch',ja:'Japanisch',it:'Italienisch'};
       set('language',languages[lang]);
       // Only a host-whitelisted URL is persisted; no third-party image is copied.
       const low=catalogUrl(detail.imageCandidate);
       set('catalog_image_url',low?detail.imageCandidate:'');
       window.TrummMarketInstance11?.applyCatalog(detail);
       const img=$('catalogSelectedImage');
       selected.hidden=false;
       if(low){img.src=low;img.hidden=false;}else{img.hidden=true;img.removeAttribute('src');}
       $('catalogSelectedInfo').textContent=detail.name+' | '+detail.setName+' | Nr. '+detail.localId+' | '+(detail.rarity||'Ohne Seltenheit');
       statusText(low?'Karte und Katalogbild verknüpft. Beim Speichern erscheint das Bild automatisch im Lager; eigene Fotos haben Vorrang.':
         'Kartendaten übernommen. Für diese Karte ist kein Katalogbild verfügbar.');
       form.elements.namedItem('name')?.focus();
     }catch(err){
       if(rev!==selectionRevision||err.name==='AbortError')return;
       statusText('Kartendetails konnten nicht geladen werden: '+String(err.message||err));
     }
   }
   disablePaging();
   return Object.freeze({clear,selectCard});
 }
 window.TrummCatalogUI11=Object.freeze({bind});
})();
