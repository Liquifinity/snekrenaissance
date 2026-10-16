import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: process.env.VITE_BASE_PATH ?? '/',
  server: {
    host: true,
    proxy: mode === 'e2e-ranked'
      ? {
          '/rank': {
            target: 'http://127.0.0.1:8787',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/rank/, '')
          }
        }
      : undefined
  },
  build: { sourcemap: true }
}));
