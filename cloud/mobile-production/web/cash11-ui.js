/* Cloud 1.1: explicit actual cash movements, not generated from FIFO bookings. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const euro=n=>Number(n??0).toLocaleString('de-AT',{style:'currency',currency:'EUR'});
 const today=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10);};
 function bind({getEntries,getSales,getLots,productName,save,remove}){
  const api=window.TrummCash11,form=$('cashEntryForm'),entriesBox=$('cashEntries'),status=$('cashEntryStatus');
  if(!api||!form)throw Error('Zahlungsmodul wurde nicht geladen.');
  const field=name=>form.elements.namedItem(name),year=$('cashYear');
  let busy=false,yearSignature='',relationSignature='',editingId='';
  const categories={
   income:[['sale_receipt','Verkaufserlös'],['other_income','Sonstige Einnahme'],['refund','Rückzahlung erhalten']],
   expense:[['purchase_payment','Wareneinkauf'],['platform_fee','Plattformgebühren'],['shipping','Versand'],['business_expense','Betriebsausgabe'],['other_expense','Sonstige Ausgabe'],['refund','Rückzahlung bezahlt']]
  };
  const say=t=>{status.textContent=t;};
  function renderCategories(){
   const select=field('category'),old=select.value;
   const options=categories[field('direction').value]||[];
   select.replaceChildren();
   for(const [value,name]of options){const option=document.createElement('option');option.value=value;option.textContent=name;select.append(option);}
   if(options.some(([code])=>code===old))select.value=old;
  }
  function renderRelations(){
   const sales=getSales(),lots=getLots();
   const signature=JSON.stringify({sales:sales.map(x=>[x.id,x.sold_on,x.product_id]),lots:lots.map(x=>[x.id,x.bought_on,x.product_id])});
   if(signature===relationSignature)return;
   const el=field('relation'),old=el.value;el.replaceChildren();
   const empty=document.createElement('option');empty.value='';empty.textContent='Keine Zuordnung';el.append(empty);
   for(const sale of sales){
     const opt=document.createElement('option');opt.value='s:'+sale.id;
     opt.textContent='Verkauf '+sale.sold_on+' | '+productName(sale.product_id);el.append(opt);
   }
   for(const lot of lots){
     const opt=document.createElement('option');opt.value='l:'+lot.id;
     opt.textContent='Einkauf '+lot.bought_on+' | '+productName(lot.product_id);el.append(opt);
   }
   el.value=Array.from(el.options).some(o=>o.value===old)?old:'';
   relationSignature=signature;
  }
  function renderYears(){
   const years=[...new Set(getEntries().map(x=>String(x.payment_on||'').slice(0,4)).filter(x=>/^\d{4}$/.test(x)))].sort().reverse();
   const signature=JSON.stringify(years);if(signature===yearSignature)return;
   const old=year.value;year.replaceChildren();
   const all=document.createElement('option');all.value='';all.textContent='Alle Jahre';year.append(all);
   for(const y of years){const option=document.createElement('option');option.value=y;option.textContent=y;year.append(option);}
   year.value=years.includes(old)?old:'';
   yearSignature=signature;
  }
  function reset(){
   editingId='';form.reset();field('edit_id').value='';field('payment_on').value=today();
   $('cashCancel').hidden=true;$('cashSave').textContent='Zahlung speichern';
   renderCategories();renderRelations();
  }
  function startEdit(id){
   const entry=getEntries().find(x=>x.id===id);if(!entry)return;
   editingId=id;field('edit_id').value=id;field('payment_on').value=entry.payment_on;
   field('direction').value=entry.direction;renderCategories();field('category').value=entry.category;
   field('amount_eur').value=Number(entry.amount_eur).toFixed(2).replace('.',',');
   field('description').value=entry.description||'';
   field('document_reference').value=entry.document_reference||'';
   renderRelations();
   field('relation').value=entry.sale_id?'s:'+entry.sale_id:entry.purchase_lot_id?'l:'+entry.purchase_lot_id:'';
   $('cashCancel').hidden=false;$('cashSave').textContent='Änderung speichern';
   say('Zahlung vom '+entry.payment_on+' zur Bearbeitung geladen.');
   form.scrollIntoView?.({behavior:'smooth',block:'nearest'});
  }
  function rowButtons(box,entry){
   const edit=document.createElement('button');edit.type='button';edit.textContent='Bearbeiten';edit.className='tiny-btn';
   edit.addEventListener('click',()=>startEdit(entry.id));
   const del=document.createElement('button');del.type='button';del.textContent='Löschen';del.className='tiny-btn';
   del.addEventListener('click',async()=>{
     if(busy||!window.confirm('Diesen Zahlungsdatensatz wirklich löschen? Eine Zahlungsverfolgung bleibt außerhalb von TrummCards erforderlich.'))return;
     busy=true;del.disabled=true;
     try{await remove(entry.id);if(editingId===entry.id)reset();say('Zahlungsdatensatz gelöscht.');render();}
     catch(e){say('Löschen fehlgeschlagen: '+String(e.message||e));}
     finally{busy=false;del.disabled=false;}
   });
   box.append(edit,del);
  }
  function render(){
   renderRelations();renderYears();
   const rows=getEntries(),selected=year.value;
   const filtered=rows.filter(e=>!selected||String(e.payment_on||'').startsWith(selected));
   try{
    const data=api.summarizeCash(filtered);
    const panel=$('cashSummary');panel.replaceChildren();
    for(const [name,value] of [['Erhaltene Zahlungen',euro(data.income)],['Geleistete Zahlungen',euro(data.expenses)],['Geldfluss-Saldo',euro(data.balance)],['Erfasste Zahlungen',String(data.count)]]){
     const el=document.createElement('div');el.className='finance-metric';
     const label=document.createElement('small');label.textContent=name;
     const number=document.createElement('strong');number.textContent=value;el.append(label,number);panel.append(el);
    }
   }catch(err){say('Zahlungsübersicht fehlgeschlagen: '+String(err.message||err));}
   entriesBox.replaceChildren();
   const ordered=[...filtered].sort((a,b)=>String(b.payment_on).localeCompare(String(a.payment_on))||String(b.id).localeCompare(String(a.id)));
   if(!ordered.length){entriesBox.textContent='Für diesen Zeitraum sind noch keine tatsächlichen Zahlungen erfasst.';return;}
   for(const entry of ordered.slice(0,250)){
    const box=document.createElement('div');box.className='cash-entry';
    const title=document.createElement('strong');title.textContent=entry.payment_on+' · '+(entry.direction==='income'?'Einnahme':'Ausgabe')+' '+euro(entry.amount_eur);
    const info=document.createElement('span');info.textContent=(api.CASH_CATEGORIES[entry.category]||entry.category)+(entry.description?' · '+entry.description:'')+(entry.document_reference?' · Beleg '+entry.document_reference:'');
    const actions=document.createElement('div');actions.className='actions';rowButtons(actions,entry);
    box.append(title,info,actions);entriesBox.append(box);
   }
   if(ordered.length>250){
    const p=document.createElement('p');p.textContent='Nur 250 von '+ordered.length+' Zahlungen angezeigt. Der CSV-Export enthält alle geladenen Einträge.';entriesBox.append(p);
   }
  }
  field('direction').addEventListener('change',renderCategories);
  year.addEventListener('change',render);
  $('cashCancel').addEventListener('click',()=>{reset();say('Bearbeitung abgebrochen.');});
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(busy)return;
   const link=field('relation').value;
   let data;
   try{data=api.cashEntry({
    payment_on:field('payment_on').value,direction:field('direction').value,
    category:field('category').value,amount_eur:field('amount_eur').value,
    description:field('description').value,document_reference:field('document_reference').value,
    sale_id:link.startsWith('s:')?link.slice(2):null,
    purchase_lot_id:link.startsWith('l:')?link.slice(2):null
   });}catch(err){say(String(err.message||err));return;}
   busy=true;$('cashSave').disabled=true;
   try{await save(editingId,data);reset();render();say('Zahlung gespeichert. Der FIFO-Bestand blieb unverändert.');}
   catch(err){say('Zahlung konnte nicht gespeichert werden: '+String(err.message||err));}
   finally{busy=false;$('cashSave').disabled=false;}
  });
  $('cashExport').addEventListener('click',()=>{
   try{
    const all=getEntries();const csv=api.cashCsv(all,{year:year.value});
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='TrummCards-Zahlungen-'+(year.value||'alle')+'.csv';
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
    say('Zahlungs-CSV vorbereitet: Die tatsächlichen Zahlungen prüfen, Belege aufbewahren und steuerliche Behandlung klären.');
   }catch(err){say('Export fehlgeschlagen: '+String(err.message||err));}
  });
  function beginLinkedPayment(type,id){
   if(!['sale','lot'].includes(type)||!id)return;
   reset();renderRelations();
   field('direction').value=type==='sale'?'income':'expense';renderCategories();
   field('category').value=type==='sale'?'sale_receipt':'purchase_payment';
   const link=(type==='sale'?'s:':'l:')+id;
   if(Array.from(field('relation').options).some(o=>o.value===link))field('relation').value=link;
   say(type==='sale'?'Bitte den tatsächlich erhaltenen Verkaufserlös und das Zahlungsdatum eintragen.':
      'Bitte den tatsächlich bezahlten Wareneinkauf und das Zahlungsdatum erfassen.');
   form.scrollIntoView?.({behavior:'smooth',block:'nearest'});
  }
  reset();render();
  return Object.freeze({render,beginLinkedPayment});
 }
 window.TrummCashUI11=Object.freeze({bind});
})();
