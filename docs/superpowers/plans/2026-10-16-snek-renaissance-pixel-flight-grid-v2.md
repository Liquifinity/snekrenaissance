# SNEK RENAISSANCE Pixel Flight Grid V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the continuous V1 spatial authority with a deterministic 3D voxel-grid Snake while preserving smooth wrap-aware interpolation, toroidal identity, local-first product flow, mobile/desktop controls, camera switching, completion flow, and the future ranking seam.

**Architecture:** Gameplay becomes integer-authoritative: `GridCell` + `GridFrame` + exact occupied-cell collision/food/growth. Rendering receives immutable logical transitions and performs presentation-only interpolation, including explicit toroidal virtual targets. Three.js presentation becomes voxel-based and intentionally low-resolution; camera/input/UI/persistence remain separate adapters around the new simulation core.

**Tech Stack:** TypeScript, Vite, Three.js, Vitest, Playwright, browser-native DOM/Pointer Events, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-16-snek-renaissance-pixel-flight-grid-v2-design.md`

## Global Constraints

- Ruleset ID: `pixel-flight-grid-v2`.
- Baseline logical resolution: `9 × 9 × 9`.
- Baseline `CELL_SIZE = 0.40`.
- `WORLD_SIZE` is derived as `resolution × cellSize`; callers never configure `worldSize` independently.
- Baseline `GRID_STEPS_PER_SECOND = 6.0`.
- Initial snake length: `6` total occupied cells including the head.
- Growth: exactly `+2` occupied cells per food.
- Canonical V2 score: `foodsCollected`; occupied length is a separate metric.
- `worldToCell()` is debug/test/tooling-only and must not become a gameplay dependency.
- Gameplay positions remain integer `GridCell` values; world-space floats never feed simulation, collision, food, growth, scoring, or persistence.
- Movement enters exactly one face-adjacent cell per logical step; no diagonal logical transitions.
- Orientation authority is `GridFrame`; gameplay does not use continuous yaw/pitch/quaternion authority.
- Toroidal wrap is exact integer modulo on X/Y/Z.
- Self-collision is exact occupied-cell collision with the explicit tail-vacate rule.
- Food occupies one free logical cell and is collected only by cell equality.
- Rendering uses immutable previous/current logical transition data plus presentation `alpha`.
- Wrap interpolation uses the spec's virtual-target algorithm for head and body; no full-cube lerp.
- Stable segment correspondence is mandatory across movement/growth/tail removal.
- Visual grid divisions equal `GRID_RESOLUTION`.
- Snake and food presentation are voxel-based and aligned to `CELL_SIZE`.
- Baseline pixel pipeline: `RENDER_SCALE = 0.50`, antialiasing disabled, CSS upscale/pixelation before any shader fallback.
- Baseline chase camera: distance `4.0 cells`, height `2.8 cells`, look-ahead `2.0 cells`, `FOV = 60°`.
- Existing `X` / mobile camera toggle remains available.
- Existing local-first username/player identity flow remains intact.
- Existing V1 personal-best data is preserved; V2 best is stored under a V2-specific record.
- The current V1 online ranking validator must never receive V2 results silently.
- `300 foods = 100%` remains provisionally unchanged through implementation; Phase 7 may recommend a change but may not apply it without explicit product approval/spec amendment.
- V1 design/spec remains historical; do not rewrite it to describe V2 behavior.
- Do not develop V2 directly on `main`; implementation starts from the approved spec/plan line in an isolated feature branch/worktree.

## Review Focus

1. **Turn-frame handedness at vertical flight:** repeated `up/down/left/right` while forward is `±Y` must preserve a valid orthonormal local frame and intuitive screen-relative semantics; pinned in Task 2 frame-rotation tests.
2. **Tail-cell entry during growth:** moving into the current tail must be legal only when that exact tail vacates in the same step; pinned in Task 4 collision tests.
3. **Body interpolation when growth creates a new tail across wrap:** no new segment may pop from an unrelated index or travel across the cube; pinned in Task 6 stable-ID/birth-transition tests.
4. **Long frame stalls / multiple logical steps:** fixed-step catch-up must not expose partially mutated render transitions or skip deterministic step ordering; pinned in Task 5 simulation-clock tests.
5. **Responsive low-resolution rendering:** DPR, resize, portrait and landscape must change backing resolution without changing gameplay coordinates, camera aspect semantics, or introducing horizontal overflow; pinned in Tasks 8 and 11 tests.

---

## File Structure and Responsibility Map

The implementation should converge toward this structure. Existing filenames may be retained where their responsibility remains valid; V1-only modules are removed from V2 authority only after their replacements are green.

```text
src/
├─ game/
│  ├─ constants.ts                # fixed runtime timing + legacy constants only while migrating
│  ├─ grid-config.ts              # GridConfig factory, derived worldSize, active V2 config/ruleset
│  ├─ grid-types.ts               # GridCell/GridDirection/GridFrame/TurnIntent/SnakeSegment
│  ├─ grid-topology.ts            # wrapCellAxis, advanceGridStep, cell key, cellToWorld; debug-only worldToCell
│  ├─ grid-frame.ts               # deterministic 90° local-frame rotations
│  ├─ grid-movement.ts            # logical step accumulator / queued turn consumption
│  ├─ snake.ts                    # ordered stable-ID segment chain + pendingGrowth
│  ├─ collision.ts                # exact next-cell occupancy / tail-vacate rule
│  ├─ food.ts                     # free-cell enumeration and deterministic selection
│  ├─ run-state.ts                # V2 run orchestration and results
│  ├─ metrics.ts                  # occupancy/pressure/confinement/tuning metrics
│  ├─ progress.ts                 # provisional 300-food completion math
│  └─ simulation.ts               # existing outer fixed-step clock only
├─ input/
│  ├─ input-state.ts              # discrete turn-intent queue contract
│  ├─ keyboard.ts                 # edge-triggered keyboard intent + X camera toggle
│  └─ joystick.ts                 # threshold/rearm analog→discrete intent
├─ render/
│  ├─ interpolation.ts            # immutable transition mapping + virtual wrap targets
│  ├─ pixel-resolution.ts         # backing-buffer scale math
│  ├─ scene.ts                    # 9-cell visual grid, AA off, low-res renderer
│  ├─ snake-renderer.ts           # instanced box voxels + head eyes
│  ├─ food-renderer.ts            # voxel food presentation
│  ├─ chase-camera.ts             # elevated GridFrame-aware chase camera
│  └─ overview-camera.ts          # preserved secondary camera
├─ app/
│  ├─ app-controller.ts           # V2 result/persistence wiring
│  ├─ identity.ts                 # V1 key preservation + V2 best key
│  └─ gateway-selection.ts        # guard V1 online path from V2 result submission
├─ ui/
│  ├─ hud-view.ts                 # score/length/progress presentation
│  └─ game-over-view.ts           # score-based local result view
├─ main.ts                        # fixed clock, logical stepping, render-alpha wiring
└─ styles.css                     # pixelated canvas and responsive rules

