/* TrummCards 1.1 – dashboard and export. Calculations are pure, no database mutation. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const euro=v=>Number(v||0).toLocaleString('de-AT',{style:'currency',currency:'EUR'});
 function buildRows(target,entries,type){
  target.replaceChildren();
  if(!entries.length){const empty=document.createElement('p');empty.className='small muted';empty.textContent='Für diesen Zeitraum sind noch keine Verkäufe vorhanden.';target.append(empty);return;}
  const max=Math.max(1,...entries.map(([,row])=>Math.abs(Number(type==='platform'?row.profit:row.revenue))));
  for(const [label,row] of entries){
   const value=Number(type==='platform'?row.profit:row.revenue);
   const line=document.createElement('div');line.className='finance-bar-row';
   const heading=document.createElement('span');heading.textContent=label;
   const track=document.createElement('div');track.className='finance-bar-track';
   const bar=document.createElement('div');bar.className='finance-bar'+(value<0?' negative':'');bar.style.width=Math.max(2,Math.round(Math.abs(value)/max*100))+'%';
   track.append(bar);
   const number=document.createElement('strong');number.textContent=euro(value);
   line.append(heading,track,number);target.append(line);
  }
 }
 function bind(getData){
  if(!window.TrummFinance11)throw Error('Finanzmodul fehlt.');
  const api=window.TrummFinance11;
  const el=$('financePeriod'),summary=$('financeSummary'),months=$('financeMonths'),platforms=$('financePlatforms'),status=$('financeStatus');
  if(!el||!summary||!months||!platforms)throw Error('Finanzoberfläche unvollständig.');
  function current(){
   const {sales=[],lots=[],products=[]}=getData();
   const period=el.value;
   const now=new Date(),yy=String(now.getFullYear()),mm=yy+'-'+String(now.getMonth()+1).padStart(2,'0');
   const includesDate=v=>period==='all'||(period==='year'?String(v||'').startsWith(yy):String(v||'').startsWith(mm));
   return {
    sales:sales.filter(x=>includesDate(x.sold_on)),
    purchaseLots:lots.filter(x=>includesDate(x.bought_on)),
    productName:id=>products.find(p=>p.id===id)?.name||'Unbekannter Artikel'
   };
  }
  function render(){
   try{
    const values=current(),metrics=api.summarizeFinance(values);
    summary.replaceChildren();
    for(const [name,value] of [['Umsatz',euro(metrics.revenue)],['FIFO-Gewinn',euro(metrics.profit)],['Gebühren + Verkaufskosten',euro(metrics.fees)],['Wareneinsatz (verkauft)',euro(metrics.cogs)],['Einkaufsausgaben',euro(metrics.purchaseSpending)],['Verkaufte Stück',String(metrics.unitsSold)]]){
     const item=document.createElement('div');item.className='finance-metric';
     const l=document.createElement('small');l.textContent=name;
     const val=document.createElement('strong');val.textContent=value;
     item.append(l,val);summary.append(item);
    }
    buildRows(months,Object.entries(metrics.byMonth).sort((a,b)=>a[0].localeCompare(b[0])),'month');
    buildRows(platforms,Object.entries(metrics.byPlatform).sort((a,b)=>b[1].revenue-a[1].revenue),'platform');
    status.textContent=metrics.sales+' gebuchte Verkäufe – FIFO-Gewinn ist keine automatische steuerliche Einnahmen-Ausgaben-Rechnung.';
   }catch(e){status.textContent='Finanzauswertung fehlgeschlagen: '+String(e.message||e);}
  }
  el.addEventListener('change',render);
  $('financeExport').addEventListener('click',()=>{
   try{
    const csv=api.financeCsv(current());
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;
    a.download='TrummCards-Finanzexport-'+new Date().toISOString().slice(0,10)+'.csv';
    document.body.append(a);a.click();a.remove();
    // Revoke after the current event; keep URL alive for the browser to start download.
    window.setTimeout(()=>URL.revokeObjectURL(url),3000);
    status.textContent='Finanz-CSV wird heruntergeladen. Prüfe Zahlungstermine und steuerliche Behandlung separat.';
   }catch(e){status.textContent='CSV-Export fehlgeschlagen: '+String(e.message||e);}
  });
  return Object.freeze({render});
 }
 window.TrummFinanceUI11=Object.freeze({bind});
})();
