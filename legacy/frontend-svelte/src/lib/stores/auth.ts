import { writable } from 'svelte/store';
import type { AuthUserInfo } from '$lib/types';
import { isTauri } from '$lib/services/platform';
import { getAuthService } from '$lib/services/auth.service';

function createAuthStore() {
  const { subscribe, set, update } = writable<{
    user: AuthUserInfo | null;
    isAuthenticated: boolean;
    loading: boolean;
  }>({
    user: null,
    isAuthenticated: false,
    loading: true,
  });

  return {
    subscribe,

    /**
     * Login via Tauri IPC. On web, login is handled by form actions.
     */
    async login(email: string, senha: string) {
      if (!isTauri()) throw new Error('Web auth uses form actions.');
      const service = getAuthService();
      const user = await service.login(email, senha);
      set({ user, isAuthenticated: true, loading: false });
      return user;
    },

    /**
     * Register via Tauri IPC. On web, register is handled by form actions.
     */
    async register(nome: string, email: string, senha: string, confirmarSenha: string) {
      if (!isTauri()) throw new Error('Web auth uses form actions.');
      const service = getAuthService();
      const user = await service.register(nome, email, senha, confirmarSenha);
      set({ user, isAuthenticated: true, loading: false });
      return user;
    },

    /**
     * Logout. On Tauri, calls IPC. On web, handled by form action.
     */
    async logout() {
      if (!isTauri()) throw new Error('Web auth uses form actions.');
      const service = getAuthService();
      await service.logout();
      set({ user: null, isAuthenticated: false, loading: false });
    },

    /**
     * Restore session from Tauri Store. On web, session is restored by hooks.server.ts.
     */
    async restore() {
      if (!isTauri()) {
        set({ user: null, isAuthenticated: false, loading: false });
        return false;
      }
      try {
        const service = getAuthService();
        const restored = await service.restoreSession();
        if (restored) {
          const user = await service.getCurrentUser();
          set({ user, isAuthenticated: true, loading: false });
        } else {
          set({ user: null, isAuthenticated: false, loading: false });
        }
        return restored;
      } catch {
        set({ user: null, isAuthenticated: false, loading: false });
        return false;
      }
    },

    /**
     * Refresh current user data.
     */
    async refresh() {
      if (!isTauri()) return;
      const service = getAuthService();
      const user = await service.getCurrentUser();
      update(s => ({ ...s, user }));
    },

    /**
     * Set the user session from SSR data (web mode).
     * Called from +layout.svelte when session data comes from server.
     */
    setFromServerSession(session: AuthUserInfo | null) {
      set({
        user: session,
        isAuthenticated: !!session,
        loading: false,
      });
    },

    setLoading(loading: boolean) {
      update(s => ({ ...s, loading }));
    }
  };
}

export const authStore = createAuthStore();
