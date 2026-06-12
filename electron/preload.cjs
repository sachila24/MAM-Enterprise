const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mamElectron', {
  isDesktop: true,
  print: () => ipcRenderer.invoke('mam:print'),
});
