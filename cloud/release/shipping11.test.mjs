import test from 'node:test';
import assert from 'node:assert/strict';
import {SHIPPING_STATES,shippingRecord,shippingLabel} from '../features/shipping11.mjs';
test('Shipment status and tracking normalize without touching a sale record',()=>{
 assert.deepEqual(SHIPPING_STATES,['offen','verpackt','versendet','zugestellt']);
 const sale={id:'test-sale',status:'booked',cogs_total:25};
 const shipment=shippingRecord({status:'versendet',carrier:'Österreichische Post',tracking_number:' 123456 ',order_reference:'E-42',shipped_on:'2026-10-19',tracking_url:'https://www.post.at/s/sendungen-verfolgen?ID=123'});
 assert.equal(shipment.tracking_number,'123456');
 assert.equal(shipment.status,'versendet');
 assert.equal(shippingLabel(shipment),'versendet · Österreichische Post · 123456');
 assert.deepEqual(sale,{id:'test-sale',status:'booked',cogs_total:25});
});
test('Tracking links must be public HTTPS, not local or credentials',()=>{
 for(const url of ['http://www.post.at/test','javascript:alert(1)','https://localhost/','https://admin:pass@post.at/','https://127.0.0.1/test']){
  assert.throws(()=>shippingRecord({tracking_url:url}),/Tracking-Link/);
 }
 assert.throws(()=>shippingRecord({status:'unknown'}),/Versandstatus/);
 assert.throws(()=>shippingRecord({tracking_number:'a'.repeat(151)}),/Sendungsnummer/);
});
test('Empty optional fields and shipping date normalize safely',()=>{
 const result=shippingRecord({status:'offen'});
 assert.deepEqual(result,{status:'offen',carrier:'',tracking_number:'',order_reference:'',shipped_on:null,tracking_url:''});
 assert.throws(()=>shippingRecord({shipped_on:'yesterday'}),/Versanddatum/);
});
