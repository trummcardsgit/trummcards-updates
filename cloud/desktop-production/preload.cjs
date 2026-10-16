'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('trummcardsCloudUpdates',Object.freeze({
  getInfo:()=>ipcRenderer.invoke('updates:info'),
  check:()=>ipcRenderer.invoke('updates:check'),
  install:()=>ipcRenderer.invoke('updates:install'),
  onStatus:cb=>{
    if(typeof cb!=='function')return()=>{};
    const listener=(_event,value)=>cb(value);
    ipcRenderer.on('updates:status',listener);
    return()=>ipcRenderer.removeListener('updates:status',listener);
  }
}));
