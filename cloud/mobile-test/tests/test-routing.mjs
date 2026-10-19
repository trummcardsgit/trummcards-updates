import {test} from 'node:test';
import assert from 'node:assert/strict';
let handler;
globalThis.Deno={serve(fn){handler=fn;}};
await import('../edge/index.ts');
const target='https://trummcardsgit.github.io/trummcards-updates/';
const host='https://cpycfxolqpidfjbhhsmr.supabase.co';
for(const path of ['/functions/v1/trummcards-mobile-test/','/','/trummcards-mobile-test/','/styles.css']){
 test('old Supabase link redirects safely: '+path,async()=>{
   const response=await handler(new Request(host+path));
   assert.equal(response.status,302);
   assert.equal(response.headers.get('location'),target);
   assert.equal(response.headers.get('cache-control'),'no-store');
 });
}
test('no unsafe or data-changing methods',async()=>{
 const r=await handler(new Request(host+'/functions/v1/trummcards-mobile-test/',{method:'POST'}));
 assert.equal(r.status,405);
});
