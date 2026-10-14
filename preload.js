const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('trummcardsUpdates', {
  getInfo: ()=>ipcRenderer.invoke('updates:info'),
  check: ()=>ipcRenderer.invoke('updates:check'),
  install: ()=>ipcRenderer.invoke('updates:install'),
  openBackups: ()=>ipcRenderer.invoke('updates:open-backups'),
  onStatus: (callback)=>{
    if(typeof callback!=='function') return ()=>{};
    const listener=(_event,status)=>callback(status);
    ipcRenderer.on('updates:status',listener);
    return ()=>ipcRenderer.removeListener('updates:status',listener);
  }
});