tests/
├─ unit/
│  ├─ grid-config.test.ts
│  ├─ grid-topology.test.ts
│  ├─ grid-frame.test.ts
│  ├─ grid-movement.test.ts
│  ├─ snake-grid.test.ts
│  ├─ collision.test.ts
│  ├─ food.test.ts
│  ├─ interpolation.test.ts
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
   └─ game.spec.ts
```

### Closed planning decision A — deterministic `GridFrame` rotations

Use the invariant:

```text
right = cross(forward, up)
```

with initial frame:

```text
forward = +Z
up      = +Y
right   = -X
```

This preserves the current chase-camera control semantics: from the initial view, `left` turns toward world `+X` and `right` turns toward world `-X`.

For a current frame `(F, R, U)`, the four rotations are normative:

```text
left:   F' = -R,  R' =  F,  U' =  U
right:  F' =  R,  R' = -F,  U' =  U
up:     F' =  U,  R' =  R,  U' = -F
down:   F' = -U,  R' =  R,  U' =  F
```

`none` leaves the frame unchanged. Every output direction must remain one of the six signed axes; `right = cross(forward, up)` must still hold after every rotation. No gameplay quaternion/Euler conversion is involved.

### Closed planning decision B — `worldSize` construction

Do not expose `worldSize` as constructor input.

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

`createGridConfig()` validates all primitive inputs, then computes:

```text
worldSize = resolution * cellSize
totalCells = resolution ** 3
```

No production code may construct `GridConfig` literals directly. Export the active V2 singleton as `GRID_CONFIG = createGridConfig(...)`. Tests may build alternate 8³/9³/10³ configs through the same factory.

---

## Phase 0 — Baseline and isolated execution line

### Task 0: Establish the V2 implementation branch/worktree and fresh baseline evidence

**Files:**
- No production source changes.
- Read: approved spec and this plan.
- Record evidence in the implementation session/PR description; do not add a redundant progress document unless execution tooling requires it.

**Interfaces:**
- Consumes: spec commit `b5650def5a346a8c6d6eea127a679014c5929bc0` and this plan.
- Produces: isolated implementation worktree/branch based on the approved docs line and a fresh green/known baseline.

- [ ] **Step 1: Create an isolated worktree/feature branch**

Use `superpowers:using-git-worktrees` before implementation. Base the worktree on the commit containing both approved spec and plan; do not branch from a stale earlier `main` if the docs commits are not yet merged.

Suggested implementation branch:

```text
feat/pixel-flight-grid-v2
```

- [ ] **Step 2: Record repository state**

Record:

```text
branch
HEAD SHA
git status --short
merge-base with main
```

Expected: clean worktree before code changes.

- [ ] **Step 3: Run existing baseline verification**

Run:

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

Expected: PASS, or any pre-existing failure must be documented and investigated before V2 code starts.

- [ ] **Step 4: Commit nothing**

This task is evidence only. Do not create a no-op baseline commit.

---

## Phase 1 — Integer grid authority

### Task 1: Add `GridConfig`, integer cell types, topology, and restricted conversion APIs

**Files:**
- Create: `src/game/grid-config.ts`
- Create: `src/game/grid-types.ts`
- Create: `src/game/grid-topology.ts`
- Test: `tests/unit/grid-config.test.ts`
- Test: `tests/unit/grid-topology.test.ts`
- Test: `tests/unit/grid-authority-boundary.test.ts`

**Interfaces:**
- Produces: `RULESET_ID`, `GridConfigInput`, `GridConfig`, `GRID_CONFIG`, `GridCell`, `GridDirection`, `GridFrame`, `TurnIntent`, `AxisVector`, `createGridConfig()`, `cellKey()`, `cellsEqual()`, `directionVector()`, `wrapCellAxis()`, `advanceGridStep()`, `cellToWorld()`, debug-only `worldToCell()`.
- Later tasks must import world scale from `GRID_CONFIG.worldSize`, not from an independently mutable `WORLD_SIZE`.

- [ ] **Step 1: Write failing `GridConfig` tests**

Test names/assertions:

```ts
it('derives worldSize and totalCells instead of accepting them as inputs')
it('creates the approved 9^3 baseline as 3.6 world units and 729 cells')
it('rejects non-integer or sub-2 resolution')
it('rejects non-positive/non-finite cellSize and stepsPerSecond')
it('rejects initialLength outside 1..totalCells')
it('rejects negative/non-integer growthPerFood')
```

The approved baseline assertions are:

```text
resolution = 9
cellSize = 0.40
worldSize ~= 3.60
totalCells = 729
stepsPerSecond = 6
initialLength = 6
growthPerFood = 2
```

- [ ] **Step 2: Run config tests and verify RED**

Run:

```bash
npm test -- tests/unit/grid-config.test.ts
```

Expected: FAIL because `grid-config.ts` does not exist.

- [ ] **Step 3: Implement the config factory and active V2 config**

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

Do not export any constructor/factory that accepts `worldSize`.

- [ ] **Step 4: Write failing topology tests**

Assertions must cover:

- `cellKey()` uniqueness over all 729 baseline cells;
- exact wrap `8 + 1 -> 0` and `0 - 1 -> 8` on each axis;
- `advanceGridStep()` changes exactly one axis;
- wrap metadata identifies the crossed axis and sign;
- `cellToWorld({4,4,4}) == {0,0,0}` for baseline 9³;
- adjacent cells differ by exactly one `CELL_SIZE` in world space;
- `worldToCell()` round-trips cell centers for debug/test usage only.

- [ ] **Step 5: Run topology tests and verify RED**

Run:

```bash
npm test -- tests/unit/grid-topology.test.ts
```

Expected: FAIL because topology APIs do not exist.

- [ ] **Step 6: Implement grid types/topology**

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

`worldToCell()` must live in a clearly marked debug/tooling export section or separate submodule re-export; gameplay modules must not import it.

- [ ] **Step 7: Add an architectural restriction test for `worldToCell()`**

`tests/unit/grid-authority-boundary.test.ts` scans production gameplay source files under `src/game/` and fails if modules other than the designated topology/debug implementation import/reference `worldToCell`. Exclude tests/tooling and the defining module itself.

- [ ] **Step 8: Run the Phase 1 tests and typecheck**

Run:

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

### Task 2: Implement deterministic `GridFrame` rotation math

**Files:**
- Create: `src/game/grid-frame.ts`
- Test: `tests/unit/grid-frame.test.ts`

**Interfaces:**
- Consumes: `GridDirection`, `GridFrame`, `TurnIntent`, `directionVector()`.
- Produces: `INITIAL_GRID_FRAME`, `rotateGridFrame()`, `isValidGridFrame()`.

- [ ] **Step 1: Write failing frame-rotation tests**

Required baseline assertions:

```text
INITIAL_GRID_FRAME = { forward:+Z, right:-X, up:+Y }
left  => { forward:+X, right:+Z, up:+Y }
right => { forward:-X, right:-Z, up:+Y }
up    => { forward:+Y, right:-X, up:-Z }
down  => { forward:-Y, right:-X, up:+Z }
```

Parameterized tests must start from every valid forward axis and exercise all four turns, asserting:

- each frame contains three mutually perpendicular signed axes;
- no two frame axes share the same absolute world axis;
- `right = cross(forward, up)`;
- four repeated left rotations return to the original frame;
- four repeated up rotations return to the original frame;
- `left` followed by `right` returns to the original frame;
- `up` followed by `down` returns to the original frame;
- output never produces a 180° reversal relative to the current forward in a single turn.

- [ ] **Step 2: Run frame tests and verify RED**

Run:

```bash
npm test -- tests/unit/grid-frame.test.ts
```

Expected: FAIL because `grid-frame.ts` does not exist.

- [ ] **Step 3: Implement exact frame formulas**

Required API:

```ts
export const INITIAL_GRID_FRAME: GridFrame;
export function rotateGridFrame(frame: GridFrame, intent: TurnIntent): GridFrame;
export function isValidGridFrame(frame: GridFrame): boolean;
```

Normative formulas, using `(F,R,U)`:

```text
left:   (-R,  F,  U)
right:  ( R, -F,  U)
up:     ( U,  R, -F)
down:   (-U,  R,  F)
none:   ( F,  R,  U)
```

Use signed-axis lookup operations, not float quaternion math.

- [ ] **Step 4: Run frame tests and typecheck**

Run:

```bash
npm test -- tests/unit/grid-frame.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/grid-frame.ts tests/unit/grid-frame.test.ts
git commit -m "feat: add deterministic grid frame rotations"
```

---

## Phase 2 — Discrete movement and input intent

### Task 3: Add queued cell-step movement and discrete input adapters

**Files:**
- Create: `src/game/grid-movement.ts`
- Modify: `src/input/input-state.ts`
- Modify: `src/input/keyboard.ts`
- Modify: `src/input/joystick.ts`
- Test: `tests/unit/grid-movement.test.ts`
- Modify/Test: `tests/unit/keyboard.test.ts`
- Modify/Test: `tests/unit/joystick.test.ts`

**Interfaces:**
- Consumes: `GridCell`, `GridFrame`, `TurnIntent`, `GridStep`, `rotateGridFrame()`, `advanceGridStep()`, `GridConfig`.
- Produces: `TurnIntentQueue`, `GridMovementClock`, `advanceGridMovement()`, keyboard discrete-intent drain API, joystick discrete-intent drain API.

- [ ] **Step 1: Write failing logical movement tests**

Required behavior:

- neutral step moves from center `{4,4,4}` to `{4,4,5}` under initial `+Z` frame;
- one queued `left` turns and moves to `{5,4,4}`;
- no logical step changes more than one axis;
- wrap is applied after an adjacent step;
- at most one turn intent is consumed per logical step;
- queued intents are FIFO;
- queue capacity is exactly `2`; a third intent while full is ignored rather than replacing earlier intent;
- `none` is never stored in the queue;
- the movement clock emits the same number/order of logical steps for equivalent elapsed time split into different render-frame chunking.

- [ ] **Step 2: Run movement tests and verify RED**

Run:

```bash
npm test -- tests/unit/grid-movement.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement movement queue/clock**

