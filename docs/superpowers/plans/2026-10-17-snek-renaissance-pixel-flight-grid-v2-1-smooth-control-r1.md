# SNEK RENAISSANCE — Pixel Flight Grid V2.1 Smooth Control Implementation Plan R1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** CANONICAL PLAN R1 — supersedes `2026-10-17-snek-renaissance-pixel-flight-grid-v2-1-smooth-control.md`.

**Goal:** Replace V2's latched 90° steering with continuous 60 Hz yaw/pitch control while keeping exact toroidal voxel occupancy, food, growth, self-collision, voxel visuals, and local-first behavior.

**Architecture:** Flight pose is continuous in logical grid coordinates. `traverseGridSegment()` converts each unwrapped continuous trajectory segment into deterministic ordered `GridCell` entries; only those entries modify strategic snake occupancy. Presentation uses a render-only unwrapped trail keyed to the existing stable strategic segment IDs; neither trail nor Three.js state may feed gameplay.

**Tech Stack:** TypeScript, Three.js, Vitest, Playwright, Vite, existing GitHub Actions CI.

**Spec:** `docs/superpowers/specs/2026-10-17-snek-renaissance-pixel-flight-grid-v2-1-smooth-control-design.md`

## Global Constraints

- Start implementation from approved documentation SHA `4ba61e598b167ccbdb0e1bd8a5c6c2aa1c50ab83`; R1 plan commit is documentation-only and must be included in the implementation branch ancestry.
- Ruleset: `pixel-flight-grid-v2-1`.
- Grid remains `9³`, `cellSize=0.40`, `initialLength=6`, `growthPerFood=2`.
- Fixed simulation: existing `FixedStepClock` at `1/60 s`.
- Steering: `STEERING_RATE=Math.PI*0.9`, `MAX_PITCH=80°`, `FLIGHT_SPEED_CELLS_PER_SECOND=6.0`.
- Input signs: left `yaw<0`, right `yaw>0`, up `pitch>0`, down `pitch<0`.
- Joystick deadzone: `0.15`, proportional radial rescale, no latch/rearm.
- Gameplay uses logical grid coordinates only; world/Three.js state never feeds simulation.
- Strategic body remains ordered stable-ID `GridCell` segments with existing tail-vacate semantics.
- Food remains exactly one free cell; pickup is exact cell entry; growth remains `+2` cells.
- Snake and food voxel fill remain `0.8 × cellSize`.
- V1/V2 history remains intact; V2.1 best key is `snek.localBest.pixelGridV2_1`.
- Legacy HTTP ranking remains unsupported for V2.1.
- Every task-ending commit must leave targeted tests and `npm test` green. API migrations and affected legacy tests happen in the same task.
- Final runtime may not depend on `TurnIntentQueue`, `GridMovementClock`, `queueTurnIntent`, 90° `GridFrame` steering, joystick activation/rearm thresholds, or movement `pendingIntent`.
- Final runtime may not depend on `LogicalTransition`/V2 cell-step interpolation for body presentation.
- Human control playtest remains a release gate after automated verification.

## Review Focus

1. Two-/three-axis DDA ties: one deterministic geometric event and one destination cell, never axis-order dependent. Covered by Task 3.
2. Toroidal wrap during sustained turning: no duplicate strategic entry and no full-cube visual/camera lerp. Covered by Tasks 3, 6, 7, 8.
3. Keyboard + joystick simultaneously: add/clamp one canonical axis convention with no hidden latch. Covered by Tasks 1 and 8.
4. Multiple entries in one tick: process in order and stop immediately at collision. Covered by Task 4.
5. Growth + render continuity: strategic IDs remain stable; render trail maps visual samples to those IDs and never becomes gameplay authority. Covered by Task 6.

---

## Locked File Responsibilities

**Create**
- `src/game/flight.ts` — continuous flight types, steering, point wrapping, head advance.
- `src/game/grid-traversal.ts` — deterministic unwrapped segment → ordered canonical cell entries.
- `src/render/flight-trail.ts` — render-only unwrapped polyline history and distance sampling.
- `src/render/flight-presentation.ts` — fixed-step pose interpolation, logical→world presentation conversion, quaternion/up/forward derivation.
- `tests/unit/flight.test.ts`
- `tests/unit/grid-traversal.test.ts`
- `tests/unit/flight-trail.test.ts`
- `tests/unit/flight-presentation.test.ts`

