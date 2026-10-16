# SNEK RENAISSANCE Pixel Flight Grid V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the continuous V1 spatial authority with a deterministic 3D voxel-grid Snake while preserving smooth wrap-aware presentation, toroidal identity, local-first product flow, mobile/desktop controls, camera switching, completion flow, and the future ranking seam.

**Architecture:** Gameplay becomes integer-authoritative: `GridCell` + `GridFrame` + exact occupied-cell collision/food/growth. The run publishes immutable logical step snapshots; the render layer derives stable-ID segment transitions, toroidal virtual targets, smooth position/orientation interpolation, voxel geometry, and a deliberately low-resolution frame. Camera, input, UI, persistence, and the preserved legacy ranking backend remain adapters around the V2 simulation core.

**Tech Stack:** TypeScript, Vite, Three.js, Vitest, Playwright, browser-native DOM/Pointer Events, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-16-snek-renaissance-pixel-flight-grid-v2-design.md`

## Global Constraints

- Ruleset ID: `pixel-flight-grid-v2`.
- Baseline logical resolution: `9 × 9 × 9`.
- Baseline `CELL_SIZE = 0.40`.
- `WORLD_SIZE` is derived as `resolution × cellSize`; callers never configure `worldSize` independently.
- Baseline `GRID_STEPS_PER_SECOND = 6.0`.
- Initial snake length: `6` total occupied cells including the head.
- Growth: exactly `+2` occupied cells per food at the approved baseline.
- Canonical V2 score: `foodsCollected`; occupied length is a separate metric.
- `worldToCell()` is debug/test/tooling-only and must not become a gameplay dependency.
- Gameplay positions remain integer `GridCell` values; world-space floats never feed simulation, collision, food, growth, scoring, or persistence.
- Movement enters exactly one face-adjacent cell per logical step; no diagonal logical transitions.
- Orientation authority is `GridFrame`; gameplay does not use continuous yaw/pitch/quaternion authority.
- Toroidal wrap is exact integer modulo on X/Y/Z.
- Self-collision is exact occupied-cell collision with the explicit tail-vacate rule.
- Food occupies one free logical cell and is collected only by cell equality.
- Rendering uses immutable previous/current logical step data plus presentation `alpha`.
- Wrap interpolation uses the spec's virtual-target algorithm for head and body; no full-cube lerp.
- Stable segment correspondence is mandatory across movement/growth/tail removal.
- Visual grid divisions equal `GRID_RESOLUTION`.
- Snake and food presentation are voxel-based and aligned to `CELL_SIZE`.
- Baseline pixel pipeline: `RENDER_SCALE = 0.50`, antialiasing disabled, CSS upscale/pixelation before any shader fallback.
- Baseline chase camera: distance `4.0 cells`, height `2.8 cells`, look-ahead `2.0 cells`, `FOV = 60°`.
- Existing `X` / mobile camera toggle remains available; overview remains front-facing.
- Existing local-first username/player identity flow remains intact.
- Existing V1 personal-best data is preserved; V2 best is stored under a V2-specific record.
- The current unversioned V1 online ranking validator must never receive V2 results silently.
- `300 foods = 100%` remains provisionally unchanged; Phase 7 may recommend a change but may not apply it without explicit product approval/spec amendment.
- V1 design/spec remains historical; do not rewrite it to describe V2 behavior.
- Do not develop V2 directly on `main`; implementation starts from the approved spec/plan line in an isolated feature branch/worktree.

## Review Focus

1. **Turn-frame handedness during vertical flight:** repeated local turns while forward is `±Y` must preserve a valid orthonormal frame and the established left/right/up/down semantics. Covered in Task 2.
2. **Tail-cell entry during growth:** entering the current tail cell is legal only when that exact tail vacates in the same logical step. Covered in Task 4.
3. **Growth + wrap render correspondence:** a new tail segment must never inherit an unrelated previous index or interpolate across the cube. Covered in Task 6.
4. **Long frame stalls / queued turns:** bounded catch-up must preserve step ordering, consume at most one turn per cell, and never expose half-mutated snapshots. Covered in Task 5.
5. **Low-resolution responsive rendering:** DPR, resize, portrait, and landscape must change presentation backing dimensions without changing gameplay coordinates/camera aspect semantics or causing overflow. Covered in Tasks 8 and 13.

---

## File Structure and Responsibility Map

```text
src/
├─ game/
│  ├─ constants.ts                # fixed runtime timing + legacy constants only while migrating
│  ├─ grid-config.ts              # config factory; derived worldSize/totalCells; active V2 ruleset
│  ├─ grid-types.ts               # GridCell/GridDirection/GridFrame/TurnIntent/axis vectors
│  ├─ grid-topology.ts            # cell key/wrap/advance/cellToWorld; restricted worldToCell
│  ├─ grid-frame.ts               # deterministic 90° local-frame rotations
│  ├─ grid-movement.ts            # capacity-2 turn queue + cell-step clock
│  ├─ snake.ts                    # stable-ID occupied segment chain + pendingGrowth
│  ├─ collision.ts                # exact next-cell collision + tail-vacate rule
│  ├─ food.ts                     # free-cell enumeration/selection
│  ├─ logical-transition.ts       # immutable simulation snapshots between committed cell states
│  ├─ run-state.ts                # V2 run orchestration/result/queue/step clock
│  ├─ metrics.ts                  # occupancy/pressure/confinement metrics
│  ├─ progress.ts                 # provisional 300-food completion contract
│  └─ simulation.ts               # existing outer bounded fixed-step clock
├─ input/
│  ├─ input-state.ts              # discrete input primitives
│  ├─ keyboard.ts                 # edge-triggered turn intent + X camera toggle
│  └─ joystick.ts                 # threshold/rearm analog→discrete intent
├─ render/
│  ├─ interpolation.ts            # stable-ID mapping, virtual targets, frame slerp, wrap offsets
│  ├─ pixel-resolution.ts         # internal backing-buffer scale math
│  ├─ scene.ts                    # visual grid + AA-off low-res renderer
│  ├─ snake-renderer.ts           # instanced body voxels + voxel head/eyes
│  ├─ food-renderer.ts            # voxel food
│  ├─ chase-camera.ts             # elevated presentation-frame-aware chase camera
│  └─ overview-camera.ts          # front-facing secondary camera derived from GridConfig
├─ app/
│  ├─ app-controller.ts           # V2 score/persistence wiring + ranking capability guard
│  ├─ app-state.ts
│  ├─ identity.ts                 # historical V1 key + V2 best key
│  ├─ gateway-selection.ts
│  └─ session-gateway.ts          # explicit ruleset capability surface
├─ ui/
│  ├─ hud-view.ts                 # score/length/progress
│  └─ game-over-view.ts           # score-based result
├─ main.ts                        # input drain → fixed simulation → interpolation → render/camera
└─ styles.css                     # pixelated canvas + responsive layout

