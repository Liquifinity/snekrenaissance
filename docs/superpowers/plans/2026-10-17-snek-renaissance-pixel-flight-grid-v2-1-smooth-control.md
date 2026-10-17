# SNEK RENAISSANCE — Pixel Flight Grid V2.1 Smooth Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace V2's latched 90-degree turn pipeline with continuous 60 Hz yaw/pitch steering while preserving exact toroidal grid occupancy, food, growth, self-collision, voxel presentation, and local-first product behavior.

**Architecture:** Runtime steering and head motion become continuous in logical grid coordinates. A deterministic toroidal voxel traversal bridge converts each continuous head segment into ordered cell-entry events; those events remain the sole authority for body occupancy, food, growth, and self-collision. Rendering consumes continuous flight pose plus a render-only path history; no render float feeds gameplay.

**Tech Stack:** TypeScript, Three.js, Vitest, Playwright, Vite, existing GitHub Actions CI.

**Spec:** `docs/superpowers/specs/2026-10-17-snek-renaissance-pixel-flight-grid-v2-1-smooth-control-design.md`

## Global Constraints

- Baseline implementation starts from documentation SHA `4ba61e598b167ccbdb0e1bd8a5c6c2aa1c50ab83`, whose parent production SHA is `37378a2e4890b258aa529ed5478c1a637c9488b9`.
- Final ruleset ID is exactly `pixel-flight-grid-v2-1`.
- Grid baseline remains `resolution=9`, `cellSize=0.40`, `initialLength=6`, `growthPerFood=2`.
- Continuous simulation runs through the existing outer `FixedStepClock` at `60 Hz`; no second movement clock may gate steering.
- `STEERING_RATE = Math.PI * 0.9`, `MAX_PITCH = 80°`, `FLIGHT_SPEED_CELLS_PER_SECOND = 6.0`.
- Canonical input signs: left `yaw<0`, right `yaw>0`, up `pitch>0`, down `pitch<0`.
- Joystick deadzone baseline is `0.15`, with continuous proportional output and no activation/rearm latch.
- Gameplay world authority is logical grid space; Three.js/world coordinates never feed steering, traversal, collision, food, growth, scoring, or persistence.
- Strategic snake authority remains ordered occupied `GridCell` values with exact tail-vacate collision semantics.
- Food remains exactly one free `GridCell`; pickup occurs on cell entry, never radius.
- Growth remains exactly `+2` occupied cells per food.
- Food and snake voxel footprint remain `0.8 × cellSize`.
- V1 and V2 local history must remain intact. V2.1 local best uses `snek.localBest.pixelGridV2_1`.
- Current HTTP ranking backend remains unsupported for V2.1.
- Every implementation-task commit must leave targeted tests and `npm test` green. When an API contract changes, migrate affected old tests in the same task; do not intentionally carry a red V2 test into a later task.
- Temporary compatibility code is allowed only while a production consumer remains. No final V2.1 runtime path or V2.1 test may depend on `TurnIntentQueue`, `GridMovementClock`, joystick rearm thresholds, or 90° `GridFrame` steering.
- Do not merge to `main` until exact-candidate CI is green and human playtest accepts control feel.

## Review Focus

1. **Simultaneous voxel-boundary crossings:** two-axis and three-axis ties must resolve deterministically as one geometric event with one destination cell, never axis-order dependent.
2. **Toroidal wrap while turning:** a continuous path crossing `N→0` or `0→N` must not create a full-arena render/camera lerp or duplicate strategic cell entry.
3. **Mixed keyboard + joystick input:** axes add and clamp to `[-1,+1]` without sign inversion, stale intent, or a hidden latch.
4. **Multiple cell entries inside one simulation tick:** traversal must emit every entered cell in order and RunState must stop immediately on collision rather than process later entries.
5. **Growth/body visual coherence:** adding two strategic cells must not churn existing IDs, detach the head visually, or allow a render-only trail to become gameplay authority.

---

## File Structure

### New gameplay files

- `src/game/flight.ts` — continuous logical-grid flight types, steering integration, forward vector, toroidal point wrapping, initial pose, and continuous head advance.
- `src/game/grid-traversal.ts` — deterministic unwrapped-segment voxel traversal and canonical cell-entry events.

### New presentation file

- `src/render/flight-trail.ts` — render-only unwrapped trajectory history and body sampling; must not be imported by gameplay modules.

### Existing files with changed responsibility

