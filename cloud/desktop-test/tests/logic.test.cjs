const test = require('node:test');
const assert = require('node:assert/strict');
const l = require('../src/logic.js');

test('de-AT price input',()=>{
  assert.equal(l.parseMoney('100'),100);
  assert.equal(l.parseMoney('1.234,56'),1234.56);
  assert.equal(l.parseMoney('1,234.56'),1234.56);
  assert.equal(l.parseMoney('0'),0);
  assert.equal(l.parseMoney('',{optional:true}),0);
  assert.throws(()=>l.parseMoney('3,333'));
  assert.throws(()=>l.parseMoney('-5'));
});
test('purchase total is unit times quantity and inverse',()=>{
  const n=l.count('2');
  assert.equal(l.money(n*l.parseMoney('100')),200);
  assert.equal(l.money(l.parseMoney('200')/n),100);
});
test('FIFO across lots and profit',()=>{
  const lots=[
    {id:'a',product_id:'p',bought_on:'2026-10-01',created_at:'2026-10-01',available_qty:2,purchased_qty:2,purchase_total:200,extra_cost:0,allocated_cost:0},
    {id:'b',product_id:'p',bought_on:'2026-10-02',created_at:'2026-10-02',available_qty:3,purchased_qty:3,purchase_total:330,extra_cost:0,allocated_cost:0}
  ];
  const res=l.fifoPreview(lots,'p',3);
  assert.equal(res.missing,0);assert.equal(res.cost,310);
  assert.deepEqual(res.allocations.map(x=>x.qty),[2,1]);
  assert.equal(l.profit({price:450,shippingIncome:5,shippingCost:5,fees:22.5,other:0,cost:res.cost}),117.5);
  assert.equal(l.fifoPreview(lots,'p',6).missing,1);
});
test('last pieces absorb cent rounding',()=>{
  const lots=[{id:'a',product_id:'p',bought_on:'2026-10-01',created_at:'1',available_qty:1,purchased_qty:3,purchase_total:100,extra_cost:0,allocated_cost:66.66}];
  assert.equal(l.fifoPreview(lots,'p',1).cost,33.34);
});
test('clear duplicate SKU error',()=>{
  assert.match(l.apiError({code:'23505',message:'duplicate key'}),/Artikelnummer bereits verwendet/);
});
