# SNEK CORE V3 — Deterministic Grid Movement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace V2.2 hidden continuous flight/DDA locomotion with a deterministic 3D Snake core where one discrete relative turn produces one face-adjacent `GridCell` step that the player can predict from visible state.

**Architecture:** `RunState` becomes authoritative through `GridCell + GridFrame + pendingTurn`. Input emits discrete relative turn events; a single strategic clock consumes at most one pending turn per cell step; collision/food/growth operate on that exact destination. Rendering and camera consume strategic grid state only and may smooth presentation, never locomotion.

**Tech Stack:** TypeScript, Three.js, Vite, Vitest, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-18-snek-core-v3-deterministic-grid-design.md`

## Global Constraints

- Baseline production authority is `main` SHA `b0f92be886ba7d3fa30cc2472cd5491e33873dc2` until V3 is accepted.
- V3 locomotion authority is only `GridCell + GridFrame + pendingTurn`.
- `GridDirection` remains exactly `+X | -X | +Y | -Y | +Z | -Z`.
- Initial frame remains `F=+Z, R=-X, U=+Y`, preserving `right = cross(forward, up)`.
- One strategic step changes exactly one logical grid axis, modulo one-axis toroidal wrap.
- No active V3 movement dependency on `FlightPose`, yaw/pitch accumulation, `advanceFlightPose`, `traverseGridSegment`, DDA, `quantizeForwardToGridDirection`, `FlightPresentation`, camera state, or continuous `SteeringInput` authority.
- `GRID_STEPS_PER_SECOND = 6`; strategic step duration is `1 / 6` seconds.
- Exactly one `pendingTurn`; newest valid input before the next strategic step wins; no command queue.
- A pending turn is consumed once; catch-up steps after the first continue straight unless a new input event exists.
- Keyboard turn controls are edge-triggered: one physical keydown/release cycle creates at most one turn.
- Joystick constants are `JOYSTICK_DEADZONE = 0.15` and `JOYSTICK_SECTOR_HYSTERESIS_DEGREES = 10`.
- Exact diagonal joystick ties entering from neutral prefer the horizontal sector.
- Snake and food positions render only via `GridCell -> cellToWorld()`.
- Head orientation derives from cardinal `GridFrame.forward` and `GridFrame.up`, never flight quaternion/yaw/pitch.
- Camera smoothing is presentation-only and cannot influence strategic state.
- Ruleset is `snek-core-v3`; local-best key is `snek.localBest.coreV3`; historical keys remain untouched.
- Current HTTP ranking backend remains unsupported for V3.
- No merge to `main` until exact-candidate CI is green and human playtest explicitly accepts V3.

## Review Focus

1. **Two turn inputs inside one cell interval:** newest event must replace the older pending turn, with no delayed replay; pinned in Task 3 and E2E Task 10.
2. **Long/lagged render frame:** one buffered turn may affect only the first owed strategic step; pinned in Task 4 and E2E Task 10.
3. **Joystick jitter near 45° boundaries:** latched sector must remain stable through the 10° hysteresis band; pinned in Task 5 and E2E Task 10.
4. **Toroidal wrap while chase camera is smoothing:** gameplay must make one axis-only step and camera must rebase without flying through the arena; pinned in Tasks 2 and 7.
5. **Vertical heading (`±Y`) with different local up vectors:** head and camera orientation must preserve full `GridFrame`, not collapse to forward-only orientation; pinned in Tasks 6 and 7.

---

### Task 1: Lock the discrete grid algebra and movement primitive

**Files:**
- Modify: `src/game/grid-frame.ts`
- Modify: `src/game/grid-movement.ts`
- Test: `tests/unit/grid-frame.test.ts`
- Test: `tests/unit/grid-movement.test.ts`

**Interfaces:**
- Consumes: existing `GridCell`, `GridDirection`, `GridFrame`, `GridStep`, `TurnIntent`, `advanceGridStep()`.
- Produces: `INITIAL_GRID_FRAME`, `rotateGridFrame(frame, intent)`, and `advanceGridMovement(cell, frame, intent, config)` as the only movement primitive later tasks need.

- [ ] **Step 1: Expand RED tests for complete `GridFrame` algebra**

Add tests proving all four turns preserve cardinal orthonormality/right-hand invariant and that four repeated LEFT, RIGHT, UP, or DOWN transforms return to the starting frame.

- [ ] **Step 2: Run the focused tests and capture RED if any invariant is missing**

Run: `npm test -- tests/unit/grid-frame.test.ts tests/unit/grid-movement.test.ts`

Expected: current correct algebra may already be GREEN; if so, record it as preserved baseline behavior rather than manufacturing a code change.

- [ ] **Step 3: Add/expand movement tests for all six directions and wraps**

Assertions per step:

```text
non-wrap: exactly one axis changes by ±1
wrap: exactly one axis wraps and GridStep.wrappedAxis identifies it
never: two or three axes change in one step
returned frame == rotateGridFrame(input frame, intent)
returned cell == GridStep.to
```

- [ ] **Step 4: Remove obsolete queue/clock authority from `grid-movement.ts` only after tests no longer require it**

Retain `advanceGridMovement()`; remove `TurnIntentQueue`, `TURN_QUEUE_CAPACITY`, and `GridMovementClock`. Strategic timing will be owned by Task 4's single `FixedStepClock` configuration.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- tests/unit/grid-frame.test.ts tests/unit/grid-movement.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/grid-frame.ts src/game/grid-movement.ts tests/unit/grid-frame.test.ts tests/unit/grid-movement.test.ts
git commit -m "refactor: isolate deterministic grid movement primitive"
```