- `src/input/keyboard.ts` — movement becomes held-state analog output; camera `X` remains edge-triggered.
- `src/input/joystick.ts` — continuous proportional screen-space yaw/pitch with deadzone; no movement intents.
- `src/input/input-state.ts` — shared axis clamp/neutral helpers only.
- `src/game/run-state.ts` — owns `FlightPose`, advances continuous motion, consumes traversal entries, and updates strategic occupancy.
- `src/game/grid-config.ts` — changes ruleset identity only; grid dimensions stay unchanged.
- `src/game/simulation.ts` — exposes fixed-clock interpolation alpha without changing its scheduling semantics.
- `src/render/snake-renderer.ts` — accepts explicit continuous head pose and render-only body positions rather than `GridFrame`-derived head presentation.
- `src/render/chase-camera.ts` — consumes continuous flight presentation.
- `src/main.ts` — reads one continuous input state, steps it at 60 Hz, updates render-only trail, and removes turn queue plumbing.
- `src/app/identity.ts` — adds isolated V2.1 local-best key/helpers.
- `src/app/app-controller.ts` — uses V2.1 local-best helpers and the new ruleset boundary.
- `src/game/metrics.ts` — retains occupancy metrics and adds V2.1 steering/cell-entry counters where runtime metrics are recorded.
- `README.md` — documents V2.1 controls and authority model after runtime migration is complete.

### Tests

- Create `tests/unit/flight.test.ts`.
- Create `tests/unit/grid-traversal.test.ts`.
- Create `tests/unit/flight-trail.test.ts`.
- Modify `tests/unit/keyboard.test.ts`.
- Modify `tests/unit/joystick.test.ts`.
- Modify `tests/unit/grid-run-state.test.ts`.
- Modify `tests/unit/grid-authority-boundary.test.ts`.
- Modify `tests/unit/simulation-step.test.ts`.
- Modify `tests/unit/voxel-renderer.test.ts`.
- Modify `tests/unit/chase-camera.test.ts`.
- Modify `tests/unit/identity.test.ts`.
- Modify `tests/unit/app-flow.test.ts` and `tests/unit/app-ranking-flow.test.ts`.
- Modify `tests/unit/task11-v2-boundary.test.ts` or replace it with a V2.1-named boundary test in the same task.
- Modify `tests/e2e/game.spec.ts`.
- Modify `tests/e2e/ranked.spec.ts`.

---

### Task 0: Isolate execution branch and prove the approved baseline

**Files:**
- No product changes.
- Read: spec and this plan.

**Interfaces:**
- Consumes: approved documentation SHA `4ba61e598b167ccbdb0e1bd8a5c6c2aa1c50ab83`.
- Produces: isolated feature branch/worktree based exactly on that SHA, with fresh green baseline evidence.

- [ ] **Step 1: Create an isolated worktree/branch**

Use `superpowers:using-git-worktrees`. Name the implementation branch `feat/pixel-flight-grid-v2-1-smooth-control`.

- [ ] **Step 2: Verify exact ancestry**

Run:

```bash
git rev-parse HEAD
git merge-base main HEAD
```

Expected: feature HEAD initially equals `4ba61e598b167ccbdb0e1bd8a5c6c2aa1c50ab83`; merge base resolves to production lineage containing `37378a2e4890b258aa529ed5478c1a637c9488b9`.

- [ ] **Step 3: Install and run baseline verification**

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

Expected: all required production gates pass before product code changes.

- [ ] **Step 4: Record baseline SHA and results in the execution notes/PR body draft**

No commit required if no tracked file changes.

---

### Task 1: Replace discrete movement input with one continuous axis contract

**Files:**
- Modify: `src/input/keyboard.ts`
- Modify: `src/input/joystick.ts`
- Modify: `src/input/input-state.ts` only if helper signatures require it
- Modify: `tests/unit/keyboard.test.ts`
- Modify: `tests/unit/joystick.test.ts`

**Interfaces:**
- Consumes: `InputState { yaw: number; pitch: number }`, `clampInputAxis()`.
- Produces: `KeyboardInput.state` and `JoystickInput.state` with canonical continuous signs; `KeyboardInput` retains edge-triggered `onCameraToggle`; movement `takeIntent()` APIs are removed from final code.

- [ ] **Step 1: Write RED keyboard tests for held-state semantics**

Add assertions that:

```text
ArrowRight/D held => state.yaw === +1 until keyup
ArrowLeft/A held  => state.yaw === -1 until keyup
ArrowUp/W held    => state.pitch === +1 until keyup
ArrowDown/S held  => state.pitch === -1 until keyup
left + right      => yaw === 0
up + down         => pitch === 0
X keydown edge    => camera toggles once; holding X does not repeat
blur              => neutralInput()
```

- [ ] **Step 2: Run keyboard tests and verify RED**

Run:

```bash
npx vitest run tests/unit/keyboard.test.ts
```

Expected: current sign/edge-intent contract fails the new held-state assertions.

- [ ] **Step 3: Implement held-state `KeyboardInput`**

Required public surface:

```ts
class KeyboardInput {
  get state(): InputState;
  handleKeyDown(key: string): void;
  handleKeyUp(key: string): void;
  handleBlur(): void;
  attach(target?: Window): () => void;
}
```

Movement state is recomputed from held keys with `yaw = right - left`, `pitch = up - down`. Remove movement `pendingIntent`/`takeIntent`; retain edge detection only for `X`.

