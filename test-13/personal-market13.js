/* TrummCards Cloud 1.3 – market-value policy for private collection/wishlist.
 * Cardmarket trend values come from TCGdex and are indicative, not guaranteed resale prices.
 * Unknown variants / stale or undated quotes are not counted as 0 EUR.
 */
(()=>{'use strict';
const DAY=86400000,MAX_AGE_DAYS=30;
function select(item,detail,now=Date.now()){
 const not=(reason,rows=[])=>({value:null,reason,rows,updatedAt:null});
 const quote=window.TrummCardDex12?.filteredMarketQuote?.(detail?.pricing,detail?.variants);
 if(!quote?.rows?.length)return not('Kein Cardmarket-Preis verfügbar');
 const rows=quote.rows.filter(r=>Number.isFinite(r.value)&&r.value>0);
 if(!rows.length)return not('Kein verlässlicher EUR-Richtwert',rows);
 const variant=String(item?.card_variant||'').toLowerCase().trim();
 const specific=rows.some(r=>r.label==='Normal (ohne Holo)'||r.label==='Holo');
 let chosen=null;
 if(specific){
  if(variant==='holo')chosen=rows.find(r=>r.label==='Holo');
  else if(variant==='normal'||variant==='standard')chosen=rows.find(r=>r.label==='Normal (ohne Holo)');
 }else if(rows.length===1)chosen=rows[0];
 if(!chosen)return not(!variant?'Ausführung auswählen: Normal oder Holo':'Kein Marktpreis für die gewählte Ausführung',rows);
 const updatedAt=quote.updatedAt||null;
 const ms=Date.parse(updatedAt||'');
 const age=Number.isFinite(ms)?Math.max(0,now-ms)/DAY:Infinity;
 if(age>MAX_AGE_DAYS)return {value:null,reason:updatedAt?'Preis älter als 30 Tage':'Preisdatum fehlt',rows,updatedAt};
 return {value:Math.round(chosen.value*100)/100,reason:chosen.label,rows,updatedAt};
}
function summarize(items,priceByKey){
 const data={collection:{amountCents:0,priced:0,missing:0,quantity:0},wishlist:{amountCents:0,priced:0,missing:0,quantity:0}};
 for(const item of items){
  const d=data[item.list_type];if(!d)continue;
  const qty=Number(item.quantity)||0;
  d.quantity+=qty;
  const price=priceByKey(item);
  if(price&&Number.isFinite(price.value)&&price.value>0){
    d.amountCents+=Math.round(price.value*100)*qty;d.priced+=qty;
  }else d.missing+=qty;
 }
 for(const key of Object.keys(data))data[key].value=Math.round(data[key].amountCents)/100;
 return data;
}
window.TrummPersonalMarket13=Object.freeze({select,summarize,MAX_AGE_DAYS});
})();