// Runner-only Cloud 1.1 TEST build. Never run for PROD or publish to cloud-updates.
import fs from 'node:fs';
import path from 'node:path';
if(process.env.TRUMMCARDS_TEST11_ENABLE!=='I_ACKNOWLEDGE_TEST_ONLY')throw Error('TEST build gate missing');
if(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REF!=='refs/heads/feature/cloud-1.1-unified')throw Error('TEST build refuses non-feature branch');
const PROD='hgdexyvtgfffcasfpjyu',TEST='cpycfxolqpidfjbhhsmr';
const PROD_KEY='sb_publishable_JDdbnEq3muaOhp3LsNhBkQ_eJZ0uYEf';
const TEST_KEY='sb_publishable_oS2Ri8VlhEqv1XDBwkUahQ_zVEEtyHG';
const VERSION='1.1.0-test.2',desk='cloud/desktop-production',web='cloud/mobile-production/web';
const read=f=>fs.readFileSync(path.resolve(f),'utf8');
const write=(f,s)=>fs.writeFileSync(path.resolve(f),s,'utf8');
const changed=[];
function change(f,fn){const old=read(f),next=fn(old);if(old===next)throw Error('Unchanged '+f);write(f,next);changed.push(f);}
function replaceOne(s,old,rep){const count=s.split(old).length-1;if(count!==1)throw Error('Expected one occurrence; got '+count+': '+old.slice(0,55));return s.replace(old,rep);}
const proj=s=>s.replaceAll(PROD,TEST).replaceAll(PROD_KEY,TEST_KEY);
change(desk+'/src/app.js',s=>replaceOne(proj(s),'const WRITES_ENABLED = false;','const WRITES_ENABLED = true;')
 .replaceAll('trummcards-cloud-production-pending-v1','trummcards-cloud-test11-pending-v1')
 .replaceAll('trummcards-cloud-production-auth-v1','trummcards-cloud-test11-auth-v1')
 .replaceAll('cloud-production-0.9.0','cloud-test11-'+VERSION)
 .replaceAll('PRODUCTION','TEST 1.1').replaceAll('Production','TEST 1.1')
 .replaceAll('Produktionsvorschau','TEST-Version'));
change(desk+'/src/index.html',s=>proj(s).replaceAll('PRODUKTIONSVORSCHAU','TEST 1.1')
 .replaceAll('<title>TrummCards Cloud</title>','<title>TrummCards Cloud 1.1 TEST</title>'));
change(desk+'/main.cjs',s=>{
 s=replaceOne(s,"app.setName('TrummCards Cloud');","app.setName('TrummCards Cloud 1.1 TEST');");
 s=replaceOne(s,"'trummcards-cloud-production'))","'trummcards-cloud-test11'))");
 s=replaceOne(s,"const CLOUD_UPDATE_FEED='https://trummcardsgit.github.io/trummcards-updates/cloud-updates/';","const CLOUD_UPDATE_FEED='https://example.invalid/test11-no-updates/';");
 if(!s.includes('const UPDATE_FEED_ENABLED=false;'))throw Error('Updater gate must be disabled');
 return s.replaceAll('PRODUKTIONSVORSCHAU','TEST 1.1');
});
change(desk+'/package.json',s=>{
 const p=JSON.parse(s);
 if(p.build.appId!=='at.trummcards.cloudproduction'||p.version!=='0.9.0')throw Error('Unexpected Windows baseline');
 p.name='trummcards-cloud-test11';p.version=VERSION;p.description='TrummCards Cloud 1.1 TEST on existing TEST Supabase';
 p.build.appId='at.trummcards.cloudtest11';p.build.productName='TrummCards Cloud 1.1 TEST';
 p.build.nsis.shortcutName='TrummCards Cloud 1.1 TEST';
 p.build.artifactName='TrummCards-Cloud-11-TEST-Setup-1.1.0-test.2.exe';
 p.build.publish=[{provider:'generic',url:'https://example.invalid/test11-no-updates/'}];
 p.scripts.dist='npm run bundle && node --check main.cjs && node --check src/app.js && python scripts/make-icon.py && electron-builder --win nsis --publish never';
 return JSON.stringify(p,null,2)+'\n';
});
change(web+'/app.js',s=>replaceOne(proj(s),'const WRITES_ENABLED=false;','const WRITES_ENABLED=true;')
 .replaceAll('trummcards-mobile-production-session-v1','trummcards-mobile-test11-session-v1')
 .replaceAll('trummcards-mobile-production-pending-v1','trummcards-mobile-test11-pending-v1')
 .replaceAll('PRODUCTION','TEST 1.1').replaceAll('Production','TEST 1.1')
 .replaceAll('Produktionsvorschau','TEST-Version').replaceAll('0.9.0',VERSION));
change(web+'/index.html',s=>s.replaceAll('0.9.0',VERSION).replaceAll('PRODUCTION','TEST 1.1')
 .replaceAll('Produktivkonto','TEST-Konto').replaceAll('Produktionsvorschau','TEST-Version'));
change(web+'/reset-password.js',s=>proj(s).replaceAll('PRODUCTION','TEST 1.1')
 .replaceAll('trummcards-mobile-production-session-v1','trummcards-mobile-test11-session-v1'));
change(web+'/reset-password.html',s=>proj(s).replaceAll('0.9.0',VERSION)
 .replaceAll('PRODUCTION','TEST 1.1').replaceAll('Produktivbenutzers','TEST-Benutzers'));
change(web+'/manifest.webmanifest',s=>{
 const m=JSON.parse(s);m.name='TrummCards Cloud 1.1 TEST';m.short_name='TC 1.1 TEST';
 m.description='Separate Testausgabe – nur Supabase TEST';return JSON.stringify(m,null,2)+'\n';
});
change(web+'/sw.js',s=>{
 s=s.replaceAll('trummcards-mobile-production-shell-','trummcards-mobile-test11-shell-').replaceAll('0.9.0',VERSION);
 const old="'./app.js?v="+VERSION+"','./styles.css?v="+VERSION+"'";
 const addition=['catalog11.js','catalog11-ui.js','sets11-ui.js','market11-ui.js','fees11.js','fees11-ui.js','finance11.js','finance11-ui.js','cash11.js','cash11-ui.js','shipping11.js','shipping11-ui.js'].map(x=>",'./"+x+"?v="+VERSION+"'").join('');
 return replaceOne(s,old,old+addition);
});
for(const f of changed){
 const s=read(f);
 if(s.includes(PROD)||s.includes(PROD_KEY))throw Error('PROD identifier leaked into TEST build: '+f);
}
for(const f of [desk+'/src/app.js',web+'/app.js']){
 const s=read(f);
 if(!/const WRITES_ENABLED\s*=\s*true;/.test(s)||!s.includes(TEST)||!s.includes(TEST_KEY))throw Error('TEST client not properly redirected: '+f);
}
const p=JSON.parse(read(desk+'/package.json'));
if(p.build.appId!=='at.trummcards.cloudtest11'||p.build.publish[0].url.includes('cloud-updates')||
 !read(desk+'/main.cjs').includes('const UPDATE_FEED_ENABLED=false;'))throw Error('TEST Windows app identity/updater not safe');
console.log('TEST 1.1 isolated: '+changed.length+' files use TEST project; no PROD identifiers in affected clients.');
