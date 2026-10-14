// TrummCards Lagerverwaltung - Electron und GitHub Auto-Updates
const {app, BrowserWindow, ipcMain, shell} = require('electron');
const {autoUpdater} = require('electron-updater');
const path = require('path');
const fs = require('fs');
let win = null;
let readyToInstall = false;
let busy = false;
let updateState = {phase:'idle',message:'Updatepruefung noch nicht gestartet.',percent:null,version:null};

if(!app.requestSingleInstanceLock()) app.quit();
else app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus();}});

function publishStatus(next){
  updateState = {...updateState,...next};
  if(win && !win.isDestroyed() && !win.webContents.isDestroyed()){
    win.webContents.send('updates:status',updateState);
  }
}
function backupDirectory(){return path.join(app.getPath('userData'),'backups');}
function createWindow(){
  win = new BrowserWindow({
    width:1280,height:850,minWidth:850,minHeight:600,
    title:'TrummCards Lagerverwaltung',
    icon:path.join(__dirname,'assets','trummcards.ico'),
    webPreferences:{preload:path.join(__dirname,'preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}
  });
  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(({url})=>{
    if(/^https:\/\//i.test(url)) shell.openExternal(url);
    return {action:'deny'};
  });
  win.webContents.on('will-navigate',(event,url)=>{
    if(!url.startsWith('file://'))event.preventDefault();
  });
  win.loadFile(path.join(__dirname,'index.html'));
}
async function checkForUpdates(){
  if(!app.isPackaged){publishStatus({phase:'dev',message:'Updatepruefung ist nur in der installierten EXE aktiv.'});return {ok:false};}
  if(readyToInstall){publishStatus({phase:'ready',message:'Update bereits heruntergeladen. Du kannst es installieren.'});return {ok:true};}
  if(busy)return {ok:false,reason:'busy'};
  busy=true;
  publishStatus({phase:'checking',message:'Suche nach Updates ...',percent:null});
  try{await autoUpdater.checkForUpdates();return {ok:true};}
  catch(err){publishStatus({phase:'error',message:'Updatepruefung fehlgeschlagen: '+err.message});return {ok:false};}
  finally{busy=false;}
}
async function saveBackupBeforeUpdate(){
  if(!win||win.isDestroyed())throw Error('Programmfenster nicht verfuegbar.');
  // Die Funktion liest Lagerdaten UND Artikelbilder aus der laufenden Anwendung.
  const data=await win.webContents.executeJavaScript('window.createTrummcardsUpdateBackup()',true);
  if(typeof data!=='string'||!data.startsWith('{')||data.length>250*1024*1024)throw Error('Ungueltige oder zu grosse Datensicherung.');
  const directory=backupDirectory();
  fs.mkdirSync(directory,{recursive:true});
  const timestamp=new Date().toISOString().replace(/[:.]/g,'-');
  const target=path.join(directory,`TrummCards_v${app.getVersion()}_vor_Update_${timestamp}.json`);
  const tmp=target+'.tmp';
  try{
    fs.writeFileSync(tmp,data,{encoding:'utf8',flag:'wx'});
    fs.renameSync(tmp,target);
  }catch(err){try{fs.unlinkSync(tmp)}catch{}throw err;}
  return target;
}

ipcMain.handle('updates:info',()=>({state:updateState,version:app.getVersion(),packaged:app.isPackaged}));
ipcMain.handle('updates:check',()=>checkForUpdates());
ipcMain.handle('updates:open-backups',async()=>{
  try{const dir=backupDirectory();fs.mkdirSync(dir,{recursive:true});const result=await shell.openPath(dir);return {ok:!result,message:result||''};}
  catch(err){return {ok:false,message:err.message};}
});
ipcMain.handle('updates:install',async()=>{
  if(!readyToInstall)return {ok:false,message:'Noch kein heruntergeladenes Update vorhanden.'};
  publishStatus({phase:'backup',message:'Sichere Einkaeufe, Verkaeufe und Artikelbilder ...'});
  try{
    const backup=await saveBackupBeforeUpdate();
    publishStatus({phase:'installing',message:'Backup erstellt: '+backup+' - Update wird installiert.'});
    // Quit & Install nur nach erfolgreich gesicherter JSON-Datei.
    setImmediate(()=>autoUpdater.quitAndInstall(false,true));
    return {ok:true};
  }catch(err){
    publishStatus({phase:'error',message:'Update NICHT installiert. Backup fehlgeschlagen: '+err.message});
    return {ok:false,message:err.message};
  }
});

autoUpdater.autoDownload=true;
autoUpdater.autoInstallOnAppQuit=false;
autoUpdater.allowPrerelease=false;
autoUpdater.on('checking-for-update',()=>publishStatus({phase:'checking',message:'Suche nach einer neuen Version ...',percent:null}));
autoUpdater.on('update-available',info=>publishStatus({phase:'available',message:'Version '+info.version+' gefunden. Lade Update herunter ...',version:info.version,percent:0}));
autoUpdater.on('update-not-available',()=>publishStatus({phase:'current',message:'Du verwendest bereits die neueste Version.',percent:null}));
autoUpdater.on('download-progress',progress=>publishStatus({phase:'downloading',message:'Update wird heruntergeladen ...',percent:Math.max(0,Math.min(100,Math.round(progress.percent||0)))}));
autoUpdater.on('update-downloaded',info=>{readyToInstall=true;publishStatus({phase:'ready',message:'Version '+info.version+' ist bereit. Vor der Installation wird automatisch ein Backup erstellt.',percent:100,version:info.version});});
autoUpdater.on('error',err=>publishStatus({phase:'error',message:'Update-Fehler: '+err.message}));

app.whenReady().then(()=>{
  createWindow();
  // Startpruefung nach dem Laden der Benutzeroberflaeche; danach alle 12 Stunden.
  win.webContents.once('did-finish-load',()=>setTimeout(()=>{checkForUpdates()},3500));
  setInterval(()=>checkForUpdates(),12*60*60*1000).unref();
});
app.on('window-all-closed',()=>app.quit());
