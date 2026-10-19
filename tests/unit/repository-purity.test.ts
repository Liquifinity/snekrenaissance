import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const packageJson = readFileSync('package.json', 'utf8');
const packageLock = readFileSync('package-lock.json', 'utf8');
const viteConfig = readFileSync('vite.config.ts', 'utf8');
const playwrightConfig = readFileSync('playwright.config.ts', 'utf8');
const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8');

const retiredPaths = [
  '.env.e2e-ranked',
  '.github/workflows/deploy-production.yml',
  'wrangler.jsonc',
  'vitest.worker.config.ts',
  'worker',
  'migrations',
  'scripts/render-production-wrangler.mjs',
  'scripts/smoke-production.mjs',
  'scripts/smoke-production.d.mts',
  'tests/unit/deploy-production.test.ts',
  'tests/unit/production-config.test.ts',
  'tests/unit/production-smoke.test.ts',
  'tests/metrics/grid-tuning.test.ts'
];

describe('public repository purity', () => {
  it('contains no retired backend or Cloudflare artifacts', () => {
    for (const path of retiredPaths) expect(existsSync(path), path).toBe(false);
  });

  it('package scripts and direct dependencies describe only the browser PWA product', () => {
    const manifest = JSON.parse(packageJson) as {
      scripts: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(Object.keys(manifest.scripts).sort()).toEqual([
      'build',
      'dev',
      'test',
      'test:e2e',
      'typecheck',
      'verify:pwa'
    ]);
    expect(manifest.dependencies).toEqual({ three: expect.any(String) });
    expect(manifest.devDependencies).not.toHaveProperty('wrangler');
    expect(packageJson).not.toMatch(/worker|wrangler|ranked/i);
  });

  it('lockfile has no retired direct dependency', () => {
    const lock = JSON.parse(packageLock) as {
      packages?: Record<string, { devDependencies?: Record<string, string> }>;
    };
    expect(lock.packages?.['']?.devDependencies).not.toHaveProperty('wrangler');
  });

  it('Vite, Playwright and CI have no ranked or Worker execution path', () => {
    for (const source of [viteConfig, playwrightConfig, ciWorkflow]) {
      expect(source).not.toMatch(/e2e-ranked|worker:|wrangler|VITE_RANKING|\/rank\b|cloudflare/i);
    }
    expect(playwrightConfig).not.toMatch(/8787|4174|ranked\.spec/i);
    expect(ciWorkflow).toContain("'refactor/**'");
    expect(ciWorkflow).toContain('npm run verify:pwa');
    expect(ciWorkflow).toContain('npm run test:e2e');
  });
});