### Task 2: Make `RunState` exclusively grid-authoritative

**Files:**
- Modify: `src/game/run-state.ts`
- Test: `tests/integration/grid-run-state.test.ts`
- Test: `tests/integration/grid-game-loop.test.ts`
- Test: `tests/unit/collision.test.ts`
- Test: `tests/unit/food.test.ts`

**Interfaces:**
- Consumes: `INITIAL_GRID_FRAME`, `advanceGridMovement()`, existing snake/collision/food/growth helpers.
- Produces:

```ts
RunState.frame: GridFrame
RunState.pendingTurn: TurnIntent
queueTurn(state: RunState, intent: Exclude<TurnIntent, 'none'>): RunState
stepRun(state: RunState, rng?: () => number, config?: GridConfig): RunState
```

`RunState` no longer contains `flight`, `previousFlight`, or `visibleDirection`.

- [ ] **Step 1: Write RED tests for initial strategic state**

Assert `createRun()` initializes `frame === INITIAL_GRID_FRAME`, `pendingTurn === 'none'`, and contains no active flight/continuous movement fields.

- [ ] **Step 2: Write RED tests for `queueTurn()` latest-wins semantics**

Assert:

```text
queue RIGHT -> pending RIGHT
queue UP before step -> pending UP
no array/queue of historical intents exists
```

- [ ] **Step 3: Write RED tests for one transactional strategic step**

Given a known head/frame/pending turn, assert `stepRun()`:

1. consumes at most one turn;
2. resets `pendingTurn` to `none`;
3. computes one `advanceGridMovement()` destination;
4. checks collision before commit;
5. commits one cell only when valid;
6. resolves food/growth/score after commit;
7. increments elapsed time by exactly `1000 / state.config.stepsPerSecond`.

- [ ] **Step 4: Implement the minimal V3 `RunState` shape and `queueTurn()`**

Remove imports/calls of `advanceFlightPose`, `createInitialFlightPose`, `traverseGridSegment`, and `quantizeForwardToGridDirection` from active run-state.

- [ ] **Step 5: Implement `stepRun()` using `advanceGridMovement()` only**

Preserve current collision tail-vacate semantics, food spawning, growth, completion target, score, and result construction.

