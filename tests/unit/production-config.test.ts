import { afterEach, describe, expect, test } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT = resolve(ROOT, '.wrangler.production.jsonc');
const SCRIPT = resolve(ROOT, 'scripts/render-production-wrangler.mjs');

function run(databaseId?: string) {
  const env = { ...process.env } as NodeJS.ProcessEnv;
  if (databaseId === undefined) {
    delete env.CLOUDFLARE_D1_DATABASE_ID;
  } else {
    env.CLOUDFLARE_D1_DATABASE_ID = databaseId;
  }
  return spawnSync(process.execPath, [SCRIPT], {
    cwd: ROOT,
    env,
    encoding: 'utf8'
  });
}

afterEach(() => {
  rmSync(OUTPUT, { force: true });
});

describe('production Wrangler renderer', () => {
  test('rejects missing, placeholder and malformed D1 database ids', () => {
    for (const databaseId of [
      undefined,
      '00000000-0000-0000-0000-000000000000',
      'not-a-uuid'
    ]) {
      const result = run(databaseId);
      expect(result.status).not.toBe(0);
      expect(existsSync(OUTPUT)).toBe(false);
    }
  });

  test('replaces only the production D1 database id', () => {
    const databaseId = '11111111-1111-4111-8111-111111111111';
    const source = JSON.parse(readFileSync(resolve(ROOT, 'wrangler.jsonc'), 'utf8'));

    const result = run(databaseId);
    expect(result.status, result.stderr).toBe(0);

    const rendered = JSON.parse(readFileSync(OUTPUT, 'utf8'));
    expect(rendered.name).toBe(source.name);
    expect(rendered.main).toBe(source.main);
    expect(rendered.compatibility_date).toBe(source.compatibility_date);
    expect(rendered.ratelimits).toEqual(source.ratelimits);
    expect(rendered.d1_databases).toHaveLength(1);
    expect(rendered.d1_databases[0]).toMatchObject({
      binding: 'DB',
      database_name: 'snekrenaissance-leaderboard',
      database_id: databaseId,
      preview_database_id: source.d1_databases[0].preview_database_id,
      migrations_dir: 'migrations'
    });
  });
});
