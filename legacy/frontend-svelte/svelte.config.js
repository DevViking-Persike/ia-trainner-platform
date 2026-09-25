import adapterStatic from "@sveltejs/adapter-static";
import adapterAuto from "@sveltejs/adapter-auto";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

// When TAURI_ENV is set (by tauri dev / tauri build), use static adapter (SPA).
// Otherwise use auto adapter for SSR web deployment.
const isTauri = !!process.env.TAURI_ENV_ARCH;

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: isTauri
      ? adapterStatic({ fallback: "index.html" })
      : adapterAuto(),
  },
};

export default config;