- [ ] **Step 6: Add collision/food regression assertions**

Prove collision commits zero movement; exact head/food cell collection grows by configured `growthPerFood`; food spawn excludes occupied cells.

- [ ] **Step 7: Run focused tests**

Run: `npm test -- tests/integration/grid-run-state.test.ts tests/integration/grid-game-loop.test.ts tests/unit/collision.test.ts tests/unit/food.test.ts`
Expected: PASS and no `FlightPose`/DDA movement import in `run-state.ts`.

- [ ] **Step 8: Commit**

```bash
git add src/game/run-state.ts tests/integration/grid-run-state.test.ts tests/integration/grid-game-loop.test.ts tests/unit/collision.test.ts tests/unit/food.test.ts
git commit -m "feat: make run state deterministic grid authority"
```

### Task 3: Convert keyboard input into edge-triggered turn events

**Files:**
- Modify: `src/input/keyboard.ts`
- Modify: `src/main.ts`
- Test: `tests/unit/keyboard.test.ts`
- Rename/modify: `tests/integration/main-v2-loop.test.ts` -> `tests/integration/main-v3-loop.test.ts`

**Interfaces:**
- Consumes: `TurnIntent`, `queueTurn()` from Task 2.
- Produces:

```ts
type KeyboardInputOptions = {
  onTurnIntent?: (intent: Exclude<TurnIntent, 'none'>) => void;
  onCameraToggle?: () => void;
};
```

`KeyboardInput` no longer exposes yaw/pitch as gameplay authority.

- [ ] **Step 1: Write RED keyboard tests**

Assert mappings A/Left→left, D/Right→right, W/Up→up, S/Down→down; repeated keydown while still pressed emits nothing; keyup re-enables that key; X toggles camera once per press.

- [ ] **Step 2: Add RED latest-wins integration test**

In the main/run integration harness, emit RIGHT then UP before a strategic step and assert the next step applies UP only.

- [ ] **Step 3: Implement callback-based keyboard emission**

Keep the pressed-set guard; invoke `onTurnIntent` only on a newly pressed turn key. Do not rely on browser autorepeat timing.

- [ ] **Step 4: Wire `main.ts` keyboard callback to the active playing run**

Callback behavior:

```ts
if (controller.currentRun?.phase === 'playing') queueTurn(run, intent)
```

Do not retain `readSteeringInput()` keyboard yaw/pitch logic.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- tests/unit/keyboard.test.ts tests/integration/main-v3-loop.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/input/keyboard.ts src/main.ts tests/unit/keyboard.test.ts tests/integration/main-v3-loop.test.ts
git rm tests/integration/main-v2-loop.test.ts
git commit -m "feat: use edge-triggered keyboard turns"
```

### Task 4: Give the browser exactly one strategic movement clock

**Files:**
- Modify: `src/main.ts`
- Modify: `src/game/simulation.ts` only if a small generic API adjustment is required; do not create a second movement clock.
- Test: `tests/unit/simulation-step.test.ts`
- Test: `tests/integration/main-v3-loop.test.ts`

**Interfaces:**
- Consumes: `FixedStepClock`, `GRID_CONFIG.stepsPerSecond`, V3 `stepRun()`.
- Produces: browser runtime whose only locomotion cadence is `new FixedStepClock(1 / GRID_CONFIG.stepsPerSecond, ...)`.

- [ ] **Step 1: Write RED tests for 6 Hz strategic cadence**

Assert no strategic movement before `1/6` accumulated seconds; one step at `1/6`; deterministic catch-up for multiple owed steps.

- [ ] **Step 2: Write RED catch-up test for single-use pending turn**

Using a `FixedStepClock` test instance with sufficient `maxFrameDeltaSeconds` to owe three strategic steps, seed `pendingTurn='right'` and assert only step 1 turns; steps 2 and 3 continue in the resulting forward direction with `pendingTurn='none'`.

- [ ] **Step 3: Replace the active 60 Hz flight stepping in `main.ts`**

Configure the existing `FixedStepClock` at `1 / GRID_CONFIG.stepsPerSecond`; each clock callback invokes V3 `stepRun(run)` exactly once. `requestAnimationFrame` continues rendering every frame but performs no continuous locomotion update.

- [ ] **Step 4: Remove obsolete steering telemetry from movement path**

Delete `readSteeringInput()` and gameplay reads of `inputYaw/inputPitch`; presentation-only joystick knob telemetry moves to Task 5's visual vector.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- tests/unit/simulation-step.test.ts tests/integration/main-v3-loop.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main.ts src/game/simulation.ts tests/unit/simulation-step.test.ts tests/integration/main-v3-loop.test.ts
git commit -m "feat: run SNEK on one strategic grid clock"
```

