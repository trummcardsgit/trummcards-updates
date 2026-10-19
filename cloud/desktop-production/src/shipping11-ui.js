/* TrummCards Cloud 1.1 shipment UI – one shipment per booked sale. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const fields=['shipping_status','carrier','tracking_number','order_reference','shipped_on','tracking_url'];
 function bind({getSales,getShipments,productName,save}){
   const form=$('shipmentForm'),selection=$('shipmentSale'),saveButton=$('shipmentSave'),status=$('shipmentStatus');
   if(!form||!window.TrummShipping11)throw Error('Versandverwaltung unvollständig.');
   let active='',dirty=false,busy=false,optionsSignature='';
   const input=key=>form.elements.namedItem(key);
   const say=message=>{status.textContent=message;};
   function options(){
     const sales=getSales();
     const signature=JSON.stringify(sales.map(s=>[s.id,s.status,s.sold_on,productName(s.product_id)]));
     if(signature===optionsSignature)return;
     const previous=active;
     selection.replaceChildren();
     const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Gebuchten Verkauf auswählen';selection.append(placeholder);
     for(const sale of sales){
       const option=document.createElement('option');option.value=sale.id;
       option.textContent=(sale.status==='booked'?'':'[Storniert] ')+String(sale.sold_on||'')+' | '+productName(sale.product_id)+' | '+String(sale.platform||'Privat');
       selection.append(option);
     }
     optionsSignature=signature;
     if(sales.some(s=>s.id===previous))selection.value=previous;
     else active='';
   }
   function load(saleId,force=false){
     const sale=getSales().find(s=>s.id===saleId);
     if(!force&&dirty&&active===saleId)return;
     active=sale?.id||'';
     selection.value=active;
     const ship=getShipments().find(x=>x.sale_id===active);
     for(const key of fields){
       const property=key==='shipping_status'?'shipping_status':key;
       const fallback=key==='shipping_status'?'offen':'';
       input(key).value=String(ship?.[property]??fallback);
     }
     saveButton.disabled=!sale||sale.status!=='booked'||busy;
     const historic=sale&&sale.status!=='booked';
     dirty=false;
     say(!sale?'Bitte einen Verkauf auswählen.':
       historic?'Stornierter Verkauf: Versanddaten bleiben zur Dokumentation sichtbar, sind aber nicht mehr bearbeitbar.':
       ship?'Gespeicherter Versandstatus: '+ship.shipping_status+'.':'Noch keine Versanddaten zu diesem Verkauf gespeichert.');
   }
   function render(){
     options();
     const sale=getSales().find(s=>s.id===active);
     if(!sale){load('',true);return;}
     if(!dirty&&!busy)load(active,true);
     saveButton.disabled=!sale||sale.status!=='booked'||busy;
   }
   selection.addEventListener('change',()=>load(selection.value,true));
   form.addEventListener('input',e=>{if(e.target!==selection&&e.target.name)dirty=true;});
   form.addEventListener('change',e=>{if(e.target!==selection&&e.target.name)dirty=true;});
   form.addEventListener('submit',async e=>{
     e.preventDefault();
     if(busy)return;
     const sale=getSales().find(s=>s.id===active);
     if(!sale||sale.status!=='booked'){say('Nur für einen gebuchten Verkauf können Versanddaten gespeichert werden.');return;}
     let normalized;
     try{
       normalized=window.TrummShipping11.shippingRecord({
         status:input('shipping_status').value,carrier:input('carrier').value,
         tracking_number:input('tracking_number').value,order_reference:input('order_reference').value,
         shipped_on:input('shipped_on').value,tracking_url:input('tracking_url').value
       });
     }catch(err){say('Eingabe prüfen: '+String(err.message||err));return;}
     busy=true;saveButton.disabled=true;say('Versandinformationen werden gespeichert …');
     try{
       await save(active,normalized);
       dirty=false;say('Versandinformationen in der Cloud gespeichert. Status: '+normalized.status+'.');
     }catch(err){say('Versand konnte nicht gespeichert werden: '+String(err.message||err));}
     finally{busy=false;saveButton.disabled=false;render();}
   });
   options();load('',true);
   return Object.freeze({render,load});
 }
 window.TrummShippingUI11=Object.freeze({bind});
})();
