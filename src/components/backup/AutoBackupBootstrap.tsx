import { useEffect } from 'react';
import {
  startAutoBackupScheduler,
  stopAutoBackupScheduler,
} from '../../lib/backup/autoBackupScheduler';

/** Starts desktop auto-backup interval + close handler once per app session. */
export function AutoBackupBootstrap() {
  useEffect(() => {
    startAutoBackupScheduler();
    return () => stopAutoBackupScheduler();
  }, []);

  return null;
}
