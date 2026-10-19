/* TrummCards Cloud 1.1: browser catalog picker. Read-only external metadata only. */
(()=>{'use strict';
 function imageUrl(root){
   if(typeof root!=='string'||!/^https:\/\/assets\.tcgdex\.net\/[A-Za-z0-9/._-]+$/.test(root))return '';
   return root+'/low.webp';
 }
 function bind(){
   const $=id=>document.getElementById(id);
   const catalog=window.TrummCatalog11,search=$('catalogSearchForm'),results=$('catalogSearchResults');
   const form=$('productForm')||$('articleForm'),status=$('catalogSearchStatus'),selected=$('catalogSelected');
   if(!catalog||!search||!form)throw Error('Katalog-Suchmodul wurde nicht geladen.');
   let revision=0,abortController=null;
   function statusText(msg){status.textContent=msg;}
   function clear(){
     revision++;
     if(abortController){abortController.abort();abortController=null;}
     results.replaceChildren();statusText('');
     selected.hidden=true;$('catalogSelectedImage').hidden=true;
     $('catalogSelectedImage').removeAttribute('src');
     $('catalogSelectedInfo').textContent='';
   }
   search.addEventListener('submit',async e=>{
     e.preventDefault();
     const id=++revision;
     if(abortController)abortController.abort();
     abortController=new AbortController();
     results.replaceChildren();statusText('Suche im Pokémon-Katalog …');
     const input=$('catalogSearchQuery').value.trim(),lang=$('catalogSearchLanguage').value;
     try{
       const cards=await catalog.searchPokemonCards({query:input,language:lang,limit:20,signal:abortController.signal});
       if(id!==revision)return;
       if(!cards.length){statusText('Keine Treffer. Bitte anderen Namen oder Sprache probieren.');return;}
       statusText(cards.length+' Treffer – Karte auswählen, um die Felder auszufüllen.');
       for(const card of cards){
         const button=document.createElement('button');button.type='button';button.className='catalog-item';
         const image=imageUrl(card.imageCandidate);
         if(image){const img=document.createElement('img');img.src=image;img.alt='';img.loading='lazy';button.append(img);}
         const label=document.createElement('span');label.textContent=card.name+' · #'+card.localId+' · '+card.id;
         button.append(label);
         button.addEventListener('click',()=>{void selectCard(card.id);});
         results.append(button);
       }
     }catch(err){if(id!==revision||err.name==='AbortError')return;statusText('Katalogsuche fehlgeschlagen: '+String(err.message||err));}
   });
   async function selectCard(id){
     const request=++revision;
     if(abortController)abortController.abort();
     abortController=new AbortController();
     statusText('Kartendetails werden geladen …');
     try{
       const detail=await catalog.getPokemonCard({id,language:$('catalogSearchLanguage').value,signal:abortController.signal});
       if(request!==revision)return;
       const set=(field,value)=>{const input=form.elements.namedItem(field);if(input)input.value=String(value||'');};
       set('name',detail.name);set('set_name',detail.setName);set('card_number',detail.localId);
       set('rarity',detail.rarity);set('catalog_card_id',detail.id);
       const languages={de:'Deutsch',en:'Englisch',ja:'Japanisch',it:'Italienisch'};
       set('language',languages[$('catalogSearchLanguage').value]);
       const img=$('catalogSelectedImage'),url=imageUrl(detail.imageCandidate);
       selected.hidden=false;
       if(url){img.src=url;img.hidden=false;}else{img.hidden=true;img.removeAttribute('src');}
       $('catalogSelectedInfo').textContent=detail.name+' | '+detail.setName+' | Nr. '+detail.localId+' | '+(detail.rarity||'Ohne Seltenheitsangabe');
       statusText('Kartendaten übernommen. Bitte prüfen, bei Bedarf korrigieren und Artikel speichern.');
       form.elements.namedItem('name')?.focus();
     }catch(err){if(request!==revision||err.name==='AbortError')return;statusText('Kartendetails konnten nicht geladen werden: '+String(err.message||err));}
   }
   return Object.freeze({clear});
 }
 window.TrummCatalogUI11=Object.freeze({bind});
})();
