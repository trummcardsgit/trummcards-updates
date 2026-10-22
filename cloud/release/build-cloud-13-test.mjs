// Cloud 1.3 isolated PWA TEST build. Never publishes or changes production.
import fs from 'node:fs';
import path from 'node:path';
const production='hgdexyvtgfffcasfpjyu';
const test='cpycfxolqpidfjbhhsmr';
const prodKey='sb_publishable_JDdbnEq3muaOhp3LsNhBkQ_eJZ0uYEf';
const testKey='sb_publishable_oS2Ri8VlhEqv1XDBwkUahQ_zVEEtyHG';
const source=path.resolve('cloud/mobile-production/web');
const target=path.resolve('cloud/test-13-build');
const marker='1.3.0-test.9';
if(!fs.existsSync(source)||!fs.existsSync(path.join(source,'app.js')))throw Error('Missing PWA source');
if(fs.existsSync(target))fs.rmSync(target,{recursive:true,force:true});
fs.cpSync(source,target,{recursive:true});
for(const name of fs.readdirSync(target)){
 const file=path.join(target,name);
 if(!fs.statSync(file).isFile()||!/[.](js|html|webmanifest|css)$/.test(name))continue;
 let content=fs.readFileSync(file,'utf8');
 content=content.replaceAll(production,test).replaceAll(prodKey,testKey)
 .replaceAll('trummcards-mobile-production-session-v1','trummcards-mobile-test13-session-v1')
 .replaceAll('trummcards-mobile-production-pending-v1','trummcards-mobile-test13-pending-v1')
 .replaceAll('trummcards-mobile-production-shell-','trummcards-mobile-test13-shell-')
 .replaceAll('PRODUCTION','TEST 1.3').replaceAll('Production','TEST 1.3')
 .replaceAll('Produktionsvorschau','TEST-Version').replaceAll('0.9.0',marker);
 if(name==='app.js'){
  if(!content.includes('const WRITES_ENABLED=false;'))throw Error('Unexpected app gate');
  content=content.replace('const WRITES_ENABLED=false;','const WRITES_ENABLED=true;');
  if(!content.includes("cloud13Selected")||!content.includes("tc_pwa_access_role"))throw Error('Cloud13 missing');
 }
 if(name==='sw.js'){
  content=content.replace("'./app.js?v="+marker+"','./styles.css?v="+marker+"'","'./app.js?v="+marker+"','./styles.css?v="+marker+"'");
 }
 if(content.includes(production)||content.includes(prodKey)||content.includes('trummcards-mobile-production-session-v1'))throw Error('Production reference in test output '+name);
 fs.writeFileSync(file,content);
}
const app=fs.readFileSync(path.join(target,'app.js'),'utf8');
if(!app.includes("const PROJECT='"+test+"'")||!app.includes("const WRITES_ENABLED=true;")||!app.includes(testKey))throw Error('TEST isolation failed');
console.log('Cloud 1.3 TEST PWA generated at '+target);
