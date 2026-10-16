import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workflowPath = resolve(import.meta.dirname, '../../.github/workflows/deploy-production.yml');

function readWorkflow(): string {
  return readFileSync(workflowPath, 'utf8');
}

function expectOrdered(source: string, snippets: string[]): void {
  let cursor = -1;
  for (const snippet of snippets) {
    const next = source.indexOf(snippet, cursor + 1);
    expect(next, `Expected workflow to contain ${snippet} after index ${cursor}`).toBeGreaterThan(cursor);
    cursor = next;
  }
}

describe('production deployment workflow contract', () => {
  test('is manual-only, least privilege and production-gated', () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toMatch(/\n\s+push:/);
    expect(workflow).not.toMatch(/\n\s+pull_request:/);
    expect(workflow).toContain('environment: production');
    expect(workflow).toMatch(/permissions:\s*\n\s+contents: read/);
  });

  test('references every required Cloudflare secret', () => {
    const workflow = readWorkflow();

    for (const secret of [
      'CLOUDFLARE_API_TOKEN',
      'CLOUDFLARE_ACCOUNT_ID',
      'CLOUDFLARE_D1_DATABASE_ID'
    ]) {
      expect(workflow).toContain(`secrets.${secret}`);
    }
  });

  test('orders verification, migration, Worker, ranked build, Pages and smoke safely', () => {
    const workflow = readWorkflow();

    expectOrdered(workflow, [
      'npm audit --omit=dev --audit-level=moderate',
      'npm test',
      'npm run test:worker',
      'npm run typecheck',
      'npm run worker:build',
      'npm run build',
      'npm run render:wrangler:production',
      'wrangler deploy --dry-run --config .wrangler.production.jsonc',
      'wrangler d1 migrations list snekrenaissance-leaderboard --remote',
      'wrangler d1 migrations apply snekrenaissance-leaderboard --remote',
      'wrangler deploy --config .wrangler.production.jsonc',
      'VITE_RANKING_API_BASE',
      'wrangler pages deploy dist --project-name snekrenaissance',
      'node scripts/smoke-production.mjs'
    ]);
  });

  test('creates only the canonical Pages project and never creates D1', () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('wrangler pages project list');
    expect(workflow).toContain('wrangler pages project create snekrenaissance --production-branch main');
    expect(workflow).not.toMatch(/wrangler d1 create/);
  });
});
