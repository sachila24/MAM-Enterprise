const AUTH_KEY = 'mam.auth.session';

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(AUTH_KEY) === '1';
}

export function signIn(): void {
  sessionStorage.setItem(AUTH_KEY, '1');
}

export function signOut(): void {
  sessionStorage.removeItem(AUTH_KEY);
}
