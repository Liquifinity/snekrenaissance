import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('GitHub Pages static deployment contract', () => {
  test('uses an explicit build-time base path with root as the local default', () => {
    const viteConfig = readFileSync('vite.config.ts', 'utf8');
    expect(viteConfig).toContain("base: process.env.VITE_BASE_PATH ?? '/'");
  });

  test('publishes only the static dist artifact from main with the fork-safe repository subpath', () => {
    const workflowPath = '.github/workflows/deploy-pages.yml';
    expect(existsSync(workflowPath)).toBe(true);
    if (!existsSync(workflowPath)) return;

    const workflow = readFileSync(workflowPath, 'utf8');
    expect(workflow).toContain('branches: [main]');
    expect(workflow).toContain('VITE_BASE_PATH: /${{ github.event.repository.name }}/');
    expect(workflow).not.toContain('VITE_BASE_PATH: /snekrenaissance/');
    expect(workflow).toContain('actions/upload-pages-artifact@v3');
    expect(workflow).toContain('path: dist');
    expect(workflow).toContain('actions/deploy-pages@v5');
    expect(workflow).not.toMatch(/VITE_RANKING|cloudflare|wrangler/i);
  });
});
