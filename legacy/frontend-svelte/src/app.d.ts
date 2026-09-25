import type { AuthUserInfo } from '$lib/server/auth/domain/auth.types';

declare global {
  namespace App {
    interface Locals {
      session: AuthUserInfo | null;
    }
    // interface Error {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }

  // Tauri injects this on the window object in desktop/mobile mode
  interface Window {
    __TAURI_INTERNALS__?: Record<string, unknown>;
  }
}

export {};
