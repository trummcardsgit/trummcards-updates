/* Cloud 1.1: explicit EUR estimate/manual market price. Never touches purchase FIFO. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const parse=value=>{
  let s=String(value??'').trim().replace(/[ €\u00a0]/g,'');
  if(!s)return null;
  if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replaceAll('.','').replace(',','.'):s.replaceAll(',','');
  else if(s.includes(','))s=s.replace(',','.');
  if(!/^\d+(?:\.\d{1,2})?$/.test(s))throw Error('Marktpreis in EUR mit höchstens zwei Nachkommastellen angeben.');
  const n=Number(s);if(!Number.isFinite(n)||n<0||n>9999999999.99)throw Error('Ungültiger Marktpreis.');
  return n;
 };
 const display=n=>n==null?'':Number(n).toFixed(2).replace('.',',');
 function bind(){
  const form=$('productForm')||$('articleForm'),notice=$('marketPriceStatus');
  const field=name=>form.elements.namedItem(name);
  const input=field('market_price_eur'),source=field('market_price_source'),updated=field('market_price_checked_at');
  const time=iso=>iso?new Date(iso).toLocaleString('de-AT',{dateStyle:'short',timeStyle:'short'}):'';
  function status(){
   const p=input.value.trim();notice.textContent=p?
    'Richtwert: '+p+' € | '+(source.value||'Manuell')+(updated.value?' | '+time(updated.value):'')+' | Zustand und Variante prüfen.':
    'Noch kein Marktpreis hinterlegt. Verkaufspreis und FIFO-Einstand bleiben unabhängig.';
  }
  function reset(){input.value='';source.value='';updated.value='';status();}
  function load(product){
   input.value=product?.market_price_eur==null?'':display(product.market_price_eur);
   source.value=String(product?.market_price_source||'');
   updated.value=String(product?.market_price_checked_at||'');
   status();
  }
  input.addEventListener('input',()=>{
    source.value=input.value.trim()?'Manuell':'';
    updated.value=input.value.trim()?new Date().toISOString():'';
    status();
  });
  field('card_variant')?.addEventListener('change',()=>{
    if(source.value.startsWith('TCGdex /')){reset();notice.textContent='Variante geändert. Bitte neuen Marktpreis prüfen oder manuell eintragen.';}
  });
  field('card_condition')?.addEventListener('change',()=>{
    if(source.value.startsWith('TCGdex /')){
      reset();notice.textContent='Zustand geändert: Bitte einen passenden Marktpreis manuell prüfen.';
    }
  });
  field('grading_company')?.addEventListener('change',()=>{
    if(field('grading_company').value&&source.value.startsWith('TCGdex /')){
      reset();notice.textContent='Grading-Karten benötigen einen eigenen Preisvergleich.';
    }
  });
  function applyCatalog(detail){
   const price=window.TrummCatalog11.euroMarketQuote(detail.pricing,{
    variant:field('card_variant')?.value||'',gradingCompany:field('grading_company')?.value||'',condition:field('card_condition')?.value||''
   });
   if(!price){reset();notice.textContent='Für diese Karte/Variante gibt es keinen eindeutig passenden EUR-Marktpreis. Manuelle Eingabe möglich.';return;}
   input.value=display(price.value);source.value=price.source;updated.value=price.updatedAt;status();
  }
  function values(){
    const amount=parse(input.value);
    if(amount===null)return {market_price_eur:null,market_price_source:'',market_price_checked_at:null};
    const src=source.value.trim();
    const date=updated.value;
    if(!src||!Number.isFinite(new Date(date).getTime()))throw Error('Quelle oder Stand des Marktpreises ungültig.');
    return {market_price_eur:amount,market_price_source:src,market_price_checked_at:new Date(date).toISOString()};
  }
  status();
  return Object.freeze({reset,load,applyCatalog,values});
 }
 window.TrummMarketUI11=Object.freeze({bind});
})();
