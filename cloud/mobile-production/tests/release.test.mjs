import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../web/',import.meta.url));
const get=name=>readFileSync(root+name,'utf8');
test('Cloud 1.0 uses only production and has explicitly enabled writes',()=>{
 const app=get('app.js');
 assert.ok(app.includes("const PROJECT='hgdexyvtgfffcasfpjyu'"));
 assert.ok(app.includes('const WRITES_ENABLED=true;'));
 assert.ok(!app.includes('cpycfxolqpidfjbhhsmr'));
});
test('Cloud 1.0 PWA cache and assets version must align',()=>{
 const html=get('index.html'),sw=get('sw.js'),reset=get('reset-password.html');
 assert.ok(html.includes('TRUMMCARDS CLOUD 1.0.0'));
 assert.ok(html.includes('app.js?v=1.0.0'));
 assert.ok(html.includes('styles.css?v=1.0.0'));
 assert.ok(reset.includes('reset-password.js?v=1.0.0'));
 assert.ok(sw.includes("trummcards-mobile-production-shell-v2"));
 assert.ok(sw.includes('app.js?v=1.0.0'));
});
