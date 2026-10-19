'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const get=p=>fs.readFileSync(path.join(root,p),'utf8');
const pkg=JSON.parse(get('package.json'));
const main=get('main.cjs');
const preload=get('preload.cjs');
const app=get('src/app.js');
const html=get('src/index.html');
const css=get('src/styles.css');
const isRelease=['1.0.0','1.1.0'].includes(pkg.version);
assert.ok(['0.9.0','1.0.0','1.1.0'].includes(pkg.version),'Unsupported Cloud version');

test('Cloud production uses a distinct Windows identity and profile',()=>{
 assert.equal(pkg.build.appId,'at.trummcards.cloudproduction');
 assert.equal(pkg.build.productName,'TrummCards Cloud');
 assert.equal(pkg.version,isRelease?pkg.version:'0.9.0');
 assert.ok(main.includes("trummcards-cloud-production"));
 assert.ok(!main.includes("'trummcards-cloud-test'"));
 assert.ok(!main.includes("'trummcards_inventory_v1'"));
 assert.ok(pkg.build.files.includes('preload.cjs'));
});
test('Cloud updater cannot consume the legacy 1.6.1 GitHub Releases latest.yml',()=>{
 const publisher=pkg.build.publish;
 assert.equal(publisher.length,1);
 assert.equal(publisher[0].provider,'generic');
 const feed='https://trummcardsgit.github.io/trummcards-updates/cloud-updates/';
 assert.equal(publisher[0].url,feed);
 assert.ok(main.includes(feed));
 assert.ok(main.includes("provider:'generic'"));
 assert.ok(!main.includes("provider:'github'"));
 assert.ok(!main.includes("TrummCards-Lagerverwaltung-Setup"));
 assert.ok(!main.includes('releases/latest'));
});
test('Updater retains auto-check, auto-download and explicit installation semantics',()=>{
 for(const term of ['electron-updater',"autoUpdater.autoDownload=true","autoUpdater.autoInstallOnAppQuit=false","autoUpdater.checkForUpdates()","autoUpdater.quitAndInstall(false,true)","updates:info","updates:check","updates:install","update-available","update-not-available","download-progress","update-downloaded","12*60*60*1000"])assert.ok(main.includes(term),term);
 assert.ok(main.includes("window.trummcardsCloudIsSaving?.()"));
 assert.ok(preload.includes("contextBridge.exposeInMainWorld('trummcardsCloudUpdates'"));
 assert.ok(main.includes('const UPDATE_FEED_ENABLED='+String(isRelease)+';'));
 assert.ok(!main.includes('autoUpdater.allowPrerelease=true'));
});
test('Production app targets only new Supabase project via public key and isolated auth storage',()=>{
 assert.ok(app.includes("SUPABASE_PROJECT = 'hgdexyvtgfffcasfpjyu'"));
 assert.ok(app.includes("sb_publishable_"));
 assert.ok(app.includes("trummcards-cloud-production-auth-v1"));
 assert.ok(app.includes("trummcards-cloud-production-pending-v1"));
 assert.ok(!app.includes('cpycfxolqpidfjbhhsmr'));
 assert.ok(!app.includes('trummcards-cloud-test-auth'));
 assert.ok(!app.includes('settingsKey'));
 assert.ok(app.includes("window.TrummSupabase.createClient(DEFAULT_URL,PUBLIC_KEY"));
});
test('Preview remains read-only; released version enables controlled business writes',()=>{
 assert.ok(app.includes('const WRITES_ENABLED = '+String(isRelease)+';'));
 for(const fun of ['saveProduct(e)','savePurchase(e)','saveSale(e)','saveImage(e)','voidSale(id)']){
  const start=app.indexOf('async function '+fun);
  assert.ok(start>=0,fun);
  const end=app.indexOf('\n  }',start);
  assert.ok(app.slice(start,end).includes('if(!WRITES_ENABLED)'),fun);
 }
 if(isRelease)assert.ok(html.includes(pkg.version==='1.0.0'?'TrummCards Cloud 1.0 – Produktivbetrieb':'TrummCards Cloud 1.1.0'));
 else assert.ok(html.includes('Produktionsvorschau – noch nicht freigegeben'));
});
test('Windows UI has dedicated update tab and secure preload',()=>{
 for(const id of ['tab-updates','cloudUpdateVersion','cloudUpdateStatus','cloudUpdateProgress','cloudUpdateCheck','cloudUpdateInstall'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('data-tab="updates"'));
 assert.ok(app.includes('initializeCloudUpdater'));
 assert.ok(css.includes('#tab-updates .cloud-updater'));
 assert.ok(main.includes('sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true'));
 assert.ok(html.includes('https://hgdexyvtgfffcasfpjyu.supabase.co'));
 assert.ok(!html.includes('https://*.supabase.co'));
});