tests/
├─ unit/
│  ├─ grid-config.test.ts
│  ├─ grid-topology.test.ts
│  ├─ grid-authority-boundary.test.ts
│  ├─ grid-frame.test.ts
│  ├─ grid-movement.test.ts
│  ├─ snake-grid.test.ts
│  ├─ collision.test.ts
│  ├─ food.test.ts
│  ├─ interpolation.test.ts
│  ├─ voxel-renderer.test.ts
│  ├─ pixel-resolution.test.ts
│  ├─ chase-camera.test.ts
│  ├─ identity.test.ts
│  ├─ keyboard.test.ts
│  └─ joystick.test.ts
├─ integration/
│  ├─ grid-run-state.test.ts
│  ├─ grid-game-loop.test.ts
│  ├─ grid-tuning-metrics.test.ts
│  └─ app-flow.test.ts
├─ metrics/
│  └─ grid-tuning.test.ts
└─ e2e/
   ├─ game.spec.ts
   └─ ranked.spec.ts              # preserved seam / V2 non-submission contract
```

### Closed planning decision A — deterministic `GridFrame` rotations

Use the invariant:

```text
right = cross(forward, up)
```

Initial frame:

```text
forward = +Z
up      = +Y
right   = -X
```

This preserves the current chase-view semantics: from the initial view, `left` turns toward world `+X` and `right` toward world `-X`.

For `(F, R, U)`, the formulas are normative:

```text
left:   F' = -R,  R' =  F,  U' =  U
right:  F' =  R,  R' = -F,  U' =  U
up:     F' =  U,  R' =  R,  U' = -F
down:   F' = -U,  R' =  R,  U' =  F
none:   F' =  F,  R' =  R,  U' =  U
```

All operations are signed-axis lookup operations, not float rotations. Every result must satisfy the same handedness invariant.

For **presentation only**, a GridFrame maps to a Three.js/local visual basis as:

```text
local +X = -GridFrame.right
local +Y =  GridFrame.up
local +Z =  GridFrame.forward
```

That makes the approved initial frame an identity visual orientation while keeping the gameplay `right` semantic consistent with the chase view.

### Closed planning decision B — derived/validated world size

No constructor takes `worldSize`.

```ts
export type GridConfigInput = Readonly<{
  resolution: number;
  cellSize: number;
  stepsPerSecond: number;
  initialLength: number;
  growthPerFood: number;
}>;

export type GridConfig = GridConfigInput & Readonly<{
  worldSize: number;
  totalCells: number;
}>;

export function createGridConfig(input: GridConfigInput): GridConfig;
```

The factory validates primitive inputs, then computes:

```text
worldSize = resolution * cellSize
totalCells = resolution ** 3
```

Production code uses `GRID_CONFIG = createGridConfig(...)`. Alternate 8³/9³/10³ experiments use the same factory. No production code constructs a `GridConfig` literal with an independently supplied `worldSize`.

---

## Phase 0 — Baseline and isolated execution line

### Task 0: Establish the implementation worktree and fresh baseline evidence

**Files:** No production changes.

**Interfaces:**
- Consumes: approved spec and this plan.
- Produces: isolated implementation branch/worktree and fresh baseline evidence.

- [ ] **Step 1: Create an isolated worktree/branch**

Use `superpowers:using-git-worktrees` before implementation. Base it on the commit containing both approved spec and this reviewed plan.

Suggested branch:

```text
feat/pixel-flight-grid-v2
```

- [ ] **Step 2: Record repository state**

```bash
git status --short
git rev-parse HEAD
git merge-base HEAD main
```

Expected: clean worktree and an explicit base SHA.

- [ ] **Step 3: Run the existing full baseline**

```bash
npm ci
npm audit --omit=dev --audit-level=moderate
npm test
npm run test:worker
npm run typecheck
npm run worker:build
npm run build
npm run test:e2e
```

Expected: PASS. Any pre-existing failure is investigated before V2 implementation.

- [ ] **Step 4: Commit nothing**

No no-op baseline commit.

---

## Phase 1 — Integer grid authority

### Task 1: Add `GridConfig`, integer cell types, topology, and the conversion authority boundary

**Files:**
- Create: `src/game/grid-config.ts`
- Create: `src/game/grid-types.ts`
- Create: `src/game/grid-topology.ts`
- Test: `tests/unit/grid-config.test.ts`
- Test: `tests/unit/grid-topology.test.ts`
- Test: `tests/unit/grid-authority-boundary.test.ts`

**Interfaces:**
- Produces: `RULESET_ID`, `GridConfigInput`, `GridConfig`, `GRID_CONFIG`, `GridCell`, `GridDirection`, `GridFrame`, `TurnIntent`, `AxisVector`, `cellKey()`, `cellsEqual()`, `directionVector()`, `wrapCellAxis()`, `advanceGridStep()`, `cellToWorld()`, restricted `worldToCell()`.

- [ ] **Step 1: Write failing config tests**

Assertions:

```text
baseline resolution = 9
baseline cellSize = 0.40
baseline worldSize ~= 3.60
baseline totalCells = 729
baseline stepsPerSecond = 6
baseline initialLength = 6
baseline growthPerFood = 2
```

Also reject non-integer/sub-2 resolution, non-positive/non-finite `cellSize`/`stepsPerSecond`, `initialLength` outside `1..totalCells`, and negative/non-integer growth.

- [ ] **Step 2: Run config tests and verify RED**

```bash
npm test -- tests/unit/grid-config.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the config factory**

Required signatures:

```ts
export const RULESET_ID = 'pixel-flight-grid-v2' as const;
export type GridConfigInput = Readonly<{
  resolution: number;
  cellSize: number;
  stepsPerSecond: number;
  initialLength: number;
  growthPerFood: number;
}>;
export type GridConfig = GridConfigInput & Readonly<{
  worldSize: number;
  totalCells: number;
}>;
export function createGridConfig(input: GridConfigInput): GridConfig;
export const GRID_CONFIG: GridConfig;
```

`worldSize` and `totalCells` are derived only.

- [ ] **Step 4: Write failing topology tests**

Cover:

- `cellKey()` uniqueness across all baseline 729 cells;
- exact wrap on positive/negative X/Y/Z;
- `advanceGridStep()` changes one axis only;
- returned wrap metadata identifies axis/sign;
- baseline center `{4,4,4}` maps to world origin;
- adjacent cells differ by exactly one `CELL_SIZE` in presentation space;
- debug `worldToCell(cellToWorld(cell))` round-trip for cell centers.

- [ ] **Step 5: Run topology tests and verify RED**

```bash
npm test -- tests/unit/grid-topology.test.ts
```

Expected: FAIL.

- [ ] **Step 6: Implement topology/conversion APIs**

Required signatures:

```ts
export type GridCell = Readonly<{ x: number; y: number; z: number }>;
export type GridDirection = '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z';
export type TurnIntent = 'left' | 'right' | 'up' | 'down' | 'none';
export type AxisVector = Readonly<{ x: -1 | 0 | 1; y: -1 | 0 | 1; z: -1 | 0 | 1 }>;
export type GridFrame = Readonly<{
  forward: GridDirection;
  right: GridDirection;
  up: GridDirection;
}>;
export type GridStep = Readonly<{
  from: GridCell;
  to: GridCell;
  direction: GridDirection;
  wrappedAxis: 'x' | 'y' | 'z' | null;
  wrapSign: -1 | 0 | 1;
}>;

export function cellKey(cell: GridCell, config?: GridConfig): number;
export function cellsEqual(a: GridCell, b: GridCell): boolean;
export function directionVector(direction: GridDirection): AxisVector;
export function wrapCellAxis(value: number, resolution: number): number;
export function advanceGridStep(cell: GridCell, direction: GridDirection, config?: GridConfig): GridStep;
export function cellToWorld(cell: GridCell, config?: GridConfig): Vec3;
export function worldToCell(world: Vec3, config?: GridConfig): GridCell; // debug/test/tooling only
```

