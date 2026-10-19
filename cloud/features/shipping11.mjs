// Cloud 1.1 shipping validation core: never changes FIFO bookings or sales history.
// Tracking is optional and does not automatically share buyer names or addresses.
export const SHIPPING_STATES=Object.freeze(['offen','verpackt','versendet','zugestellt']);
export const SHIPPING_CARRIERS=Object.freeze(['Österreichische Post','DHL','DPD','GLS','Hermes','Andere']);
const text=(value,max,label)=>{
 const s=String(value??'').trim();
 if(s.length>max)throw Error(label+' darf höchstens '+max+' Zeichen enthalten.');
 if(/[\u0000-\u001f\u007f]/.test(s))throw Error(label+' enthält unzulässige Steuerzeichen.');
 return s;
};
export function shippingRecord(value={}){
 const status=String(value.status??'offen');
 if(!SHIPPING_STATES.includes(status))throw Error('Unbekannter Versandstatus.');
 const carrier=text(value.carrier,100,'Versanddienstleister');
 const tracking_number=text(value.tracking_number,150,'Sendungsnummer');
 const order_reference=text(value.order_reference,150,'Bestellreferenz');
 const shipped_on=text(value.shipped_on,10,'Versanddatum');
 if(shipped_on&&!/^\d{4}-\d{2}-\d{2}$/.test(shipped_on))throw Error('Ungültiges Versanddatum.');
 if(shipped_on){const d=new Date(shipped_on+'T00:00:00Z');if(!Number.isFinite(d.valueOf())||d.toISOString().slice(0,10)!==shipped_on)throw Error('Ungültiges Versanddatum.');}
 const link=text(value.tracking_url,500,'Tracking-Link');
 let tracking_url='';
 if(link){
  let u;try{u=new URL(link);}catch{throw Error('Tracking-Link muss eine gültige HTTPS-Adresse sein.');}
  if(u.protocol!=='https:'||u.username||u.password||!u.hostname||/^(localhost|127\.|10\.|192\.168\.|172\.)/.test(u.hostname))
    throw Error('Tracking-Link muss eine öffentliche HTTPS-Adresse sein.');
  tracking_url=u.toString();
 }
 return {status,carrier,tracking_number,order_reference,shipped_on:shipped_on||null,tracking_url};
}
export function shippingLabel(value){
 const row=shippingRecord(value);
 return row.status+(row.carrier?' · '+row.carrier:'')+(row.tracking_number?' · '+row.tracking_number:'');
}
