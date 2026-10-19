#!/usr/bin/env node
// Mutate the isolated CI checkout only after explicit upgrade gates are satisfied.
import fs from 'node:fs';
const checked = ['TRUMMCARDS_BACKUP_ACTIVE','TRUMMCARDS_RESTORE_VERIFIED','TRUMMCARDS_PRODUCTION_APPROVED'];
if (checked.some(k => process.env[k] !== 'true')) throw Error('Cloud 1.1 upgrade not authorized');
const patches = {
 'cloud/desktop-production/package.json': [['"version": "0.9.0"','"version": "1.1.0"']],
 'cloud/desktop-production/main.cjs': [['const UPDATE_FEED_ENABLED=false;','const UPDATE_FEED_ENABLED=true;']],
 'cloud/desktop-production/src/app.js': [['const WRITES_ENABLED = false;','const WRITES_ENABLED = true;']],
 'cloud/mobile-production/web/app.js': [['const WRITES_ENABLED=false;','const WRITES_ENABLED=true;']],
 'cloud/mobile-production/web/index.html': [['?v=0.9.0','?v=1.1.0']],
 'cloud/mobile-production/web/sw.js': [['trummcards-mobile-production-shell-v1','trummcards-mobile-production-shell-v11'],['?v=0.9.0','?v=1.1.0']]
};
for (const [path, pairs] of Object.entries(patches)) {
 let s=fs.readFileSync(path,'utf8');
 for(const [oldText,newText] of pairs){if(!s.includes(oldText))throw Error('Missing marker: '+path);s=s.replaceAll(oldText,newText);}
 fs.writeFileSync(path,s);
}
console.log('Cloud 1.1 production sources prepared in isolated checkout, no deployment');