- [ ] **Step 7: Add the `worldToCell()` production-boundary test**

`grid-authority-boundary.test.ts` scans active production gameplay files and fails if `worldToCell` is referenced outside the defining debug/tooling location. Tests/tooling are excluded.

- [ ] **Step 8: Run Phase 1 verification**

```bash
npm test -- tests/unit/grid-config.test.ts tests/unit/grid-topology.test.ts tests/unit/grid-authority-boundary.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/game/grid-config.ts src/game/grid-types.ts src/game/grid-topology.ts tests/unit/grid-config.test.ts tests/unit/grid-topology.test.ts tests/unit/grid-authority-boundary.test.ts
git commit -m "feat: add integer voxel grid authority"
```

---

### Task 2: Implement deterministic `GridFrame` rotations

**Files:**
- Create: `src/game/grid-frame.ts`
- Test: `tests/unit/grid-frame.test.ts`

**Interfaces:**
- Consumes: grid direction/frame types.
- Produces: `INITIAL_GRID_FRAME`, `rotateGridFrame()`, `isValidGridFrame()`.

- [ ] **Step 1: Write failing baseline rotation tests**

Pin exactly:

```text
initial = { forward:+Z, right:-X, up:+Y }
left    = { forward:+X, right:+Z, up:+Y }
right   = { forward:-X, right:-Z, up:+Y }
up      = { forward:+Y, right:-X, up:-Z }
down    = { forward:-Y, right:-X, up:+Z }
```

- [ ] **Step 2: Add exhaustive frame-invariant tests**

Generate all valid signed-axis frames and assert after each of four turns:

- all three axes are perpendicular signed cardinal axes;
- no absolute world axis is reused;
- `right = cross(forward, up)`;
- four repeated left turns return to origin;
- four repeated up turns return to origin;
- left→right and up→down are inverses;
- one turn never returns `-previous.forward`.

- [ ] **Step 3: Run and verify RED**

```bash
npm test -- tests/unit/grid-frame.test.ts
```

Expected: FAIL.

- [ ] **Step 4: Implement exact signed-axis formulas**

```ts
export const INITIAL_GRID_FRAME: GridFrame;
export function rotateGridFrame(frame: GridFrame, intent: TurnIntent): GridFrame;
export function isValidGridFrame(frame: GridFrame): boolean;
```

Use only the formulas fixed above; no gameplay quaternion/Euler math.

- [ ] **Step 5: Run and commit**

```bash
npm test -- tests/unit/grid-frame.test.ts
npm run typecheck
git add src/game/grid-frame.ts tests/unit/grid-frame.test.ts
git commit -m "feat: add deterministic grid frame rotations"
```

---

## Phase 2 — Discrete movement and input intent

### Task 3: Add the turn queue, cell-step clock, and discrete keyboard/joystick adapters

**Files:**
- Create: `src/game/grid-movement.ts`
- Modify: `src/input/input-state.ts`
- Modify: `src/input/keyboard.ts`
- Modify: `src/input/joystick.ts`
- Test: `tests/unit/grid-movement.test.ts`
- Modify/Test: `tests/unit/keyboard.test.ts`
- Modify/Test: `tests/unit/joystick.test.ts`

**Interfaces:**
- Produces: capacity-2 FIFO `TurnIntentQueue`, `GridMovementClock`, `advanceGridMovement()`, edge-triggered keyboard `takeIntent()`, latched joystick `takeIntent()`.

- [ ] **Step 1: Write failing movement tests**

Pin:

- center + initial frame + no turn moves `{4,4,4} -> {4,4,5}`;
- one `left` moves `{4,4,4} -> {5,4,4}`;
- no move changes more than one logical axis;
- wrap happens after one adjacent step;
- FIFO queue capacity is exactly `2`;
- a third enqueue while full returns `false` and does not replace earlier inputs;
- `none` is not stored;
- at most one queued turn is consumed by each logical cell commit;
- equivalent elapsed time split into different dt chunks produces the same number of cell-step callbacks and the same residual alpha.

- [ ] **Step 2: Run and verify RED**

