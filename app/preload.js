const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pelihalli', {
  info: () => ipcRenderer.invoke('upd:info'),
  setRepo: repo => ipcRenderer.invoke('upd:setRepo', String(repo || '')),
  check: () => ipcRenderer.invoke('upd:check')
});
