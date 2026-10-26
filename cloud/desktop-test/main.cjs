'use strict';
const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

// Different Electron app ID / user-data directory from the shipped inventory.
app.setName('TrummCards Cloud TEST');
app.setPath('userData', path.join(app.getPath('appData'), 'trummcards-cloud-test'));
if (!app.requestSingleInstanceLock()) app.quit();
else app.on('second-instance', () => {
  const w = BrowserWindow.getAllWindows()[0];
  if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
});
function createWindow() {
  const win = new BrowserWindow({
    width: 1350, height: 900, minWidth: 950, minHeight: 630,
    title: 'TrummCards Cloud TEST - KEINE PRODUKTIVDATEN',
    icon: path.join(__dirname, 'assets', 'cloud-test.ico'),
    webPreferences: {
      sandbox: true, contextIsolation: true, nodeIntegration: false,
      webSecurity: true
    }
  });
  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault();
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
