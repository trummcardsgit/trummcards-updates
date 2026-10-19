import test from 'node:test';
import assert from 'node:assert/strict';
import {cashEntry,summarizeCash,cashCsv} from '../features/cash11.mjs';

const SALE='723e4567-e89b-12d3-a456-426614174000';
const LOT='623e4567-e89b-12d3-a456-426614174000';
const journal=[
 {id:'c1',payment_on:'2026-12-29',direction:'income',category:'sale_receipt',amount_eur:20,description:'erste Teilzahlung',sale_id:SALE},
 {id:'c2',payment_on:'2027-01-03',direction:'income',category:'sale_receipt',amount_eur:30,description:'Restzahlung',sale_id:SALE},
 {id:'c3',payment_on:'2026-12-28',direction:'expense',category:'purchase_payment',amount_eur:18.50,purchase_lot_id:LOT},
 {id:'c4',payment_on:'2026-12-29',direction:'expense',category:'business_expense',amount_eur:3,description:'Verpackung'},
 {id:'c5',payment_on:'2026-12-30',direction:'expense',category:'platform_fee',amount_eur:2.20,description:'Gebuehr'}
];
test('Cash-flow reporting separates payment dates across fiscal years, unlike FIFO sale date',()=>{
 assert.deepEqual(summarizeCash(journal),{income:50,expenses:23.70,balance:26.30,count:5});
 assert.deepEqual(summarizeCash(journal,{year:'2026'}),{income:20,expenses:23.70,balance:-3.70,count:4});
 assert.deepEqual(summarizeCash(journal,{year:'2027'}),{income:30,expenses:0,balance:30,count:1});
 assert.deepEqual(summarizeCash(journal,{month:'2026-11'}),{income:0,expenses:0,balance:0,count:0});
});
test('Valid cash records support partial payments, manual costs, refund direction and optional linkage',()=>{
 assert.deepEqual(cashEntry({payment_on:'2026-10-19',direction:'expense',category:'shipping',
  amount_eur:'12,30',description:'Verpackung',document_reference:'R1',purchase_lot_id:LOT}),{
  payment_on:'2026-10-19',direction:'expense',category:'shipping',amount_eur:12.3,description:'Verpackung',
  document_reference:'R1',sale_id:null,purchase_lot_id:LOT
 });
 assert.equal(cashEntry({payment_on:'2026-10-19',direction:'income',category:'refund',amount_eur:1}).category,'refund');
 assert.throws(()=>cashEntry({payment_on:'2026-10-19',direction:'income',category:'purchase_payment',amount_eur:1}),/Kategorie/);
 assert.throws(()=>cashEntry({payment_on:'2026-10-19',direction:'expense',category:'sale_receipt',amount_eur:1}),/Kategorie/);
 assert.throws(()=>cashEntry({payment_on:'2026-10-19',direction:'expense',category:'business_expense',amount_eur:0}),/Betrag/);
 assert.throws(()=>cashEntry({payment_on:'2026-02-30',direction:'expense',category:'business_expense',amount_eur:1}),/Zahlungsdatum/);
 assert.throws(()=>cashEntry({payment_on:'2026-10-19',direction:'income',category:'sale_receipt',amount_eur:1,sale_id:SALE,purchase_lot_id:LOT}),/nur einem/);
});
test('CSV is ordered by PAYMENT date and is Excel-safe with German EUR decimals',()=>{
 const csv=cashCsv([...journal,{id:'attack',payment_on:'2026-12-31',direction:'expense',category:'business_expense',
  amount_eur:1,description:'=HYPERLINK("https://untrusted/")',document_reference:'+evil'}],{year:'2026'});
 assert.ok(csv.startsWith('\uFEFF'));
 assert.ok(csv.includes('"-"')===false,'direction uses unambiguous German labels');
 assert.ok(csv.includes('"18,50"'));
 assert.ok(csv.includes('"\'=HYPERLINK(""https://untrusted/"")"'),'spreadsheet formula protected');
 assert.ok(csv.includes('"\'+evil"'),'formula in document reference protected');
 assert.equal(csv.includes('2027-01-03'),false,'next-year income not in prior fiscal year');
 assert.ok(csv.indexOf('2026-12-28')<csv.indexOf('2026-12-29'),'payments sorted chronologically');
});