**Modify**
- `src/input/keyboard.ts`, `src/input/joystick.ts`
- `src/game/run-state.ts`, `src/game/grid-config.ts`, `src/game/simulation.ts`, `src/game/metrics.ts`
- `src/render/snake-renderer.ts`, `src/render/chase-camera.ts`
- `src/main.ts`
- `src/app/identity.ts`, `src/app/app-controller.ts`
- relevant unit/E2E tests and `README.md`

**Final runtime-retired / historical only**
- `src/game/grid-movement.ts`
- `src/game/grid-frame.ts`
- `src/game/logical-transition.ts`
- `src/render/interpolation.ts`

Delete a retired module only when no remaining non-historical test/tool needs it. Otherwise keep it as historical pure code, but authority-boundary tests must prove active V2.1 runtime does not import it.

---

### Task 0: Execution isolation and baseline

**Files:** none.

**Produces:** `feat/pixel-flight-grid-v2-1-smooth-control` based on the accepted documentation lineage and fresh green baseline.

- [ ] Use `superpowers:using-git-worktrees` and create the isolated implementation workspace.
- [ ] Verify branch ancestry includes the approved spec and this R1 plan; record exact starting SHA.
- [ ] Run:

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

- [ ] Require all baseline gates green before product edits. No commit if no tracked changes.

---

### Task 1: Canonical continuous input

**Files:** `src/input/keyboard.ts`, `src/input/joystick.ts`, `tests/unit/keyboard.test.ts`, `tests/unit/joystick.test.ts`.

**Produces:** state-based continuous `InputState`; movement `takeIntent()` disappears.

Required public movement contract:

```ts
InputState { yaw: number; pitch: number }
right=+yaw; left=-yaw; up=+pitch; down=-pitch
```

- [ ] RED keyboard tests: held right/left/up/down remain ±1 until release; opposing keys cancel; blur neutralizes; `X` toggles once per press edge.
- [ ] Run `npx vitest run tests/unit/keyboard.test.ts`; require RED against old intent API/signs.
- [ ] Implement `KeyboardInput.state` from held keys using `yaw=right-left`, `pitch=up-down`; remove movement `pendingIntent` and `takeIntent`; preserve camera edge detection only.
- [ ] RED joystick tests: four signs, proportional magnitude, radial deadzone `0.15`, right→center→left without rearm, end/cancel/reset neutral.
- [ ] Run `npx vitest run tests/unit/joystick.test.ts`; require RED.
- [ ] Implement continuous joystick axes. Outside deadzone, rescale magnitude as `(m-d)/(1-d)` while preserving direction. Remove movement latch/rearm constants and intent API.
- [ ] Run targeted tests then `npm test`; require green.
- [ ] Commit: `feat: restore continuous steering input`.

---

### Task 2: Continuous logical flight pose

**Files:** create `src/game/flight.ts`, `tests/unit/flight.test.ts`.

**Produces:**

```ts
export type SteeringInput = Readonly<{ yaw:number; pitch:number }>;
export type GridPoint = Readonly<{ x:number; y:number; z:number }>;
export type FlightOrientation = Readonly<{ yaw:number; pitch:number; roll:0 }>;
export type FlightPose = Readonly<{
  unwrappedPosition: GridPoint;
  wrappedPosition: GridPoint;
  orientation: FlightOrientation;
  forward: Vec3;
}>;

export const STEERING_RATE = Math.PI * 0.9;
export const MAX_PITCH = Math.PI * (80 / 180);
export const FLIGHT_SPEED_CELLS_PER_SECOND = 6;
export function createInitialFlightPose(headCell: GridCell, config?: GridConfig): FlightPose;
export function applySteering(o: FlightOrientation, input: SteeringInput, dt: number): FlightOrientation;
export function forwardVector(o: FlightOrientation): Vec3;
export function wrapGridPoint(p: GridPoint, resolution: number): GridPoint;
export function advanceFlightPose(pose: FlightPose, input: SteeringInput, dt: number, config?: GridConfig): FlightPose;
```

