'use strict';
const CACHE='trummcards-mobile-production-shell-v122';
const SHELL=["./","./manifest.webmanifest","./icon.svg","./logo.webp","./icon-192.png","./icon-512.png","./styles.css?v=1.2.2","./catalog11.js?v=1.2.2","./catalog11-ui.js?v=1.2.2","./sets11-ui.js?v=1.2.2","./market11-ui.js?v=1.2.2","./fees11.js?v=1.2.2","./fees11-ui.js?v=1.2.2","./finance11.js?v=1.2.2","./finance11-ui.js?v=1.2.2","./cash11.js?v=1.2.2","./cash11-ui.js?v=1.2.2","./shipping11.js?v=1.2.2","./shipping11-ui.js?v=1.2.2","./carddex12.js?v=1.2.2","./vinted12.js?v=1.2.2","./app.js?v=1.2.2"];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('trummcards-mobile-production-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 const url=new URL(req.url);if(!SHELL.some(p=>new URL(p,self.registration.scope).pathname===url.pathname))return;
 event.respondWith(fetch(req).then(resp=>{if(resp.ok){const clone=resp.clone();caches.open(CACHE).then(c=>c.put(req,clone)).catch(()=>{});}return resp;}).catch(()=>caches.match(req,{ignoreSearch:true})));
});
