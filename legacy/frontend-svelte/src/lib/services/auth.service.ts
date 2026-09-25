/**
 * Unified Auth Service — works in both Web (SSR) and Tauri (IPC) modes.
 *
 * Web: Auth is handled via form actions in +page.server.ts (cookies httpOnly).
 *      This service is only used for Tauri mode.
 * Tauri: Auth goes through Rust IPC commands and tokens stored in Tauri Store.
 */
import { isTauri } from '$lib/services/platform';
import type { AuthUserInfo } from '$lib/types';

export interface AuthService {
  login(email: string, senha: string): Promise<AuthUserInfo>;
  register(nome: string, email: string, senha: string, confirmar: string): Promise<AuthUserInfo>;
  logout(): Promise<void>;
  restoreSession(): Promise<boolean>;
  getCurrentUser(): Promise<AuthUserInfo | null>;
  isAuthenticated(): Promise<boolean>;
  resendVerification(email: string, nome?: string): Promise<void>;
}

class TauriAuthService implements AuthService {
  private async api() {
    return (await import('$lib/tauri')).auth;
  }

  async login(email: string, senha: string) {
    const api = await this.api();
    return api.login(email, senha);
  }

  async register(nome: string, email: string, senha: string, confirmar: string) {
    const api = await this.api();
    return api.register(nome, email, senha, confirmar);
  }

  async logout() {
    const api = await this.api();
    return api.logout();
  }

  async restoreSession() {
    const api = await this.api();
    return api.restoreSession();
  }

  async getCurrentUser() {
    const api = await this.api();
    return api.getCurrentUser();
  }

  async isAuthenticated() {
    const api = await this.api();
    return api.isAuthenticated();
  }

  async resendVerification(email: string, nome?: string) {
    const api = await this.api();
    return api.resendVerification(email, nome);
  }
}

/**
 * Web auth is handled entirely by server-side form actions.
 * This stub exists only to satisfy the interface;
 * on Web, auth operations happen through <form> POST.
 */
class WebAuthService implements AuthService {
  async login(): Promise<AuthUserInfo> {
    throw new Error('Web auth uses form actions — should not call this directly.');
  }
  async register(): Promise<AuthUserInfo> {
    throw new Error('Web auth uses form actions — should not call this directly.');
  }
  async logout(): Promise<void> {
    throw new Error('Web auth uses form actions — should not call this directly.');
  }
  async restoreSession(): Promise<boolean> {
    return false; // Web uses cookies, session is restored by hooks.server.ts
  }
  async getCurrentUser(): Promise<AuthUserInfo | null> {
    return null; // Web gets user from server-side locals
  }
  async isAuthenticated(): Promise<boolean> {
    return false; // Web checks via server-side locals.session
  }
  async resendVerification(): Promise<void> {
    throw new Error('Web auth uses form actions — should not call this directly.');
  }
}

let _instance: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!_instance) {
    _instance = isTauri() ? new TauriAuthService() : new WebAuthService();
  }
  return _instance;
}
