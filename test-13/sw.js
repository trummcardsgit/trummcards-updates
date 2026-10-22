'use strict';
const CACHE='trummcards-mobile-test13-shell-v138';
const SHELL=["./","./index.html","./manifest.webmanifest","./icon.svg","./logo.webp","./icon-180.png","./icon-192.png","./icon-512.png","./reset-password.html","./styles.css?v=1.3.0-test.8","./catalog11.js?v=1.3.0-test.8","./image-link12.js?v=1.3.0-test.8","./catalog11-ui.js?v=1.3.0-test.8","./sets11-ui.js?v=1.3.0-test.8","./market11-ui.js?v=1.3.0-test.8","./fees11.js?v=1.3.0-test.8","./fees11-ui.js?v=1.3.0-test.8","./finance11.js?v=1.3.0-test.8","./finance11-ui.js?v=1.3.0-test.8","./cash11.js?v=1.3.0-test.8","./cash11-ui.js?v=1.3.0-test.8","./shipping11.js?v=1.3.0-test.8","./shipping11-ui.js?v=1.3.0-test.8","./carddex12.js?v=1.3.0-test.8","./vinted12.js?v=1.3.0-test.8","./personal-market13.js?v=1.3.0-test.8","./app.js?v=1.3.0-test.8","./reset-password.js?v=1.3.0-test.8"];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('trummcards-mobile-test13-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 const url=new URL(req.url);if(!SHELL.some(p=>new URL(p,self.registration.scope).pathname===url.pathname))return;
 event.respondWith(fetch(req).then(resp=>{if(resp.ok){const clone=resp.clone();caches.open(CACHE).then(c=>c.put(req,clone)).catch(()=>{});}return resp;}).catch(()=>caches.match(req,{ignoreSearch:true})));
});
