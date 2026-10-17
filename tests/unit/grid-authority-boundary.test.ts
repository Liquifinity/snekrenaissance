import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = join(process.cwd(), 'src');
const GAME_ROOT = join(SRC_ROOT, 'game');
const WORLD_TO_CELL_DEFINITION = 'game/grid-topology.ts';
const FORBIDDEN_RETIRED_V1_AUTHORITY = /\b(TrailBuffer|sampleBodyPositions|advanceHead|SNAKE_SPEED|SEGMENT_SPACING|FOOD_PICKUP_RADIUS|SELF_COLLISION_RADIUS|headWrapped|headUnwrapped|bodyPositions|LegacySteeringInput|LegacyChaseCameraSnapshot)\b/;

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

  it('contains no retired continuous V1 gameplay authority or bridge', async () => {
    const violations: string[] = [];

    for (const file of await listTypeScriptFiles(SRC_ROOT)) {
      const repoRelative = relative(SRC_ROOT, file).replaceAll('\\', '/');
      const source = await readFile(file, 'utf8');
      if (FORBIDDEN_RETIRED_V1_AUTHORITY.test(source)) violations.push(repoRelative);
    }

    expect(violations).toEqual([]);
  });

  it('allows V2.1 continuous logical flight without resurrecting V1 steering/trail modules', async () => {
    const gameFiles = await readdir(GAME_ROOT);
    expect(gameFiles).toContain('flight.ts');
    expect(gameFiles).not.toContain('steering.ts');
    expect(gameFiles).not.toContain('trail.ts');
  });
});
