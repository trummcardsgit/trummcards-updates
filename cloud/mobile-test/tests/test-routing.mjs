import {test} from 'node:test';
import assert from 'node:assert/strict';

let handler;
globalThis.Deno = {
  serve(fn) { handler=fn; },
  env: { get(key) { return key === 'SUPABASE_ANON_KEY' ? 'public-test-anon-key' : undefined; } },
};
await import('../edge/index.ts');
assert.equal(typeof handler,'function');

const origin='https://cpycfxolqpidfjbhhsmr.supabase.co';
const full='/functions/v1/trummcards-mobile-test/';

for(const root of [full,'/trummcards-mobile-test/','/']){
  test('HTML served under '+root,async()=>{
    const res=await handler(new Request(origin+root));
    assert.equal(res.status,200);
    assert.match(res.headers.get('content-type'),/^text\/html/);
    assert.match(await res.text(),/TrummCards/);
  });
  for(const [asset,mime] of [['app.js','text/javascript'],['styles.css','text/css'],['manifest.webmanifest','application/manifest+json'],['icon-192.png','image/png']]){
    test('Asset '+root+asset,async()=>{
      const res=await handler(new Request(origin+root+asset));
      assert.equal(res.status,200);
      assert.ok(res.headers.get('content-type')?.startsWith(mime));
      assert.ok((await res.arrayBuffer()).byteLength>64);
    });
  }
  test('Publishable config '+root,async()=>{
    const res=await handler(new Request(origin+root+'api/config'));
    assert.equal(res.status,200);
    const cfg=await res.json();
    assert.equal(cfg.url,origin);
    assert.equal(cfg.anon_key,'public-test-anon-key');
  });
  test('Session requires authentication '+root,async()=>{
    const res=await handler(new Request(origin+root+'api/session'));
    assert.equal(res.status,401);
  });
}
for(const root of [full.slice(0,-1),'/trummcards-mobile-test']){
  test('Missing slash redirect '+root,async()=>{
    const res=await handler(new Request(origin+root));
    assert.equal(res.status,308);
    assert.equal(res.headers.get('location'),origin+full);
  });
}
test('Unknown files and POST rejected',async()=>{
  assert.equal((await handler(new Request(origin+'/private.json'))).status,404);
  assert.equal((await handler(new Request(origin+full,{method:'POST'}))).status,405);
});
