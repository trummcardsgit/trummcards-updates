#!/usr/bin/env node
// TrummCards Cloud 1.2.5 unified Windows/iPhone/Android PWA production staging.
// This changes ONLY a disposable CI checkout of the static PWA; no database writes.
// Existing Electron 1.2.4 updater and all user data remain untouched.
import fs from 'node:fs';
import path from 'node:path';
const root='cloud/mobile-production/web/';
const PROD='hgdexyvtgfffcasfpjyu',TEST='cpycfxolqpidfjbhhsmr';
const version='1.2.5';
for(const gate of ['TRUMMCARDS_BACKUP_ACTIVE','TRUMMCARDS_RESTORE_VERIFIED','TRUMMCARDS_PRODUCTION_APPROVED']){
 if(process.env[gate]!=='true')throw Error('Missing reviewed production gate: '+gate);
}
const read=f=>fs.readFileSync(root+f,'utf8'),write=(f,s)=>fs.writeFileSync(root+f,s,'utf8');
function exact(s,old,newText){const n=s.split(old).length-1;if(n!==1)throw Error('Missing/nonunique release marker ('+n+'): '+old.slice(0,100));return s.replace(old,newText);}
function change(name,transform){const old=read(name),next=transform(old);if(next===old)throw Error('Unchanged staging file: '+name);write(name,next);}
if(!read('app.js').includes("const PROJECT='"+PROD+"';")||read('app.js').includes(TEST))throw Error('Wrong PRODUCTION Supabase project');
if(!read('app.js').includes("const STORE='trummcards-mobile-production-session-v1'"))throw Error('Existing PRODUCTION session must remain usable');
if(!read('app.js').includes('const WRITES_ENABLED=false;'))throw Error('Unexpected PWA source baseline');
if(!read('index.html').includes('class="desktop-bookings-link"')||!read('index.html').includes('id="page-sales"'))throw Error('Missing restored Buchungen page/menu');
if(!read('styles.css').includes('@media (min-width:1080px)')||!read('styles.css').includes('.bottom-nav button.desktop-bookings-link{display:flex}'))throw Error('Missing responsive desktop/mobile navigation');
if(read('styles.css').includes('.bottom-nav button.desktop-bookings-link{display:none'))throw Error('Buchungen hidden at narrow window widths');

change('app.js',s=>exact(s,'const WRITES_ENABLED=false;','const WRITES_ENABLED=true;').replaceAll('0.9.0',version));
change('index.html',s=>{
 s=s.replaceAll('?v=0.9.0','?v='+version);
 s=exact(s,'Melde dich mit deinem TrummCards-Produktivkonto an. Lagerdaten werden später zwischen Windows und PWA synchronisiert. Aktuell sind Buchungen zum Schutz deiner Daten gesperrt.',
  'Melde dich mit deinem bestehenden TrummCards-Konto an. Windows, iPhone und Android verwenden dieselbe Cloud-Lagerverwaltung mit synchronisiertem Bestand.');
 s=exact(s,'Die PWA verbindet sich ausschließlich mit der neuen leeren Datenbank <b>TrummCards Production</b>. Artikelanlage, Ein- und Verkäufe sowie Bilduploads bleiben bis zur Freigabe gesperrt.',
  'Gemeinsame Web-App für Windows, iPhone und Android. Alle Artikel, Bilder, Einkäufe, Verkäufe und Buchungen bleiben in <b>TrummCards Production</b> gespeichert.');
 s=s.replaceAll('PRODUKTIONSVORSCHAU 0.9.0','TRUMMCARDS CLOUD '+version)
  .replaceAll('VORSCHAU 0.9.0','CLOUD '+version)
  .replaceAll('RELEASE VORSCHAU','RELEASE '+version);
 // Avoid confusing preview wording in the booking forms.
 s=s.replaceAll('PRODUCTION · VORSCHAU 0.9.0','CLOUD '+version);
 return s;
});
change('reset-password.html',s=>s.replaceAll('?v=0.9.0','?v='+version));
change('manifest.webmanifest',s=>{
 const m=JSON.parse(s);
 if(m.id!=='./'||m.start_url!=='./'||m.scope!=='./')throw Error('PWA identity/scope must be unchanged for installed users');
 m.name='TrummCards Cloud';m.short_name='TC Cloud';
 m.description='TrummCards Cloud 1.2.5 – gemeinsame PWA für Windows, iPhone und Android';
 return JSON.stringify(m,null,2)+'\n';
});
const html=read('index.html');
if(html.includes('Aktuell sind Buchungen zum Schutz deiner Daten gesperrt.')||html.includes('neuen leeren Datenbank')||html.includes('PRODUKTIONSVORSCHAU'))throw Error('Stale nonfunctional preview warning');
const cacheFiles=['./','./index.html','./manifest.webmanifest','./icon.svg','./logo.webp','./icon-180.png','./icon-192.png','./icon-512.png','./reset-password.html'];
for(const match of html.matchAll(/(?:src|href)="\.\/([^"?#]+\.(?:js|css))(?:\?v=[0-9.]+)?"/g)){
 const file=match[1];if(!fs.existsSync(root+file))throw Error('Missing PWA asset: '+file);
 cacheFiles.push('./'+file+'?v='+version);
}
cacheFiles.push('./reset-password.js?v='+version);
const uniqueFiles=[...new Set(cacheFiles)];
for(const asset of uniqueFiles){const base=asset.split('?')[0];if(base!=='./'&&!fs.existsSync(path.join(root,base)))throw Error('Cannot precache nonexisting asset: '+base);}
if(uniqueFiles.length<22)throw Error('Too few PWA offline assets: '+uniqueFiles.length);
change('sw.js',s=>{
 s=exact(s,'trummcards-mobile-production-shell-v1','trummcards-mobile-production-shell-v125');
 if(!/const SHELL=\[[^;]*\];/.test(s))throw Error('Unexpected service worker format');
 return s.replace(/const SHELL=\[[^;]*\];/,'const SHELL='+JSON.stringify(uniqueFiles)+';');
});
for(const file of ['app.js','index.html','reset-password.js','reset-password.html','manifest.webmanifest','sw.js']){
 const s=read(file);
 if(s.includes(TEST))throw Error('TEST project leaked into LIVE '+file);
}
const app=read('app.js'),sw=read('sw.js'),out=read('index.html');
for(const requirement of ['tc_adjust_inventory','tc_archive_product','inferCatalogImageRoot',"sales:'Buchungen'","const WRITES_ENABLED=true;"]){
 if(!app.includes(requirement))throw Error('Missing app function: '+requirement);
}
for(const script of ['catalog11.js','catalog11-ui.js','carddex12.js','vinted12.js','finance11.js','shipping11.js','cash11.js']){
 if(!out.includes(script+'?v='+version)||!sw.includes(script+'?v='+version))throw Error('Unversioned/missing PWA module: '+script);
}
if(!sw.includes('trummcards-mobile-production-shell-v125')||!sw.includes('styles.css?v='+version))throw Error('Service worker not refreshed');
if(!out.includes('data-go="sales" class="desktop-bookings-link"'))throw Error('Buchungen nav missing');
if(!app.includes("const STORE='trummcards-mobile-production-session-v1'"))throw Error('Release would log out existing installed users');
console.log('Unified TrummCards PWA 1.2.5 safely staged, '+uniqueFiles.length+' cached assets, existing user sessions intact. No DB writes or Windows updater changes.');
