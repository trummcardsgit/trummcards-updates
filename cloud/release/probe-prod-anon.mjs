#!/usr/bin/env node
// Production smoke test: deliberately UNAUTHENTICATED, READ-ONLY.
 // No owner passwords, tokens, admin keys, object paths or production writes.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const web=fileURLToPath(new URL('../mobile-production/web/app.js',import.meta.url));
const app=fs.readFileSync(web,'utf8');
const project='hgdexyvtgfffcasfpjyu';
if(!app.includes("const PROJECT='"+project+"'")||app.includes('cpycfxolqpidfjbhhsmr'))
 throw Error('Unsafe project target: live smoke test refused.');
const matches=app.match(/anon_key:"(sb_publishable_[A-Za-z0-9_-]+)"/);
if(!matches)throw Error('Public production publishable key not detected. No request made.');
const key=matches[1];
const url='https://'+project+'.supabase.co';
const headers={apikey:key,Accept:'application/json'};
async function probe(name,route,init,check){
 const response=await fetch(url+route,{method:init.method||'GET',headers:{...headers,...(init.headers||{})},body:init.body,redirect:'error',signal:AbortSignal.timeout(12000),cache:'no-store'});
 let body=null;
 const ctype=response.headers.get('content-type')||'';
 if(ctype.includes('json')){try{body=await response.json();}catch{}}
 if(!check(response.status,body))throw Error(name+' refused: unexpected HTTP status '+response.status+' or exposed data.');
 console.log(name+': pass (HTTP '+response.status+')');
}
const safeEmpty=(status,body)=>[401,403].includes(status)||(status===200&&Array.isArray(body)&&body.length===0);
await probe('Supabase Auth API online','/auth/v1/health',{method:'GET'},status=>status===200);
for(const table of ['tc_products','tc_purchase_lots','tc_sales','tc_sale_allocations','tc_stock_movements','tc_lot_images','tc_product_images']){
 await probe('Anonymous '+table,'/rest/v1/'+table+'?select=id&limit=1',{},safeEmpty);
}
await probe('No anonymous backup snapshot','/rest/v1/rpc/tc_backup_snapshot',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'},(status,body)=>[401,403,404].includes(status));
await probe('No anonymous owner authorization','/rest/v1/rpc/tc_is_authorized',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'},(status,body)=>[401,403].includes(status)||(status===200&&body===false));
console.log('Read-only PROD smoke tests passed. No account was used and no data changed.');
