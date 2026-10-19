/* TrummCards Cloud 1.2 — Vinted listing helper; NO Vinted API or automatic posting. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const text=value=>String(value??'').trim().replace(/\s+/g,' ');
function listing(product){
  if(!product||!text(product.name))throw Error('Bitte zuerst einen Lagerartikel auswählen.');
  const name=text(product.name),number=text(product.card_number);
  const title=('Pokémon '+name+(number?' #'+number:'')+' – Sammelkarte').slice(0,100);
  const lines=[
    'Pokémon-Sammelkarte: '+name,
    ...(number?['Kartennummer: '+number]:[]),
    'Set: '+(text(product.set_name)||'Nicht angegeben'),
    'Sprache: '+(text(product.language)||'Nicht angegeben'),
    ...(text(product.card_condition)?['Zustand: '+text(product.card_condition)]:[]),
    ...(text(product.card_variant)?['Variante: '+text(product.card_variant)]:[]),
    '',
    'Bei Fragen gerne melden. Sicherer Versand nach Absprache.'
  ];
  return {title,description:lines.join('\n')};
}
function bind({getProducts,getOwnImage}={}){
 if(typeof getProducts!=='function')throw Error('Vinted: Artikelquelle fehlt.');
 const dialog=$('vintedDialog'),picker=$('vintedProduct'),title=$('vintedTitle'),description=$('vintedDescription'),status=$('vintedStatus'),preview=$('vintedOwnImage');
 let generation=0;
 function products(){return getProducts().filter(p=>p&&p.id);}
 async function select(id){
  const product=products().find(x=>x.id===id);
  if(!product){status.textContent='Bitte einen Artikel auswählen.';return;}
  const ad=listing(product);title.value=ad.title;description.value=ad.description;
  status.textContent='Titel und Beschreibung sind bearbeitbar. Inserat bitte manuell auf Vinted veröffentlichen.';
  preview.hidden=true;preview.removeAttribute('src');
  const current=++generation;
  if(getOwnImage){
   try{
    const src=await getOwnImage(product);
    if(generation!==current||!dialog.open)return;
    if(src){preview.src=src;preview.hidden=false;}
    else status.textContent+=' Für das Inserat eigene Fotos der echten Karte aufnehmen.';
   }catch{if(generation===current)status.textContent+=' Eigenes Foto kann gerade nicht geladen werden.';}
  }
 }
 function updatePicker(id){
  const old=id||picker.value;
  picker.replaceChildren();
  const empty=document.createElement('option');empty.value='';empty.textContent='Artikel auswählen';picker.append(empty);
  for(const p of products()){
   const o=document.createElement('option');o.value=p.id;o.textContent=p.name+(p.card_number?' #'+p.card_number:'');picker.append(o);
  }
  if(products().some(p=>p.id===old))picker.value=old;
 }
 async function open(id){
  updatePicker(id);
  if(!dialog.open)dialog.showModal();
  if(picker.value)await select(picker.value);
  else {title.value='';description.value='';status.textContent='Wähle einen Artikel aus deinem Lager.';preview.hidden=true;}
 }
 async function copy(field,label){
  if(!field.value.trim()){status.textContent='Kein Text zum Kopieren vorhanden.';return;}
  let success=false;
  try{await navigator.clipboard.writeText(field.value);success=true;}catch{}
  if(!success){
   try{field.focus();field.select();success=document.execCommand('copy');}catch{}
  }
  status.textContent=success?label+' wurde kopiert. Bei Vinted einfügen.':'Kopieren nicht erlaubt: Text markieren und manuell kopieren.';
 }
 picker.addEventListener('change',()=>{void select(picker.value);});
 $('vintedCopyTitle').addEventListener('click',()=>{void copy(title,'Titel');});
 $('vintedCopyDescription').addEventListener('click',()=>{void copy(description,'Beschreibung');});
 $('vintedClose').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{generation++;preview.removeAttribute('src');});
 return Object.freeze({open});
}
window.TrummVinted12=Object.freeze({listing,bind});
})();