```bash
npm test -- tests/unit/grid-movement.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement movement primitives**

```ts
export const TURN_QUEUE_CAPACITY = 2;
export class TurnIntentQueue {
  enqueue(intent: Exclude<TurnIntent, 'none'>): boolean;
  shift(): TurnIntent;
  clear(): void;
  get size(): number;
}
export class GridMovementClock {
  constructor(readonly stepsPerSecond: number);
  consume(dtSeconds: number, onStep: () => void): number;
  get alpha(): number; // [0,1)
  reset(): void;
}
export function advanceGridMovement(
  cell: GridCell,
  frame: GridFrame,
  intent: TurnIntent,
  config?: GridConfig
): Readonly<{ cell: GridCell; frame: GridFrame; step: GridStep }>;
```

The existing `FixedStepClock` remains the outer bounded time source. `GridMovementClock` schedules cell commits inside that deterministic time.

- [ ] **Step 4: Rewrite keyboard tests around edge-triggered intents**

Assert:

- Left/A emits `left` once per press;
- Right/D emits `right`;
- Up/W emits `up`;
- Down/S emits `down`;
- repeated `keydown` while already held emits nothing new;
- release then press emits again;
- X toggles camera once per press and never becomes movement intent;
- blur clears held state.

- [ ] **Step 5: Implement keyboard `takeIntent()`**

```ts
export class KeyboardInput {
  takeIntent(): TurnIntent;
  // existing attach/blur/camera lifecycle retained
}
```

The adapter buffers at most one not-yet-drained edge intent; the authoritative two-item queue lives in RunState later.

- [ ] **Step 6: Rewrite joystick tests around threshold/rearm**

Pin:

```text
activation = 0.55
rearm      = 0.25
```

Assert dominant-axis resolution, one emission per deflection, no repeated turns while held, rearm only after returning to `<=0.25`, and reset on pointer end/cancel/resize/orientation.

- [ ] **Step 7: Implement joystick `takeIntent()`**

```ts
export const JOYSTICK_ACTIVATION_THRESHOLD = 0.55;
export const JOYSTICK_REARM_THRESHOLD = 0.25;
export class JoystickInput {
  takeIntent(): TurnIntent;
  // pointer lifecycle retained
}
```

- [ ] **Step 8: Verify and commit**

```bash
npm test -- tests/unit/grid-movement.test.ts tests/unit/keyboard.test.ts tests/unit/joystick.test.ts
npm run typecheck
git add src/game/grid-movement.ts src/input/input-state.ts src/input/keyboard.ts src/input/joystick.ts tests/unit/grid-movement.test.ts tests/unit/keyboard.test.ts tests/unit/joystick.test.ts
git commit -m "feat: add discrete voxel movement input"
```

---

## Phase 3 — Body, collision, food, and V2 run authority

### Task 4: Replace continuous trail authority with stable-ID occupied-cell snake state

**Files:**
- Rewrite: `src/game/snake.ts`
- Rewrite: `src/game/collision.ts`
- Rewrite: `src/game/food.ts`
- Test: `tests/unit/snake-grid.test.ts`
- Rewrite/Test: `tests/unit/collision.test.ts`
- Rewrite/Test: `tests/unit/food.test.ts`
- Keep temporarily but remove from active imports: `src/game/trail.ts`

**Interfaces:**
- Produces: `SnakeSegment`, `GridSnakeState`, exact occupancy, `commitSnakeStep()`, `wouldSelfCollide()`, free-cell food APIs.

- [ ] **Step 1: Write failing snake tests**

Required state:

```ts
export type SnakeSegment = Readonly<{ id: number; cell: GridCell }>;
export type GridSnakeState = {
  segments: SnakeSegment[]; // segments[0] is head
  pendingGrowth: number;
  nextSegmentId: number;
};
```

Assertions:

- initial chain has exactly 6 unique cells;
- head starts at the baseline center cell `{4,4,4}`;
- consecutive initial segments are face-adjacent and the initialization does not require a visual wrap discontinuity;
- IDs are unique/stable;
- on a normal step each existing segment moves into its predecessor's previous cell;
- without growth the old tail becomes free;
- `addGrowth(state,2)` increments pending growth but does not fabricate occupied cells immediately;
- each of the next two committed steps births one new ID at the previous tail cell;
- after those two steps length is exactly +2 and pending growth is zero.

Do not over-specify the exact six-cell startup path beyond these invariants; use a deterministic path generator centered in the grid.

- [ ] **Step 2: Run and verify RED**

```bash
npm test -- tests/unit/snake-grid.test.ts
```

Expected: FAIL against the continuous snake model.

- [ ] **Step 3: Implement stable-ID grid snake**

```ts
export type SnakeSegment = Readonly<{ id: number; cell: GridCell }>;
export type GridSnakeState = {
  segments: SnakeSegment[];
  pendingGrowth: number;
  nextSegmentId: number;
};
export function createGridSnake(config?: GridConfig): GridSnakeState;
export function snakeHead(state: GridSnakeState): SnakeSegment;
export function snakeTail(state: GridSnakeState): SnakeSegment;
export function occupiedCellKeys(state: GridSnakeState, config?: GridConfig): Set<number>;
export function addGrowth(state: GridSnakeState, amount: number): void;
export function commitSnakeStep(state: GridSnakeState, nextHead: GridCell): Readonly<{
  previousSegments: readonly SnakeSegment[];
  currentSegments: readonly SnakeSegment[];
  grew: boolean;
  bornSegmentId: number | null;
}>;
```

- [ ] **Step 4: Write exact collision/tail-vacate tests**

Cover occupied non-tail target, free target, legal entry into a tail that vacates, illegal entry into a retained tail when `pendingGrowth>0`, and wrapped target collision on X/Y/Z. No radius/exclusion constants participate.

- [ ] **Step 5: Implement collision**

```ts
export function wouldSelfCollide(
  state: GridSnakeState,
  nextHead: GridCell,
  config?: GridConfig
): boolean;
```

Decision occurs before mutation.

- [ ] **Step 6: Write free-cell food tests**

Cover deterministic free-cell selection, last free cell, full-world bounded failure, exact-cell collection, and absence of pickup-radius logic.

- [ ] **Step 7: Implement food APIs**

```ts
export type FoodSpawnResult =
  | { ok: true; cell: GridCell }
  | { ok: false; reason: 'no-free-cell' };
export function listFreeCells(state: GridSnakeState, config?: GridConfig): GridCell[];
export function spawnGridFood(state: GridSnakeState, rng?: () => number, config?: GridConfig): FoodSpawnResult;
export function isGridFoodCollected(head: GridCell, food: GridCell): boolean;
```

- [ ] **Step 8: Verify and commit**

```bash
npm test -- tests/unit/snake-grid.test.ts tests/unit/collision.test.ts tests/unit/food.test.ts
npm run typecheck
git add src/game/snake.ts src/game/collision.ts src/game/food.ts tests/unit/snake-grid.test.ts tests/unit/collision.test.ts tests/unit/food.test.ts
git commit -m "feat: add exact voxel snake occupancy"
```

---

### Task 5: Rebuild `RunState` around queued intents, cell commits, V2 score, and immutable logical snapshots

**Files:**
- Create: `src/game/logical-transition.ts`
- Rewrite: `src/game/run-state.ts`
- Modify: `src/game/progress.ts` only for terminology if needed; preserve 300-food math.
- Keep: `src/game/simulation.ts` as the outer bounded fixed-step clock.
- Test: `tests/integration/grid-run-state.test.ts`
- Test: `tests/integration/grid-game-loop.test.ts`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: V2 `RunState`, `RunResult`, `queueTurnIntent()`, `stepRun()`, `LogicalTransition`.

- [ ] **Step 1: Define/write failing logical-transition and run-state tests**

```ts
export type LogicalSnapshot = Readonly<{
  segments: readonly SnakeSegment[];
  frame: GridFrame;
}>;
export type LogicalTransition = Readonly<{
  previous: LogicalSnapshot;
  current: LogicalSnapshot;
  headStep: GridStep;
  bornSegmentId: number | null;
}>;

