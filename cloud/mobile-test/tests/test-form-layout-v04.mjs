import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../web/',import.meta.url);
const html=readFileSync(new URL('index.html',root),'utf8');
const css=readFileSync(new URL('styles.css',root),'utf8');
const sw=readFileSync(new URL('sw.js',root),'utf8');
const p=html.slice(html.indexOf('<section id="page-purchase"'),html.indexOf('<section id="page-sale"'));
const s=html.slice(html.indexOf('<section id="page-sale"'),html.indexOf('<section id="page-sales"'));
function inputs(fragment){
 return [...fragment.matchAll(/\bname="([^"]+)"/g)].map(match=>match[1]);
}
function hasLinkedLabel(fragment,id){
 return fragment.includes('for="'+id+'"')&&fragment.includes('id="'+id+'"');
}
test('two clearly grouped booking forms, with their own article, price and detail sections',()=>{
 for(const [source,name] of [[p,'purchaseForm'],[s,'saleForm']]){
  assert.ok(source.includes('id="'+name+'"'));
  assert.equal((source.match(/class="booking-group"/g)||[]).length,3);
  assert.ok(source.includes('Artikel &amp; Menge'));
  assert.ok(source.includes('Weitere Angaben'));
  assert.ok(source.includes('class="booking-grid booking-grid-primary"'));
  assert.ok(source.includes('class="booking-grid booking-grid-money"'));
 }
});
test('all existing data keys are retained to avoid breaking sales or purchases',()=>{
 for(const name of ['product','date','qty','unit','total','extra','source','note'])
  assert.ok(inputs(p).includes(name),'Missing purchase field '+name);
 for(const name of ['product','date','qty','price','shippingIncome','shippingCost','fees','other','platform','note'])
  assert.ok(inputs(s).includes(name),'Missing sale field '+name);
});
test('every required booking input has an accessible visible label',()=>{
 for(const [source,ids] of [[p,['purchaseProduct','purchaseDate','purchaseQty','purchaseUnit','purchaseTotal']],
                            [s,['saleProduct','saleDate','saleQty','salePrice']]]){
  for(const id of ids)assert.ok(hasLinkedLabel(source,id),'Missing label for '+id);
 }
});
test('money fields have a euro suffix without modifying submitted values',()=>{
 for(const source of [p,s]){
  assert.ok(source.includes('class="money-input"'));
  assert.ok(source.includes('<span aria-hidden="true">€</span>'));
  assert.ok(!source.includes('type="number" inputmode="decimal"'));
 }
 assert.ok(css.includes('.booking-panel .money-input>span'));
 assert.ok(css.includes('.booking-panel .booking-group .money-input>input'));
});
test('iPhone forms use one column with responsive native date and safe quantity input',()=>{
 assert.ok(css.includes('@media(max-width:680px)'));
 assert.ok(css.includes('grid-template-columns:minmax(0,1fr);gap:14px'));
 assert.ok(css.includes('input[type=date]'));
 assert.ok(css.includes('-webkit-min-logical-width:0'));
 assert.ok(css.includes('grid-template-columns:52px minmax(0,1fr) 52px'));
 assert.ok(s.includes('id="saleQtyMinus"')&&s.includes('id="saleQtyPlus"'));
});
test('new asset version bypasses old cached forms in installed iPhone PWA',()=>{
 assert.ok(html.includes('styles.css?v=0.4.0'));
 assert.ok(html.includes('app.js?v=0.4.0'));
 assert.ok(sw.includes('trummcards-mobile-test-shell-v5'));
 assert.ok(sw.includes('./styles.css?v=0.4.0'));
 assert.ok(sw.includes('./app.js?v=0.4.0'));
 assert.ok(sw.includes('ignoreSearch:true'));
});
