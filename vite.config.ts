import { defineConfig } from 'vite';

// A short label shown in Settings so you can confirm the phone has the newest build.
const sha = (process.env.GITHUB_SHA ?? 'local').slice(0, 7);
const date = new Date().toISOString().slice(0, 16).replace('T', ' ');

// base './' makes every asset path relative, so the build works at
// https://<user>.github.io/fathomlight/ without hard-coding the repo name.
export default defineConfig({
  base: './',
  define: { __BUILD_ID__: JSON.stringify(`${sha} · ${date} UTC`) },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
});