Required API:

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
  get alpha(): number; // normalized [0,1) progress toward next logical step
  reset(): void;
}

export function advanceGridMovement(
  cell: GridCell,
  frame: GridFrame,
  intent: TurnIntent,
  config?: GridConfig
): Readonly<{ cell: GridCell; frame: GridFrame; step: GridStep }>;
```

`GridMovementClock` is separate from the existing 60 Hz `FixedStepClock`: the outer clock provides bounded deterministic simulation time; this clock schedules cell commits at `stepsPerSecond` and exposes presentation alpha.

- [ ] **Step 4: Write failing keyboard intent tests**

Update keyboard tests so:

- `ArrowLeft/A` emits `left` once on the edge;
- `ArrowRight/D` emits `right` once;
- `ArrowUp/W` emits `up` once;
- `ArrowDown/S` emits `down` once;
- key auto-repeat/duplicate `keydown` while pressed does not emit another intent;
- release and press again emits a new intent;
- `X` toggles camera exactly once per press and is not emitted as movement intent;
- blur clears held-key state.

- [ ] **Step 5: Implement keyboard discrete-intent API**

Retain the existing camera-toggle callback. Replace continuous yaw/pitch authority with a drainable intent API such as:

```ts
export class KeyboardInput {
  takeIntent(): TurnIntent;
  // existing attach/blur/camera-toggle lifecycle retained
}
```

Internally queue no more than one not-yet-drained keyboard intent; global two-intent buffering belongs to `TurnIntentQueue` in the simulation layer.

- [ ] **Step 6: Write failing joystick threshold/rearm tests**

Assertions:

- magnitude below `0.55` emits nothing;
- dominant horizontal left/right maps to `left/right` using current established screen semantics;
- dominant vertical up/down maps to `up/down`;
- diagonal input resolves to dominant absolute axis only;
- once activated, holding beyond threshold emits only one intent;
- another intent is impossible until magnitude returns to `<= 0.25`;
- pointer cancel/end/reset re-arms and returns to neutral;
- resize/orientation change clears active pointer/latch.

- [ ] **Step 7: Implement joystick latch/rearm**

Required constants/API:

```ts
export const JOYSTICK_ACTIVATION_THRESHOLD = 0.55;
export const JOYSTICK_REARM_THRESHOLD = 0.25;
export class JoystickInput {
  takeIntent(): TurnIntent;
  // pointer lifecycle methods retained
}
```

- [ ] **Step 8: Run movement/input tests**

Run:

```bash
npm test -- tests/unit/grid-movement.test.ts tests/unit/keyboard.test.ts tests/unit/joystick.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/game/grid-movement.ts src/input/input-state.ts src/input/keyboard.ts src/input/joystick.ts tests/unit/grid-movement.test.ts tests/unit/keyboard.test.ts tests/unit/joystick.test.ts
git commit -m "feat: add discrete voxel movement input"
```

---

## Phase 3 — Body, collision, food, and V2 run state

### Task 4: Replace trail authority with stable-ID occupied-cell snake state

**Files:**
- Rewrite: `src/game/snake.ts`
- Rewrite: `src/game/collision.ts`
- Rewrite: `src/game/food.ts`
- Test: `tests/unit/snake-grid.test.ts`
- Rewrite/Test: `tests/unit/collision.test.ts`
- Rewrite/Test: `tests/unit/food.test.ts`
- Keep temporarily but stop importing from V2 gameplay: `src/game/trail.ts`

**Interfaces:**
- Consumes: grid config/types/topology.
- Produces: stable `SnakeSegment` IDs, `GridSnakeState`, exact occupancy helpers, planned-step collision, free-cell food spawn.

- [ ] **Step 1: Write failing snake-state tests**

Use a single chain representation with the head at `segments[0]`:

```ts
export type SnakeSegment = Readonly<{ id: number; cell: GridCell }>;
export type GridSnakeState = {
  segments: SnakeSegment[];
  pendingGrowth: number;
  nextSegmentId: number;
};
```

Assertions:

- initial snake contains exactly 6 unique occupied cells;
- initial head is center cell `{4,4,4}` and body trails along `-Z` with toroidal-safe construction;
- IDs are stable and unique;
- a normal step moves each existing segment into its predecessor's previous cell;
- without growth, the previous tail cell becomes free;
- `addGrowth(state, 2)` does not immediately fabricate cells; it increments `pendingGrowth`;
- each of the next two committed steps creates exactly one new stable-ID tail segment at the previous tail cell;
- after two such steps, occupied length is exactly +2 and pending growth returns to zero.

- [ ] **Step 2: Run snake tests and verify RED**

Run:

```bash
npm test -- tests/unit/snake-grid.test.ts
```

Expected: FAIL against the current continuous snake implementation.

- [ ] **Step 3: Implement stable-ID grid snake**

Required API:

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

The implementation may mutate `state` at commit time, but returned previous/current arrays must be immutable copies suitable for render-transition construction.

- [ ] **Step 4: Write failing tail-vacate/exact-collision tests**

Required cases:

- occupied non-tail target collides;
- free target does not collide;
- current tail target is legal when `pendingGrowth === 0`;
- current tail target collides when `pendingGrowth > 0`;
- wrapped next cell collision works across X/Y/Z without distance radii;
- no near-head exclusion constant is needed.

- [ ] **Step 5: Implement planned-cell collision**

Required API:

```ts
export function wouldSelfCollide(
  state: GridSnakeState,
  nextHead: GridCell,
  config?: GridConfig
): boolean;
```

Collision must be decided before mutating the chain and must explicitly account for whether the old tail vacates.

- [ ] **Step 6: Write failing free-cell food tests**

Assertions:

- food always returns a canonical `GridCell` not occupied by the snake;
- same seeded/index RNG selects the same free cell deterministically;
- food may use the last remaining free cell;
- fully occupied world returns `{ ok:false, reason:'no-free-cell' }` rather than looping;
- collection is exact `cellsEqual(head, food)` only;
- no pickup radius/head-exclusion/body-clearance constants participate.

- [ ] **Step 7: Implement free-cell food selection**

Required API:

```ts
export type FoodSpawnResult =
  | { ok: true; cell: GridCell }
  | { ok: false; reason: 'no-free-cell' };