### Task 5: Convert joystick into a deterministic sector state machine

**Files:**
- Modify: `src/input/joystick.ts`
- Modify: `src/main.ts`
- Test: `tests/unit/joystick.test.ts`

**Interfaces:**
- Consumes: `TurnIntent`, `queueTurn()`.
- Produces:

```ts
export const JOYSTICK_DEADZONE = 0.15;
export const JOYSTICK_SECTOR_HYSTERESIS_DEGREES = 10;
export type JoystickSector = 'neutral' | 'left' | 'right' | 'up' | 'down';
export type JoystickVisualVector = Readonly<{ x: number; y: number }>;

type JoystickInputOptions = {
  onTurnIntent?: (intent: Exclude<TurnIntent, 'none'>) => void;
};

JoystickInput.sector: JoystickSector
JoystickInput.visualVector: JoystickVisualVector
```

- [ ] **Step 1: Write RED deadzone and neutral-entry sector tests**

Assert magnitude `<=0.15` is neutral; outside deadzone chooses dominant axis; exact diagonal `abs(x)===abs(y)` chooses horizontal.

- [ ] **Step 2: Write RED hysteresis tests**

For a currently latched RIGHT sector, movement up toward the RIGHT/UP nominal 45° boundary must remain RIGHT through 55° inclusive and switch to UP only after crossing beyond 55°. Mirror equivalent boundaries for all four sectors.

- [ ] **Step 3: Write RED event-emission tests**

Assert:

```text
neutral -> right emits right once
right -> right emits nothing
right -> up after hysteresis emits up once
right -> left direct move emits left once once the new sector is unambiguous
up -> neutral emits nothing
neutral -> up emits up once
pointer-up/cancel => neutral
```

- [ ] **Step 4: Implement sector-state joystick**

Retain normalized pointer coordinates solely as `visualVector` for knob placement. Strategic code may consume only emitted turn events, never vector magnitude/angle.

- [ ] **Step 5: Wire joystick callback to `queueTurn()` and visual vector to knob CSS**

Remove the previous keyboard+joystick yaw/pitch summation path entirely.

- [ ] **Step 6: Run focused tests**

Run: `npm test -- tests/unit/joystick.test.ts tests/integration/main-v3-loop.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/input/joystick.ts src/main.ts tests/unit/joystick.test.ts tests/integration/main-v3-loop.test.ts
git commit -m "feat: use deterministic joystick turn sectors"
```

### Task 6: Render head/body from `GridCell + GridFrame` only

**Files:**
- Modify: `src/render/pixel-snake-presentation.ts`
- Modify: `src/main.ts`
- Test: `tests/unit/pixel-snake-presentation.test.ts`
- Test: `tests/unit/voxel-renderer.test.ts`

**Interfaces:**
- Consumes: `RunState.snake`, `RunState.frame`, `cellToWorld()`.
- Produces:

```ts
quaternionForGridFrame(frame: GridFrame): Readonly<{x:number;y:number;z:number;w:number}>
buildPixelSnakeRenderSnapshot(run: Pick<RunState, 'snake' | 'frame' | 'config'>): VoxelSnakeRenderSnapshot
```

