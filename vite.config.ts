import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { PWA_OPTIONS } from './pwa.config';

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [VitePWA(PWA_OPTIONS)],
  server: { host: true },
  build: { sourcemap: true }
});