- [ ] RED tests: initial head cell center; forward `+Z`; full/half yaw integration; repeated held input across 10 ticks; pitch clamp ±80°; neutral stability; `1/60s × 6 cells/s = 0.1 cell`; positive/negative torus wrap; invalid dt errors.
- [ ] Run `npx vitest run tests/unit/flight.test.ts`; require module-missing RED.
- [ ] Implement without importing Three.js or renderer code.
- [ ] Run targeted test and `npm test`; require green.
- [ ] Commit: `feat: add continuous logical flight pose`.

---

### Task 3: Deterministic toroidal voxel traversal

**Files:** create `src/game/grid-traversal.ts`, `tests/unit/grid-traversal.test.ts`.

**Consumes:** `GridPoint`, `GridCell`, `GridConfig`.

**Produces:**

```ts
export type GridCellEntry = Readonly<{ cell: GridCell; tEnter: number }>;
export function traverseGridSegment(
  fromUnwrapped: GridPoint,
  toUnwrapped: GridPoint,
  config?: GridConfig
): readonly GridCellEntry[];
```

- [ ] RED tests: no boundary→`[]`; one boundary; multi-cell ±axis order; positive/negative wrap; two-axis tie; three-axis tie; no duplicate cell from one tie event; high-speed path includes every intermediate target; non-finite input rejects.
- [ ] Run `npx vitest run tests/unit/grid-traversal.test.ts`; require RED.
- [ ] Implement Amanatides–Woo traversal on **unwrapped** coordinates. At each minimum `t`, advance every axis tied within a documented numeric epsilon, then emit one resulting voxel. Canonicalize only emitted integer cells modulo resolution. `tEnter` is monotonic in `[0,1]`.
- [ ] Run targeted test and `npm test`; require green.
- [ ] Commit: `feat: traverse continuous flight through voxel grid`.

---

### Task 4: RunState uses flight pose + cell-entry authority

**Files:** `src/game/run-state.ts`, `src/game/grid-config.ts`, `tests/unit/grid-run-state.test.ts`, `tests/unit/grid-authority-boundary.test.ts`; adapt collision/food tests only if fixtures need migration.

**Produces final RunState core:**

```ts
RunState {
  phase; config; snake;
  flight: FlightPose;
  previousFlight: FlightPose;
  food; foodsCollected; score; foodEaten; maxLength; elapsedMs; result;
}

stepRun(state, input: SteeringInput, dtSeconds, rng?, config?): RunState
```

No `frame`, `turnQueue`, `movementClock`, `renderAlpha`, or `transition` in final V2.1 RunState.

- [ ] RED tests: flight initialized at strategic head center; within-cell steering changes orientation but not occupancy; boundary entry commits one snake cell; food collected on entry; +2 growth retained/consumed on later entries; exact collision before commit; multi-entry processing stops at first collision; score=foods; result ruleset `pixel-flight-grid-v2-1`.
- [ ] If needed for deterministic multi-entry testing, expose simulation helper:

```ts
export function processGridEntries(
  state: RunState,
  entries: readonly GridCellEntry[],
  rng: () => number
): void;
```

It is simulation infrastructure, not app API.

- [ ] Run `npx vitest run tests/unit/grid-run-state.test.ts tests/unit/grid-authority-boundary.test.ts`; require RED.
- [ ] Change only `RULESET_ID` in grid config; keep grid dimensions/growth unchanged.
- [ ] Implement per tick: `previousFlight=flight` → `next=advanceFlightPose` → `entries=traverseGridSegment` → sequential collision/commit/food/growth → assign next flight pose unless run terminated. Later entries after collision are never processed.
- [ ] Authority test must prove active gameplay does not import `worldToCell`, Three.js, render trail, `TurnIntentQueue`, `GridMovementClock`, or `rotateGridFrame`.
- [ ] Migrate old RunState tests in this task; no intentional red V2 tests deferred.
- [ ] Run targeted tests and `npm test`; require green.
- [ ] Commit: `feat: drive grid occupancy from continuous flight`.

---

### Task 5: Fixed-clock render alpha

**Files:** `src/game/simulation.ts`, `tests/unit/simulation-step.test.ts`.

**Produces:**

```ts
FixedStepClock.get alpha(): number // residual accumulator / stepSeconds, [0,1)
```

