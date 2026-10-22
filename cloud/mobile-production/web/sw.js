'use strict';
const CACHE='trummcards-mobile-production-shell-v138';
const SHELL=["./","./index.html","./manifest.webmanifest","./icon.svg","./logo.webp","./icon-180.png","./icon-192.png","./icon-512.png","./reset-password.html","./styles.css?v=0.9.0","./catalog11.js?v=0.9.0","./image-link12.js?v=0.9.0","./catalog11-ui.js?v=0.9.0","./sets11-ui.js?v=0.9.0","./market11-ui.js?v=0.9.0","./fees11.js?v=0.9.0","./fees11-ui.js?v=0.9.0","./finance11.js?v=0.9.0","./finance11-ui.js?v=0.9.0","./cash11.js?v=0.9.0","./cash11-ui.js?v=0.9.0","./shipping11.js?v=0.9.0","./shipping11-ui.js?v=0.9.0","./carddex12.js?v=0.9.0","./vinted12.js?v=0.9.0","./personal-market13.js?v=0.9.0","./app.js?v=0.9.0","./reset-password.js?v=0.9.0"];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('trummcards-mobile-production-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 const url=new URL(req.url);if(!SHELL.some(p=>new URL(p,self.registration.scope).pathname===url.pathname))return;
 event.respondWith(fetch(req).then(resp=>{if(resp.ok){const clone=resp.clone();caches.open(CACHE).then(c=>c.put(req,clone)).catch(()=>{});}return resp;}).catch(()=>caches.match(req,{ignoreSearch:true})));
});