export function listFreeCells(state: GridSnakeState, config?: GridConfig): GridCell[];
export function spawnGridFood(
  state: GridSnakeState,
  rng?: () => number,
  config?: GridConfig
): FoodSpawnResult;
export function isGridFoodCollected(head: GridCell, food: GridCell): boolean;
```

- [ ] **Step 8: Run Phase 3 core tests**

Run:

```bash
npm test -- tests/unit/snake-grid.test.ts tests/unit/collision.test.ts tests/unit/food.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/game/snake.ts src/game/collision.ts src/game/food.ts tests/unit/snake-grid.test.ts tests/unit/collision.test.ts tests/unit/food.test.ts
git commit -m "feat: add exact voxel snake occupancy"
```

---

### Task 5: Rebuild `RunState` around cell commits, V2 score, and deterministic render transitions

**Files:**
- Rewrite: `src/game/run-state.ts`
- Modify: `src/game/progress.ts` only for naming/score semantics if necessary; preserve target math.
- Modify: `src/game/simulation.ts` only if a small alpha/catch-up hook is required; do not reintroduce continuous movement.
- Test: `tests/integration/grid-run-state.test.ts`
- Test: `tests/integration/grid-game-loop.test.ts`
- Modify existing run-state/progress tests where they encode V1 movement arithmetic.

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: active V2 `RunState`, `RunResult`, `stepRun()`, `renderTransition`, canonical score/length fields.

- [ ] **Step 1: Write failing V2 run-state tests**

The new result contract is:

```ts
export type RunResult = Readonly<{
  rulesetId: 'pixel-flight-grid-v2';
  score: number;
  foodsCollected: number;
  length: number;
  maxLength: number;
  durationMs: number;
}>;
```

The active run contains at minimum:

```ts
export type RunState = {
  phase: 'ready' | 'playing' | 'game-over' | 'completed';
  snake: GridSnakeState;
  frame: GridFrame;
  food: GridCell | null;
  foodsCollected: number;
  elapsedMs: number;
  maxLength: number;
  result: RunResult | null;
  transition: RenderTransition | null;
};
```

Assertions:

- new run is centered, initial length 6, initial frame +Z/-X/+Y;
- first food is a free cell;
- logical step applies at 6 steps/s rather than every 60 Hz tick;
- collecting food increments `foodsCollected` and therefore score by exactly 1;
- growth schedules exactly +2 cells;
- self-collision ends the run before mutating into an invalid duplicated occupancy state;
- `300` foods still enters `completed` phase and no lower provisional target is introduced;
- result carries exact V2 ruleset ID and score semantics;
- elapsed time remains based on simulation time, not render frame count.

- [ ] **Step 2: Run run-state tests and verify RED**

Run:

```bash
npm test -- tests/integration/grid-run-state.test.ts
```

Expected: FAIL against continuous `RunState`.

- [ ] **Step 3: Implement V2 run orchestration**

Required primary signatures remain intentionally close to the current app seam:

```ts
export function createRun(rng?: () => number, config?: GridConfig): RunState;
export function startRun(state: RunState): RunState;
export function stepRun(
  state: RunState,
  input: TurnIntent,
  dtSeconds: number,
  rng?: () => number,
  config?: GridConfig
): RunState;
```

`stepRun()` may consume zero or multiple cell commits during bounded catch-up, but each commit must execute atomically in this order:

```text
consume <=1 queued turn for this cell
-> rotate GridFrame
-> compute wrapped next cell
-> evaluate exact collision with tail-vacate rule
-> if collision: finalize game-over without invalid occupancy mutation
-> commit snake step
-> evaluate exact food-cell equality at new head
-> if food: increment score, queue +2 growth, spawn next free-cell food or complete if provisional target reached
-> construct immutable render transition from committed previous/current segment snapshots
-> update metrics/length/result state
```

- [ ] **Step 4: Write failing frame-chunk determinism tests**

In `grid-game-loop.test.ts`, simulate the same input schedule with equivalent total time chunked as 60 Hz, 30 Hz, and irregular frame durations. Assert identical:

```text
head cell
GridFrame
segment cells/IDs
pendingGrowth
foodsCollected
phase
```

Also simulate a clamped large frame stall and assert no partially mutated transition and no out-of-order turn consumption.

- [ ] **Step 5: Make outer fixed clock and grid clock cooperate deterministically**

Keep `FixedStepClock` as the bounded wall-clock adapter. Do not use old `advanceHead()` in active V2 code. Remove its import from `run-state.ts`; legacy function may remain temporarily until cleanup Task 12.

- [ ] **Step 6: Run Phase 3 integration tests**

Run:

```bash
npm test -- tests/integration/grid-run-state.test.ts tests/integration/grid-game-loop.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/game/run-state.ts src/game/progress.ts src/game/simulation.ts tests/integration/grid-run-state.test.ts tests/integration/grid-game-loop.test.ts
git commit -m "feat: make voxel grid the run authority"
```

---

## Phase 4 — Presentation-only interpolation

### Task 6: Implement immutable stable-segment render transitions and normative wrap interpolation

**Files:**
- Create: `src/render/interpolation.ts`
- Test: `tests/unit/interpolation.test.ts`
- Modify: `src/game/run-state.ts` only if transition construction needs a narrow helper call.

**Interfaces:**
- Consumes: stable segment IDs/cells, `GridFrame`, `GridStep`, `GridConfig`, `cellToWorld()`.
- Produces: `RenderTransition`, `SegmentRenderTransition`, `interpolateTransition()` and wrap-duplicate metadata.

- [ ] **Step 1: Write failing ordinary/wrap interpolation tests**

Required cases for head and a matched stable segment ID:

- ordinary adjacent move interpolates one `CELL_SIZE` only;
- `8 -> 0` uses virtual target `9`, never lerps `8 -> 0` through cube interior;
- `0 -> 8` uses virtual target `-1`;
- equivalent tests on X/Y/Z;
- output alpha is rejected or clamped to `[0,1]` according to one consistent API contract; choose clamping for renderer resilience;
- canonical displayed world position remains inside the toroidal render interval after wrap canonicalization.

- [ ] **Step 2: Run interpolation tests and verify RED**

Run:

```bash
npm test -- tests/unit/interpolation.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement transition types and virtual-target algorithm**