- [ ] RED tests: reset/new alpha 0; half-step gives ~0.5; full step returns alpha ~0; catch-up reports only residual; existing clamping behavior unchanged.
- [ ] Run test; require RED.
- [ ] Add read-only getter only; do not change scheduling semantics.
- [ ] Run targeted test and `npm test`; require green.
- [ ] Commit: `feat: expose fixed-step render alpha`.

---

### Task 6: Render-only trail, continuous presentation, stable-ID voxel body

**Files:** create `src/render/flight-trail.ts`, `src/render/flight-presentation.ts`, corresponding tests; modify `src/render/snake-renderer.ts`, `tests/unit/voxel-renderer.test.ts`, `tests/unit/gameplay-presentation.test.ts`.

**FlightTrail produces:**

```ts
export class FlightTrail {
  reset(pointsNewestToOldest: readonly GridPoint[]): void;
  push(head: GridPoint): void;
  trimToDistance(maxDistanceCells: number): void;
  sampleBehind(distanceCells: number, headOverride?: GridPoint): GridPoint;
}
```

Rules: points remain unwrapped; `distance<0` throws; `distance=0` returns override/newest; samples use accumulated polyline distance.

**Flight presentation produces:**

```ts
export type FlightPresentation = Readonly<{
  unwrappedGridPoint: GridPoint;
  headWorld: Vec3;              // unwrapped world position
  displayWrapOffset: Vec3;      // canonical display delta
  displayedHeadWorld: Vec3;
  forwardWorld: Vec3;
  upWorld: Vec3;
  quaternion: Readonly<{x:number;y:number;z:number;w:number}>;
}>;

export function interpolateFlightPresentation(
  previous: FlightPose,
  current: FlightPose,
  alpha: number,
  config?: GridConfig
): FlightPresentation;

export function displayWorldForGridPoint(point: GridPoint, config?: GridConfig): Vec3;
```

**Snake renderer consumes:**

```ts
export type VoxelBodySample = Readonly<{ id:number; position:Vec3 }>;
export type VoxelSnakeRenderSnapshot = Readonly<{
  headPosition: Vec3;
  headQuaternion: Readonly<{x:number;y:number;z:number;w:number}>;
  body: readonly VoxelBodySample[];
}>;
```

- [ ] RED trail tests: straight distances; curved polyline distance; initial seeding from 6 segment centers; trim; head override; wrap remains unwrapped internally.
- [ ] RED presentation tests: alpha 0/0.5/1 logical interpolation; yaw/pitch-derived orientation; N→0 interpolation stays short in unwrapped space; displayed world canonicalizes with explicit wrap offset.
- [ ] Implement both render-only modules. Gameplay modules must not import them.
- [ ] RED renderer tests: head exact position/quaternion; body matrices map IDs/positions in strategic order; existing IDs remain unchanged when a new tail ID appears; voxel size/capacity unchanged.
- [ ] Migrate `SnakeRenderer`; remove runtime dependency on `InterpolatedFrame`/`InterpolatedSegment`.
- [ ] Body snapshot construction rule for later Task 8: for strategic segment index `i>=1`, sample `i` logical cells behind interpolated head and pair that position with `snake.segments[i].id`. Newly grown IDs appear only at tail; existing IDs are preserved.
- [ ] Run four targeted test files and `npm test`; require green.
- [ ] Commit: `feat: render voxel snake from continuous flight trail`.

---

### Task 7: Continuous chase camera

**Files:** `src/render/chase-camera.ts`, `tests/unit/chase-camera.test.ts`.

**Consumes:** `FlightPresentation` fields `headWorld`, `forwardWorld`, `upWorld`, `displayWrapOffset`.

- [ ] RED/update tests: small yaw causes small camera change rather than cardinal snap; pitch remains coherent; wrap offset relocates prior smoothed pose before smoothing; no full-world sweep; constants remain 4.0 cells behind, 2.8 up, 2.0 lookahead, FOV 60.
- [ ] Remove any remaining dependency on V2 `GridFrame` interpolation while preserving smoothing/wrap relocation.
- [ ] Run targeted test and `npm test`; require green.
- [ ] Commit: `feat: follow continuous flight with chase camera`.

---

### Task 8: Integrate one continuous browser control path

