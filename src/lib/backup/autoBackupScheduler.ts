import { getDb } from '../local-db/localDb';
import {
  isDesktopBackupAvailable,
  saveDesktopBackup,
} from './desktopBackupClient';

const AUTO_BACKUP_INTERVAL_MS = 30 * 60 * 1000;

let intervalId: number | null = null;
let closeUnsubscribe: (() => void) | null = null;
let running = false;

async function runAutoBackup(reason: 'interval' | 'close'): Promise<void> {
  if (!isDesktopBackupAvailable() || running) return;
  running = true;
  try {
    await saveDesktopBackup(getDb(), 'auto');
  } catch (error) {
    if (reason === 'close') {
      console.error('[backup] auto backup on close failed', error);
    }
  } finally {
    running = false;
  }
}

export function startAutoBackupScheduler(): void {
  if (!isDesktopBackupAvailable() || intervalId != null) return;

  intervalId = window.setInterval(() => {
    void runAutoBackup('interval');
  }, AUTO_BACKUP_INTERVAL_MS);

  const bridge = window.mamElectron;
  if (bridge?.onAppClosing) {
    closeUnsubscribe = bridge.onAppClosing(() => {
      void runAutoBackup('close').finally(() => {
        bridge.notifyCloseBackupDone?.();
      });
    });
  }
}

export function stopAutoBackupScheduler(): void {
  if (intervalId != null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
  closeUnsubscribe?.();
  closeUnsubscribe = null;
}