export type RunResult = Readonly<{
  rulesetId: 'pixel-flight-grid-v2';
  score: number;
  foodsCollected: number;
  length: number;
  maxLength: number;
  durationMs: number;
}>;
```

`RunState` must own:

```text
snake
frame
food
foodsCollected
elapsedMs
maxLength
result
turnQueue: TurnIntentQueue
movementClock: GridMovementClock
transition: LogicalTransition | null
renderAlpha: number
```

Assertions:

- new run: length 6, center head, approved initial frame, free-cell food;
- `queueTurnIntent()` honors capacity-2 FIFO;
- logical cell commits occur at 6 steps/s, not every 60 Hz tick;
- each commit consumes at most one queued turn;
- food increments canonical score by exactly 1 and queues +2 growth;
- collision finalizes game-over before invalid occupancy mutation;
- score/length/maxLength semantics are distinct;
- 300 foods remains the completion threshold;
- result carries V2 ruleset ID;
- `transition` is immutable and represents only fully committed before/after logical states.

- [ ] **Step 2: Run and verify RED**

```bash
npm test -- tests/integration/grid-run-state.test.ts
```

Expected: FAIL against current continuous RunState.

- [ ] **Step 3: Implement the V2 run API**

```ts
export function createRun(rng?: () => number, config?: GridConfig): RunState;
export function startRun(state: RunState): RunState;
export function queueTurnIntent(state: RunState, intent: TurnIntent): boolean;
export function stepRun(
  state: RunState,
  dtSeconds: number,
  rng?: () => number,
  config?: GridConfig
): RunState;
```

`queueTurnIntent()` ignores `none`; adapters do not own the authoritative capacity-2 queue.

Each `GridMovementClock` callback commits atomically in this order:

```text
shift <=1 queued turn
→ rotate GridFrame
→ compute adjacent wrapped GridStep
→ exact collision check with tail-vacate semantics
→ on collision: finalize game-over without invalid chain mutation
→ otherwise commit snake step
→ test exact food equality at new head
→ on food: foodsCollected++, score++, pendingGrowth += configured growth, then respawn free-cell food
→ if foodsCollected reaches provisional target: finalize completed
→ build immutable LogicalTransition from complete previous/current snapshots
→ update maxLength/metrics-facing state
```

If food cannot respawn because no free cell exists under an experimental config, keep `food = null`; do not invent an alternative completion threshold. The run may continue until collision. This preserves the explicit 300-food contract during 8³ experiments.

- [ ] **Step 4: Write frame-chunk determinism tests**

Run the same queued-input schedule with equivalent elapsed time chunked as 60 Hz, 30 Hz, and irregular dt. Assert identical head cell, frame, segment IDs/cells, pending growth, score, and phase.

Also inject a bounded large frame stall through the existing outer `FixedStepClock` and assert queue ordering and transition atomicity remain intact.

- [ ] **Step 5: Remove active continuous movement from RunState**

`run-state.ts` must no longer import/use `advanceHead`, continuous steering, `TrailBuffer`, radius collision, or radius food collection.

- [ ] **Step 6: Verify and commit**

```bash
npm test -- tests/integration/grid-run-state.test.ts tests/integration/grid-game-loop.test.ts
npm run typecheck
git add src/game/logical-transition.ts src/game/run-state.ts src/game/progress.ts tests/integration/grid-run-state.test.ts tests/integration/grid-game-loop.test.ts
git commit -m "feat: make voxel grid the run authority"
```

---

## Phase 4 — Presentation-only interpolation

### Task 6: Implement stable-ID wrap interpolation and smooth presentation-frame rotation

**Files:**
- Create: `src/render/interpolation.ts`
- Test: `tests/unit/interpolation.test.ts`

**Interfaces:**
- Consumes: `LogicalTransition`, stable segment IDs, `cellToWorld()`, GridFrame.
- Produces: `RenderTransition`, `interpolateTransition()`, `InterpolatedFrame` and per-segment display-wrap offsets/duplicates.

- [ ] **Step 1: Write failing position interpolation tests**

Cover ordinary adjacency and `8→0` / `0→8` on X/Y/Z. Assert wrapped moves use virtual targets `9` or `-1` and never cross the cube interior. Clamp presentation alpha to `[0,1]`.

- [ ] **Step 2: Write failing stable-ID growth/tail tests**

Assert:

- existing segment IDs map only to their own previous/current cell;
- a new tail ID starts from the previous tail cell;
- tail removal does not shift correspondence;
- born segment during a wrapped transition never originates from an unrelated region;
- later snake mutation cannot mutate the already-built render transition.

- [ ] **Step 3: Write failing presentation-frame tests**

Derive presentation orientation from the planning basis:

```text
visual X = -GridFrame.right
visual Y =  GridFrame.up
visual Z =  GridFrame.forward
```

Assert:

- approved initial frame produces identity orientation;
- `alpha=0` equals previous frame basis;
- `alpha=1` equals current frame basis;
- an intermediate 90° turn is finite and smoothly normalized;
- forward/up/right remain orthogonal within numeric tolerance after quaternion slerp.

Quaternion math is render-only and may use Three.js in this module.

- [ ] **Step 4: Run and verify RED**

```bash
npm test -- tests/unit/interpolation.test.ts
```

Expected: FAIL.

- [ ] **Step 5: Implement render-transition APIs**

```ts
export type SegmentRenderTransition = Readonly<{
  id: number;
  from: GridCell;
  to: GridCell;
  born: boolean;
}>;
export type RenderTransition = Readonly<{
  head: SegmentRenderTransition;
  body: readonly SegmentRenderTransition[];
  previousFrame: GridFrame;
  currentFrame: GridFrame;
}>;
export type InterpolatedFrame = Readonly<{
  forward: Vec3;
  right: Vec3;
  up: Vec3;
  quaternion: Readonly<{ x: number; y: number; z: number; w: number }>;
}>;
export type InterpolatedSegment = Readonly<{
  id: number;
  position: Vec3;
  born: boolean;
  birthAlpha: number;
  displayWrapOffset: Vec3;
  duplicatePosition: Vec3 | null;
}>;
export function buildRenderTransition(logical: LogicalTransition, config?: GridConfig): RenderTransition;
export function interpolateTransition(
  transition: RenderTransition,
  alpha: number,
  config?: GridConfig
): Readonly<{
  head: InterpolatedSegment;
  body: readonly InterpolatedSegment[];
  frame: InterpolatedFrame;
}>;
```

`displayWrapOffset` is the world-space canonicalization offset actually applied at the current alpha (e.g. `-worldSize` after crossing +X). Camera uses this to relocate coherently at the same visual boundary crossing.

- [ ] **Step 6: Verify and commit**

```bash
npm test -- tests/unit/interpolation.test.ts tests/integration/grid-run-state.test.ts
npm run typecheck
git add src/render/interpolation.ts tests/unit/interpolation.test.ts
git commit -m "feat: add wrap aware voxel interpolation"
```

---

## Phase 5 — Voxel and pixel presentation

### Task 7: Replace sphere renderers with cell-scaled voxels and bind the cube grid to logical resolution

**Files:**
- Rewrite: `src/render/snake-renderer.ts`
- Rewrite: `src/render/food-renderer.ts`
- Modify: `src/render/scene.ts`
- Modify/Test: `tests/unit/gameplay-presentation.test.ts`
- Create/Test: `tests/unit/voxel-renderer.test.ts`

**Interfaces:**
- Consumes: interpolated presentation data + GridConfig.
- Produces: voxel snake/food and exactly `GRID_RESOLUTION` visual cells per face.

- [ ] **Step 1: Write failing presentation constants tests**

Pin baseline:

```text
CUBE_GRID_DIVISIONS = 9
SNAKE_VOXEL_SIZE = 0.40 * 0.80 = 0.32
FOOD_VOXEL_SIZE = 0.40 * 0.60 = 0.24
```

Old sphere radii cease to be authority.

- [ ] **Step 2: Write failing renderer structure tests**

Assert body uses `InstancedMesh` + `BoxGeometry`, head uses a box footprint close/equal to body, two eyes remain attached, food is a voxel, body count matches interpolated body count, and optional wrap duplicates are presentation-only.

- [ ] **Step 3: Run and verify RED**

```bash
npm test -- tests/unit/gameplay-presentation.test.ts tests/unit/voxel-renderer.test.ts
```

Expected: FAIL against sphere renderer/24-grid scene.

- [ ] **Step 4: Implement voxel renderers/grid**

SnakeRenderer consumes interpolated positions and `InterpolatedFrame.quaternion`; it must not accept logical `GridCell` arrays as its normal render API. Eyes use the same presentation quaternion as the head.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- tests/unit/gameplay-presentation.test.ts tests/unit/voxel-renderer.test.ts
npm run typecheck
git add src/render/snake-renderer.ts src/render/food-renderer.ts src/render/scene.ts tests/unit/gameplay-presentation.test.ts tests/unit/voxel-renderer.test.ts
git commit -m "feat: render snake and food as grid voxels"
```

