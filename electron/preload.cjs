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
  database: {
    init: () => ipcRenderer.invoke('mam:db:init'),
    migrate: (dbJson) => ipcRenderer.invoke('mam:db:migrate', dbJson),
    sync: (dbJson) => ipcRenderer.invoke('mam:db:sync', dbJson),
    verify: (sourceCounts) => ipcRenderer.invoke('mam:db:verify', sourceCounts),
    health: () => ipcRenderer.invoke('mam:db:health'),
    fullVerify: (sourceCounts) =>
      ipcRenderer.invoke('mam:db:fullVerify', sourceCounts),
    fileStats: () => ipcRenderer.invoke('mam:db:fileStats'),
    counts: () => ipcRenderer.invoke('mam:db:counts'),
    kvGet: (key) => ipcRenderer.sendSync('mam:db:kv:get', key),
    kvSet: (key, value) => ipcRenderer.sendSync('mam:db:kv:set', key, value),
    kvRemove: (key) => ipcRenderer.sendSync('mam:db:kv:remove', key),
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
