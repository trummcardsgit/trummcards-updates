// TrummCards Cloud 1.1: cash movements are intentionally separate from FIFO.
// Values recorded here represent payments the owner confirmed, not invoices or bookings.
const LABELS=Object.freeze({
 sale_receipt:'Verkaufserloes',purchase_payment:'Wareneinkauf',platform_fee:'Plattformgebuehr',
 shipping:'Versand',business_expense:'Betriebsausgabe',other_income:'Sonstige Einnahme',
 other_expense:'Sonstige Ausgabe',refund:'Rueckzahlung'
});
export const CASH_CATEGORIES=LABELS;
const amount=v=>{
 let s=String(v??'').trim().replace(/[\s\u00a0€]/g,'');
 if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replaceAll('.','').replace(',','.'):s.replaceAll(',','');
 else if(s.includes(','))s=s.replace(',','.');
 if(!/^\d+(?:\.\d{1,2})?$/.test(s))throw Error('Betrag muss positiv sein und maximal zwei Nachkommastellen haben.');
 const n=Number(s);if(!Number.isFinite(n)||n<=0||n>9999999999.99)throw Error('Betrag außerhalb des gültigen Bereichs.');
 return n;
};
const validDate=value=>{
 const v=String(value||'').trim();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v))throw Error('Bitte ein Zahlungsdatum angeben.');
 const date=new Date(v+'T00:00:00.000Z');
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==v)throw Error('Ungültiges Zahlungsdatum.');
 return v;
};
const safeString=(v,max,label)=>{
 const s=String(v??'').trim();
 if(s.length>max||/[\x00-\x1f\x7f]/.test(s))throw Error(label+' enthält zu viele oder ungültige Zeichen.');
 return s;
};
export function cashEntry(input){
 if(!input||!['income','expense'].includes(input.direction))throw Error('Bitte Einnahme oder Ausgabe wählen.');
 const category=safeString(input.category,40,'Kategorie');
 if(!Object.hasOwn(LABELS,category))throw Error('Ungültige Buchungskategorie.');
 const incomeCategory=category==='sale_receipt'||category==='other_income';
 const expenseCategory=['purchase_payment','platform_fee','shipping','business_expense','other_expense'].includes(category);
 if(incomeCategory&&input.direction!=='income'||expenseCategory&&input.direction!=='expense')
   throw Error('Kategorie und Zahlungsrichtung passen nicht zusammen.');
 const sale_id=String(input.sale_id||'').trim()||null;
 const purchase_lot_id=String(input.purchase_lot_id||'').trim()||null;
 if(sale_id&&purchase_lot_id)throw Error('Zahlung darf nur einem Verkauf oder Einkauf zugeordnet werden.');
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(sale_id&&!uuid.test(sale_id)||purchase_lot_id&&!uuid.test(purchase_lot_id))throw Error('Ungültige Buchungsreferenz.');
 return {payment_on:validDate(input.payment_on),direction:input.direction,category,
  amount_eur:amount(input.amount_eur),description:safeString(input.description,500,'Beschreibung'),
  document_reference:safeString(input.document_reference,160,'Belegnummer'),sale_id,purchase_lot_id};
}
const cents=v=>Math.round(Number(v||0)*100);
export function summarizeCash(entries,{year='',month=''}={}){
 let income=0,expenses=0,count=0;
 for(const row of entries){
  const date=validDate(row.payment_on);
  if(year&&!date.startsWith(String(year)))continue;
  if(month&&!date.startsWith(String(month)))continue;
  const n=cents(row.amount_eur);if(!Number.isInteger(n)||n<=0)throw Error('Ungültiger Zahlungsbetrag in Cloud-Daten.');
  if(row.direction==='income')income+=n;
  else if(row.direction==='expense')expenses+=n;
  else throw Error('Ungültige Zahlungsrichtung in Cloud-Daten.');
  count++;
 }
 return {income:income/100,expenses:expenses/100,balance:(income-expenses)/100,count};
}
const csvValue=value=>{
 let text=String(value??'');
 if(/^[\s]*[=+@\-\t\r]/.test(text)&&!/^[-]?\d+(?:,\d{1,2})?$/.test(text))text="'"+text;
 return '"'+text.replaceAll('"','""')+'"';
};
export function cashCsv(entries,{year='',month=''}={}){
 const header=['Zahlungsdatum','Richtung','Kategorie','Betrag EUR','Beschreibung','Beleg','Verkaufs-ID','Einkaufs-ID','Buchungs-ID'];
 const lines=[header.map(csvValue).join(';')];
 for(const item of [...entries].sort((a,b)=>a.payment_on.localeCompare(b.payment_on)||String(a.id||'').localeCompare(String(b.id||'')))){
  if(year&&!item.payment_on.startsWith(String(year)))continue;
  if(month&&!item.payment_on.startsWith(String(month)))continue;
  const entry=cashEntry(item);
  lines.push([entry.payment_on,entry.direction==='income'?'Einnahme':'Ausgabe',LABELS[entry.category],
   entry.amount_eur.toFixed(2).replace('.',','),entry.description,entry.document_reference,
   entry.sale_id||'',entry.purchase_lot_id||'',item.id||''].map(csvValue).join(';'));
 }
 return '\uFEFF'+lines.join('\r\n')+'\r\n';
}
