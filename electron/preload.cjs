const { contextBridge, ipcRenderer } = require('electron');

let closingHandler = null;

ipcRenderer.on('mam:app-closing', () => {
  if (typeof closingHandler === 'function') {
    closingHandler();
  }
});

contextBridge.exposeInMainWorld('mamElectron', {
  isDesktop: true,
  print: () => ipcRenderer.invoke('mam:print'),
  backup: {
    save: (envelopeJson) => ipcRenderer.invoke('mam:backup:save', envelopeJson),
    list: () => ipcRenderer.invoke('mam:backup:list'),
    read: (id) => ipcRenderer.invoke('mam:backup:read', id),
    delete: (id) => ipcRenderer.invoke('mam:backup:delete', id),
  },
  onAppClosing: (handler) => {
    closingHandler = handler;
    return () => {
      if (closingHandler === handler) {
        closingHandler = null;
      }
    };
  },
  notifyCloseBackupDone: () => {
    ipcRenderer.send('mam:backup:close-ready');
  },
});
