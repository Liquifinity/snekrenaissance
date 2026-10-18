import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = join(process.cwd(), 'src');
const GAME_ROOT = join(SRC_ROOT, 'game');
const INPUT_ROOT = join(SRC_ROOT, 'input');
const RENDER_ROOT = join(SRC_ROOT, 'render');
const WORLD_TO_CELL_DEFINITION = 'game/grid-topology.ts';
const FORBIDDEN_RETIRED_V1_AUTHORITY = /\b(TrailBuffer|sampleBodyPositions|advanceHead|SNAKE_SPEED|SEGMENT_SPACING|FOOD_PICKUP_RADIUS|SELF_COLLISION_RADIUS|headWrapped|headUnwrapped|bodyPositions|LegacySteeringInput|LegacyChaseCameraSnapshot)\b/;
const FORBIDDEN_V3_RUNSTATE_AUTHORITY = /\b(FlightPose|SteeringInput|advanceFlightPose|createInitialFlightPose|traverseGridSegment|GridCellEntry|quantizeForwardToGridDirection|visibleDirection|TurnIntentQueue|GridMovementClock|queueTurnIntent|LogicalTransition)\b/;
const FORBIDDEN_DISCRETE_INPUT_BRIDGE = /\b(takeIntent|pendingIntent|legacyIntentArmed|LEGACY_INTENT_ACTIVATION_THRESHOLD|LEGACY_INTENT_REARM_THRESHOLD)\b/;
const FORBIDDEN_ACTIVE_LEGACY_AUTHORITY = /\b(FlightPose|advanceFlightPose|traverseGridSegment|quantizeForwardToGridDirection|visibleDirection|TurnIntentQueue|GridMovementClock|queueTurnIntent|JOYSTICK_ACTIVATION_THRESHOLD|JOYSTICK_REARM_THRESHOLD|LogicalTransition|buildRenderTransition|interpolateTransition)\b/;
const ACTIVE_V3_RUNTIME_FILES = Object.freeze([
  'main.ts',
  'game/run-state.ts',
  'input/keyboard.ts',
  'input/joystick.ts',
  'render/chase-camera.ts',
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

  it('keeps active V3 RunState exclusively grid-authoritative', async () => {
    const source = await readFile(join(GAME_ROOT, 'run-state.ts'), 'utf8');
    expect(FORBIDDEN_V3_RUNSTATE_AUTHORITY.test(source)).toBe(false);
    expect(source).not.toMatch(/from ['"]three['"]/);
    expect(source).not.toMatch(/render\//);
    expect(source).toMatch(/INITIAL_GRID_FRAME/);
    expect(source).toMatch(/advanceGridMovement/);
    expect(source).toMatch(/pendingTurn/);
    expect(source).toMatch(/queueTurn/);
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

  it('keeps all active V3 runtime modules free of retired locomotion authority', async () => {
    const violations: string[] = [];

    for (const repoRelative of ACTIVE_V3_RUNTIME_FILES) {
      const source = await readFile(join(SRC_ROOT, repoRelative), 'utf8');
      if (FORBIDDEN_ACTIVE_LEGACY_AUTHORITY.test(source)) violations.push(repoRelative);
    }

    expect(violations).toEqual([]);
  });

  it('keeps FlightTrail out of the active V3 presentation architecture', async () => {
    const renderFiles = await readdir(RENDER_ROOT);
    expect(renderFiles).not.toContain('flight-trail.ts');

    const mainSource = await readFile(join(SRC_ROOT, 'main.ts'), 'utf8');
    expect(mainSource).not.toMatch(/\b(FlightTrail|flightTrail|sampleBehind)\b/);
    expect(mainSource).toContain('snakeRenderer.render(buildPixelSnakeRenderSnapshot(run))');
  });

  it('keeps the pixel snake snapshot on GridCell + GridFrame only', async () => {
    const source = await readFile(join(RENDER_ROOT, 'pixel-snake-presentation.ts'), 'utf8');
    expect(source).not.toMatch(/\b(FlightPose|FlightPresentation|FlightTrail|unwrappedGridPoint|displayedHeadWorld|sampleBehind|visibleDirection)\b/);
    expect(source).toMatch(/cellToWorld/);
    expect(source).toMatch(/quaternionForGridFrame/);
    expect(source).toMatch(/run\.frame/);
  });

  it('keeps historical continuous-navigation modules unreachable from active V3 runtime', async () => {
    const violations: string[] = [];
    const forbidden = /\b(FlightPose|advanceFlightPose|traverseGridSegment|quantizeForwardToGridDirection|FlightPresentation)\b/;

    for (const repoRelative of ACTIVE_V3_RUNTIME_FILES) {
      const source = await readFile(join(SRC_ROOT, repoRelative), 'utf8');
      if (forbidden.test(source)) violations.push(repoRelative);
    }

    expect(violations).toEqual([]);
  });
});
