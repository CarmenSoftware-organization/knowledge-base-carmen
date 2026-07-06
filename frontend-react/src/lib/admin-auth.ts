/**
 * Session-scoped admin key store. The key lives only in sessionStorage (gone
 * when the tab closes) and is attached as X-Admin-Key by admin-fetch. It is
 * never written to localStorage or the bundle.
 */
const STORAGE_KEY = "carmen_admin_key";

export function getAdminKey(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminKey(key: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, key);
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export function clearAdminKey(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("admin-key-cleared"));
  }
}