- [ ] **Step 4: Write RED joystick tests**

Pin:

```text
right => yaw > 0
left  => yaw < 0
up    => pitch > 0
down  => pitch < 0
center/within 0.15 radial deadzone => {0,0}
0.575 radial deflection => approximately 0.5 normalized magnitude after deadzone rescale
right -> center -> left works continuously with no rearm state
pointer end/cancel/reset => neutral
```

- [ ] **Step 5: Run joystick tests and verify RED**

Run:

```bash
npx vitest run tests/unit/joystick.test.ts
```

Expected: current activation/rearm/discrete-intent behavior fails.

- [ ] **Step 6: Implement continuous joystick state**

Export:

```ts
export const JOYSTICK_DEADZONE = 0.15;
```

`updateFromPoint()` computes normalized screen axes, applies radial deadzone and radial rescaling `(magnitude-deadzone)/(1-deadzone)`, preserves direction, and stores only continuous `InputState`. Remove movement latch, `pendingIntent`, activation/rearm constants, and `takeIntent()`.

- [ ] **Step 7: Verify targeted and global unit suite**

Run:

```bash
npx vitest run tests/unit/keyboard.test.ts tests/unit/joystick.test.ts
npm test
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/input tests/unit/keyboard.test.ts tests/unit/joystick.test.ts
git commit -m "feat: restore continuous steering input"
```

---

### Task 2: Introduce continuous logical flight pose and 60 Hz steering

**Files:**
- Create: `src/game/flight.ts`
- Create: `tests/unit/flight.test.ts`
- Modify: `src/game/constants.ts` only for shared fixed-step constants if needed; do not duplicate the existing 60 Hz scheduler constant.

**Interfaces:**
- Consumes: `GridCell`, `GridConfig`, `Vec3`.
- Produces:

```ts
export type SteeringInput = Readonly<{ yaw: number; pitch: number }>;
export type GridPoint = Readonly<{ x: number; y: number; z: number }>;
export type FlightOrientation = Readonly<{ yaw: number; pitch: number; roll: 0 }>;
export type FlightPose = Readonly<{
  unwrappedPosition: GridPoint;
  wrappedPosition: GridPoint;
  orientation: FlightOrientation;
  forward: Vec3;
}>;

export const STEERING_RATE: number; // Math.PI * 0.9
export const MAX_PITCH: number; // 80° radians
export const FLIGHT_SPEED_CELLS_PER_SECOND = 6;

export function createInitialFlightPose(headCell: GridCell, config?: GridConfig): FlightPose;
export function applySteering(orientation: FlightOrientation, input: SteeringInput, dt: number): FlightOrientation;
export function forwardVector(orientation: FlightOrientation): Vec3;
export function wrapGridPoint(point: GridPoint, resolution: number): GridPoint;
export function advanceFlightPose(pose: FlightPose, input: SteeringInput, dt: number, config?: GridConfig): FlightPose;
```

- [ ] **Step 1: Write RED flight tests**

Pin exact values:

```text
initial cell center => (x+.5,y+.5,z+.5), yaw=0, pitch=0, forward=+Z
right full input for 1/60 s => yaw increases by (π*0.9)/60
left full input => symmetric negative yaw
half input => half angular delta
held right for 10 ticks => ten deltas, not one
pitch clamps at ±80°
neutral input preserves orientation
60 × 1/60 s and deterministic equivalent fixed-step integration produce the same orientation
advance at neutral for 1/60 s => +0.1 logical Z cell
wrap point N+epsilon => epsilon; negative epsilon => N-epsilon
invalid negative/non-finite dt => RangeError
```

- [ ] **Step 2: Run test and verify RED**

```bash
npx vitest run tests/unit/flight.test.ts
```

Expected: module missing.

- [ ] **Step 3: Implement `src/game/flight.ts`**

Use authoritative yaw/pitch, roll fixed at zero, and logical-grid units. Do not import Three.js. Do not derive gameplay orientation from a quaternion.

- [ ] **Step 4: Verify flight tests and `npm test`**

```bash
npx vitest run tests/unit/flight.test.ts
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/flight.ts tests/unit/flight.test.ts src/game/constants.ts
git commit -m "feat: add continuous logical flight pose"
```

---

### Task 3: Add deterministic toroidal voxel traversal

**Files:**
- Create: `src/game/grid-traversal.ts`
- Create: `tests/unit/grid-traversal.test.ts`

**Interfaces:**
- Consumes: `GridPoint` from Task 2, `GridCell`, `GridConfig`.
- Produces:

```ts
export type GridCellEntry = Readonly<{
  cell: GridCell;
  tEnter: number; // 0..1 along from->to
}>;

export function traverseGridSegment(
  fromUnwrapped: GridPoint,
  toUnwrapped: GridPoint,
  config?: GridConfig
): readonly GridCellEntry[];
```

