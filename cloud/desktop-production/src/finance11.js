(()=>{'use strict';
// TrummCards Cloud 1.1 financial primitives: no API, no database writes.
// Operational FIFO profitability is NOT identical to Austrian taxable cash-basis income.
const amount=v=>{const n=Number(v??0);if(!Number.isFinite(n))throw Error('Ungültiger Geldbetrag');return Math.round((n+Number.EPSILON)*100)/100;};
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const csvCell=value=>{
 let s=String(value??'');
 // Prevent spreadsheet formula injection in free text when opened as a spreadsheet.
 if(/^[\s]*[=+@\-\t\r]/.test(s)&&!/^[-]?\d+(?:,\d{1,2})?$/.test(s))s="'"+s;
 return '"'+s.replaceAll('"','""')+'"';
};
const moneyCell=n=>amount(n).toFixed(2).replace('.',',');

function calculateSale(sale){
 if(sale.status!=='booked')return null;
 const revenue=round(amount(sale.price)+amount(sale.shipping_income));
 const fees=round(amount(sale.fees)+amount(sale.shipping_cost)+amount(sale.other_cost));
 const cogs=amount(sale.cogs_total);
 return {revenue,fees,cogs,profit:round(revenue-fees-cogs)};
}
function summarizeFinance({sales=[],purchaseLots=[]}={}){
 const result={sales:0,unitsSold:0,revenue:0,fees:0,cogs:0,profit:0,purchaseSpending:0,byPlatform:{},byMonth:{}};
 for(const sale of sales){
  const row=calculateSale(sale);if(!row)continue;
  result.sales++;result.unitsSold+=Number(sale.qty||0);
  for(const name of ['revenue','fees','cogs','profit'])result[name]=round(result[name]+row[name]);
  const platform=String(sale.platform||'Sonstige');
  const p=result.byPlatform[platform]||{count:0,revenue:0,profit:0};
  p.count++;p.revenue=round(p.revenue+row.revenue);p.profit=round(p.profit+row.profit);
  result.byPlatform[platform]=p;
  const month=String(sale.sold_on||'').slice(0,7)||'Unbekannt';
  const m=result.byMonth[month]||{count:0,revenue:0,profit:0};
  m.count++;m.revenue=round(m.revenue+row.revenue);m.profit=round(m.profit+row.profit);
  result.byMonth[month]=m;
 }
 for(const lot of purchaseLots)result.purchaseSpending=round(result.purchaseSpending+amount(lot.purchase_total)+amount(lot.extra_cost));
 return result;
}
function financeCsv({sales=[],purchaseLots=[],productName=()=>''}={}){
 const headers=['Typ','Datum','Artikel','Plattform/Quelle','Menge','Einnahmen EUR','Ausgaben EUR','FIFO Einstand EUR','Gewinn EUR','Status','Buchungs-ID'];
 const rows=[headers.map(csvCell).join(';')];
 for(const sale of sales){
  const calc=calculateSale(sale);
  rows.push(['Verkauf',sale.sold_on,productName(sale.product_id),sale.platform,sale.qty,
   moneyCell(amount(sale.price)+amount(sale.shipping_income)),
   moneyCell(amount(sale.fees)+amount(sale.shipping_cost)+amount(sale.other_cost)),
   moneyCell(sale.cogs_total),calc?moneyCell(calc.profit):'',sale.status||'',sale.id||''].map(csvCell).join(';'));
 }
 for(const lot of purchaseLots){
  rows.push(['Einkauf',lot.bought_on,productName(lot.product_id),lot.source,lot.purchased_qty,'',
   moneyCell(amount(lot.purchase_total)+amount(lot.extra_cost)),'','','',lot.id||''].map(csvCell).join(';'));
 }
 // Excel-compatible UTF-8 with BOM. For cash-basis bookkeeping, payment dates
 // and other business expenses must still be supplied separately.
 return '\uFEFF'+rows.join('\r\n')+'\r\n';
}

window.TrummFinance11=Object.freeze({calculateSale,summarizeFinance,financeCsv});
})();