- [ ] **Step 1: Write RED tests for full-frame head orientation**

Test representative frames with the same `forward` but different valid `up` values, especially vertical `±Y` headings, proving the quaternion preserves both forward and up instead of forward-only orientation.

- [ ] **Step 2: Write RED position-authority tests**

Assert head and every body voxel equal exact `cellToWorld(segment.cell)` and stable body IDs remain unchanged.

- [ ] **Step 3: Implement `quaternionForGridFrame()`**

Construct orientation from local forward `+Z` and local up `+Y` to the cardinal `GridFrame.forward/up` basis; do not import flight/yaw/pitch presentation.

- [ ] **Step 4: Update snapshot builder and browser render call**

Replace `visibleDirection` dependency with `frame`.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- tests/unit/pixel-snake-presentation.test.ts tests/unit/voxel-renderer.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/render/pixel-snake-presentation.ts src/main.ts tests/unit/pixel-snake-presentation.test.ts tests/unit/voxel-renderer.test.ts
git commit -m "feat: orient voxel snake from grid frame"
```

### Task 7: Decouple chase camera from `FlightPresentation`

**Files:**
- Modify: `src/render/chase-camera.ts`
- Modify: `src/render/pixel-camera-presentation.ts`
- Modify: `src/main.ts`
- Test: `tests/unit/chase-camera.test.ts`
- Test: `tests/unit/pixel-camera-presentation.test.ts`

**Interfaces:**
- Consumes: snapped head `GridCell`, `GridFrame.forward/up`, `directionVector()`, `cellToWorld()`.
- Produces:

```ts
export type ChaseCameraSnapshot = Readonly<{
  headWorld: Vec3;
  forwardWorld: Vec3;
  upWorld: Vec3;
}>;