- [ ] **Step 1: Write RED traversal tests**

Required cases:

```text
same voxel => []
(4.5,4.5,4.5) -> (4.5,4.5,5.1) => [{4,4,5}]
long +Z segment => every crossed Z cell in order
long -X segment => every crossed X cell in order
unwrapped X 8.9 -> 9.1 at N=9 => canonical X 0 exactly once
negative wrap -0.1 => canonical X 8
2-axis exact corner crossing => one deterministic diagonal destination event
3-axis exact corner crossing => one deterministic diagonal destination event
duplicate canonical cell within one segment is suppressed
high-speed path crossing many cells cannot skip an intermediate target cell
zero-length segment => []
non-finite coordinates => RangeError
```

- [ ] **Step 2: Run traversal tests and verify RED**

```bash
npx vitest run tests/unit/grid-traversal.test.ts
```

Expected: module missing.

- [ ] **Step 3: Implement Amanatides–Woo-style traversal with explicit tie handling**

Algorithm requirements not inferable from signature:

- operate on unwrapped coordinates;
- derive start/end integer voxels via floor;
- compute per-axis step, first-boundary `tMax`, and `tDelta`;
- at each minimum `t`, advance **all axes whose `tMax` equals that minimum within a small deterministic epsilon**;
- emit the resulting destination voxel once for that geometric event;
- canonicalize emitted integer coordinates modulo `resolution`;
- preserve increasing `tEnter` order;
- stop once the end voxel is reached; include end voxel only if it differs from start.

- [ ] **Step 4: Verify traversal tests and global tests**

```bash
npx vitest run tests/unit/grid-traversal.test.ts
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/grid-traversal.ts tests/unit/grid-traversal.test.ts
git commit -m "feat: traverse continuous flight through voxel grid"
```

---

### Task 4: Migrate RunState to continuous flight plus strategic cell-entry processing

**Files:**
- Modify: `src/game/run-state.ts`
- Modify: `src/game/grid-config.ts`
- Modify: `tests/unit/grid-run-state.test.ts`
- Modify: `tests/unit/collision.test.ts` only if helper setup changes
- Modify: `tests/unit/food.test.ts` only if helper setup changes
- Modify: `tests/unit/grid-authority-boundary.test.ts`

**Interfaces:**
- Consumes: `FlightPose`, `SteeringInput`, `advanceFlightPose()` from Task 2; `traverseGridSegment()` from Task 3; existing `GridSnakeState`, `wouldSelfCollide()`, `commitSnakeStep()`, food/growth helpers.
- Produces revised `RunState`:

```ts
export type RunState = {
  phase: RunPhase;
  config: GridConfig;
  snake: GridSnakeState;
  flight: FlightPose;
  previousFlight: FlightPose;
  food: GridCell | null;
  foodsCollected: number;
  score: number;
  foodEaten: number;
  maxLength: number;
  elapsedMs: number;
  result: RunResult | null;
  transition: LogicalTransition | null; // occupancy/body transition only
};

export function stepRun(
  state: RunState,
  input: SteeringInput,
  dtSeconds: number,
  rng?: () => number,
  config?: GridConfig
): RunState;
```

`queueTurnIntent`, `turnQueue`, `movementClock`, `renderAlpha`, and runtime `frame: GridFrame` disappear from V2.1 RunState.

- [ ] **Step 1: Write RED RunState migration tests**

Pin:

```text
createRun flight head starts at exact center of strategic head cell
1/60 s right input changes yaw even when no new cell is entered
within-cell tick leaves snake occupancy identical
crossing one boundary commits exactly one strategic snake step
food cell entered by trajectory increments foods/score and adds +2 pending growth
subsequent occupancy commits consume +2 growth exactly as V2
candidate occupied cell triggers game-over before commit
collision on first entry prevents later entries from same synthetic multi-entry processing path
ruleset result is pixel-flight-grid-v2-1
score remains foodsCollected
```

For the multi-entry stop case, extract a package-private/testable helper if necessary:

```ts
processGridEntries(state: RunState, entries: readonly GridCellEntry[], rng: () => number): void
```

If exported for tests, document it as deterministic simulation infrastructure, not public app API.

- [ ] **Step 2: Run targeted tests and verify RED**

```bash
npx vitest run tests/unit/grid-run-state.test.ts tests/unit/grid-authority-boundary.test.ts
```

Expected: old discrete RunState contract fails.

- [ ] **Step 3: Change `RULESET_ID`**

In `src/game/grid-config.ts`:

```ts
export const RULESET_ID = 'pixel-flight-grid-v2-1' as const;
```

Do not change resolution/cell/growth baselines.

- [ ] **Step 4: Implement continuous RunState**

Per fixed tick:

```text
previousFlight = flight
nextFlight = advanceFlightPose(flight,input,dt)
entries = traverseGridSegment(previousFlight.unwrappedPosition,nextFlight.unwrappedPosition)
process entries sequentially through collision -> commit -> food/growth
flight = nextFlight unless run termination policy explicitly clamps it at the first rejected entry
```

