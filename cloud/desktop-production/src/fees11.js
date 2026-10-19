(()=>{'use strict';
// Sales platform fee profiles. No platform's official fees are assumed.
const feeAmount=(rule,{price=0,shippingIncome=0}={})=>{
 const pct=Number(rule?.percent_rate??0),fixed=Number(rule?.fixed_eur??0);
 const amount=Number(price),postage=Number(shippingIncome);
 if(![pct,fixed,amount,postage].every(Number.isFinite)||pct<0||pct>100||fixed<0||amount<0||postage<0)
  throw Error('Ungültige Gebührenkonfiguration.');
 const basis=amount+(rule?.include_shipping===false?0:postage);
 return Math.round((basis*pct/100+fixed+Number.EPSILON)*100)/100;
};
const feeRule=(input={})=>{
 const platform=String(input.platform||'').trim();
 const percent_rate=Number(String(input.percent_rate??0).replace(',','.'));
 const fixed_eur=Number(String(input.fixed_eur??0).replace(',','.'));
 if(!platform||platform.length>100||!Number.isFinite(percent_rate)||percent_rate<0||percent_rate>100||
    !Number.isFinite(fixed_eur)||fixed_eur<0||fixed_eur>999999.99||
    !/^\d+(?:[.,]\d{1,2})?$/.test(String(input.percent_rate??0))||
    !/^\d+(?:[.,]\d{1,2})?$/.test(String(input.fixed_eur??0)))throw Error('Plattformgebühren müssen gültige positive Beträge mit höchstens 2 Nachkommastellen sein.');
 return {platform,percent_rate,fixed_eur,include_shipping:input.include_shipping!==false};
};

window.TrummFees11=Object.freeze({feeAmount,feeRule});
})();