**Files:** `src/main.ts`, existing main-loop unit test (rename to V2.1 if useful), `tests/e2e/game.spec.ts`.

**Runtime order:**

```text
read keyboard.state + joystick.state -> add/clamp
FixedStepClock @ 60 Hz:
  stepRun(run,input,dt)
  trail.push(run.flight.unwrappedPosition)
render at fixedClock.alpha:
  interpolateFlightPresentation(previousFlight,flight,alpha)
  sample body by stable segment IDs from FlightTrail
  SnakeRenderer
  chase camera
```

- [ ] RED structural unit test: active `main.ts` contains no `queueTurnIntent`, `takeIntent`, `TurnIntentQueue`, or `GridMovementClock`; it passes continuous input to `stepRun`.
- [ ] RED desktop E2E: holding right/left continuously changes exposed yaw across multiple fixed ticks; holding up/down continuously changes pitch; release stops angular change; no repeated keydown required.
- [ ] RED mobile E2E in portrait+landscape: held joystick stays active; right→center→left changes sign with no rearm; diagonal/circular pointer motion updates both axes continuously; center neutral produces no delayed turn.
- [ ] Use read-only diagnostics only: `data-input-yaw`, `data-input-pitch`, `data-head-yaw`, `data-head-pitch`, `data-head-point`, `data-head-cell`. Never read diagnostics back into simulation.
- [ ] Initialize FlightTrail on new run from strategic segment cell centers ordered head→tail, expressed as coherent unwrapped points; reset on run change/restart.
- [ ] Trim render trail to strategic body distance plus a small named render reserve. Reserve is presentation-only.
- [ ] Pair body visual sample `i` with existing `snake.segments[i].id`.
- [ ] Use `npx playwright test tests/e2e/game.spec.ts --grep "continuous|steering|joystick"` for focused RED/GREEN, then run full `npm run test:e2e`.
- [ ] Run `npm test` and full E2E; require green.
- [ ] Commit: `feat: integrate smooth V2.1 browser controls`.

---

### Task 9: V2.1 persistence and unsupported ranking seam

**Files:** `src/app/identity.ts`, `src/app/app-controller.ts`, ranking/session files only as needed; identity/app/ranking unit tests; `tests/e2e/ranked.spec.ts`.

**Produces:**

```ts
export const V2_1_LOCAL_BEST_KEY = 'snek.localBest.pixelGridV2_1';
export function loadPixelGridV2_1Best(storage: StorageLike): number;
export function savePixelGridV2_1Best(storage: StorageLike, score: number): number;
```

- [ ] RED tests prove V1, V2, V2.1 best keys are independent.
- [ ] Migrate active AppController reads/writes to V2.1 helpers.
- [ ] Boundary tests prove `HttpSessionGateway.supportsRuleset('pixel-flight-grid-v2-1') === false` and V2.1 does not start/submit a legacy ranked run.
- [ ] Ranked E2E proves local best persists and no unsupported `/api/games` submission occurs.
- [ ] Run targeted tests, `npm test`, `npm run test:e2e`; require green.
- [ ] Commit: `feat: isolate V2.1 score persistence`.

---

### Task 10: V2.1 metrics and tuning boundary

**Files:** `src/game/metrics.ts`, `tests/unit/grid-tuning-metrics.test.ts`, `tests/metrics/grid-tuning.test.ts`.

**Preserve:** strategic occupancy/pressure/confinement metrics use cells only.

**Add pure/runtime metrics:**

```text
totalGridCellEntries
steeringMagnitude = min(1,hypot(yaw,pitch))
averageSteeringMagnitude
maxConsecutiveNonZeroSteeringTicks
```

- [ ] RED tests for neutral/partial/full magnitude, entry count, non-zero streak/reset, unchanged pressure/confinement semantics.
- [ ] Implement without reading render trail/world coordinates.
- [ ] Relabel the existing 32-seed discrete greedy harness as historical V2/discrete evidence if retained. It must not publish a V2.1 tuning verdict. Do not invent a V2.1 autopilot in this migration.
- [ ] Run metric/tuning tests and `npm test`; require green.
- [ ] Commit: `test: separate V2.1 metrics from V2 tuning`.

---

### Task 11: Retire active V2 discrete steering/interpolation authority and document V2.1