At baseline speed (`0.1 cell/tick`) normal ticks cross at most one boundary event, but processing must remain correct for an injected multi-entry list.

- [ ] **Step 5: Strengthen authority-boundary tests**

Assert final runtime gameplay modules do not import:

```text
TurnIntentQueue
GridMovementClock
rotateGridFrame
worldToCell
Three.js
render/flight-trail
```

- [ ] **Step 6: Migrate affected old tests in the same task**

Remove/replace assertions that require a `GridFrame`/turn queue inside active RunState. Historical pure `grid-frame.test.ts` / `grid-movement.test.ts` may remain temporarily, but no V2.1 RunState test may depend on them.

- [ ] **Step 7: Verify**

```bash
npx vitest run tests/unit/grid-run-state.test.ts tests/unit/collision.test.ts tests/unit/food.test.ts tests/unit/grid-authority-boundary.test.ts
npm test
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/game tests/unit/grid-run-state.test.ts tests/unit/collision.test.ts tests/unit/food.test.ts tests/unit/grid-authority-boundary.test.ts
git commit -m "feat: drive grid occupancy from continuous flight"
```

---

### Task 5: Expose fixed-clock interpolation alpha

**Files:**
- Modify: `src/game/simulation.ts`
- Modify: `tests/unit/simulation-step.test.ts`

**Interfaces:**
- Consumes: existing `FixedStepClock` scheduling semantics.
- Produces:

```ts
class FixedStepClock {
  get alpha(): number; // accumulator / stepSeconds, clamped to [0,1)
}
```

- [ ] **Step 1: Write RED alpha tests**

Assert:

```text
new/reset clock alpha = 0
consume half a fixed step without stepping => alpha ~= 0.5
consume a full step => one step and alpha ~= 0
catch-up leaves alpha representing only residual accumulator
non-finite/negative frame deltas retain existing safe behavior
```

- [ ] **Step 2: Run test and verify RED**

```bash
npx vitest run tests/unit/simulation-step.test.ts
```

- [ ] **Step 3: Implement read-only alpha getter without changing consume behavior**

- [ ] **Step 4: Verify**

```bash
npx vitest run tests/unit/simulation-step.test.ts
npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/game/simulation.ts tests/unit/simulation-step.test.ts
git commit -m "feat: expose fixed-step render alpha"
```

---

### Task 6: Add render-only continuous trail and flight presentation

**Files:**
- Create: `src/render/flight-trail.ts`
- Create: `tests/unit/flight-trail.test.ts`
- Modify: `src/render/snake-renderer.ts`
- Modify: `tests/unit/voxel-renderer.test.ts`
- Modify: `tests/unit/gameplay-presentation.test.ts`

**Interfaces:**
- Consumes: `GridPoint`, `FlightPose`, strategic snake segment count/IDs, `GridConfig`.
- Produces render-only trajectory API:

```ts
export class FlightTrail {
  reset(head: GridPoint): void;
  push(head: GridPoint): void;
  trimToDistance(maxDistanceCells: number): void;
  sampleBehind(distanceCells: number, headOverride?: GridPoint): GridPoint;
}

export type VoxelSnakeRenderSnapshot = Readonly<{
  headPosition: Vec3;
  headQuaternion: Readonly<{ x: number; y: number; z: number; w: number }>;
  bodyPositions: readonly Vec3[];
}>;
```

The plan deliberately places `FlightTrail` under `src/render`, not `src/game`.

- [ ] **Step 1: Write RED FlightTrail tests**

Pin:

```text
straight +Z history samples 1,2,3 cells behind at correct unwrapped positions
curved polyline samples by accumulated path distance, not array index
trim retains enough leading/trailing interpolation data
headOverride changes the leading interpolation point without mutating stored gameplay state
unwrapped points remain unwrapped across toroidal boundary
zero/negative requested distance returns head/throws according to chosen exact API; choose and test one behavior
```

