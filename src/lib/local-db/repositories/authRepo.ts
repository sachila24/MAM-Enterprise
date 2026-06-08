import { getDb, saveDb } from '../localDb';
import {
  hashAppPassword,
  MIN_APP_PASSWORD_LENGTH,
  normalizeAppAuth,
  verifyAppPassword,
} from '../appAuth';
import type { MamDemoDb } from '../types';

export type ChangePasswordErrorKey =
  | 'passwordCurrentRequired'
  | 'passwordNewRequired'
  | 'passwordConfirmRequired'
  | 'passwordMismatch'
  | 'passwordTooShort'
  | 'passwordCurrentIncorrect'
  | 'passwordSameAsCurrent';

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; errorKey: ChangePasswordErrorKey };

export function getAppAuth(db: MamDemoDb = getDb()) {
  normalizeAppAuth(db);
  return db.app_auth;
}

export async function verifyLoginPassword(
  password: string,
  db: MamDemoDb = getDb()
): Promise<boolean> {
  normalizeAppAuth(db);
  return verifyAppPassword(password, db.app_auth);
}

export async function changeAppPassword(
  input: ChangePasswordInput,
  db: MamDemoDb = getDb()
): Promise<ChangePasswordResult> {
  const current = input.currentPassword.trim();
  const next = input.newPassword;
  const confirm = input.confirmPassword;

  if (!current) {
    return { ok: false, errorKey: 'passwordCurrentRequired' };
  }
  if (!next) {
    return { ok: false, errorKey: 'passwordNewRequired' };
  }
  if (!confirm) {
    return { ok: false, errorKey: 'passwordConfirmRequired' };
  }
  if (next.length < MIN_APP_PASSWORD_LENGTH) {
    return { ok: false, errorKey: 'passwordTooShort' };
  }
  if (next !== confirm) {
    return { ok: false, errorKey: 'passwordMismatch' };
  }

  normalizeAppAuth(db);
  const matches = await verifyAppPassword(current, db.app_auth);
  if (!matches) {
    return { ok: false, errorKey: 'passwordCurrentIncorrect' };
  }

  if (await verifyAppPassword(next, db.app_auth)) {
    return { ok: false, errorKey: 'passwordSameAsCurrent' };
  }

  db.app_auth = await hashAppPassword(next);
  saveDb(db);
  return { ok: true };
}