---

### Task 8: Add deterministic low-resolution pixel rendering

**Files:**
- Create: `src/render/pixel-resolution.ts`
- Modify: `src/render/scene.ts`
- Modify: `src/styles.css`
- Test: `tests/unit/pixel-resolution.test.ts`

**Interfaces:**
- Produces: `RENDER_SCALE`, `computeInternalRenderSize()`, AA-off scene resize contract independent of DPR.

- [ ] **Step 1: Write failing backing-resolution tests**

```ts
export const RENDER_SCALE = 0.50;
export function computeInternalRenderSize(
  cssWidth: number,
  cssHeight: number,
  scale?: number
): Readonly<{ width: number; height: number }>;
```

Pin `800×600 @ 0.5 → 400×300`, minimum `1×1`, invalid scale rejection, and DPR independence.

- [ ] **Step 2: Run and verify RED**

```bash
npm test -- tests/unit/pixel-resolution.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement scene resize/pixel contract**

`WebGLRenderer({ antialias:false })`; renderer pixel ratio fixed to `1`; backing width/height from CSS dimensions × render scale; camera aspect remains CSS width/height; CSS canvas uses `image-rendering: pixelated`.

- [ ] **Step 4: Add scene assertions for AA/aspect/backing behavior where testable**

Do not attempt subjective pixel-art visual assertions in unit tests.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- tests/unit/pixel-resolution.test.ts tests/unit/gameplay-presentation.test.ts
npm run typecheck
npm run build
git add src/render/pixel-resolution.ts src/render/scene.ts src/styles.css tests/unit/pixel-resolution.test.ts tests/unit/gameplay-presentation.test.ts
git commit -m "feat: add low resolution pixel render pipeline"
```

---

## Phase 6 — Camera V2 and integrated browser loop

### Task 9: Implement elevated chase camera and migrate front overview sizing to GridConfig

**Files:**
- Rewrite: `src/render/chase-camera.ts`
- Modify: `src/render/overview-camera.ts`
- Rewrite/Test: `tests/unit/chase-camera.test.ts`
- Modify/Test: `tests/unit/compact-arena-overview.test.ts`

**Interfaces:**
- Consumes: interpolated head world position, interpolated presentation frame, display-wrap offset, GridConfig.
- Produces: stable elevated chase pose and preserved front overview camera.

- [ ] **Step 1: Write failing chase-camera tests**

Pin cell-relative baseline:

```text
CAMERA_DISTANCE_CELLS   = 4.0
CAMERA_HEIGHT_CELLS     = 2.8
CAMERA_LOOK_AHEAD_CELLS = 2.0
CAMERA_FOV              = 60
```

Assert world offsets scale by `CELL_SIZE`, all six directions are finite, camera is behind `forward` and elevated along interpolated `up`, target is ahead, camera stays outside head voxel, rapid 90° sequences remain stable, and applying `displayWrapOffset` relocates camera instead of smoothing through the cube.

- [ ] **Step 2: Run and verify RED**

```bash
npm test -- tests/unit/chase-camera.test.ts
```

Expected: FAIL against current camera.

- [ ] **Step 3: Implement presentation-frame-aware chase camera**

```ts
export type ChaseCameraSnapshot = Readonly<{
  headWorld: Vec3;
  forwardWorld: Vec3;
  upWorld: Vec3;
  displayWrapOffset: Vec3;
}>;
```

Desired pose:

```text
position = head - forward * (4.0*CELL_SIZE) + up * (2.8*CELL_SIZE)
target   = head + forward * (2.0*CELL_SIZE)
```

Preserve damping; remove the old world-Y-specific vertical clamp as authority.

- [ ] **Step 4: Update overview camera test/implementation**

`applyOverviewCamera(camera, config = GRID_CONFIG)` remains centered directly in front of the cube and derives its distance from `config.worldSize`; it must not import legacy independent `WORLD_SIZE`.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- tests/unit/chase-camera.test.ts tests/unit/compact-arena-overview.test.ts
npm run typecheck
git add src/render/chase-camera.ts src/render/overview-camera.ts tests/unit/chase-camera.test.ts tests/unit/compact-arena-overview.test.ts
git commit -m "feat: add elevated voxel chase camera"
```

---

### Task 10: Wire discrete input, RunState queueing, interpolation, voxel renderers, and cameras in `main.ts`

**Files:**
- Rewrite relevant loop portions: `src/main.ts`
- Modify: `src/app/runtime-lifecycle.ts` only if a narrow clock hook is required.
- Test: `tests/integration/grid-game-loop.test.ts`
- Test: `tests/integration/runtime-lifecycle.test.ts`

**Interfaces:**
- Consumes: Tasks 1–9.
- Produces: complete browser-frame → integer simulation → presentation interpolation → render/camera path.

- [ ] **Step 1: Extend the loop integration test**

Assert ordering:

```text
keyboard.takeIntent / joystick.takeIntent
→ queueTurnIntent(run,...)
→ bounded FixedStepClock
→ stepRun(run, fixedDt)
→ run.transition + run.renderAlpha
→ build/interpolate RenderTransition
→ voxel renderers
→ chase camera from interpolated head/frame
```

No render position is ever converted back to `GridCell`.

- [ ] **Step 2: Define simultaneous-adapter ordering**

If keyboard and joystick both produce an intent in the same browser frame, enqueue keyboard first, then joystick. Capacity-2 FIFO makes this deterministic. This is an input arbitration detail, not a gameplay-axis change.

- [ ] **Step 3: Refactor the runtime loop**

Remove active continuous yaw/pitch aggregation and reads of `headWrapped/bodyPositions/forward`. Drain each adapter once per browser frame, enqueue non-`none` intents, let fixed simulation call `stepRun()`, then render from immutable logical transition + `renderAlpha`.

Before the first committed transition, build/render a stationary presentation snapshot from the current snake state.

Keep `X`/mobile camera toggle; overview remains static/front-facing.

- [ ] **Step 4: Verify and commit**

```bash
npm test -- tests/integration/grid-game-loop.test.ts tests/integration/runtime-lifecycle.test.ts
npm run typecheck
npm run build
git add src/main.ts src/app/runtime-lifecycle.ts tests/integration/grid-game-loop.test.ts tests/integration/runtime-lifecycle.test.ts
git commit -m "feat: integrate voxel simulation and render loop"
```

---

## Phase 7 — Score/persistence boundary and tuning evidence

### Task 11: Isolate V2 score/personal best and add an explicit ranking-ruleset capability guard

**Files:**
- Modify: `src/app/identity.ts`
- Modify: `src/app/app-controller.ts`
- Modify: `src/app/app-state.ts`
- Modify: `src/app/session-gateway.ts`
- Modify: `src/app/http-session-gateway.ts`
- Modify: `src/ui/hud-view.ts`
- Modify: `src/ui/game-over-view.ts`
- Modify/Test: `tests/unit/identity.test.ts`
- Modify/Test: `tests/unit/http-session-gateway.test.ts`
- Modify/Test: `tests/integration/app-flow.test.ts`
- Preserve Worker V1 validation/tests.

**Interfaces:**
- Produces: V2 best keyed by V2 ruleset score; `SessionGateway.supportsRuleset()`; active V2 never submits to legacy HTTP validator.

- [ ] **Step 1: Write V2 local-best isolation tests**

```ts
export const V2_LOCAL_BEST_KEY = 'snek.localBest.pixelGridV2';
export function loadPixelGridV2Best(storage: StorageLike): number;
export function savePixelGridV2Best(storage: StorageLike, score: number): number;
```

Assert old `snek.localBest` remains unchanged, V2 best uses `foodsCollected`, lower later scores cannot overwrite, and username/player ID keys are unchanged.

- [ ] **Step 2: Write score-based UI/AppController tests**

HUD shows `SCORE <foodsCollected>` and may show `LENGTH <occupiedCells>` secondarily. Local game-over `SCORE` comes from `result.score`, personal best from V2 storage, replay reuses username, completion remains 300 foods.

- [ ] **Step 3: Add explicit gateway capability typing**

```ts
export interface SessionGateway {
  supportsRuleset(rulesetId: string): boolean;
  // existing methods...
}
```

`LocalSessionGateway.supportsRuleset()` returns `true` because local persistence is ruleset-scoped by the app. The current unversioned `HttpSessionGateway.supportsRuleset()` returns `false` for explicit V2 rulesets until the backend is separately upgraded.

AppController checks `gateway.supportsRuleset(RULESET_ID)` before starting a ranked session. If false, it follows the normal local-first path; it does not call legacy start/submit APIs for the V2 run.

This preserves the HTTP/Worker implementation and its direct unit/integration tests without pretending it validates V2.

- [ ] **Step 4: Implement persistence/UI/capability guard**

Do not add V2 backend validation in this plan.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- tests/unit/identity.test.ts tests/unit/http-session-gateway.test.ts tests/integration/app-flow.test.ts
npm run test:worker
npm run typecheck
git add src/app src/ui/hud-view.ts src/ui/game-over-view.ts tests/unit/identity.test.ts tests/unit/http-session-gateway.test.ts tests/integration/app-flow.test.ts
git commit -m "feat: isolate pixel grid score and persistence"
```

