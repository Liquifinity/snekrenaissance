import { describe, expect, it } from 'vitest';

describe('PWA configuration contract', () => {
  it('defines the installable SNEK manifest and safe service-worker lifecycle', async () => {
    const { PWA_OPTIONS } = await import('../../pwa.config');

    expect(PWA_OPTIONS.strategies).toBe('generateSW');
    expect(PWA_OPTIONS.registerType).toBe('prompt');
    expect(PWA_OPTIONS.manifest).toMatchObject({
      name: 'SNEK RENAISSANCE',
      short_name: 'SNEK',
      start_url: '.',
      scope: '.',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#ffffff'
    });
    expect(PWA_OPTIONS.workbox).toMatchObject({
      skipWaiting: false,
      clientsClaim: false
    });
    expect(PWA_OPTIONS.workbox?.globPatterns).toContain(
      '**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}'
    );

    expect(PWA_OPTIONS.manifest?.icons).toEqual([
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
    ]);
  });
});
