'use strict';
const CACHE='trummcards-mobile-test123-shell-v1-1209';
const SHELL=['./','./app.js?v=1.2.3-test.1','./styles.css?v=1.2.3-test.1','./catalog11.js?v=1.2.3-test.1','./catalog11-ui.js?v=1.2.3-test.1','./sets11-ui.js?v=1.2.3-test.1','./market11-ui.js?v=1.2.3-test.1','./fees11.js?v=1.2.3-test.1','./fees11-ui.js?v=1.2.3-test.1','./finance11.js?v=1.2.3-test.1','./finance11-ui.js?v=1.2.3-test.1','./cash11.js?v=1.2.3-test.1','./cash11-ui.js?v=1.2.3-test.1','./shipping11.js?v=1.2.3-test.1','./shipping11-ui.js?v=1.2.3-test.1','./carddex12.js?v=1.2.3-test.1','./vinted12.js?v=1.2.3-test.1','./manifest.webmanifest','./icon.svg','./logo.webp','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('trummcards-mobile-test123-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 const url=new URL(req.url);if(!SHELL.some(p=>new URL(p,self.registration.scope).pathname===url.pathname))return;
 event.respondWith(fetch(req).then(resp=>{if(resp.ok){const clone=resp.clone();caches.open(CACHE).then(c=>c.put(req,clone)).catch(()=>{});}return resp;}).catch(()=>caches.match(req,{ignoreSearch:true})));
});