Required types/API:

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

export type InterpolatedSegment = Readonly<{
  id: number;
  position: Vec3;
  born: boolean;
  birthAlpha: number;
  duplicatePosition: Vec3 | null;
}>;

export function buildRenderTransition(
  previousSegments: readonly SnakeSegment[],
  currentSegments: readonly SnakeSegment[],
  previousFrame: GridFrame,
  currentFrame: GridFrame,
  config?: GridConfig
): RenderTransition;

export function interpolateTransition(
  transition: RenderTransition,
  alpha: number,
  config?: GridConfig
): Readonly<{ head: InterpolatedSegment; body: readonly InterpolatedSegment[] }>;
```

Correspondence is by stable segment `id`, not array-index reconstruction. For a newly born tail ID with no previous segment, `from` is the previous tail cell and `born = true`. Removed tail IDs simply do not appear in current render output.

- [ ] **Step 4: Add growth/tail/wrap correspondence tests**

Assertions:

- all pre-existing IDs map from their own previous cell to their own current cell;
- a born tail starts at previous tail cell, not from another index;
- a born tail on a wrapped chain never interpolates across the cube;
- tail removal cannot shift IDs and produce cross-index popping;
- render transition objects remain unchanged after later logical snake mutation.

- [ ] **Step 5: Run interpolation suite**

Run:

```bash
npm test -- tests/unit/interpolation.test.ts tests/integration/grid-run-state.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/render/interpolation.ts src/game/run-state.ts tests/unit/interpolation.test.ts
git commit -m "feat: add wrap aware voxel interpolation"
```

---

## Phase 5 — Voxel and low-resolution presentation

### Task 7: Replace sphere renderers with cell-scaled voxels and bind cube grid to `GRID_RESOLUTION`

**Files:**
- Rewrite: `src/render/snake-renderer.ts`
- Rewrite: `src/render/food-renderer.ts`
- Modify: `src/render/scene.ts`
- Modify/Test: `tests/unit/gameplay-presentation.test.ts`
- Add: `tests/unit/voxel-renderer.test.ts`

**Interfaces:**
- Consumes: interpolated world-space presentation snapshot and `GridConfig`.
- Produces: voxel snake/food meshes and grid geometry whose scale/divisions derive from config.

- [ ] **Step 1: Write failing presentation contract tests**

Assert exported/observable presentation constants derive from config:

```text
CUBE_GRID_DIVISIONS = GRID_CONFIG.resolution = 9
SNAKE_VOXEL_SIZE = CELL_SIZE * 0.80 = 0.32
FOOD_VOXEL_SIZE = CELL_SIZE * 0.60 = 0.24
```

Also assert old sphere-radius constants are no longer renderer authority.

- [ ] **Step 2: Write failing renderer structure tests**

Using a real `THREE.Scene` in Vitest where feasible, assert:

- body uses `InstancedMesh` + `BoxGeometry`;
- head uses a box footprint close/equal to body footprint;
- two eye meshes remain attached to the head and rotate with current discrete frame orientation;
- body instance count equals interpolated body segment count;
- food uses box/voxel geometry;
- renderer accepts duplicate wrap presentation entries without adding logical segments.

- [ ] **Step 3: Run presentation tests and verify RED**

Run:

```bash
npm test -- tests/unit/gameplay-presentation.test.ts tests/unit/voxel-renderer.test.ts
```

Expected: FAIL because renderers are still sphere-based and grid is 24 divisions.

- [ ] **Step 4: Implement voxel renderers and 9-cell scene grid**

Renderer input should no longer accept logical `GridCell` arrays directly. It accepts presentation positions from `interpolateTransition()` plus frame/orientation data for head eyes.

Use shared `BoxGeometry` and `InstancedMesh` for body. Preserve dynamic capacity growth only if still needed; 729 maximum cells bounds the absolute body count.

- [ ] **Step 5: Run presentation tests and typecheck**

Run:

```bash
npm test -- tests/unit/gameplay-presentation.test.ts tests/unit/voxel-renderer.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
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
- Modify/Test: `tests/e2e/game.spec.ts` later for browser-level assertions; keep unit contract here.

**Interfaces:**
- Produces: `RENDER_SCALE`, `computeInternalRenderSize()`, scene resize behavior independent from gameplay/DPR.

