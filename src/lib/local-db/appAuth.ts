import type { DbAppAuth, MamDemoDb } from './types';

/** Default demo login password (change after first sign-in). */
export const DEFAULT_APP_PASSWORD = 'mam123';

const PBKDF2_ITERATIONS = 100_000;

/** Precomputed hash for {@link DEFAULT_APP_PASSWORD} (PBKDF2-SHA256). */
export const DEFAULT_APP_AUTH: DbAppAuth = {
  password_salt: 'vEornkDNBbYA6PIIA6sDoQ==',
  password_hash: 'aNMGktKafSljMki77W0jAG4WHNJsgzqbx8Xa+QQ/WHg=',
  updated_at: '1970-01-01T00:00:00.000Z',
};

export const MIN_APP_PASSWORD_LENGTH = 6;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function derivePasswordHash(
  password: string,
  saltBase64: string
): Promise<string> {
  const salt = base64ToBytes(saltBase64);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return bytesToBase64(new Uint8Array(derived));
}

export async function hashAppPassword(password: string): Promise<DbAppAuth> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const password_salt = bytesToBase64(saltBytes);
  const password_hash = await derivePasswordHash(password, password_salt);
  return {
    password_hash,
    password_salt,
    updated_at: new Date().toISOString(),
  };
}

export async function verifyAppPassword(
  password: string,
  auth: DbAppAuth
): Promise<boolean> {
  const derived = await derivePasswordHash(password, auth.password_salt);
  if (derived.length !== auth.password_hash.length) return false;
  let mismatch = 0;
  for (let i = 0; i < derived.length; i++) {
    mismatch |= derived.charCodeAt(i) ^ auth.password_hash.charCodeAt(i);
  }
  return mismatch === 0;
}

export function isValidAppAuth(value: unknown): value is DbAppAuth {
  if (typeof value !== 'object' || value === null) return false;
  const auth = value as Record<string, unknown>;
  return (
    typeof auth.password_hash === 'string' &&
    auth.password_hash.length > 0 &&
    typeof auth.password_salt === 'string' &&
    auth.password_salt.length > 0 &&
    typeof auth.updated_at === 'string'
  );
}

export function createDefaultAppAuth(): DbAppAuth {
  return { ...DEFAULT_APP_AUTH, updated_at: new Date().toISOString() };
}

/** Ensure `app_auth` exists (legacy DB / backup without password). */
export function normalizeAppAuth(db: MamDemoDb): void {
  if (!isValidAppAuth(db.app_auth)) {
    db.app_auth = createDefaultAppAuth();
  }
}