**Files:** runtime-retired modules as applicable, `tests/unit/grid-authority-boundary.test.ts`, historical tests as applicable, `README.md`.

- [ ] Strengthen authority scan across active runtime (`src/main.ts`, `src/game/run-state.ts`, `src/input`, active render modules) to reject imports/usages of:

```text
TurnIntentQueue
GridMovementClock
queueTurnIntent
rotateGridFrame
JOYSTICK_ACTIVATION_THRESHOLD
JOYSTICK_REARM_THRESHOLD
LogicalTransition
buildRenderTransition
interpolateTransition
```

- [ ] Delete retired modules only if no historical/pure consumer remains. Otherwise leave them explicitly historical and unreachable from active runtime.
- [ ] Delete/migrate tests whose purpose is to require active 90° steering or V2 cell-step presentation. Historical pure topology tests may remain if clearly scoped.
- [ ] README: state V2.1 continuous held keyboard/joystick, 60 Hz steering, exact 9³ strategic occupancy, exact-cell food/collision, +2 growth, render-only trail, V2.1 best key, and unsupported legacy ranking backend.
- [ ] Run `npm test` and `npm run typecheck`; require green.
- [ ] Commit: `refactor: retire discrete V2 control authority`.

---

### Task 12: Exact-candidate verification, review, playtest, PR, release

**Files:** no product edits unless a newly discovered defect gets its own RED/GREEN fix cycle.

- [ ] Record `git rev-parse HEAD`.
- [ ] Run fresh exact-SHA verification:

```bash
npm audit --omit=dev --audit-level=moderate
npm test
npm run test:worker
npm run typecheck
npm run worker:build
npm run build
npm run test:e2e
```

- [ ] Inspect Playwright pass/skip counts; continuous-control tests must actually execute in intended desktop/mobile projects.
- [ ] Audit all 16 spec acceptance criteria line-by-line: one input sign convention; held steering; no joystick rearm; no FIFO; no 6 Hz steering gate; 60 Hz flight; logical continuous position; exhaustive DDA; exact collision; exact food; +2 growth; toroidal wrap; voxel identity; isolated persistence; exact-SHA automation green; human playtest pending/accepted.
- [ ] Use `superpowers:requesting-code-review`. If independent reviewer/subagent is unavailable in the harness, say so explicitly and perform a whole-branch inline architectural audit; do not call that independent review.
- [ ] Open PR `feat: launch Pixel Flight Grid V2.1 smooth controls` only after automated candidate is green. PR body records exact SHA and leaves `Human control playtest: PENDING` until user acceptance.
- [ ] Require PR-triggered CI on the same head SHA.
- [ ] Human test must confirm: sustained keyboard left/right/up/down is continuous; joystick never requires recenter/rearm to accept the next direction; neutral has no stale command; camera remains readable in curves/wrap; grid/food/body remain legible.
- [ ] Any control tuning discovered here changes only continuous parameters/deadzone/steering rate through a new tested commit; never reintroduce turn queues.
- [ ] After explicit user acceptance, merge with expected-head-SHA lease and verify both `main` CI and GitHub Pages deploy on the merge SHA before production completion is claimed.

---

## R1 Self-Review Record

- **Spec coverage:** Sections 1–28 map to Tasks 1–12; no uncovered runtime subsystem found.
- **Type consistency:** `SteeringInput`, `GridPoint`, `FlightPose`, `GridCellEntry`, `FlightPresentation`, and stable-ID render sample interfaces are defined once and consumed by later tasks under the same names.
- **Authority consistency:** `LogicalTransition` and V2 interpolation are explicitly absent from final RunState/runtime; render-only `FlightTrail` is under `src/render` and blocked from gameplay by Task 4/11 authority tests.
- **Initial body continuity:** trail reset explicitly accepts the six initial strategic segment centers head→tail, avoiding the body-stack/pop ambiguity in the first draft.
- **Stable IDs:** body visual samples are paired with `snake.segments[i].id`; growth adds tail IDs without remapping existing IDs.
- **Review Focus coverage:** all five high-risk conditions have named tests/tasks above.
- **Proportion:** algorithms are specified only where implementation-order decisions affect determinism (DDA ties/deadzone); other steps specify interfaces and assertions rather than full bodies.
