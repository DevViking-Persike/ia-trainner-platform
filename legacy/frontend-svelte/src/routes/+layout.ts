/**
 * Root layout configuration.
 * When running inside Tauri (TAURI_ENV_ARCH is set during build),
 * SSR is disabled so the app runs as a SPA with client-side routing.
 * When deployed as a web app, SSR remains enabled for full server rendering.
 */
import { isTauri } from '$lib/services/platform';
import { browser } from '$app/environment';

// Disable SSR when running inside Tauri (static SPA mode).
// This is evaluated at build time by SvelteKit.
// TAURI_ENV_ARCH is set automatically by the Tauri CLI.
export const ssr = typeof process !== 'undefined' && process.env?.TAURI_ENV_ARCH ? false : true;

// Prerender only for web builds
export const prerender = typeof process !== 'undefined' && process.env?.TAURI_ENV_ARCH ? false : 'auto';
