import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../web/',import.meta.url));
const file=n=>readFileSync(root+n,'utf8');
const app=file('app.js'),html=file('index.html'),sw=file('sw.js'),reset=file('reset-password.js'),resetHtml=file('reset-password.html');
const manifest=JSON.parse(file('manifest.webmanifest'));
const project='hgdexyvtgfffcasfpjyu',testRef='cpycfxolqpidfjbhhsmr';

test('Production PWA connects only to the independent project',()=>{
 assert.ok(app.includes("const PROJECT='"+project+"'"));
 assert.ok(app.includes("url:'https://'+PROJECT+'.supabase.co'"));
 assert.ok(app.includes("sb_publishable_"));
 assert.ok(!app.includes(testRef));
 assert.ok(!reset.includes(testRef));
 assert.ok(resetHtml.includes('https://'+project+'.supabase.co'));
 assert.ok(app.includes('trummcards-mobile-production-session-v1'));
 assert.ok(app.includes('trummcards-mobile-production-pending-v1'));
 assert.ok(reset.includes('trummcards-mobile-production-session-v1'));
});
test('Production PWA prevents accidental business writes until go-live',()=>{
 assert.ok(app.includes('const WRITES_ENABLED=false;'));
 for(const fn of ['saveArticle','savePurchase','saveSale','savePhoto','cancelSale']){
  const i=app.indexOf('async function '+fn+'(');
  assert.ok(i>=0,fn);
  assert.ok(app.slice(i,i+270).includes('if(!WRITES_ENABLED)'),fn);
 }
 assert.ok(html.includes('PRODUKTIONSVORSCHAU 0.9.0'));
});
test('PWA identity and serviceworker cache cannot delete TEST cache',()=>{
 assert.equal(manifest.name,'TrummCards Cloud');
 assert.equal(manifest.short_name,'TC Cloud');
 assert.equal(manifest.scope,'./');
 assert.ok(sw.includes("trummcards-mobile-production-shell-v1"));
 assert.ok(sw.includes("keys.filter(k=>k.startsWith('trummcards-mobile-production-shell-')&&k!==CACHE)"));
 assert.ok(!sw.includes("keys.filter(k=>k!==CACHE)"));
 assert.ok(app.includes("navigator.serviceWorker.register('./sw.js',{scope:'./'})"));
 assert.ok(html.includes('app.js?v=0.9.0'));
 assert.ok(html.includes('styles.css?v=0.9.0'));
});
test('Password recovery is production-scoped and uses the eventual PWA URL',()=>{
 assert.ok(reset.includes("const PROJECT='"+project+"'"));
 assert.ok(reset.includes("const REDIRECT=new URL('./reset-password.html',location.href).href"));
 assert.ok(!reset.includes('https://trummcardsgit.github.io/trummcards-updates/reset-password.html'));
 assert.ok(resetHtml.includes('reset-password.js?v=0.9.0'));
 assert.ok(reset.includes('history.replaceState'));
});
test('No implicit deployment or PROD routes to TEST',()=>{
 for(const name of ['app.js','reset-password.js','reset-password.html','index.html','sw.js','manifest.webmanifest'])
  assert.ok(!file(name).includes(testRef),name);
 assert.ok(!app.includes('trummcards-mobile-test-session'));
});
