import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = join(process.cwd(), 'src');
const GAME_ROOT = join(SRC_ROOT, 'game');
const INPUT_ROOT = join(SRC_ROOT, 'input');
const RENDER_ROOT = join(SRC_ROOT, 'render');
const WORLD_TO_CELL_DEFINITION = 'game/grid-topology.ts';
const FORBIDDEN_RETIRED_V1_AUTHORITY = /\b(TrailBuffer|sampleBodyPositions|advanceHead|SNAKE_SPEED|SEGMENT_SPACING|FOOD_PICKUP_RADIUS|SELF_COLLISION_RADIUS|headWrapped|headUnwrapped|bodyPositions|LegacySteeringInput|LegacyChaseCameraSnapshot)\b/;
const FORBIDDEN_V2_RUNSTATE_AUTHORITY = /\b(TurnIntentQueue|GridMovementClock|rotateGridFrame|queueTurnIntent|INITIAL_GRID_FRAME|LogicalTransition)\b/;
const FORBIDDEN_DISCRETE_INPUT_BRIDGE = /\b(takeIntent|pendingIntent|legacyIntentArmed|LEGACY_INTENT_ACTIVATION_THRESHOLD|LEGACY_INTENT_REARM_THRESHOLD)\b/;
const FORBIDDEN_ACTIVE_V2_AUTHORITY = /\b(TurnIntentQueue|GridMovementClock|queueTurnIntent|rotateGridFrame|JOYSTICK_ACTIVATION_THRESHOLD|JOYSTICK_REARM_THRESHOLD|LogicalTransition|buildRenderTransition|interpolateTransition)\b/;
const ACTIVE_V22_RUNTIME_FILES = Object.freeze([
  'main.ts',
  'game/run-state.ts',
  'input/keyboard.ts',
  'input/joystick.ts',
  'render/chase-camera.ts',
  'render/flight-presentation.ts',
  'render/pixel-camera-presentation.ts',
  'render/pixel-snake-presentation.ts',
  'render/snake-renderer.ts',
  'render/food-renderer.ts'
]);

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

  it('keeps active V2.2 RunState independent from retired steering and render authority', async () => {
    const source = await readFile(join(GAME_ROOT, 'run-state.ts'), 'utf8');
    expect(FORBIDDEN_V2_RUNSTATE_AUTHORITY.test(source)).toBe(false);
    expect(source).not.toMatch(/from ['"]three['"]/);
    expect(source).not.toMatch(/render\//);
    expect(source).toMatch(/advanceFlightPose/);
    expect(source).toMatch(/traverseGridSegment/);
    expect(source).toMatch(/visibleDirection/);
    expect(source).toMatch(/quantizeForwardToGridDirection/);
  });

  it('removes the legacy discrete movement bridge from active input adapters', async () => {
    const violations: string[] = [];

    for (const file of await listTypeScriptFiles(INPUT_ROOT)) {
      const repoRelative = relative(SRC_ROOT, file).replaceAll('\\', '/');
      const source = await readFile(file, 'utf8');
      if (FORBIDDEN_DISCRETE_INPUT_BRIDGE.test(source)) violations.push(repoRelative);
    }

    expect(violations).toEqual([]);
  });

  it('keeps all active V2.2 runtime modules free of retired discrete V2 authority', async () => {
    const violations: string[] = [];

    for (const repoRelative of ACTIVE_V22_RUNTIME_FILES) {
      const source = await readFile(join(SRC_ROOT, repoRelative), 'utf8');
      if (FORBIDDEN_ACTIVE_V2_AUTHORITY.test(source)) violations.push(repoRelative);
    }

    expect(violations).toEqual([]);
  });

  it('removes FlightTrail from the active V2.2 presentation architecture', async () => {
    const renderFiles = await readdir(RENDER_ROOT);
    expect(renderFiles).not.toContain('flight-trail.ts');

    const mainSource = await readFile(join(SRC_ROOT, 'main.ts'), 'utf8');
    expect(mainSource).not.toMatch(/\b(FlightTrail|flightTrail|sampleBehind)\b/);
    expect(mainSource).toContain('snakeRenderer.render(buildPixelSnakeRenderSnapshot(run))');
  });

  it('keeps the pixel snake snapshot independent from continuous flight presentation', async () => {
    const source = await readFile(join(RENDER_ROOT, 'pixel-snake-presentation.ts'), 'utf8');
    expect(source).not.toMatch(/\b(FlightPose|FlightPresentation|FlightTrail|unwrappedGridPoint|displayedHeadWorld|sampleBehind)\b/);
    expect(source).toMatch(/cellToWorld/);
    expect(source).toMatch(/visibleDirection/);
  });

  it('allows continuous navigation only as camera guidance while preserving pixel placement', async () => {
    const gameFiles = await readdir(GAME_ROOT);
    expect(gameFiles).toContain('flight.ts');
    expect(gameFiles).not.toContain('steering.ts');
    expect(gameFiles).not.toContain('trail.ts');
  });
});
