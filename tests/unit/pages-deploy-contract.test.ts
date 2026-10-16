import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('GitHub Pages static V1 contract', () => {
  test('builds production assets under the repository subpath', () => {
    const viteConfig = readFileSync('vite.config.ts', 'utf8');
    expect(viteConfig).toContain("mode === 'production' ? '/snekrenaissance/' : '/'");
  });

  test('publishes only the static dist artifact from main', () => {
    const workflowPath = '.github/workflows/deploy-pages.yml';
    expect(existsSync(workflowPath)).toBe(true);
    if (!existsSync(workflowPath)) return;

    const workflow = readFileSync(workflowPath, 'utf8');
    expect(workflow).toContain('branches: [main]');
    expect(workflow).toContain('actions/upload-pages-artifact@v3');
    expect(workflow).toContain('path: dist');
    expect(workflow).toContain('actions/deploy-pages@v5');
    expect(workflow).not.toContain('VITE_RANKING_API_BASE');
  });
});
