import { writable } from 'svelte/store';
import type { ThemeMode } from '$lib/types';
import { theme as themeApi } from '$lib/tauri';

function createThemeStore() {
  const { subscribe, set } = writable<ThemeMode>('dark');

  return {
    subscribe,

    async init() {
      try {
        const mode = await themeApi.get();
        set(mode);
        document.documentElement.setAttribute('data-theme', mode);
      } catch {
        set('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    },

    async setMode(mode: ThemeMode) {
      await themeApi.set(mode);
      set(mode);
      document.documentElement.setAttribute('data-theme', mode);
    },

    async toggle() {
      const newMode = await themeApi.toggle();
      set(newMode);
      document.documentElement.setAttribute('data-theme', newMode);
    }
  };
}

export const themeStore = createThemeStore();
