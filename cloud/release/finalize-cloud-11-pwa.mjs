#!/usr/bin/env node
// Complete the production PWA precache in the isolated release runner.
import fs from 'node:fs';
const root='cloud/mobile-production/web/';
const html=fs.readFileSync(root+'index.html','utf8');
const swPath=root+'sw.js';
let sw=fs.readFileSync(swPath,'utf8');
const entries=['./','./manifest.webmanifest','./icon.svg','./logo.webp','./icon-192.png','./icon-512.png'];
for (const m of html.matchAll(/(?:src|href)="\.\/([^"?#]+\.(?:js|css))(?:\?v=1\.1\.0)?"/g)) {
  const filename=m[1];
  if (!fs.existsSync(root+filename)) throw Error('Missing production asset: '+filename);
  entries.push('./'+filename+'?v=1.1.0');
}
for (const f of ['app.js','styles.css']) entries.push('./'+f+'?v=1.1.0');
const unique=[...new Set(entries)];
if (unique.length<13) throw Error('Unexpectedly few PWA assets');
const original=/const SHELL=\[[^;]*\];/;
if (!original.test(sw)) throw Error('Service-worker shell marker missing');
sw=sw.replace(original,'const SHELL='+JSON.stringify(unique)+';');
fs.writeFileSync(swPath,sw);
if(!html.includes('v=1.1.0'))throw Error('PWA version not updated');
console.log('PWA 1.1 assets precached: '+unique.length);