Choose: distance `<0` throws `RangeError`; distance `0` returns `headOverride ?? newest`.

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run tests/unit/flight-trail.test.ts
```

- [ ] **Step 3: Implement `FlightTrail`**

Use accumulated Euclidean distance in logical grid units. Never canonicalize inside the trail; wrap is a presentation concern applied after sampling.

- [ ] **Step 4: Write RED renderer tests for continuous snapshot API**

Assert head mesh uses explicit world position/quaternion; body instances use supplied explicit world positions; voxel dimensions remain `0.8 × cellSize`; capacity growth behavior remains.

- [ ] **Step 5: Migrate `SnakeRenderer` to explicit continuous snapshot**

Remove runtime dependency on `InterpolatedFrame` / `InterpolatedSegment`. Keep voxel geometry/materials/eyes unchanged.

- [ ] **Step 6: Add presentation helpers in `flight-trail.ts` or a focused adjacent helper only if needed**

Required conversion contract:

```text
unwrapped logical point -> canonical per-axis display point -> world = point*cellSize - worldSize/2
```

For head orientation, derive a render quaternion from authoritative yaw/pitch; render quaternion never feeds gameplay.

- [ ] **Step 7: Verify**

```bash
npx vitest run tests/unit/flight-trail.test.ts tests/unit/voxel-renderer.test.ts tests/unit/gameplay-presentation.test.ts
npm test
```

- [ ] **Step 8: Commit**

```bash
git add src/render/flight-trail.ts src/render/snake-renderer.ts tests/unit/flight-trail.test.ts tests/unit/voxel-renderer.test.ts tests/unit/gameplay-presentation.test.ts
git commit -m "feat: render voxel snake from continuous flight trail"
```

---

### Task 7: Move chase camera to continuous flight pose

**Files:**
- Modify: `src/render/chase-camera.ts`
- Modify: `tests/unit/chase-camera.test.ts`

**Interfaces:**
- Consumes continuous presentation:

```ts
type ChaseTarget = Readonly<{
  headWorld: Vec3;          // unwrapped presentation world
  forwardWorld: Vec3;
  upWorld: Vec3;
  displayWrapOffset: Vec3;  // canonicalization delta for the head
}>;
```

- Produces existing camera-controller behavior with the same baseline offsets/FOV and wrap relocation.

- [ ] **Step 1: Write/replace camera tests**

Pin:

```text
continuous small yaw changes produce continuous desired camera movement, not cardinal snaps
continuous pitch changes use derived up/forward coherently
wrap offset relocates prior smoothed camera pose before smoothing
no full-world camera sweep on N->0 wrap
baseline 4.0 behind / 2.8 up / 2.0 lookahead / FOV 60 remain
```

- [ ] **Step 2: Run and verify RED where old GridFrame assumptions remain**

```bash
npx vitest run tests/unit/chase-camera.test.ts
```

- [ ] **Step 3: Remove any remaining cardinal-frame assumptions from camera**

Keep smoothing and wrap-relocation behavior.

- [ ] **Step 4: Verify**

```bash
npx vitest run tests/unit/chase-camera.test.ts
npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/render/chase-camera.ts tests/unit/chase-camera.test.ts
git commit -m "feat: follow continuous flight with chase camera"
```

---

### Task 8: Integrate continuous steering, trail, rendering, and telemetry in the browser loop

**Files:**
- Modify: `src/main.ts`
- Modify: `tests/unit/main-v2-loop.test.ts` (rename to `main-v2-1-loop.test.ts` if the file name is contract-specific; delete the old file in the same commit if renamed)
- Modify: `tests/e2e/game.spec.ts`

**Interfaces:**
- Consumes: continuous `KeyboardInput.state`, `JoystickInput.state`, `stepRun(run,input,dt)`, `FixedStepClock.alpha`, `FlightTrail`, continuous `SnakeRenderer` snapshot, chase target.
- Produces one runtime control path with no movement intents/FIFO.

- [ ] **Step 1: Write RED structural browser-loop unit test**

Assert `src/main.ts` contains no runtime reference/import to:

```text
queueTurnIntent
keyboard.takeIntent
joystick.takeIntent
TurnIntentQueue
GridMovementClock
```

and does call `stepRun(run, input, dt)` using the combined continuous state.

- [ ] **Step 2: Write RED E2E control tests**

Desktop:

```text
hold ArrowRight across multiple fixed ticks => exposed yaw/orientation continues changing without repeat keydown
release => orientation stops changing except forward travel
hold ArrowLeft reverses yaw rate direction
hold ArrowUp/Down continuously changes pitch with clamp-safe behavior
```

Mobile portrait and landscape:

```text
right stick held => positive yaw remains active
move directly right -> center -> left => steering changes sign with no rearm protocol
trace diagonal/circular pointer path => both axes update continuously; no ignored-command latch
return center => neutral axes and no delayed historical turn afterwards
```

Expose read-only diagnostics as needed:

```text
data-input-yaw
data-input-pitch
data-head-yaw
data-head-pitch
data-head-point
data-head-cell
```

Diagnostics must never be read back by gameplay.

- [ ] **Step 3: Run focused tests and verify RED**

```bash
npx vitest run tests/unit/main-v2-loop.test.ts
npm run test:e2e -- --grep "continuous|steering|joystick"
```

Expected: current turn-intent runtime fails.

- [ ] **Step 4: Implement new main-loop order**

Per animation frame:

```text
read + combine continuous input
consume FixedStepClock
  for each 1/60 step:
    stepRun(run,input,dt)
    push run.flight.unwrappedPosition to render-only FlightTrail
