import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = join(process.cwd(), 'src');
const GAME_ROOT = join(SRC_ROOT, 'game');
const RENDER_ROOT = join(SRC_ROOT, 'render');
const INPUT_ROOT = join(SRC_ROOT, 'input');
const WORLD_TO_CELL_DEFINITION = 'game/grid-topology.ts';
const ACTIVE_V4_RUNTIME_FILES = Object.freeze([
  'main.ts',
  'game/run-state.ts',
  'input/keyboard.ts',
  'input/direction-pad.ts',
  'render/board-camera.ts',
  'render/pixel-snake-presentation.ts',
  'render/snake-renderer.ts',
  'render/food-renderer.ts'
]);
const FORBIDDEN_V4_AUTHORITY = /\b(GridFrame|TurnIntent|queueTurn|pendingTurn|ChaseCameraController|JoystickInput|wrapRebase|buildPixelChaseCameraSnapshot|applyOverviewCamera)\b/;

async function listTypeScriptFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listTypeScriptFiles(path);
    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
  }));
  return nested.flat();
}

describe('SNEK CORE V4 authority boundary', () => {
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

  it('keeps active V4 runtime free of local-frame, joystick and chase authority', async () => {
    const violations: string[] = [];
    for (const repoRelative of ACTIVE_V4_RUNTIME_FILES) {
      const source = await readFile(join(SRC_ROOT, repoRelative), 'utf8');
      if (FORBIDDEN_V4_AUTHORITY.test(source)) violations.push(repoRelative);
    }
    expect(violations).toEqual([]);
  });

  it('keeps RunState on heading + pendingDirection + advanceGridStep only', async () => {
    const source = await readFile(join(GAME_ROOT, 'run-state.ts'), 'utf8');
    expect(source).toMatch(/heading/);
    expect(source).toMatch(/pendingDirection/);
    expect(source).toMatch(/queueDirection/);
    expect(source).toMatch(/advanceGridStep/);
    expect(source).not.toMatch(/\b(GridFrame|TurnIntent|queueTurn|advanceGridMovement|INITIAL_GRID_FRAME)\b/);
    expect(source).not.toMatch(/from ['"]three['"]/);
    expect(source).not.toMatch(/render\//);
  });

  it('removes obsolete V3 authority modules from production', async () => {
    const gameFiles = await readdir(GAME_ROOT);
    const inputFiles = await readdir(INPUT_ROOT);
    const renderFiles = await readdir(RENDER_ROOT);
    expect(gameFiles).not.toContain('grid-frame.ts');
    expect(gameFiles).not.toContain('grid-movement.ts');
    expect(inputFiles).not.toContain('joystick.ts');
    expect(renderFiles).not.toContain('chase-camera.ts');
    expect(renderFiles).not.toContain('overview-camera.ts');
    expect(renderFiles).not.toContain('pixel-camera-presentation.ts');
  });

  it('derives snake presentation from GridCell + heading only', async () => {
    const source = await readFile(join(RENDER_ROOT, 'pixel-snake-presentation.ts'), 'utf8');
    expect(source).toMatch(/cellToWorld/);
    expect(source).toMatch(/quaternionForHeading/);
    expect(source).toMatch(/run\.heading/);
    expect(source).not.toMatch(/\b(GridFrame|run\.frame|quaternionForGridFrame)\b/);
  });

  it('keeps one board camera route in the browser runtime', async () => {
    const source = await readFile(join(SRC_ROOT, 'main.ts'), 'utf8');
    expect(source).toMatch(/BoardCameraController/);
    expect(source).toContain("app.dataset.cameraMode = 'board'");
    expect(source).not.toMatch(/\b(ChaseCameraController|applyOverviewCamera|toggleCamera|JoystickInput)\b/);
  });
});
