import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const REQUIRED_ICONS = [
  'icons/snek-192.png',
  'icons/snek-512.png',
  'icons/snek-maskable-512.png'
];

const REQUIRED_PRECACHE_ASSETS = [
  'completed-water.jpg',
  ...REQUIRED_ICONS
];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeBasePath(basePath) {
  const raw = typeof basePath === 'string' && basePath.length > 0 ? basePath : '/';
  const leading = raw.startsWith('/') ? raw : `/${raw}`;
  return leading.endsWith('/') ? leading : `${leading}/`;
}

function readRequired(path, label) {
  invariant(existsSync(path), `Missing ${label}: ${path}`);
  return readFileSync(path, 'utf8');
}

function findManifestHref(indexHtml) {
  const linkTags = indexHtml.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of linkTags) {
    const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1];
    if (!rel?.split(/\s+/).includes('manifest')) continue;
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (href) return href;
  }
  return null;
}

export function verifyPwaBuild({ distDir = 'dist', basePath = '/' } = {}) {
  const dist = resolve(distDir);
  const base = normalizeBasePath(basePath);
  const manifestPath = resolve(dist, 'manifest.webmanifest');
  const swPath = resolve(dist, 'sw.js');
  const indexPath = resolve(dist, 'index.html');

  const manifestText = readRequired(manifestPath, 'manifest.webmanifest');
  const swText = readRequired(swPath, 'generated service worker sw.js');
  const indexHtml = readRequired(indexPath, 'index.html');

  let manifest;
  try {
    manifest = JSON.parse(manifestText);
  } catch {
    throw new Error('Invalid PWA manifest JSON');
  }

  invariant(manifest.name === 'SNEK RENAISSANCE', 'Invalid PWA manifest name');
  invariant(manifest.short_name === 'SNEK', 'Invalid PWA manifest short_name');
  invariant(manifest.start_url === '.', 'Invalid PWA manifest start_url');
  invariant(manifest.scope === '.', 'Invalid PWA manifest scope');
  invariant(manifest.display === 'standalone', 'Invalid PWA manifest display');
  invariant(Array.isArray(manifest.icons), 'Invalid PWA manifest icons');

  for (const iconSrc of REQUIRED_ICONS) {
    const entry = manifest.icons.find((icon) => icon?.src === iconSrc);
    invariant(entry, `PWA manifest missing icon ${iconSrc}`);
    invariant(existsSync(resolve(dist, iconSrc)), `Missing install icon ${iconSrc}`);
  }

  const maskable = manifest.icons.find((icon) => icon?.src === 'icons/snek-maskable-512.png');
  invariant(maskable?.purpose === 'maskable', 'PWA manifest maskable icon contract is invalid');

  invariant(existsSync(resolve(dist, 'completed-water.jpg')), 'Missing completion asset completed-water.jpg');

  const manifestHref = findManifestHref(indexHtml);
  invariant(manifestHref, 'Missing manifest link in index.html');
  const manifestUrl = new URL(manifestHref, `https://snek.invalid${base}`);
  invariant(
    manifestUrl.pathname.startsWith(base) && manifestUrl.pathname.endsWith('/manifest.webmanifest'),
    `Manifest link is outside expected base path ${base}: ${manifestUrl.pathname}`
  );

  for (const asset of REQUIRED_PRECACHE_ASSETS) {
    invariant(swText.includes(asset), `Service worker precache is missing ${asset}`);
  }

  return {
    distDir: dist,
    basePath: base,
    manifestHref: manifestUrl.pathname
  };
}

function readCliArgs(argv) {
  const values = { distDir: 'dist', basePath: '/' };
  for (const arg of argv) {
    if (arg.startsWith('--base=')) values.basePath = arg.slice('--base='.length);
    if (arg.startsWith('--dist=')) values.distDir = arg.slice('--dist='.length);
  }
  return values;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  const result = verifyPwaBuild(readCliArgs(process.argv.slice(2)));
  console.log(`PWA build verified for ${result.basePath}`);
}