render with fixedClock.alpha
camera from continuous flight presentation
```

Initialize/reset trail whenever active RunState changes. Trim trail to at least `(snake.segments.length + reserve) * 1 cell` where reserve is render-only and documented in `flight-trail.ts`.

- [ ] **Step 5: Build render snapshot**

Interpolate previous/current flight pose using `fixedClock.alpha`. Sample body positions one logical cell apart behind the interpolated head using `FlightTrail`; canonicalize each sampled point only for display conversion.

- [ ] **Step 6: Update telemetry**

Replace cardinal `data-head-forward` with continuous diagnostics while preserving `data-head-cell` for occupancy checks.

- [ ] **Step 7: Verify unit + E2E + global unit suite**

```bash
npm test
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/main.ts tests/unit/main-v2-loop.test.ts tests/unit/main-v2-1-loop.test.ts tests/e2e/game.spec.ts
git commit -m "feat: integrate smooth V2.1 browser controls"
```

---

### Task 9: Isolate V2.1 persistence and ranking boundary

**Files:**
- Modify: `src/app/identity.ts`
- Modify: `src/app/app-controller.ts`
- Modify: `src/app/session-gateway.ts` only if ruleset typing requires it
- Modify: `src/app/http-session-gateway.ts` only if comments/tests require the new ID
- Modify: `tests/unit/identity.test.ts`
- Modify: `tests/unit/app-flow.test.ts`
- Modify: `tests/unit/app-ranking-flow.test.ts`
- Modify/rename: `tests/unit/task11-v2-boundary.test.ts`
- Modify: `tests/e2e/ranked.spec.ts`

**Interfaces:**
- Produces:

```ts
export const V2_1_LOCAL_BEST_KEY = 'snek.localBest.pixelGridV2_1';
export function loadPixelGridV2_1Best(storage: StorageLike): number;
export function savePixelGridV2_1Best(storage: StorageLike, score: number): number;
```

- [ ] **Step 1: Write RED identity isolation tests**

Assert V1, V2, and V2.1 keys are distinct and saving V2.1 does not change either historical value.

- [ ] **Step 2: Run identity test and verify RED**

```bash
npx vitest run tests/unit/identity.test.ts
```

- [ ] **Step 3: Implement V2.1 persistence helpers and migrate AppController**

All active V2.1 local-best reads/writes use V2.1 helpers.

- [ ] **Step 4: Update ranking-boundary tests**

Assert current `HttpSessionGateway.supportsRuleset('pixel-flight-grid-v2-1') === false` and AppController starts/runs V2.1 locally without calling legacy `/api/games` or submitting a V2.1 result.

- [ ] **Step 5: Update ranked E2E**

With HTTP gateway configured, V2.1 must remain local/unranked, persist V2.1 best, show local rank view, and make no unsupported gameplay submission.

- [ ] **Step 6: Verify**

```bash
npx vitest run tests/unit/identity.test.ts tests/unit/app-flow.test.ts tests/unit/app-ranking-flow.test.ts tests/unit/task11-v2-boundary.test.ts
npm run test:e2e
npm test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app tests/unit tests/e2e/ranked.spec.ts
git commit -m "feat: isolate V2.1 score persistence"
```

---

### Task 10: Adapt metrics and add smooth-control observability

**Files:**
- Modify: `src/game/metrics.ts`
- Modify: `tests/unit/grid-tuning-metrics.test.ts`
- Modify: `tests/metrics/grid-tuning.test.ts` so it does not silently pretend the V2 discrete greedy policy is a V2.1 gameplay benchmark.

**Interfaces:**
- Preserve existing occupancy/pressure/confinement helpers that operate on strategic cells.
- Add a V2.1 runtime accumulator or pure helpers for:

```text
totalGridCellEntries
steeringMagnitude = hypot(yaw,pitch) clamped to 1
sumSteeringMagnitude / fixedTickCount
maxConsecutiveNonZeroSteeringTicks
```

- [ ] **Step 1: Write RED metric tests**

Pin neutral/partial/full steering magnitudes, entry counting, consecutive non-zero streak reset, and existing pressure/confinement behavior.

- [ ] **Step 2: Run targeted tests and verify RED**

```bash
npx vitest run tests/unit/grid-tuning-metrics.test.ts
```

- [ ] **Step 3: Implement V2.1-safe metrics**

Do not derive occupancy from continuous render positions; use strategic snake cells only.

- [ ] **Step 4: Reclassify old discrete tuning harness**

The previous 32-seed turn policy may remain as a historical V2 regression harness only if its test name/output explicitly says V2/discrete. It must not emit a V2.1 tuning verdict. Do not invent a new autopilot policy in this migration.

- [ ] **Step 5: Verify**

```bash
npx vitest run tests/unit/grid-tuning-metrics.test.ts tests/metrics/grid-tuning.test.ts
npm test
```

- [ ] **Step 6: Commit**

```bash
git add src/game/metrics.ts tests/unit/grid-tuning-metrics.test.ts tests/metrics/grid-tuning.test.ts
git commit -m "test: separate V2.1 control metrics from V2 tuning"
```

---

### Task 11: Retire active discrete steering authority and update documentation

**Files:**
- Modify/delete as justified: `src/game/grid-movement.ts`
- Keep or mark historical: `src/game/grid-frame.ts`
- Modify: `tests/unit/grid-movement.test.ts`
- Modify: `tests/unit/grid-frame.test.ts`
- Modify: `tests/unit/grid-authority-boundary.test.ts`
- Modify: `README.md`

**Interfaces:**
- Produces final architectural invariant: no active V2.1 runtime module imports discrete-turn movement authority.

- [ ] **Step 1: Add RED static authority assertions before deleting compatibility surfaces**

Scan active runtime files (`src/main.ts`, `src/game/run-state.ts`, `src/input/*.ts`, `src/render/*.ts`) and assert absence of:

```text
TurnIntentQueue
GridMovementClock
queueTurnIntent
rotateGridFrame
JOYSTICK_ACTIVATION_THRESHOLD
JOYSTICK_REARM_THRESHOLD
```

- [ ] **Step 2: Remove obsolete runtime-only discrete movement code**

Delete `grid-movement.ts` if no non-historical consumer remains. If `GridFrame` remains only as a V2 historical pure module, make that status explicit in tests/docs and ensure production runtime dependency scan excludes it.

- [ ] **Step 3: Remove or migrate obsolete tests**

Do not retain tests whose purpose is to require active V2.1 runtime to queue 90° turns. Pure historical topology/frame tests may remain if they test still-used utilities or documented historical behavior; otherwise delete them in this task.

- [ ] **Step 4: Update README**

Document:

```text
Pixel Flight Grid V2.1
continuous held keyboard/joystick steering
60 Hz control response
strategic occupancy still exact 9³ grid
food exact cell; +2 growth; exact self collision
render-only continuous trail
V2.1 local best key and unsupported HTTP ranking seam
```

Remove active documentation telling players to tap/recenter for each turn.

- [ ] **Step 5: Verify no stale imports and run tests/typecheck**

```bash
npm test
npm run typecheck
```

Expected: PASS and no unresolved discrete-control imports.

- [ ] **Step 6: Commit**

```bash
git add -A src/game src/input src/render tests README.md
git commit -m "refactor: retire discrete V2 steering authority"
```

---

### Task 12: Full verification, browser acceptance evidence, review, and release candidate gate

**Files:**
- No product changes unless verification reveals a defect; any fix requires its own RED/GREEN cycle before returning here.
- Update PR body/release notes only after evidence exists.

**Interfaces:**
- Consumes: completed V2.1 feature branch.
- Produces: exact candidate SHA with complete automated evidence and a clearly separated human-playtest gate.

- [ ] **Step 1: Run fresh full verification on exact candidate SHA**

Record:

```bash
git rev-parse HEAD
npm audit --omit=dev --audit-level=moderate
npm test
npm run test:worker
npm run typecheck
npm run worker:build
npm run build
npm run test:e2e
```

Expected: all PASS with zero failing required tests.

- [ ] **Step 2: Inspect E2E counts and skips**

Every skip must be structurally expected from Playwright project gating. Continuous-control tests must execute in their intended desktop/mobile projects rather than be accidentally skipped everywhere.

- [ ] **Step 3: Review requirements line-by-line against the approved spec**

Explicitly verify all 16 spec acceptance criteria, especially:

```text
no movement FIFO
no 6 Hz steering gate
held controls continue steering
no joystick rearm
DDA exact cell entry
food/growth/collision remain cell-exact
V2.1 persistence isolated
```

- [ ] **Step 4: Request code review**

Use `superpowers:requesting-code-review`. If this harness has no independent subagent/reviewer capability, state that limitation explicitly and perform an inline whole-branch architectural diff audit; do not label it an independent review.

- [ ] **Step 5: Open PR to `main` only after automated candidate is green**

PR title:

```text
feat: launch Pixel Flight Grid V2.1 smooth controls
```

PR body must include candidate SHA, control architecture, verification commands/results, persistence boundary, and `Human control playtest: PENDING` until the user plays it.

- [ ] **Step 6: Require PR-triggered CI on the same head SHA**

Do not merge on stale or different-SHA CI.

- [ ] **Step 7: Human gameplay gate**

User must validate at least:

```text
keyboard hold left/right feels continuous
keyboard hold up/down feels continuous
joystick does not need recenter between steering changes
no command executes after controls return neutral
camera remains readable during sustained curves
food/body/grid visual relationship remains legible
```

If control still feels latched, delayed, over-sensitive, or under-sensitive, treat that as a product defect/tuning input before release; do not compensate by reintroducing queued turn logic.

- [ ] **Step 8: Merge only after explicit product acceptance**

Merge PR with expected-head-SHA lease, then run/observe `main` CI and GitHub Pages deploy on the resulting merge SHA before declaring production complete.
