#!/usr/bin/env node
// Cloud 1.2.1 PRODUCTION build preparation. Only changes CI checkout; never talks to database.
import fs from 'node:fs';
const root='cloud/';
const desktop=root+'desktop-production/';
const mobile=root+'mobile-production/web/';
const prod='hgdexyvtgfffcasfpjyu',test='cpycfxolqpidfjbhhsmr';
const version='1.2.1';
for(const gate of ['TRUMMCARDS_BACKUP_ACTIVE','TRUMMCARDS_RESTORE_VERIFIED','TRUMMCARDS_PRODUCTION_APPROVED']){
 if(process.env[gate]!=='true')throw Error('Cloud 1.2.1 production preparation missing '+gate);
}
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s,'utf8');
function change(path,fn){
 const previous=read(path),next=fn(previous);
 if(next===previous)throw Error('No production change: '+path);
 write(path,next);
}
function replaceOne(s,from,to){
 if(s.split(from).length!==2)throw Error('Expected exactly one marker: '+from.slice(0,80));
 return s.replace(from,to);
}
const pkg=JSON.parse(read(desktop+'package.json'));
if(pkg.version!=='0.9.0'||pkg.build.appId!=='at.trummcards.cloudproduction'||
 pkg.build.productName!=='TrummCards Cloud'||
 pkg.build.publish?.[0]?.url!=='https://trummcardsgit.github.io/trummcards-updates/cloud-updates/'||
 pkg.build.nsis.shortcutName!=='TrummCards Cloud')throw Error('Windows 1.0/1.1 updater identity must remain unchanged');
