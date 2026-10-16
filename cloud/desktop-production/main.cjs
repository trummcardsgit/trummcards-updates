'use strict';
// TrummCards Cloud PRODUCTION RELEASE CANDIDATE. No TEST or legacy updater.
const {app,BrowserWindow,ipcMain,shell}=require('electron');
const {autoUpdater}=require('electron-updater');
const path=require('node:path');

// Dedicated updater feed: NOT the legacy GitHub releases/latest.yml.
// This URL is currently unpublished; cannot update until separately approved.
const CLOUD_UPDATE_FEED='https://trummcardsgit.github.io/trummcards-updates/cloud-updates/';
const UPDATE_FEED_ENABLED=false; // Release gate: enable only after signed, verified feed and backups.
let win=null;
let readyToInstall=false;
let checking=false;
let updateState={phase:'preview',message:'Automatische Cloud-Updates sind vorbereitet. Freischaltung erst mit dem endgültigen Release.',percent:null,version:null};

app.setName('TrummCards Cloud');
app.setPath('userData',path.join(app.getPath('appData'),'trummcards-cloud-production'));
if(!app.requestSingleInstanceLock())app.quit();
else app.on('second-instance',()=>{
  const w=BrowserWindow.getAllWindows()[0];
  if(w){if(w.isMinimized())w.restore();w.focus();}
});
function status(next){
  updateState={...updateState,...next};
  if(win&&!win.isDestroyed()&&!win.webContents.isDestroyed())
    win.webContents.send('updates:status',updateState);
}
function createWindow(){
  win=new BrowserWindow({
    width:1350,height:900,minWidth:950,minHeight:630,
    title:'TrummCards Cloud – PRODUKTIONSVORSCHAU',
    icon:path.join(__dirname,'assets','cloud-production.ico'),
    webPreferences:{
      preload:path.join(__dirname,'preload.cjs'),
      sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true
    }
  });
  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(({url})=>{
    if(/^https:\/\//i.test(url))void shell.openExternal(url);
    return {action:'deny'};
  });
  win.webContents.on('will-navigate',(event,url)=>{
    if(url!==win.webContents.getURL())event.preventDefault();
  });
  win.loadFile(path.join(__dirname,'src','index.html'));
}
async function checkForUpdates(){
  if(!app.isPackaged)return {ok:false,message:'Updateprüfung nur in der installierten Windows-App.'};
  if(!UPDATE_FEED_ENABLED){
    status({phase:'preview',message:'Separater Cloud-Updatekanal vorbereitet, aber noch nicht freigegeben.'});
    return {ok:false,message:'Release noch nicht freigegeben.'};
  }
  if(readyToInstall)return {ok:true,message:'Update bereits heruntergeladen.'};
  if(checking)return {ok:false,message:'Prüfung läuft bereits.'};
  checking=true;status({phase:'checking',message:'Cloud-Update wird geprüft …',percent:null});
  try{await autoUpdater.checkForUpdates();return {ok:true};}
  catch(e){status({phase:'error',message:'Cloud-Updateprüfung fehlgeschlagen: '+e.message,percent:null});return {ok:false,message:e.message};}
  finally{checking=false;}
}
ipcMain.handle('updates:info',()=>({
  state:updateState,
  version:app.getVersion(),
  packaged:app.isPackaged,
  feedEnabled:UPDATE_FEED_ENABLED,
  cloudFeed:CLOUD_UPDATE_FEED
}));
ipcMain.handle('updates:check',()=>checkForUpdates());
ipcMain.handle('updates:install',async()=>{
  if(!UPDATE_FEED_ENABLED||!readyToInstall)return {ok:false,message:'Kein freigegebenes Cloud-Update heruntergeladen.'};
  if(!win||win.isDestroyed())return {ok:false,message:'Fenster nicht verfügbar.'};
  // A pending inventory operation must never be cut off by a restart.
  let isSaving=true;
  try{isSaving=await win.webContents.executeJavaScript('Boolean(window.trummcardsCloudIsSaving?.())',true);}
  catch{return {ok:false,message:'Buchungsstatus nicht prüfbar. Update abgebrochen.'};}
  if(isSaving)return {ok:false,message:'Ein Vorgang läuft noch. Bitte danach erneut versuchen.'};
  status({phase:'installing',message:'Cloud-App wird aktualisiert. Lagerdaten liegen weiterhin in Supabase.'});
  setImmediate(()=>autoUpdater.quitAndInstall(false,true));
  return {ok:true};
});

autoUpdater.setFeedURL({provider:'generic',url:CLOUD_UPDATE_FEED});
autoUpdater.autoDownload=true;
autoUpdater.autoInstallOnAppQuit=false;
autoUpdater.allowPrerelease=false;
autoUpdater.on('checking-for-update',()=>status({phase:'checking',message:'Cloud-Updates werden geprüft …',percent:null}));
autoUpdater.on('update-available',i=>status({phase:'available',message:'Neue Cloud-Version '+i.version+'. Download läuft …',version:i.version,percent:0}));
autoUpdater.on('update-not-available',()=>status({phase:'current',message:'Du verwendest die aktuelle Cloud-Version.',percent:null}));
autoUpdater.on('download-progress',p=>status({phase:'downloading',message:'Cloud-Update wird heruntergeladen …',percent:Math.max(0,Math.min(100,Math.round(p.percent||0)))}));
autoUpdater.on('update-downloaded',i=>{readyToInstall=true;status({phase:'ready',message:'Cloud-Version '+i.version+' ist bereit. Jetzt installieren oder später fortfahren.',percent:100,version:i.version});});
autoUpdater.on('error',e=>status({phase:'error',message:'Cloud-Updater: '+e.message,percent:null}));

app.whenReady().then(()=>{
  createWindow();
  win.webContents.once('did-finish-load',()=>{
    if(UPDATE_FEED_ENABLED)setTimeout(()=>void checkForUpdates(),3500);
  });
  if(UPDATE_FEED_ENABLED)setInterval(()=>void checkForUpdates(),12*60*60*1000).unref();
});
app.on('window-all-closed',()=>app.quit());
