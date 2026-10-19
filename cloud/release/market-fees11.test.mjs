import test from 'node:test';
import assert from 'node:assert/strict';
import {euroMarketQuote,getPokemonCard} from '../features/tcgdex11.mjs';
import {feeAmount,feeRule} from '../features/fees11.mjs';

test('TCGdex Cardmarket EUR quote includes clear variant, provider and observation time',()=>{
 const pricing={cardmarket:{unit:'EUR',updated:'2026-10-18T17:00:00Z',trend:12.8,'trend-holo':34.9}};
 const normal=euroMarketQuote(pricing,{variant:''});
 assert.deepEqual(normal,{value:12.8,currency:'EUR',source:'TCGdex / Cardmarket Trend',
  updatedAt:'2026-10-18T17:00:00.000Z',estimated:true,variant:'Standard'});
 assert.equal(euroMarketQuote(pricing,{variant:'Holo'}).value,34.9);
 assert.equal(euroMarketQuote(pricing,{variant:'Reverse Holo'}),null);
 assert.equal(euroMarketQuote(pricing,{variant:'Special Illustration Rare'}),null);
 assert.equal(euroMarketQuote(pricing,{variant:'',gradingCompany:'PSA'}),null);
});
test('Never invent or relabel missing / USD / invalid or future cardmarket data',()=>{
 const good={unit:'EUR',trend:5,updated:'2026-10-01T12:00:00Z'};
 assert.equal(euroMarketQuote({tcgplayer:{unit:'USD',marketPrice:500}}),null);
 assert.equal(euroMarketQuote({cardmarket:{...good,unit:'USD'}}),null);
 assert.equal(euroMarketQuote({cardmarket:{...good,trend:null}}),null);
 assert.equal(euroMarketQuote({cardmarket:{...good,trend:-1}}),null);
 assert.equal(euroMarketQuote({cardmarket:{...good,updated:'not a date'}}),null);
 assert.equal(euroMarketQuote({cardmarket:{...good,updated:'2100-01-01'}}),null);
});
test('TCGdex card details provide optional raw pricing but never pre-commit guessed price',async()=>{
 const detailed=await getPokemonCard({id:'sv03.5-001',fetchImpl:async()=>({ok:true,json:async()=>({
  id:'sv03.5-001',name:'Bisasam',localId:'001',set:{name:'151'},pricing:{cardmarket:{unit:'EUR',trend:2.45,updated:'2026-10-18T07:00:00Z'}}
 })})});
 assert.equal(detailed.price,null);
 assert.equal(detailed.pricing.cardmarket.trend,2.45);
});
test('Fee profiles are purely user-defined and shipping included only when selected',()=>{
 const rule=feeRule({platform:'eBay',percent_rate:'10,00',fixed_eur:'0,35',include_shipping:true});
 assert.deepEqual(rule,{platform:'eBay',percent_rate:10,fixed_eur:0.35,include_shipping:true});
 assert.equal(feeAmount(rule,{price:25,shippingIncome:5}),3.35);
 assert.equal(feeAmount({...rule,include_shipping:false},{price:25,shippingIncome:5}),2.85);
 assert.equal(feeAmount({percent_rate:0,fixed_eur:0},{price:100,shippingIncome:10}),0);
 assert.throws(()=>feeRule({platform:'eBay',percent_rate:'200',fixed_eur:'0'}),/Plattformgebühren/);
 assert.throws(()=>feeRule({platform:'eBay',percent_rate:'5,555',fixed_eur:'0'}),/Plattformgebühren/);
 assert.throws(()=>feeAmount({percent_rate:10},{price:-10}),/Gebührenkonfiguration/);
});