- [ ] **Step 1: Write failing backing-resolution tests**

Required API/behavior:

```ts
export const RENDER_SCALE = 0.50;
export function computeInternalRenderSize(
  cssWidth: number,
  cssHeight: number,
  scale?: number
): Readonly<{ width: number; height: number }>;
```

Assertions:

- `800×600 @ 0.5 -> 400×300`;
- dimensions clamp to at least `1×1`;
- invalid/non-positive dimensions or scale use deterministic safe handling (reject invalid scale; clamp dimensions);
- result is independent of `devicePixelRatio`.

- [ ] **Step 2: Run pixel-resolution tests and verify RED**

Run:

```bash
npm test -- tests/unit/pixel-resolution.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement low-resolution renderer resize contract**

In `createScene()`:

- instantiate `WebGLRenderer({ antialias:false, ... })`;
- keep camera `aspect = cssWidth/cssHeight`;
- set renderer pixel ratio to `1`;
- set backing size from `computeInternalRenderSize(cssWidth, cssHeight)` with `updateStyle=false`;
- preserve CSS canvas size from layout, not backing pixels.

In CSS, add `image-rendering: pixelated` to the gameplay canvas with appropriate fallback declaration if needed.

- [ ] **Step 4: Add a scene-level test/mocked assertion that AA is disabled and aspect uses CSS dimensions**

Do not assert browser-specific visual quality in unit tests; only assert deterministic renderer configuration where possible.

- [ ] **Step 5: Run pixel/scene tests**

Run:

```bash
npm test -- tests/unit/pixel-resolution.test.ts tests/unit/gameplay-presentation.test.ts
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/render/pixel-resolution.ts src/render/scene.ts src/styles.css tests/unit/pixel-resolution.test.ts tests/unit/gameplay-presentation.test.ts
git commit -m "feat: add low resolution pixel render pipeline"
```

---

## Phase 6 — Camera V2 and main-loop integration

### Task 9: Replace close continuous chase framing with elevated GridFrame-aware chase camera

**Files:**
- Rewrite: `src/render/chase-camera.ts`
- Rewrite/Test: `tests/unit/chase-camera.test.ts`
- Preserve: `src/render/overview-camera.ts`

**Interfaces:**
- Consumes: interpolated head position, interpolated/discrete `GridFrame`, wrap-transition metadata, config cell size.
- Produces: stable elevated camera pose; no gameplay feedback.

- [ ] **Step 1: Write failing camera V2 tests**

Baseline camera constants in cell units:

```text
CAMERA_DISTANCE_CELLS   = 4.0
CAMERA_HEIGHT_CELLS     = 2.8
CAMERA_LOOK_AHEAD_CELLS = 2.0
CAMERA_FOV              = 60
```

Required tests:

- baseline physical offsets multiply by `CELL_SIZE` rather than hardcoded world units;
- all six forward directions produce finite position/target;
- camera is behind the local forward axis and elevated along local `up`;
- local `up` comes from `GridFrame`, including forward `±Y` states;
- target lies ahead of head along local forward;
- camera-head distance stays outside the head voxel volume;
- sequential 90° turns smooth without NaN/overshoot explosion;
- wrap relocation never smooths camera through the whole cube;
- FOV is 60° baseline.

- [ ] **Step 2: Run camera tests and verify RED**

Run:

```bash
npm test -- tests/unit/chase-camera.test.ts
```

Expected: FAIL against the current continuous-forward camera constants/assumptions.

- [ ] **Step 3: Implement grid-frame-aware camera**

Required snapshot shape:

```ts
export type ChaseCameraSnapshot = Readonly<{
  headWorld: Vec3;
  frame: GridFrame;
  wrapDeltaWorld: Vec3;
}>;
```

Preserve exponential damping and coherent wrap relocation, but derive desired position from local signed-axis vectors converted to world vectors. Do not restore the old world-Y clamp algorithm as authority.

- [ ] **Step 4: Run camera tests**

Run:

```bash
npm test -- tests/unit/chase-camera.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render/chase-camera.ts tests/unit/chase-camera.test.ts
git commit -m "feat: add elevated voxel chase camera"
```

---

### Task 10: Wire discrete input, logical stepping, render alpha, voxel renderers, and cameras in `main.ts`

**Files:**
- Rewrite relevant loop portions: `src/main.ts`
- Modify: `src/app/runtime-lifecycle.ts` only if its clock hook needs a narrow adaptation.
- Test: `tests/integration/grid-game-loop.test.ts`
- Test: `tests/integration/runtime-lifecycle.test.ts`

**Interfaces:**
- Consumes: V2 `RunState`, discrete input adapters, `GridMovementClock`/`stepRun`, interpolation, voxel renderers, camera V2.
- Produces: complete runtime path from browser frame to deterministic logical state to presentation snapshot.

- [ ] **Step 1: Write/extend integration test for the frame pipeline**

Using test seams rather than WebGL, assert ordering:

```text
keyboard/joystick discrete intents
-> simulation TurnIntentQueue
-> bounded FixedStepClock consume
-> V2 stepRun logical commits
-> run.transition + movement alpha
-> interpolateTransition()
-> snake/food renderer snapshot
-> chase camera update from interpolated head/frame
```

Assert no renderer position is ever converted back into `GridCell`.

- [ ] **Step 2: Refactor `main.ts` minimally around the V2 pipeline**

Remove active reads of `run.headWrapped`, `run.bodyPositions`, `run.forward`, continuous yaw/pitch aggregation, and old `advanceHead` assumptions.

The runtime must:

- drain keyboard/joystick intents into the shared capacity-2 queue;
- pass at most the queued semantics expected by `stepRun`;
- render from `run.transition` + current alpha;
- render a stationary canonical snapshot before the first transition exists;
- keep `X`/mobile camera toggle behavior;
- update chase camera from the interpolated head; overview camera remains external/static behavior.

- [ ] **Step 3: Run loop/lifecycle integration tests**

Run:

```bash
npm test -- tests/integration/grid-game-loop.test.ts tests/integration/runtime-lifecycle.test.ts
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts src/app/runtime-lifecycle.ts tests/integration/grid-game-loop.test.ts tests/integration/runtime-lifecycle.test.ts
git commit -m "feat: integrate voxel simulation and render loop"
```

---

## Phase 7 — Score persistence, UI semantics, and tuning evidence

### Task 11: Separate V2 score/personal best from V1 and guard the legacy online ranking seam

**Files:**
- Modify: `src/app/identity.ts`
- Modify: `src/app/app-controller.ts`
- Modify: `src/app/app-state.ts`
- Modify: `src/app/gateway-selection.ts`
- Modify: `src/app/session-gateway.ts` only if needed for ruleset capability typing.
- Modify: `src/ui/hud-view.ts`
- Modify: `src/ui/game-over-view.ts`
- Modify/Test: `tests/unit/identity.test.ts`
- Modify/Test: `tests/unit/gateway-selection.test.ts`
- Modify/Test: `tests/integration/app-flow.test.ts`
- Preserve worker/backend V1 tests unless an explicit V2 backend project is separately approved.

**Interfaces:**
- Consumes: V2 `RunResult`.
- Produces: V2-local best by `foodsCollected`; historical V1 key remains untouched; no V2 result reaches the V1 HTTP validator.

- [ ] **Step 1: Write failing identity migration/isolation tests**

Required constants/API:

```ts
export const V2_LOCAL_BEST_KEY = 'snek.localBest.pixelGridV2';
export function loadPixelGridV2Best(storage: StorageLike): number;
export function savePixelGridV2Best(storage: StorageLike, score: number): number;
```

Assertions:

- existing `snek.localBest` value remains readable/unchanged after V2 saves;
- V2 best starts at 0 independently;
- V2 best stores max `foodsCollected` score only;
- lower later V2 score cannot overwrite higher V2 score;
- username/player ID keys remain unchanged.

- [ ] **Step 2: Write failing app/UI score-semantic tests**

Assertions:

- HUD exposes `SCORE <foodsCollected>` and may also expose `LENGTH <occupiedCells>` as secondary information;
- game over local view shows `SCORE` from `result.score` and `PERSONAL BEST` from V2 key, not `maxLength`;
- completion still occurs at provisional 300 foods;
- replay reuses username as before.

- [ ] **Step 3: Add a ruleset capability guard for the preserved HTTP ranking path**

Planning decision: V2 remains local-first in this implementation. Do **not** retrofit the current Worker validator to V2 in this plan.

`createSessionGateway()` must receive/know the active `RULESET_ID`; for `pixel-flight-grid-v2`, it returns `LocalSessionGateway` even if a V1 ranking API base is configured, unless a future gateway explicitly declares V2 support. Unit-test this behavior.

The preserved `HttpSessionGateway` and Worker V1 tests remain in the repository as the future seam; they must not be deleted merely because the active ruleset cannot use them.

- [ ] **Step 4: Implement V2 persistence/UI/gateway guard**

Update AppController to save/load V2 score. Keep local-first flow and completion view behavior intact.

- [ ] **Step 5: Run app/persistence/ranking-seam tests**

Run:

```bash
npm test -- tests/unit/identity.test.ts tests/unit/gateway-selection.test.ts tests/integration/app-flow.test.ts
npm run test:worker
npm run typecheck
```

Expected: PASS. Worker V1 validation remains green and isolated.

- [ ] **Step 6: Commit**

```bash
git add src/app src/ui/hud-view.ts src/ui/game-over-view.ts tests/unit/identity.test.ts tests/unit/gateway-selection.test.ts tests/integration/app-flow.test.ts
git commit -m "feat: isolate pixel grid score and persistence"
```

---

### Task 12: Add deterministic pressure metrics and compare 8³ / 9³ / 10³ without changing product tuning

**Files:**
- Create: `src/game/metrics.ts`
- Create: `tests/integration/grid-tuning-metrics.test.ts`
- Create: `tests/metrics/grid-tuning.test.ts`
- Modify: `package.json` to add a metrics-only command if useful, e.g. `test:tuning`.
- No product config changes in this task.

**Interfaces:**
- Produces: pure metric calculations and repeatable comparison harness; no automatic tuning mutation.

- [ ] **Step 1: Write failing metric-definition tests**

Required API:

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
```

