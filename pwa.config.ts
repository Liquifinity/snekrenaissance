import type { VitePWAOptions } from 'vite-plugin-pwa';

export const PWA_OPTIONS: Partial<VitePWAOptions> = {
  strategies: 'generateSW',
  registerType: 'prompt',
  manifest: {
    name: 'SNEK RENAISSANCE',
    short_name: 'SNEK',
    start_url: '.',
    scope: '.',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: 'icons/snek-192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: 'icons/snek-512.png',
        sizes: '512x512',
        type: 'image/png'
      },
      {
        src: 'icons/snek-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  },
  workbox: {
    skipWaiting: false,
    clientsClaim: false,
    globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}']
  }
};
