import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
function extract(start,end){
 const a=source.indexOf(start);
 const b=source.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Cannot locate function '+start);
 return source.slice(a,b);
}
function fixture(){
 const values={email:{value:'example@example.com'},password:{value:'not-a-real-password'},date:{value:'2026-10-15'}};
 const form=new EventTarget();
 form.elements={namedItem:key=>values[key]};
 form.reset=()=>{form.resets=(form.resets||0)+1;};
 return {form,values};
}
test('Successful async login survives DOM submit event lifetime',async()=>{
 const {form,values}=fixture();
 let attemptedLogout=false,entered=false,errors=[];
 const btn={disabled:false},emailLabel={textContent:''};
 const ctx={
  val:(el,key)=>el.elements.namedItem(key).value,
  f:(el,key)=>el.elements.namedItem(key),
  $:id=>id==='signInBtn'?btn:emailLabel,
  clearNotice(){},
  apiBase:()=> 'https://example.invalid',
  raw:async()=>({access_token:'TEST_NO_REAL_TOKEN'}),
  API_HEADERS:{},KEY:'TEST_PUBLIC_KEY',
  persistSession(){},checkAccount:async()=>({email:'example@example.com'}),
  showApp(){entered=true;},refreshAll:async()=>{},navigate(){},
  notice:(msg,type)=>{if(type==='error')errors.push(msg);},
  errorText:e=>String(e?.message||e),
  get session(){return {access_token:'TEST_NO_REAL_TOKEN'};},
  signOut:async()=>{attemptedLogout=true;}
 };
 runInNewContext(extract('async function login(event)','async function signOut'),ctx);
 let settled;
 form.addEventListener('submit',e=>{settled=ctx.login(e);});
 form.dispatchEvent(new Event('submit',{cancelable:true}));
 assert.equal(typeof settled?.then,'function','Submit handler should return a promise');
 await settled;
 assert.equal(entered,true,'Login should succeed after successful Auth response');
 assert.equal(values.password.value,'','Password field must be cleared');
 assert.equal(attemptedLogout,false,'Do not log user out after successful login');
 assert.deepEqual(errors,[]);
 assert.equal(btn.disabled,false);
});
test('Booked sale clears form after asynchronous Supabase RPC',async()=>{
 const {form,values}=fixture();
 let error=null,shown=null,cleared=false;
 const ctx={
  withBusy:async fn=>{try{await fn();}catch(e){error=e;}},
  saleValues:()=>({product:'product-id',qty:1,date:'2026-10-15',price:50,shippingIncome:0,shippingCost:0,fees:0,other:0,platform:'eBay',note:''}),
  productById:()=>({id:'product-id'}),
  fifoPreview:()=>({missing:0}),
  money:n=>n,
  bookId:()=> 'TEST_ONLY_IDEMPOTENCY_KEY',
  rpc:async()=>({id:'TEST_SALE_ID'}),
  clearPending:()=>{cleared=true;},
  f:(el,key)=>el.elements.namedItem(key),
  today:()=> '2026-10-15',
  refreshAll:async()=>{},showPage:page=>{shown=page;},
  notice:()=>{}
 };
 runInNewContext(extract('async function saveSale(e)','async function cancelSale'),ctx);
 let finished;
 form.addEventListener('submit',e=>{finished=ctx.saveSale(e);});
 form.dispatchEvent(new Event('submit',{cancelable:true}));
 await finished;
 assert.equal(error,null,String(error));
 assert.equal(form.resets,1,'Form should reset after RPC');
 assert.equal(values.date.value,'2026-10-15');
 assert.equal(shown,'sales');
 assert.equal(cleared,true);
});