Pin definitions:

```text
pressure    = safeMoveCount <= 2
confinement = safeMoveCount <= 1
```

`safeMoveCount` evaluates the current forward/left/right/up/down candidate moves permitted by the control contract, deduplicates equivalent wrapped target cells if a tiny synthetic grid causes overlap, and applies exact collision/tail-vacate semantics.

- [ ] **Step 2: Run metric tests and verify RED**

Run:

```bash
npm test -- tests/integration/grid-tuning-metrics.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement pure metric helpers**

Do not add speed changes, dynamic camera zoom, target changes, or hidden difficulty modifiers.

- [ ] **Step 4: Build a deterministic comparison harness**

`tests/metrics/grid-tuning.test.ts` runs the same seeded RNG set and the same deterministic input policy against configs created with resolutions 8, 9, and 10 while holding `cellSize`, `stepsPerSecond`, initial length and growth contract explicitly controlled.

The harness records/prints, per configuration:

```text
length @ 30s
length @ 60s
foods @ 30s
foods @ 60s
occupancy @ 30s / 60s
final foods score
final occupied length
run duration
cause of death
near-body encounters
first pressure time
first confinement time
```

This harness is comparative evidence, not a human-skill simulator. Do not convert its output automatically into product config.

- [ ] **Step 5: Run 8³/9³/10³ comparison and preserve evidence in the PR/implementation review**

Suggested command after adding script:

```bash
npm run test:tuning
```

Expected: deterministic repeated output for the same seeds.

- [ ] **Step 6: Make an explicit Phase 7 tuning recommendation**

Based on deterministic metrics plus manual controlled play, recommend final resolution and whether the provisional 300-food target appears operationally viable.

Hard gate:

- if recommendation keeps 300 foods, continue;
- if recommendation changes the 300-food target/progress curve, stop implementation of that product change and request explicit approval/spec amendment first.

- [ ] **Step 7: Commit metrics infrastructure only**

```bash
git add src/game/metrics.ts tests/integration/grid-tuning-metrics.test.ts tests/metrics/grid-tuning.test.ts package.json package-lock.json
git commit -m "test: add voxel difficulty tuning metrics"
```

Do not commit an unapproved completion-target change in this task.

---

## Phase 8 — Responsive/browser verification and cleanup

### Task 13: Expand Playwright for desktop, portrait, landscape, DPR, discrete input, pixel renderer, and camera switching

**Files:**
- Modify: `playwright.config.ts`
- Rewrite/extend: `tests/e2e/game.spec.ts`
- Preserve: `tests/e2e/ranked.spec.ts` only for the legacy/preserved V1 ranking seam if its harness remains valid; do not make active V2 submit to V1 backend.
- Modify: `src/styles.css` only for verified responsive defects.

**Interfaces:**
- Consumes: complete V2 runtime.
- Produces: browser-level evidence for input/layout/render resize contracts.

- [ ] **Step 1: Add an explicit mobile-landscape Playwright project**

Use Chromium with a phone-like landscape viewport/device context. Keep existing desktop and portrait coverage.

- [ ] **Step 2: Add V2 browser assertions**

At minimum verify:

- intro → username → game still works;
- initial HUD length is 6 and score is 0;
- progress bar remains visible;
- `X` toggles chase/overview and back;
- keyboard press produces one discrete turn, not a continuous yaw dataset contract;
- mobile joystick is visible and can emit one discrete intent;
- camera button works on mobile;
- no horizontal overflow in portrait or landscape;
- resize/orientation does not crash or leave stuck joystick input;
- canvas backing dimensions are lower than CSS dimensions at baseline render scale;
- representative DPR > 1 does not multiply backing dimensions back to native DPR scale;
- app remains functional after resize.

Use test-only DOM datasets only for logical/input state that cannot otherwise be asserted; do not expose production debug UI.

- [ ] **Step 3: Run the browser suite and fix only observed responsive defects**

Run:

```bash
npm run test:e2e
```

Expected: PASS across desktop, portrait mobile, landscape mobile, and preserved legacy ranking project where applicable.

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts tests/e2e/game.spec.ts tests/e2e/ranked.spec.ts src/styles.css
git commit -m "test: verify voxel game across responsive browsers"
```

