#!/usr/bin/env node
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const expected='hgdexyvtgfffcasfpjyu';
const test='cpycfxolqpidfjbhhsmr';
const d='cloud/desktop-production/';
const w='cloud/mobile-production/web/';
const packageInfo=JSON.parse(read(d+'package.json'));
if(packageInfo.version!=='1.1.0'||packageInfo.build.appId!=='at.trummcards.cloudproduction')throw Error('Windows update identity/version changed');
if(packageInfo.build.publish[0].url!=='https://trummcardsgit.github.io/trummcards-updates/cloud-updates/')throw Error('Windows update feed changed');
const main=read(d+'main.cjs');
if(!main.includes('trummcards-cloud-production')||!main.includes('UPDATE_FEED_ENABLED=true;'))throw Error('Windows profile/updater mismatch');
for(const path of [d+'src/app.js',w+'app.js']){
 const s=read(path);
 if(!s.includes(expected)||s.includes(test)||!/WRITES_ENABLED\s*=\s*true;/.test(s))throw Error('Unsafe endpoint or read-only build: '+path);
}
const html=read(w+'index.html'),sw=read(w+'sw.js');
if(!sw.includes('trummcards-mobile-production-shell-v11'))throw Error('Stale PWA shell cache');
for(const m of html.matchAll(/(?:src|href)="\.\/([^"?#]+\.js)\?v=1\.1\.0"/g)){
 if(!sw.includes('./'+m[1]+'?v=1.1.0'))throw Error('Missing PWA cache entry '+m[1]);
}
if(/PRODUKTIONSVORSCHAU|VORSCHAU 0\.9\.0/.test(read(d+'src/index.html')+'\n'+html))throw Error('Preview labels not removed');
console.log('Cloud 1.1 PRODUCTION staging checks OK; NO DEPLOY');
