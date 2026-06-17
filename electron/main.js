import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  deleteBackupFromDisk,
  listBackupsOnDisk,
  readBackupFromDisk,
  saveBackupToDisk,
} from './backupManager.js';

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

app.whenReady().then(() => {
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