---

### Task 14: Remove obsolete V1 continuous gameplay authority and update active documentation

**Files:**
- Delete or stop exporting V1-only gameplay modules if now unused: `src/game/trail.ts`, continuous steering/motion portions of `src/game/steering.ts`, `advanceHead()` and old movement constants where safe.
- Modify: `src/game/constants.ts`
- Modify: `README.md`
- Modify relevant tests that are now historical-only.
- Do **not** edit the historical V1 spec to pretend it described V2.

**Interfaces:**
- Consumes: all prior green V2 tasks.
- Produces: repository with one active gameplay authority and no accidental production dependency on continuous V1 movement.

- [ ] **Step 1: Prove dead/forbidden production dependencies before deletion**

Search production imports/usages for:

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

Expected: none in active V2 gameplay/runtime. Any remaining use must be classified as legacy-only test/tooling or migrated before deletion.

- [ ] **Step 2: Add/extend architecture tests**

Assert active V2 gameplay does not import continuous trail/steering authority and does not depend on radius-based food/self-collision constants.

- [ ] **Step 3: Remove obsolete active code/constants carefully**

Delete modules only if no preserved backend/tooling path requires them. It is acceptable to retain legacy-only helpers under an explicit legacy namespace if removing them would unnecessarily break V1 backend tests; they must not be imported by active V2 runtime.

- [ ] **Step 4: Update README active-game description**

Document:

- Pixel Flight Grid V2 as active ruleset;
- 9³ baseline subject to Phase 7 tuning result;
- score = foods collected;
- V2 personal best isolation;
- voxel/pixel presentation;
- toroidal grid wrap;
- discrete cell authority + smooth interpolation;
- preserved `X` camera mode;
- future online ranking seam currently not used for V2.

- [ ] **Step 5: Run focused architecture/docs verification**

Run:

```bash
npm test -- tests/unit/grid-authority-boundary.test.ts
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A src/game README.md tests/unit/grid-authority-boundary.test.ts
git commit -m "refactor: retire continuous V1 gameplay authority"
```

---

## Phase 9 — Final verification, review, and release gate

### Task 15: Execute full V2 verification on the exact candidate commit

**Files:**
- No source changes unless verification reveals a defect; any fix requires its own TDD cycle and commit before rerunning this task from the start.

**Interfaces:**
- Produces: fresh release evidence tied to one exact candidate SHA.

- [ ] **Step 1: Record candidate state**

```bash
git status --short
git rev-parse HEAD
git log -1 --oneline
```

Expected: clean working tree.

- [ ] **Step 2: Run full repository gates**

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

Expected: all applicable commands PASS on the same SHA.

- [ ] **Step 3: Review acceptance-criteria evidence against the approved spec**

Explicitly confirm:

```text
integer GridCell authority
GridFrame rotation invariants
exact occupied-cell collision
tail-vacate semantics
free-cell food
+2 growth
score = foodsCollected
V2 ruleset persistence isolation
no V2 -> V1 ranking submission
normative head/body wrap interpolation
voxel geometry
9-cell visual/logical grid alignment
AA off + reduced backing resolution
elevated chase + overview toggle
desktop + portrait + landscape
tuning comparison 8³/9³/10³
300-food target unchanged unless separately approved
```

- [ ] **Step 4: Run final code review before merge**

Use `superpowers:requesting-code-review`. Review specifically for hidden reintroduction of floats as gameplay authority, stale V1 collision/movement imports, wrap interpolation edge cases, and score/ranking contamination.

- [ ] **Step 5: If review is green, prepare PR/merge without bypassing `main` gates**

PR description must include:

- approved spec path;
- this plan path;
- candidate SHA;
- test/CI evidence;
- 8³/9³/10³ tuning summary;
- final chosen resolution/tuning values;
- explicit statement that completion target stayed 300 or link to a separately approved amendment if it changed.

Do not merge a target change that lacks that amendment.

- [ ] **Step 6: After merge, verify `main` CI and GitHub Pages deployment**

Do not declare production updated from the merge event alone. Verify the post-merge `main` workflow and Pages deploy conclude successfully on the merged SHA.

---

## Dependency / Task Order

The implementation is intentionally serial through the spatial core because later contracts depend on earlier type/identity decisions:

```text
0 baseline
  ↓
1 GridConfig/topology
  ↓
2 GridFrame
  ↓
3 movement + discrete input
  ↓
4 snake/collision/food
  ↓
5 run authority
  ↓
6 interpolation
  ↓
7 voxel renderer
  ↓
8 pixel pipeline
  ↓
9 camera V2
  ↓
10 main-loop integration
  ↓
11 score/persistence/ranking guard
  ↓
12 tuning metrics + explicit tuning gate
  ↓
13 responsive/E2E
  ↓
14 V1 authority cleanup/docs
  ↓
15 full verification/review/release
```

Do not parallelize Tasks 1–6: their interfaces are deliberately cumulative. After Task 10, Task 11 and the pure metric plumbing in Task 12 can be reviewed independently, but the Phase 7 tuning conclusion still requires the integrated runtime.

## Plan Self-Review Result

- **Spec coverage:** all approved V2 sections are mapped to Tasks 1–15; the provisional completion target has an explicit stop gate in Task 12.
- **Closed decisions:** deterministic `GridFrame` formulas and derived `worldSize` factory are fixed in this plan and require no spec amendment.
- **Type consistency:** active gameplay uses `GridCell`, `GridFrame`, stable `SnakeSegment.id`, `GridSnakeState`, `RenderTransition`, and V2 `RunResult` consistently across tasks.
- **Authority boundary:** `worldToCell()` is explicitly restricted and protected by an architecture test; rendering never feeds logical state.
- **Persistence boundary:** V1 best is preserved, V2 score is isolated, and V2 is prevented from entering the current V1 validator.
- **Release discipline:** `main` remains untouched until the integrated branch is fully green, reviewed, and accepted.
