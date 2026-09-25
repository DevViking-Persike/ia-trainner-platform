/**
 * Platform detection utility.
 * Determines if the app is running inside a Tauri shell (desktop/mobile)
 * or in a standard web browser (SSR mode).
 */

/**
 * Returns true when running inside Tauri (desktop or mobile).
 * Safe to call during SSR — always returns false on the server.
 */
export function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window;
}

/**
 * Returns true when running in a standard web browser (not Tauri).
 */
export function isWeb(): boolean {
  return !isTauri();
}

/**
 * Returns true only on the server (during SSR).
 */
export function isServer(): boolean {
  return typeof window === 'undefined';
}
