import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// @ts-expect-error The verifier is intentionally a plain ESM Node script.
import { verifyPwaBuild } from '../../scripts/verify-pwa-build.mjs';

const roots: string[] = [];

function makeDist(overrides?: {
  manifest?: Record<string, unknown> | null;
  indexHtml?: string;
  swText?: string | null;
  omitIcons?: string[];
}): string {
  const root = mkdtempSync(join(tmpdir(), 'snek-pwa-'));
  roots.push(root);
  const dist = join(root, 'dist');
  mkdirSync(join(dist, 'icons'), { recursive: true });

  const manifest = overrides?.manifest === null
    ? null
    : overrides?.manifest ?? {
        name: 'SNEK RENAISSANCE',
        short_name: 'SNEK',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        icons: [
          { src: 'icons/snek-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/snek-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/snek-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      };

  if (manifest) {
    writeFileSync(join(dist, 'manifest.webmanifest'), JSON.stringify(manifest));
  }

  writeFileSync(
    join(dist, 'index.html'),
    overrides?.indexHtml ?? '<link rel="manifest" href="/snekrenaissance/manifest.webmanifest">'
  );

  if (overrides?.swText !== null) {
    writeFileSync(
      join(dist, 'sw.js'),
      overrides?.swText ?? [
        'completed-water.jpg',
        'icons/snek-192.png',
        'icons/snek-512.png',
        'icons/snek-maskable-512.png'
      ].join('\n')
    );
  }

  writeFileSync(join(dist, 'completed-water.jpg'), 'fixture');
  for (const icon of ['snek-192.png', 'snek-512.png', 'snek-maskable-512.png']) {
    if (!overrides?.omitIcons?.includes(icon)) {
      writeFileSync(join(dist, 'icons', icon), 'fixture');
    }
  }

  return dist;
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('built PWA verifier', () => {
  it('accepts a complete canonical Pages build fixture', () => {
    expect(() => verifyPwaBuild({
      distDir: makeDist(),
      basePath: '/snekrenaissance/'
    })).not.toThrow();
  });

  it('rejects a missing manifest', () => {
    expect(() => verifyPwaBuild({
      distDir: makeDist({ manifest: null }),
      basePath: '/snekrenaissance/'
    })).toThrow(/manifest/i);
  });

  it('rejects a missing generated service worker', () => {
    expect(() => verifyPwaBuild({
      distDir: makeDist({ swText: null }),
      basePath: '/snekrenaissance/'
    })).toThrow(/sw\.js|service worker/i);
  });

  it('rejects a manifest that violates the install contract', () => {
    expect(() => verifyPwaBuild({
      distDir: makeDist({
        manifest: {
          name: 'Wrong',
          short_name: 'SNEK',
          start_url: '.',
          scope: '.',
          display: 'browser',
          icons: []
        }
      }),
      basePath: '/snekrenaissance/'
    })).toThrow(/manifest/i);
  });

  it('rejects a missing declared install icon', () => {
    expect(() => verifyPwaBuild({
      distDir: makeDist({ omitIcons: ['snek-512.png'] }),
      basePath: '/snekrenaissance/'
    })).toThrow(/snek-512\.png/i);
  });

  it('rejects a manifest link outside the requested Pages base path', () => {
    expect(() => verifyPwaBuild({
      distDir: makeDist({
        indexHtml: '<link rel="manifest" href="/wrong/manifest.webmanifest">'
      }),
      basePath: '/snekrenaissance/'
    })).toThrow(/base path|manifest link/i);
  });

  it('rejects a service worker precache missing completion art or install icons', () => {
    expect(() => verifyPwaBuild({
      distDir: makeDist({ swText: 'icons/snek-192.png\nicons/snek-512.png' }),
      basePath: '/snekrenaissance/'
    })).toThrow(/precache|completed-water|maskable/i);
  });
});