for(const n of ['src/carddex12.js','src/vinted12.js','src/kein-bild12.webp','src/image-link12.js'])if(!pkg.build.files.includes(n))throw Error('Missing Windows asset: '+n);
pkg.version=version;pkg.description='TrummCards Cloud 1.2.1 Production – existing inventory and account';
write(desktop+'package.json',JSON.stringify(pkg,null,2)+'\n');
change(desktop+'main.cjs',s=>{
 s=replaceOne(s,'const UPDATE_FEED_ENABLED=false;','const UPDATE_FEED_ENABLED=true;');
 s=s.replaceAll('PRODUKTIONSVORSCHAU','TrummCards Cloud 1.2.1');
 s=s.replaceAll('Automatische Cloud-Updates sind vorbereitet. Freischaltung erst mit dem endgültigen Release.','TrummCards Cloud 1.2.1: Automatische Updates sind aktiviert.');
 return s;
});
change(desktop+'src/app.js',s=>replaceOne(s,'const WRITES_ENABLED = false;','const WRITES_ENABLED = true;'));
change(mobile+'app.js',s=>replaceOne(s,'const WRITES_ENABLED=false;','const WRITES_ENABLED=true;').replaceAll('0.9.0',version));
change(desktop+'src/index.html',s=>{
 s=replaceOne(s,'<div class="warning production-preview-banner"><strong>Produktionsvorschau – noch nicht freigegeben!</strong> Diese Windows-App ist mit TrummCards Production verbunden. Artikel, Einkäufe, Verkäufe, Storno und Bildupload sind bis zur fertigen Datensicherung und Releasefreigabe technisch gesperrt. TEST und Version 1.6.1 bleiben unangetastet.</div>','<div class="warning production-preview-banner"><strong>TrummCards Cloud 1.2.1</strong> – Mit deinem bestehenden Produktivkonto verbunden. Alle bisherigen Artikel, Fotos, Einkäufe und Verkäufe bleiben erhalten.</div>');
 return s.replaceAll('PRODUKTIONSVORSCHAU','CLOUD 1.2');
});
change(mobile+'index.html',s=>{
 s=s.replaceAll('?v=0.9.0','?v='+version);
 s=replaceOne(s,'Die PWA verbindet sich ausschließlich mit der neuen leeren Datenbank <b>TrummCards Production</b>. Artikelanlage, Ein- und Verkäufe sowie Bilduploads bleiben bis zur Freigabe gesperrt.','Bestehende Artikel, Einkäufe, Verkäufe und Fotos werden unverändert aus <b>TrummCards Production</b> geladen.');
 return s.replaceAll('PRODUKTIONSVORSCHAU 0.9.0','TRUMMCARDS CLOUD '+version)
  .replaceAll('VORSCHAU 0.9.0','CLOUD '+version)
  .replaceAll('RELEASE VORSCHAU','RELEASE '+version);
});
change(mobile+'manifest.webmanifest',s=>{
 const m=JSON.parse(s);m.description='TrummCards Cloud 1.2.1 – synchronisierte Pokémon-Karten-Lagerverwaltung';return JSON.stringify(m,null,2)+'\n';
});
change(desktop+'tests/production.test.cjs',s=>{
 s=replaceOne(s,"const isRelease=['1.0.0','1.1.0'].includes(pkg.version);","const isRelease=['1.0.0','1.1.0','1.2.1'].includes(pkg.version);");
 s=replaceOne(s,"['0.9.0','1.0.0','1.1.0'].includes(pkg.version)","['0.9.0','1.0.0','1.1.0','1.2.1'].includes(pkg.version)");
 return replaceOne(s,"'TrummCards Cloud 1.1.0'","'TrummCards Cloud '+pkg.version");
});
const html=read(mobile+'index.html');
if(!html.includes('carddex12.js?v='+version)||!html.includes('vinted12.js?v='+version)||!html.includes('image-link12.js?v='+version)||html.includes('cardscan12.js'))throw Error('Cloud 1.2.1 UI is incomplete or obsolete scanner remains');
const localAssets=['./','./manifest.webmanifest','./icon.svg','./logo.webp','./icon-192.png','./icon-512.png'];
for(const match of html.matchAll(/(?:src|href)="\.\/([^"?#]+\.(?:js|css))(?:\?v=[0-9.]+)?"/g)){
 const file=match[1];if(!fs.existsSync(mobile+file))throw Error('Missing production PWA asset '+file);
 localAssets.push('./'+file+'?v='+version);
}
for(const f of ['app.js','styles.css'])localAssets.push('./'+f+'?v='+version);
const files=[...new Set(localAssets)];
if(files.length<19)throw Error('PWA precache unexpectedly short '+files.length);
change(mobile+'sw.js',s=>{
 s=replaceOne(s,'trummcards-mobile-production-shell-v1','trummcards-mobile-production-shell-v121');
 if(!/const SHELL=\[[^;]*\];/.test(s))throw Error('PWA cache list not found');
 return s.replace(/const SHELL=\[[^;]*\];/,'const SHELL='+JSON.stringify(files)+';');
});
for(const [tag,rootDir] of [['Windows',desktop+'src/'],['PWA',mobile]]){
 const dex=read(rootDir+'carddex12.js'),catalog=read(rootDir+'catalog11.js');
 if(!dex.includes('const NO_IMAGE_DATA_URI=')||!dex.includes('img.src=NO_IMAGE_DATA_URI;')||
 !catalog.includes('searchPrintedFraction')||!read(rootDir+'image-link12.js').includes('window.TrummImageLink12'))throw Error(tag+' is missing verified cards, number search or approved inline artwork');
}
const apps=[desktop+'src/app.js',mobile+'app.js'];
for(const p of apps){const s=read(p);if(!s.includes(prod)||s.includes(test)||!/WRITES_ENABLED\s*=\s*true;/.test(s))throw Error('Unsafe database target or read-only mode: '+p);}
if(!read(desktop+'main.cjs').includes("trummcards-cloud-production")||
 !read(desktop+'main.cjs').includes('const UPDATE_FEED_ENABLED=true;'))throw Error('Windows updater or userData not preserved');
if(!read(mobile+'sw.js').includes('trummcards-mobile-production-shell-v121')||
 !read(mobile+'sw.js').includes('carddex12.js?v='+version))throw Error('PWA update invalid');
console.log('Cloud 1.2.1 production assets prepared safely in CI checkout. NO DATABASE CHANGES. NO DEPLOY.');
