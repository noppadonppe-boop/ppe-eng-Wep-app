import { SESSION_KEY, SESSION_DURATION_MS } from '../config/constants';

export function setSessionExpiry(): void {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  localStorage.setItem(SESSION_KEY, expiresAt.toString());
}

export function hasSessionKey(): boolean {
  return localStorage.getItem(SESSION_KEY) !== null;
}

export function isSessionExpired(): boolean {
  const expiresAt = localStorage.getItem(SESSION_KEY);
  // No key = fresh login (setSessionExpiry hasn't been called yet) → NOT expired
  if (!expiresAt) return false;
  return Date.now() > parseInt(expiresAt, 10);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getRemainingMinutes(): number {
  const expiresAt = localStorage.getItem(SESSION_KEY);
  if (!expiresAt) return 0;
  const remaining = parseInt(expiresAt, 10) - Date.now();
  return Math.max(0, Math.ceil(remaining / 60000));
}
