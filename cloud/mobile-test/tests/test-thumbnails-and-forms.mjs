import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const root=new URL('../web/',import.meta.url);
const js=readFileSync(new URL('app.js',root),'utf8');
const html=readFileSync(new URL('index.html',root),'utf8');
const css=readFileSync(new URL('styles.css',root),'utf8');
const sw=readFileSync(new URL('sw.js',root),'utf8');

const begin=js.indexOf('function prepareInventoryThumbnails(){');
const end=js.indexOf('async function openProductImage(',begin);
assert.ok(begin>=0&&end>begin,'Thumbnail loader must exist');
const loader=js.slice(begin,end);

function imageHarness(useObserver){
 const loaded=[];
 const rows=Array.from({length:16},(_,i)=>{
  const img={id:i,hidden:true};
  const element={
   visible:true,
   querySelector:selector=>selector==='img[data-thumb]'?img:null
  };
  img.closest=selector=>selector==='.list-image-button'?element:null;
  return {img,element};
 });
 let observer;
 class IO{
  constructor(callback,opts){this.callback=callback;this.options=opts;this.targets=[];observer=this;}
  observe(target){this.targets.push(target);}
  unobserve(target){this.targets=this.targets.filter(t=>t!==target);}
  disconnect(){this.targets.length=0;}
  trigger(target){this.callback([{target,isIntersecting:true}]);}
 }
 const context={
  document:{querySelectorAll:()=>rows.map(r=>r.img)},
  window:useObserver?{IntersectionObserver:IO}:{},
  IntersectionObserver:IO,
  thumbnailObserver:null,
  fillThumbnail:async img=>{loaded.push(img.id);}
 };
 runInNewContext(loader,context);
 context.prepareInventoryThumbnails();
 return {loaded,rows,get observer(){return observer}};
}

test('Hidden img must not be an IntersectionObserver target',()=>{
 const h=imageHarness(true);
 assert.deepEqual(h.loaded,Array.from({length:12},(_,i)=>i));
 assert.equal(h.observer.targets.length,4);
 assert.equal(h.observer.options.rootMargin,'300px');
 assert.ok(h.observer.targets.every(t=>t.visible===true));
 h.observer.trigger(h.rows[12].element);
 assert.deepEqual(h.loaded,Array.from({length:13},(_,i)=>i));
 assert.equal(h.observer.targets.length,3);
});
test('Without IntersectionObserver all images still load',()=>{
 const h=imageHarness(false);
 assert.equal(h.loaded.length,16);
});
test('Cards contain real thumbnail elements and enlargement remains available',()=>{
 assert.ok(js.includes('data-thumb='));
 assert.ok(js.includes('data-photo-open='));
 assert.ok(js.includes('fillThumbnail(img)'));
 assert.ok(js.includes('img.src=url;img.hidden=false'));
 assert.ok(css.includes('.list-image-button img{width:100%;height:100%;object-fit:contain'));
});
test('Purchase and sale forms are mobile responsive and retain valid input names',()=>{
 for(const form of ['purchaseForm','saleForm'])assert.ok(html.includes('id="'+form+'"'));
 for(const cls of ['booking-panel','booking-date-qty','booking-money-pair','sale-date-qty','qty-stepper'])assert.ok(html.includes(cls),'Missing '+cls);
 assert.ok(html.includes('id="purchaseDate"')&&html.includes('id="saleDate"'));
 assert.ok(css.includes('.booking-panel .two-fields{grid-template-columns:minmax(0,1fr);gap:0}'));
 assert.ok(css.includes('min-width:0;min-height:53px'));
 assert.ok(css.includes('safe-area-inset-top'));
 assert.ok(sw.includes('trummcards-mobile-test-shell-v4'));
});