---

### Task 12: Add pressure metrics and compare 8³/9³/10³ without silently changing product contracts

**Files:**
- Create: `src/game/metrics.ts`
- Create: `tests/integration/grid-tuning-metrics.test.ts`
- Create: `tests/metrics/grid-tuning.test.ts`
- Modify: `package.json` / `package-lock.json` only if adding `test:tuning` script requires it; no new runtime dependency is expected.

**Interfaces:**
- Produces: pure metrics + deterministic comparative harness; no automatic tuning mutation.

- [ ] **Step 1: Write failing metric-definition tests**

```ts
export type RunMetrics = Readonly<{
  occupancyRatio: number;
  safeMoveCount: number;
  nearBodyEncounters: number;
  firstPressureMs: number | null;
  firstConfinementMs: number | null;
}>;
export function occupancyRatio(state: GridSnakeState, config: GridConfig): number;
export function safeMoveCount(state: GridSnakeState, frame: GridFrame, config: GridConfig): number;
export class GridMetricsTracker {
  observe(state: GridSnakeState, frame: GridFrame, elapsedMs: number, config: GridConfig): void;
  snapshot(): RunMetrics;
}
```

Definitions:

```text
pressure    = safeMoveCount <= 2
confinement = safeMoveCount <= 1
near-body encounter = a committed, non-colliding head cell has at least one face-adjacent occupied body cell excluding the immediate neck
```

`safeMoveCount` evaluates forward/left/right/up/down reachable next cells, deduplicates equivalent targets if a synthetic tiny grid wraps them together, and applies the same tail-vacate collision rule as gameplay.

- [ ] **Step 2: Run and verify RED**

```bash
npm test -- tests/integration/grid-tuning-metrics.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement pure metric helpers/tracker**

No hidden speed/camera/difficulty changes.

- [ ] **Step 4: Build a deterministic comparison policy**

`tests/metrics/grid-tuning.test.ts` runs the same fixed seed set (use 32 explicit seeds) against 8³, 9³, and 10³ configs.

Use one deterministic greedy policy for all configurations:

1. enumerate currently legal forward/left/right/up/down actions;
2. discard immediate self-collisions;
3. choose the action minimizing toroidal Manhattan distance from next head cell to food;
4. resolve ties with a fixed action order documented in the test;
5. if no legal action exists, allow the deterministic terminal collision.

This is a comparative autopilot, not a claim about human skill.

Record per config/seed:

```text
length @ 30s / 60s
foods @ 30s / 60s
occupancy @ 30s / 60s
final food score
final occupied length
run duration
cause of death
near-body encounters
first pressure time
first confinement time
```

- [ ] **Step 5: Add/run `test:tuning`**

Suggested script:

```json
"test:tuning": "vitest run tests/metrics/grid-tuning.test.ts --reporter=verbose"
```

Run twice and confirm identical output for identical seeds.

- [ ] **Step 6: Produce the Phase 7 tuning recommendation**

Combine deterministic comparison with controlled manual play. The spec authorizes tuning of values explicitly marked experimental/baseline (including final grid resolution) if changes are documented and tested. Any chosen change must be explicit in the PR and corresponding config/tests; never hide it inside unrelated commits.

Hard product gate: if evidence recommends changing the provisional 300-food completion target/progress curve, stop and request an explicit spec amendment before applying that change.

- [ ] **Step 7: If non-completion baseline tuning changes are selected, apply them in a separate TDD commit**

First update the config/tuning expectation test to the selected values, verify RED, update `GRID_CONFIG`, rerun core tests/metrics, then commit with a message that names the tuning change. Skip this step if the approved baseline remains selected.

- [ ] **Step 8: Commit metrics infrastructure separately**

```bash
git add src/game/metrics.ts tests/integration/grid-tuning-metrics.test.ts tests/metrics/grid-tuning.test.ts package.json package-lock.json
git commit -m "test: add voxel difficulty tuning metrics"
```

Do not include an unapproved completion-target change.

---

## Phase 8 — Responsive/browser verification and cleanup

### Task 13: Expand Playwright for desktop, portrait, landscape, DPR, discrete input, pixel rendering, and camera switching

**Files:**
- Modify: `playwright.config.ts`
- Rewrite/extend: `tests/e2e/game.spec.ts`
- Modify: `tests/e2e/ranked.spec.ts` to verify the preserved legacy seam and V2 non-submission contract rather than forcing a V2 score through V1 validation.
- Modify: `src/styles.css` only for observed responsive defects.

**Interfaces:**
- Produces: browser evidence for the integrated V2 runtime.

- [ ] **Step 1: Add an explicit mobile-landscape Chromium project**

Keep desktop and portrait coverage.

- [ ] **Step 2: Add V2 browser assertions**

Verify:

- intro → username → game;
- initial `LENGTH 6` and `SCORE 0`;
- progress bar visible;
- X toggles chase/overview/back;
- keyboard press emits one discrete intent, not continuous yaw;
- mobile joystick emits one latched intent;
- mobile camera button works;
- no horizontal overflow in portrait/landscape;
- resize/orientation does not crash or leave joystick latched;
- canvas backing width/height are below CSS dimensions at `RENDER_SCALE=0.50`;
- DPR > 1 does not multiply backing dimensions back to native DPR scale;
- app remains playable after resize.

Use test-only datasets only where no user-visible assertion exists.

- [ ] **Step 3: Update ranked browser coverage**

When the active ruleset is V2 and an HTTP API base is present, assert the app stays local because `HttpSessionGateway` does not advertise V2 support. Keep Worker/HTTP gateway tests as the preserved legacy ranking seam.

- [ ] **Step 4: Run/fix only observed browser defects**

```bash
npm run test:e2e
```

Expected: PASS across desktop, portrait, landscape, and preserved ranking-seam coverage.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e/game.spec.ts tests/e2e/ranked.spec.ts src/styles.css
git commit -m "test: verify voxel game across responsive browsers"
```

