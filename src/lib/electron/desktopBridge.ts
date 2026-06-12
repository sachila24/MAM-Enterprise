import type { DesktopBackupListEntry } from '../backup/types';

export interface MamElectronBackupBridge {
  save: (envelopeJson: string) => Promise<DesktopBackupListEntry>;
  list: () => Promise<DesktopBackupListEntry[]>;
  read: (id: string) => Promise<string>;
  delete: (id: string) => Promise<void>;
}

export interface MamElectronBridge {
  isDesktop: boolean;
  print: () => Promise<{ ok: boolean; reason?: string }>;
  backup?: MamElectronBackupBridge;
  onAppClosing?: (handler: () => void) => () => void;
  notifyCloseBackupDone?: () => void;
}

declare global {
  interface Window {
    mamElectron?: MamElectronBridge;
  }
}

export {};
