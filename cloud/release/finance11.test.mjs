import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateSale,summarizeFinance,financeCsv} from '../features/finance11.mjs';
const sales=[
 {id:'S1',product_id:'P1',sold_on:'2026-10-17',qty:4,price:'100.00',shipping_income:'5.00',shipping_cost:'3.00',fees:'7.00',other_cost:'2.00',cogs_total:'55.00',platform:'Cardmarket',status:'booked'},
 {id:'S2',product_id:'P1',sold_on:'2026-10-17',qty:1,price:'10.00',shipping_income:0,shipping_cost:0,fees:0,other_cost:0,cogs_total:5,platform:'eBay',status:'voided'}
];
test('FIFO sale and cancelled sales are accounted separately',()=>{
 assert.deepEqual(calculateSale(sales[0]),{revenue:105,fees:12,cogs:55,profit:38});
 assert.equal(calculateSale(sales[1]),null);
 const result=summarizeFinance({sales,purchaseLots:[{purchase_total:30,extra_cost:2},{purchase_total:50,extra_cost:0}]});
 assert.deepEqual([result.sales,result.unitsSold,result.revenue,result.fees,result.cogs,result.profit,result.purchaseSpending],[1,4,105,12,55,38,82]);
 assert.equal(result.byPlatform.Cardmarket.profit,38);
 assert.equal(result.byMonth['2026-10'].profit,38);
 assert.equal(result.byPlatform.eBay,undefined);
});
test('Spreadsheet export preserves cancelled status and protects CSV formulas',()=>{
 const csv=financeCsv({sales,purchaseLots:[{id:'L1',product_id:'P1',bought_on:'2026-10-01',purchased_qty:3,purchase_total:30,extra_cost:2,source:'=HYPERLINK("evil")'}],productName:()=>'+formula'});
 assert.ok(csv.startsWith('\uFEFF'));
 assert.ok(csv.includes("'+formula"),'formula prefix escaped');
 assert.ok(csv.includes("'=HYPERLINK"),'source formula escaped');
 assert.ok(csv.includes('"Storniert"')===false);
 assert.ok(csv.includes('"voided"'));
 assert.ok(csv.includes('"38,00"'));
});
test('Invalid amounts fail closed',()=>{
 assert.throws(()=>calculateSale({...sales[0],fees:'bad'}),/Ungültiger Geldbetrag/);
});