buildPixelChaseCameraSnapshot(
  run: Pick<RunState, 'snake' | 'frame' | 'config'>
): ChaseCameraSnapshot
```

`ChaseCameraController` internally tracks the prior displayed head world position and rebases its own pose by `±config.worldSize` on any detected one-axis toroidal wrap before damping toward the new desired pose.

- [ ] **Step 1: Write RED snapshot tests**

Assert `headWorld === cellToWorld(head.cell)`, `forwardWorld === directionVector(frame.forward)`, and `upWorld === directionVector(frame.up)` with no `FlightPresentation` input.

- [ ] **Step 2: Write RED wrap-rebase camera test**

Move a snapshot from one arena edge to the opposite edge in a valid one-axis wrap and assert camera pose is rebased by one `worldSize` on that axis before smoothing, rather than interpolating through the arena volume.

- [ ] **Step 3: Write RED vertical-frame camera tests**

For `forward=±Y` with valid different `up` vectors, verify desired camera position/target changes according to full `GridFrame` basis.

- [ ] **Step 4: Remove `FlightPresentation` from camera interfaces and implement wrap-aware rebasing**

Camera may retain its own damping state only; it must not write back to gameplay.

- [ ] **Step 5: Remove `buildPresentation()` and all active flight-presentation camera calls from `main.ts`**

- [ ] **Step 6: Run focused tests**

Run: `npm test -- tests/unit/chase-camera.test.ts tests/unit/pixel-camera-presentation.test.ts tests/integration/main-v3-loop.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/render/chase-camera.ts src/render/pixel-camera-presentation.ts src/main.ts tests/unit/chase-camera.test.ts tests/unit/pixel-camera-presentation.test.ts tests/integration/main-v3-loop.test.ts
git commit -m "refactor: make chase camera grid-frame presentation only"
```

### Task 8: Version V3 ruleset/persistence and enforce architecture boundaries

**Files:**
- Modify: `src/game/grid-config.ts`
- Modify: `src/app/identity.ts`
- Modify: `src/app/app-controller.ts`
- Modify: `src/app/http-session-gateway.ts` only if active ruleset capability fixtures require explicit V3 rejection.
- Create: `tests/unit/v3-persistence.test.ts`
- Modify: `tests/unit/grid-authority-boundary.test.ts`
- Modify: `tests/unit/http-session-gateway.test.ts`
- Modify: `tests/integration/app-flow.test.ts`
- Modify: `tests/integration/app-ranking-flow.test.ts`

**Interfaces:**
- Produces:

```ts
RULESET_ID = 'snek-core-v3'
V3_LOCAL_BEST_KEY = 'snek.localBest.coreV3'
loadSnekCoreV3Best(storage): number
saveSnekCoreV3Best(storage, score): number
```

- [ ] **Step 1: Write RED V3 persistence tests**

Assert V3 reads/writes only `snek.localBest.coreV3`; historical V1/V2/V2.1/V2.2 keys remain byte-for-byte untouched.

- [ ] **Step 2: Write RED active-authority scanner tests**

The active V3 path (`src/main.ts`, `src/game/run-state.ts`, active input/render camera adapters) must reject imports/usages of:

```text
advanceFlightPose
traverseGridSegment
FlightPose
SteeringInput as movement authority
quantizeForwardToGridDirection
FlightPresentation
TurnIntentQueue
GridMovementClock
```

Also assert `nextCell` authority remains `advanceGridMovement/advanceGridStep` and camera symbols are absent from game movement files.

- [ ] **Step 3: Update ruleset and persistence implementation**

Update `AppController` to load/save only V3 best for the active ruleset.

- [ ] **Step 4: Preserve HTTP incompatibility**

Update relevant tests/fixtures so HTTP ranking remains unsupported for `snek-core-v3` and gameplay remains local-first when HTTP base is configured.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- tests/unit/v3-persistence.test.ts tests/unit/grid-authority-boundary.test.ts tests/unit/http-session-gateway.test.ts tests/integration/app-flow.test.ts tests/integration/app-ranking-flow.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/grid-config.ts src/app/identity.ts src/app/app-controller.ts src/app/http-session-gateway.ts tests/unit/v3-persistence.test.ts tests/unit/grid-authority-boundary.test.ts tests/unit/http-session-gateway.test.ts tests/integration/app-flow.test.ts tests/integration/app-ranking-flow.test.ts
git commit -m "feat: version SNEK CORE V3 authority"
```

### Task 9: Retire continuous locomotion from active authority and prove determinism

**Files:**
- Audit: `src/game/flight.ts`
- Audit: `src/game/grid-traversal.ts`
- Audit: `src/game/grid-direction.ts`
- Audit: `src/render/flight-presentation.ts`
- Create: `tests/integration/v3-determinism.test.ts`
- Modify: `tests/metrics/grid-tuning.test.ts` and/or `tests/integration/grid-tuning-metrics.test.ts` only where they reference retired active flight authority.

**Interfaces:**
- Consumes: completed V3 strategic core from Tasks 1–8.
- Produces: zero active production dependency on continuous locomotion and deterministic long-run proof.

- [ ] **Step 1: Run an active-consumer audit**

Run searches equivalent to:

```bash
rg "FlightPose|advanceFlightPose|traverseGridSegment|quantizeForwardToGridDirection|FlightPresentation" src tests
```

Every occurrence must be classified. Any occurrence reachable from active V3 runtime is a failure and must be removed. Historical tests/modules may remain only when they have no import path into active V3 runtime.

- [ ] **Step 2: Remove truly orphaned flight modules only when the audit proves zero consumers**

If one of the audited modules is consumed only by its own dedicated historical tests, delete that module and those dedicated tests in the same commit. If it still supports unrelated historical tooling/tests, leave it physically present but unreachable from active V3 production paths. Do not broaden this task into unrelated cleanup.

- [ ] **Step 3: Write a deterministic 1,000-step integration harness**

