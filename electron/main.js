import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  deleteBackupFromDisk,
  listBackupsOnDisk,
  readBackupFromDisk,
  saveBackupToDisk,
} from './backupManager.js';
import {
  closeDatabase,
  getDatabasePath,
  getEntityCounts,
  initializeDatabase,
  kvGet,
  kvRemove,
  kvSet,
  migrateLocalStorageToSQLite,
  verifyMigration,
  verifySqliteHealth,
  syncLocalStorageToSQLite,
} from './database/databaseManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Packaged EXE → always production.
 * Unpacked `electron .` → production unless ELECTRON_DEV=true (electron:dev script).
 */
const isDev = !app.isPackaged && process.env.ELECTRON_DEV === 'true';

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;
let quitAfterBackup = false;
let closeBackupTimer = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: 'MAM Trading',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (isDev) {
    console.log('Running in dev mode');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Running in production mode');
    console.log('Loading:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function finishQuitAfterBackup() {
  if (closeBackupTimer) {
    clearTimeout(closeBackupTimer);
    closeBackupTimer = null;
  }
  quitAfterBackup = true;
  app.quit();
}

ipcMain.handle('mam:print', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    return { ok: false, reason: 'no-window' };
  }

  return new Promise((resolve) => {
    win.webContents.print(
      {
        silent: false,
        printBackground: true,
      },
      (success, failureReason) => {
        resolve({ ok: success, reason: failureReason });
      }
    );
  });
});

ipcMain.handle('mam:backup:save', async (_event, envelopeJson) => {
  if (typeof envelopeJson !== 'string' || !envelopeJson.trim()) {
    throw new Error('Backup payload is empty.');
  }
  return saveBackupToDisk(envelopeJson);
});

ipcMain.handle('mam:backup:list', async () => {
  return listBackupsOnDisk();
});

ipcMain.handle('mam:backup:read', async (_event, id) => {
  return readBackupFromDisk(id);
});

ipcMain.handle('mam:backup:delete', async (_event, id) => {
  await deleteBackupFromDisk(id);
  return { ok: true };
});

ipcMain.on('mam:backup:close-ready', () => {
  finishQuitAfterBackup();
});

// SQLite infrastructure (Phase 1 — sync IPC for future StorageAdapter swap)
ipcMain.on('mam:db:kv:get', (event, key) => {
  try {
    event.returnValue = kvGet(key);
  } catch (err) {
    event.returnValue = null;
    console.error('[SQLite] kv:get failed:', err);
  }
});

ipcMain.on('mam:db:kv:set', (event, key, value) => {
  try {
    kvSet(key, value);
    event.returnValue = true;
  } catch (err) {
    event.returnValue = false;
    console.error('[SQLite] kv:set failed:', err);
  }
});

ipcMain.on('mam:db:kv:remove', (event, key) => {
  try {
    kvRemove(key);
    event.returnValue = true;
  } catch (err) {
    event.returnValue = false;
    console.error('[SQLite] kv:remove failed:', err);
  }
});

ipcMain.handle('mam:db:init', async () => {
  const result = initializeDatabase();
  return { ok: true, path: result.path, created: result.created };
});

ipcMain.handle('mam:db:migrate', async (_event, dbJson) => {
  if (typeof dbJson !== 'string' || !dbJson.trim()) {
    throw new Error('Migration payload is empty.');
  }
  return migrateLocalStorageToSQLite(dbJson);
});

ipcMain.handle('mam:db:verify', async (_event, sourceCounts) => {
  if (!sourceCounts || typeof sourceCounts !== 'object') {
    throw new Error('Verification requires source entity counts.');
  }
  return verifyMigration(sourceCounts);
});

ipcMain.handle('mam:db:sync', async (_event, dbJson) => {
  if (typeof dbJson !== 'string' || !dbJson.trim()) {
    throw new Error('Sync payload is empty.');
  }
  return syncLocalStorageToSQLite(dbJson);
});

ipcMain.handle('mam:db:health', async () => {
  return verifySqliteHealth();
});

ipcMain.handle('mam:db:counts', async () => {
  return {
    counts: getEntityCounts(),
    path: getDatabasePath(),
  };
});

app.whenReady().then(() => {
  try {
    const dbInit = initializeDatabase();
    console.log('[SQLite] Database ready:', dbInit.path);
  } catch (err) {
    console.error('[SQLite] Failed to initialize database:', err);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', (event) => {
  if (quitAfterBackup || !mainWindow) return;
  event.preventDefault();
  mainWindow.webContents.send('mam:app-closing');
  closeBackupTimer = setTimeout(() => {
    finishQuitAfterBackup();
  }, 8000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  closeDatabase();
});
