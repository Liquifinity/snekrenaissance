import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = join(process.cwd(), 'src');
const GAME_ROOT = join(SRC_ROOT, 'game');
const WORLD_TO_CELL_DEFINITION = 'game/grid-topology.ts';
const FORBIDDEN_V1_AUTHORITY = /\b(TrailBuffer|sampleBodyPositions|advanceHead|applySteering|forwardVector|SNAKE_SPEED|STEERING_RATE|MAX_PITCH|SEGMENT_SPACING|FOOD_PICKUP_RADIUS|SELF_COLLISION_RADIUS)\b/;

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
      if (repoRelative === WORLD_TO_CELL_DEFINITION) continue;

      const source = await readFile(file, 'utf8');
      if (/\bworldToCell\b/.test(source)) violations.push(repoRelative);
    }

    expect(violations).toEqual([]);
  });

  it('contains no active continuous V1 gameplay authority', async () => {
    const violations: string[] = [];

    for (const file of await listTypeScriptFiles(SRC_ROOT)) {
      const repoRelative = relative(SRC_ROOT, file).replaceAll('\\', '/');
      const source = await readFile(file, 'utf8');
      if (FORBIDDEN_V1_AUTHORITY.test(source)) violations.push(repoRelative);
    }

    expect(violations).toEqual([]);
  });

  it('removes the old steering and trail authority modules entirely', async () => {
    const gameFiles = await readdir(GAME_ROOT);
    expect(gameFiles).not.toContain('steering.ts');
    expect(gameFiles).not.toContain('trail.ts');
  });
});