---

### Task 14: Remove obsolete active V1 continuous authority and update active documentation

**Files:**
- Remove or stop exporting unused V1 gameplay authority from `src/game/trail.ts`, `src/game/steering.ts`, continuous portions of `src/game/simulation.ts`, and legacy constants where safe.
- Modify: `src/game/constants.ts`
- Modify: `README.md`
- Extend: `tests/unit/grid-authority-boundary.test.ts`
- Do not rewrite historical V1 spec.

**Interfaces:**
- Produces: one active spatial authority; preserved legacy backend seam remains isolated.

- [ ] **Step 1: Search active production dependencies**

Classify every remaining use of:

```text
TrailBuffer
sampleBodyPositions
advanceHead
applySteering
forwardVector
SNAKE_SPEED
STEERING_RATE
MAX_PITCH
SEGMENT_SPACING
FOOD_PICKUP_RADIUS
SELF_COLLISION_RADIUS
```

Expected: none in active V2 runtime/gameplay.

- [ ] **Step 2: Extend architecture tests**

Fail if active V2 gameplay imports continuous trail/steering authority or radius-based food/self-collision constants.

- [ ] **Step 3: Remove obsolete active code carefully**

Retain a legacy-only helper only if an existing preserved backend/test path truly needs it, and name/location must make that isolation explicit.

- [ ] **Step 4: Update README**

Document active Pixel Flight Grid V2, final selected tuning, score=foods, V2 best isolation, voxel/pixel rendering, toroidal integer grid + smooth presentation, both camera modes, and the fact that the preserved online backend is not V2-authoritative yet.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- tests/unit/grid-authority-boundary.test.ts
npm run typecheck
npm run build
git add -A src/game README.md tests/unit/grid-authority-boundary.test.ts
git commit -m "refactor: retire continuous V1 gameplay authority"
```

---

## Phase 9 — Full verification, review, and release gate

### Task 15: Verify the exact candidate SHA and prepare release evidence

**Files:** No planned source changes. Any defect fix gets its own TDD commit and this task restarts.

**Interfaces:** Produces fresh evidence tied to one exact candidate commit.

- [ ] **Step 1: Record candidate state**

```bash
git status --short
git rev-parse HEAD
git log -1 --oneline
```

Expected: clean tree.

- [ ] **Step 2: Run all gates on the same SHA**

```bash
npm audit --omit=dev --audit-level=moderate
npm test
npm run test:worker
npm run typecheck
npm run worker:build
npm run build
npm run test:e2e
npm run test:tuning
```

Expected: PASS.

- [ ] **Step 3: Audit acceptance evidence**

Explicitly confirm:

```text
integer GridCell authority
GridFrame formulas/handedness
exact occupied-cell collision
explicit tail-vacate rule
free-cell food
approved/final growth value
score = foodsCollected
V2 ruleset persistence isolation
no V2 submission to legacy validator
stable-ID head/body wrap interpolation
smooth render-only frame rotation
voxel geometry
visual/logical grid alignment
AA off + reduced backing resolution
elevated chase + front overview
desktop + portrait + landscape
8³/9³/10³ tuning comparison
300-food target unchanged unless separately amended
```

- [ ] **Step 4: Request final code review**

Use `superpowers:requesting-code-review`. Focus on accidental float authority, stale V1 imports, frame handedness, tail-vacate ordering, wrap interpolation/camera relocation, score/ranking contamination, and responsive renderer scaling.

- [ ] **Step 5: Prepare PR only after green review**

PR body includes approved spec path, plan path, exact candidate SHA, verification evidence, 8³/9³/10³ summary, final tuning values, and explicit completion-target status.

- [ ] **Step 6: Merge only through the normal `main` gate**

Do not bypass CI. After merge, verify `main` CI and GitHub Pages deployment on the merged SHA before declaring production updated.

---

## Dependency / Task Order

```text
0 baseline/worktree
↓
1 GridConfig + topology
↓
2 GridFrame
↓
3 movement + discrete input
↓
4 snake + collision + food
↓
5 RunState + logical snapshots
↓
6 render interpolation + frame slerp
↓
7 voxel renderer + logical grid visuals
↓
8 low-resolution pixel pipeline
↓
9 camera V2 + overview sizing
↓
10 integrated browser loop
↓
11 score/persistence/ranking capability guard
↓
12 tuning metrics + explicit tuning gate
↓
13 responsive/E2E
↓
14 legacy authority cleanup/docs
↓
15 full verification/review/release
```

Do not parallelize Tasks 1–6: their interfaces are cumulative and define the authoritative spatial model. After Task 10, persistence/ranking isolation and metric plumbing can be reviewed independently, but the tuning conclusion requires the integrated runtime.

## Plan Self-Review Result

- **Spec coverage:** all approved V2 sections map to Tasks 1–15; the 300-food contract has an explicit stop gate.
- **Closed decisions:** deterministic `GridFrame` rotation formulas and derived-only `worldSize` are fixed here with tests.
- **Type consistency:** gameplay uses `GridCell`/`GridFrame`/stable `SnakeSegment.id`; simulation publishes `LogicalTransition`; render derives `RenderTransition`; renderer/camera consume presentation data only.
- **Input consistency:** adapters emit edge/latch intents; RunState owns the only authoritative capacity-2 FIFO and consumes at most one turn per cell.
- **Interpolation consistency:** stable IDs solve growth/tail correspondence; virtual cell targets solve wrap; presentation quaternion slerp smooths 90° visual turns without affecting gameplay.
- **Camera consistency:** camera follows interpolated presentation frame and the exact display wrap offset, not raw logical jumps.
- **Persistence boundary:** historical V1 best remains untouched; V2 best is food-score based; legacy HTTP ranking explicitly advertises no V2 capability.
- **Tuning discipline:** 8³/9³/10³ use one deterministic greedy policy and fixed seeds; baseline values may change only explicitly, while 300-food completion requires a separate approval to change.
- **Release discipline:** `main` remains untouched until the integrated branch is green, reviewed, accepted, and then post-merge Pages deployment is verified.
