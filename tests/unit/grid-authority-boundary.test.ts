import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = join(process.cwd(), 'src');
const DEFINITION = 'game/grid-topology.ts';

async function listTypeScriptFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listTypeScriptFiles(path);
    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
  }));

  return nested.flat();
}

describe('grid authority boundary', () => {
  it('keeps worldToCell out of production consumers', async () => {
    const violations: string[] = [];

    for (const file of await listTypeScriptFiles(SRC_ROOT)) {
      const repoRelative = relative(SRC_ROOT, file).replaceAll('\\', '/');
      if (repoRelative === DEFINITION) continue;

      const source = await readFile(file, 'utf8');
      if (/\bworldToCell\b/.test(source)) violations.push(repoRelative);
    }

    expect(violations).toEqual([]);
  });
});