Use a straight toroidal path with deterministic initial food placed off that path so no terminal collision/growth is introduced. Run the same scenario twice and assert identical frame/head/body/food/score sequences for at least 1,000 strategic steps.

- [ ] **Step 4: Assert face adjacency for every committed step**

For each pair of head cells, normalize toroidal delta and assert exactly one axis has absolute delta 1 and the others 0.

- [ ] **Step 5: Add framerate-independence simulation**

Feed different render-frame delta partitions that represent the same elapsed strategic schedule/input-to-step assignments and assert identical strategic path.

- [ ] **Step 6: Run unit/integration suite**

Run: `npm test`
Expected: all tests PASS; architecture scanner PASS; no active flight/DDA locomotion references.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: retire continuous locomotion authority"
```

### Task 10: Browser E2E, documentation, verification, and human release gate

**Files:**
- Modify: `tests/e2e/game.spec.ts` and/or existing gameplay E2E file(s)
- Modify: `tests/e2e/ranked.spec.ts`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-10-18-snek-core-v3-deterministic-grid-design.md` status only if still marked draft
- Create/update execution ledger/checkpoint as established by repository convention.

**Interfaces:**
- Consumes: complete V3 runtime.
- Produces: browser evidence, canonical docs, exact release candidate SHA.

- [ ] **Step 1: Add RED/then GREEN desktop E2E for predictable turns**

Prove one D press changes heading once; holding D across multiple strategic steps does not keep rotating; no-input steps continue straight.

- [ ] **Step 2: Add E2E for latest-wins and catch-up semantics**

Inject RIGHT then UP before one step and assert UP wins. Exercise a controlled multi-step catch-up and assert one buffered turn affects only the first owed step.

- [ ] **Step 3: Add mobile joystick E2E**

Prove neutral→RIGHT emits once; holding sector does not repeat; RIGHT→UP switches without pointer-up only after hysteresis; diagonal-boundary jitter inside the 10° band does not alternate turns.

- [ ] **Step 4: Add movement/render invariants E2E**

Assert each visible head position is an exact cell center, no diagonal jump occurs, wrap is one-axis deterministic, and food pickup telemetry shows identical consumed-food/head world centers.

- [ ] **Step 5: Add camera-independence E2E**

Toggle chase/overview and exercise wrap; strategic head/frame sequence must be identical regardless of camera mode while chase remains visually smooth.

- [ ] **Step 6: Update active documentation**

Document V3 controls and authority. Mark the approved spec canonical. Do not rewrite historical V2.x documents as if they were never shipped.

- [ ] **Step 7: Run full verification on the exact candidate SHA**

Required commands/gates:

```bash
npm ci
npm audit --omit=dev --audit-level=moderate
npm test
npm run test:worker
npm run typecheck
npm run render:wrangler:production
npx wrangler deploy --dry-run --config .wrangler.production.jsonc
npm run worker:build
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Expected: all required gates GREEN. Record dev-tree audit warnings separately from production-only audit; do not conflate them.

- [ ] **Step 8: Whole-branch review against the V3 spec**

Review specifically for duplicate movement authority, event replay, joystick hysteresis defects, wrap/camera coupling, historical-key overwrite, and stale V2.2 active dependencies.

- [ ] **Step 9: Open a draft PR and freeze exact candidate SHA**

PR must state the candidate SHA, base SHA, CI evidence, behavioral contract, and human gate. Do not merge.

- [ ] **Step 10: Human playtest**

Acceptance checklist:

```text
no input -> straight/predictable
one turn input -> exactly one 90° turn
held key -> no continued spin
latest pre-step input wins
one voxel per strategic step
no diagonal jumps
food contact matches pickup
joystick immediate but stable near diagonals
camera mode never changes steering
same scripted inputs -> same path
```

- [ ] **Step 11: Merge/release only after explicit human acceptance**

Use a normal PR merge protected by exact expected head/base SHA. Then require post-merge `main` CI and Pages deployment success on the merge SHA before declaring V3 released.
