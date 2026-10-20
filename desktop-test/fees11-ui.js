/* TrummCards Cloud 1.1: platform fee profiles, manual opt-in when booking. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const fmt=v=>Number(v??0).toFixed(2).replace('.',',');
 function bind({getProfiles,save,parseEuro,onFeeApplied}){
  const api=window.TrummFees11,form=$('feeProfileForm'),sale=$('saleForm'),status=$('feeProfileStatus');
  if(!api||!form||!sale)throw Error('Gebührenprofile nicht geladen.');
  const el=name=>form.elements.namedItem(name);
  const saleEl=name=>sale.elements.namedItem(name);
  function render(){
   const rules=getProfiles();
   const container=$('feeProfileList');container.replaceChildren();
   if(!rules.length){container.textContent='Noch keine Profile. TrummCards setzt keine Gebühren ungefragt voraus.';return;}
   for(const rule of rules){
    const line=document.createElement('div');line.className='fee-rule';
    const title=document.createElement('strong');title.textContent=rule.platform;
    const val=document.createElement('span');val.textContent=fmt(rule.percent_rate)+' % + '+fmt(rule.fixed_eur)+' €'+(rule.include_shipping?' (inkl. Versand-Einnahmen)':' (ohne Versand-Einnahmen)');
    line.append(title,val);container.append(line);
   }
  }
  el('platform').addEventListener('change',()=>{
   const rule=getProfiles().find(x=>x.platform===el('platform').value);
   el('percent_rate').value=rule?fmt(rule.percent_rate):'0,00';
   el('fixed_eur').value=rule?fmt(rule.fixed_eur):'0,00';
   el('include_shipping').checked=rule?rule.include_shipping:true;
  });
  form.addEventListener('submit',async e=>{
   e.preventDefault();
   const button=$('feeProfileSave');button.disabled=true;
   try{
    const rule=api.feeRule({platform:el('platform').value,percent_rate:el('percent_rate').value,fixed_eur:el('fixed_eur').value,include_shipping:el('include_shipping').checked});
    await save(rule);render();
    status.textContent='Gebührenprofil für '+rule.platform+' gespeichert. Es wird nur auf ausdrücklichen Klick bei einem Verkauf angewendet.';
   }catch(err){status.textContent='Gebührenprofil nicht gespeichert: '+String(err.message||err);}
   finally{button.disabled=false;}
  });
  $('feeSuggest').addEventListener('click',()=>{
   const platform=saleEl('platform').value,rule=getProfiles().find(x=>x.platform===platform);
   if(!rule){$('feeSuggestStatus').textContent='Für '+platform+' wurde noch kein Gebührenprofil erstellt. Gebühren weiterhin manuell eingeben.';return;}
   try{
    const amount=api.feeAmount(rule,{price:parseEuro(saleEl('price').value),shippingIncome:parseEuro(saleEl('shippingIncome').value)});
    saleEl('fees').value=fmt(amount);
    saleEl('fees').dispatchEvent(new Event('input',{bubbles:true}));
    onFeeApplied?.();
    $('feeSuggestStatus').textContent='Vorschlag '+fmt(amount)+' € für '+platform+' übernommen. Du kannst den Betrag vor der Buchung ändern.';
   }catch(err){$('feeSuggestStatus').textContent='Gebühr nicht berechnet: '+String(err.message||err);}
  });
  render();return Object.freeze({render});
 }
 window.TrummFeesUI11=Object.freeze({bind});
})();
