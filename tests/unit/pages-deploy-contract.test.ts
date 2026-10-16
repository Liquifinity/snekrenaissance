import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('GitHub Pages static V1 contract', () => {
  test('uses an explicit build-time base path so non-Pages production builds stay at root', () => {
    const viteConfig = readFileSync('vite.config.ts', 'utf8');
    expect(viteConfig).toContain("base: process.env.VITE_BASE_PATH ?? '/'");

    const cloudflareWorkflow = readFileSync('.github/workflows/deploy-production.yml', 'utf8');
    expect(cloudflareWorkflow).not.toContain('VITE_BASE_PATH');
  });

  test('publishes only the static dist artifact from main with the repository subpath', () => {
    const workflowPath = '.github/workflows/deploy-pages.yml';
    expect(existsSync(workflowPath)).toBe(true);
    if (!existsSync(workflowPath)) return;

    const workflow = readFileSync(workflowPath, 'utf8');
    expect(workflow).toContain('branches: [main]');
    expect(workflow).toContain('VITE_BASE_PATH: /snekrenaissance/');
    expect(workflow).toContain('actions/upload-pages-artifact@v3');
    expect(workflow).toContain('path: dist');
    expect(workflow).toContain('actions/deploy-pages@v5');
    expect(workflow).not.toContain('VITE_RANKING_API_BASE');
  });
});
