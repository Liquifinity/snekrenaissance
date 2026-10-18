import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const deployWorkflow = readFileSync(resolve('.github/workflows/deploy-pages.yml'), 'utf8');
const ciWorkflow = readFileSync(resolve('.github/workflows/ci.yml'), 'utf8');

describe('fork-first Pages workflow contract', () => {
  it('derives the Pages base path from the repository name', () => {
    expect(deployWorkflow).toContain('github.event.repository.name');
    expect(deployWorkflow).not.toContain('VITE_BASE_PATH: /snekrenaissance/');
  });

  it('verifies both canonical and synthetic fork PWA builds in CI', () => {
    expect(ciWorkflow).toContain('npm run build -- --base=/snekrenaissance/');
    expect(ciWorkflow).toContain('npm run verify:pwa -- --base=/snekrenaissance/');
    expect(ciWorkflow).toContain('npm run build -- --base=/snek-experiment/');
    expect(ciWorkflow).toContain('npm run verify:pwa -- --base=/snek-experiment/');
  });
});
