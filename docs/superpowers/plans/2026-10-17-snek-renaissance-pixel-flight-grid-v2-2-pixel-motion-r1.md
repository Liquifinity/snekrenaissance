# SNEK RENAISSANCE — Pixel Flight Grid V2.2 Pixel Motion Implementation Plan R1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** CANONICAL PLAN R1 — implements the approved V2.2 design plus Orientation Amendment R1.

**Goal:** Restore true cell-snapped/pixelated snake motion and exact visible food contact while preserving V2.1 continuous 60 Hz keyboard/joystick steering, continuous internal `FlightPose`, deterministic toroidal DDA gameplay, and smooth chase-camera behavior.

**Architecture:** Continuous input and `FlightPose` remain the navigation authority. DDA remains the only continuous→discrete gameplay bridge. Visible snake position is rebuilt exclusively from strategic `GridCell` centers; continuous flight presentation survives only for navigation/camera guidance. Visible head orientation is a cardinal value latched only on accepted cell entry, using deterministic forward-vector quantization from the approved amendment.

**Tech Stack:** TypeScript 5.8, Three.js 0.180, Vitest 3.2, Playwright 1.55, Vite 7.1, existing GitHub Actions CI and GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-17-snek-renaissance-pixel-flight-grid-v2-2-pixel-motion-design.md`

**Normative amendment:** `docs/superpowers/specs/2026-10-17-snek-renaissance-pixel-flight-grid-v2-2-pixel-motion-amendment-r1.md`

## Global Constraints

- Production baseline before documentation is `main` SHA `fd852aa54081a1026d146ead06c4778738c2f6ef`.
- Implementation branch must include the V2.2 spec, amendment, and this R1 plan in its ancestry; do not develop directly on `main`.
- New ruleset is exactly `pixel-flight-grid-v2-2`.
- Local-best key is exactly `snek.localBest.pixelGridV2_2`; V1, V2, and V2.1 keys remain untouched.
- Grid remains `9 × 9 × 9`, `cellSize=0.40`, derived `worldSize=3.60`, `initialLength=6`, `growthPerFood=2`.
- Simulation remains the existing `FixedStepClock` at `1/60 s`.
- Navigation remains `FLIGHT_SPEED_CELLS_PER_SECOND=6`, `STEERING_RATE=Math.PI*0.9`, `MAX_PITCH=80°`.
- Keyboard and joystick signs/deadzone remain V2.1: continuous held state, joystick radial deadzone `0.15`, no latch/rearm/queue.
- Existing toroidal DDA tie semantics are immutable for V2.2: a simultaneous two-/three-axis boundary crossing remains one geometric `GridCellEntry` destination event.
- Strategic gameplay remains exact-cell: occupancy, collision, food, growth, score, and completion never read Three.js/world/render state.
- Visible snake head and every visible body segment must be derived only from `cellToWorld(segment.cell, run.config)`.
- Food render remains `cellToWorld(run.food, run.config)` and voxel fill remains `0.8 × cellSize`, matching snake fill.
- Head orientation is one of `+X/-X/+Y/-Y/+Z/-Z`, initial `+Z`, and changes only after an accepted cell entry.
- `quantizeForwardToGridDirection()` selects greatest absolute component; exact ties resolve `X > Y > Z`.
- Chase camera remains smooth; snake position does not tween. Wrap must relocate camera display space before damping rather than smoothing through the cube.
- Final active runtime must not restore `TurnIntentQueue`, `GridMovementClock`, `queueTurnIntent`, input `pendingIntent`, `takeIntent`, joystick rearm thresholds, `LogicalTransition`, `buildRenderTransition`, or `interpolateTransition`.
- Final snake placement must not depend on `FlightTrail.sampleBehind`, `FlightPresentation.unwrappedGridPoint`, or `FlightPresentation.displayedHeadWorld`.
- Human playtest is mandatory before merge to `main`.

## Review Focus

1. **DDA corner events:** two-/three-axis ties stay one destination cell while head orientation remains deterministic (`X > Y > Z` ties). Pinned in Tasks 1 and 9.
2. **Toroidal wrap:** visible head snaps `8 → 0` atomically and chase camera relocates wrap-space instead of traversing the arena. Pinned in Tasks 4, 5, and 8.
3. **Steering inside one cell:** yaw/pitch and continuous `FlightPose.forward` may change every fixed tick while visible position and visible direction remain unchanged until cell entry. Pinned in Tasks 1, 3, and 8.
4. **Food respawn observability:** collection may respawn immediately, but diagnostics/tests must compare the consumed food cell center with the committed head center from the same collection event. Pinned in Tasks 6 and 8.
5. **Growth/ID stability:** every body voxel remains cell-centered and preserves strategic segment ID order through growth. Pinned in Tasks 3 and 6.

---

## Locked File Responsibilities

**Create**
- `src/game/grid-direction.ts` — continuous forward vector → deterministic cardinal `GridDirection` quantization.
- `src/render/pixel-snake-presentation.ts` — strategic `GridCell` chain → exact cell-centered `VoxelSnakeRenderSnapshot`; cardinal head quaternion.
- `src/render/pixel-camera-presentation.ts` — snapped strategic head center + continuous navigation orientation → wrap-aware chase-camera snapshot.
- `tests/unit/grid-direction.test.ts`
- `tests/unit/pixel-snake-presentation.test.ts`
- `tests/unit/pixel-camera-presentation.test.ts`

**Modify**
- `src/game/run-state.ts`
- `src/render/flight-presentation.ts`
- `src/render/chase-camera.ts` only if its snapshot typing requires decoupling from `FlightPresentation`
- `src/main.ts`
- `src/game/grid-config.ts`
- `src/app/identity.ts`
- `src/app/app-controller.ts`
- relevant unit/integration/E2E tests
- `README.md`
- V2.2 design/amendment status headers during documentation closeout

**Expected active-runtime retirement**
- `src/render/flight-trail.ts`
- `tests/unit/flight-trail.test.ts`

Delete `flight-trail.ts` only after `src/main.ts` and all production modules have zero imports/consumers. `flight-presentation.ts` remains active for continuous camera/navigation orientation; its continuous position must never again drive snake placement.

---

### Task 0: Execution isolation and baseline

**Files:** none.

**Produces:** isolated `feat/pixel-flight-grid-v2-2-pixel-motion` branch/worktree including this R1 plan, with a fresh green baseline and untouched `main`.

- [ ] **Step 1: Read execution skills**

Read `superpowers:executing-plans`, `superpowers:using-git-worktrees`, and `superpowers:test-driven-development` before changing source code.

- [ ] **Step 2: Create isolated implementation branch/worktree**

Branch from the exact current HEAD of `docs/pixel-flight-grid-v2-2-pixel-motion` containing this R1 plan.

```bash
git worktree add ../snek-v22 -b feat/pixel-flight-grid-v2-2-pixel-motion <CANONICAL_V22_PLAN_SHA>
cd ../snek-v22
```

Expected: implementation branch ancestry contains approved spec, amendment R1, and plan R1; `main` remains unchanged.

- [ ] **Step 3: Install and run baseline verification**

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

Expected: all baseline gates green before source edits. If the environment cannot run a command, document the exact infrastructure failure and use repository CI for that gate; never convert an unexecuted gate into PASS.

---

### Task 1: Cardinal visible-direction state latched by cell entry

**Files:**
- Create: `src/game/grid-direction.ts`
- Create: `tests/unit/grid-direction.test.ts`
- Modify: `src/game/run-state.ts`
- Modify: `tests/integration/grid-run-state.test.ts`
- Modify: `tests/integration/grid-game-loop.test.ts`
- Confirm unchanged: `src/game/grid-traversal.ts`, `tests/unit/grid-traversal.test.ts`

**Interfaces:**

```ts
export function quantizeForwardToGridDirection(forward: Vec3): GridDirection;
```

`RunState` adds:

```ts
visibleDirection: GridDirection;
```

`processGridEntries` becomes:

```ts
export function processGridEntries(
  state: RunState,
  entries: readonly GridCellEntry[],
  visibleDirection: GridDirection,
  rng: () => number
): void;
```

- [ ] **Step 1: Write RED unit tests for direction quantization**

In `tests/unit/grid-direction.test.ts`, assert all six dominant-axis outputs and exact ties:

```ts
expect(quantizeForwardToGridDirection({ x: 0.8, y: 0.2, z: 0.5 })).toBe('+X');
expect(quantizeForwardToGridDirection({ x: -0.8, y: 0.2, z: 0.5 })).toBe('-X');
expect(quantizeForwardToGridDirection({ x: 0.2, y: 0.9, z: 0.3 })).toBe('+Y');
expect(quantizeForwardToGridDirection({ x: 0.2, y: -0.9, z: 0.3 })).toBe('-Y');
expect(quantizeForwardToGridDirection({ x: 0.2, y: 0.3, z: 0.9 })).toBe('+Z');
expect(quantizeForwardToGridDirection({ x: 0.2, y: 0.3, z: -0.9 })).toBe('-Z');
expect(quantizeForwardToGridDirection({ x: 1, y: 1, z: 1 })).toBe('+X');
expect(quantizeForwardToGridDirection({ x: 0, y: 1, z: 1 })).toBe('+Y');
```

Also reject non-finite vectors.

- [ ] **Step 2: Run RED**

```bash
npm test -- tests/unit/grid-direction.test.ts
```

Expected: FAIL because the module/function does not exist.

- [ ] **Step 3: Implement minimal quantizer**

Create `src/game/grid-direction.ts`. Use absolute magnitudes and deterministic `X >= Y && X >= Z`, then `Y >= Z`, else Z; sign comes from selected component. Do not change DDA semantics.

- [ ] **Step 4: Write RED RunState tests**

Add assertions that:
- `createRun()` initializes `visibleDirection === '+Z'`;
- steering for several 60 Hz ticks inside the initial cell changes `flight.forward` but leaves `visibleDirection === '+Z'`;
- the next accepted entry updates `visibleDirection` from the quantized `nextFlight.forward`;
- `processGridEntries` updates direction only after successful `commitSnakeStep`; collision before commit does not change it;
- existing two-/three-axis DDA tie tests still emit one destination cell.

- [ ] **Step 5: Implement RunState latch**

In `stepRun`, compute one `entryDirection = quantizeForwardToGridDirection(nextFlight.forward)` for the fixed step and pass it to `processGridEntries`. Inside `processGridEntries`, assign `state.visibleDirection = visibleDirection` immediately after each successful strategic commit and before food/completion handling.

- [ ] **Step 6: Run targeted + full unit/integration tests**

```bash
npm test -- tests/unit/grid-direction.test.ts tests/unit/grid-traversal.test.ts tests/integration/grid-run-state.test.ts tests/integration/grid-game-loop.test.ts
npm test
```

Expected: PASS; no modification to `grid-traversal.ts` needed.

- [ ] **Step 7: Commit**

```bash
git add src/game/grid-direction.ts src/game/run-state.ts tests/unit/grid-direction.test.ts tests/integration/grid-run-state.test.ts tests/integration/grid-game-loop.test.ts
git commit -m "feat: latch cardinal voxel direction on cell entry"
```

---

### Task 2: Exact cell-centered snake render snapshot

**Files:**
- Create: `src/render/pixel-snake-presentation.ts`
- Create: `tests/unit/pixel-snake-presentation.test.ts`
- Modify only if needed for typing/comments: `src/render/snake-renderer.ts`
- Modify: `tests/unit/voxel-renderer.test.ts`
- Modify: `tests/unit/gameplay-presentation.test.ts`

**Interfaces:**

```ts
export function quaternionForGridDirection(
  direction: GridDirection
): Readonly<{ x: number; y: number; z: number; w: number }>;

export function buildPixelSnakeRenderSnapshot(
  run: Pick<RunState, 'snake' | 'visibleDirection' | 'config'>
): VoxelSnakeRenderSnapshot;
```

- [ ] **Step 1: Write RED snapshot tests**

Assert:
- head position equals `cellToWorld(run.snake.segments[0].cell, run.config)` exactly;
- each body sample keeps its strategic `segment.id` and exact `cellToWorld(segment.cell)` position;
- changing only continuous `run.flight` cannot alter this snapshot;
- six cardinal directions rotate local head-forward `+Z` to the expected world axis;
- initial `+Z` quaternion is identity;
- snake and food footprint remain `0.8 × cellSize`.

- [ ] **Step 2: Run RED**

```bash
npm test -- tests/unit/pixel-snake-presentation.test.ts tests/unit/gameplay-presentation.test.ts
```

Expected: FAIL because pixel presentation module does not exist.

- [ ] **Step 3: Implement cell-only snapshot builder**

Use only `run.snake.segments`, `run.visibleDirection`, `run.config`, `cellToWorld`, and render-only quaternion math. Do not import `FlightPose`, `FlightPresentation`, or `FlightTrail` into this module.

- [ ] **Step 4: Tighten renderer tests**

Keep `SnakeRenderer` as a dumb snapshot consumer. Rename continuous wording in `voxel-renderer.test.ts`; prove it renders the exact supplied snapped snapshot but does not itself perform logical conversion/interpolation.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- tests/unit/pixel-snake-presentation.test.ts tests/unit/voxel-renderer.test.ts tests/unit/gameplay-presentation.test.ts
npm test
git add src/render/pixel-snake-presentation.ts src/render/snake-renderer.ts tests/unit/pixel-snake-presentation.test.ts tests/unit/voxel-renderer.test.ts tests/unit/gameplay-presentation.test.ts
git commit -m "feat: render snake from exact voxel cells"
```

---

### Task 3: Browser loop uses snapped snake state, not FlightTrail

**Files:**
- Modify: `src/main.ts`
- Modify: `tests/integration/main-v2-loop.test.ts`
- Modify: `tests/unit/grid-authority-boundary.test.ts`

**Consumes:** `buildPixelSnakeRenderSnapshot(run)` from Task 2.

**Produces:** active browser snake rendering with no continuous-position dependency.

- [ ] **Step 1: Write RED structural tests**

Update `main-v2-loop.test.ts` to require:
- `stepRun(run, steering, dt)` remains the fixed-step gameplay path;
- `snakeRenderer.render(buildPixelSnakeRenderSnapshot(run))` or equivalent snapped snapshot call exists;
- active `main.ts` contains no `new FlightTrail()`, `flightTrail.sampleBehind`, `initialTrailPoints`, `retainedTrailDistance`, or `buildBodySamples`;
- `presentation.displayedHeadWorld` is not used as snake head position;
- continuous `interpolateFlightPresentation` is still allowed for camera/navigation only.

- [ ] **Step 2: Run RED**

```bash
npm test -- tests/integration/main-v2-loop.test.ts tests/unit/grid-authority-boundary.test.ts
```

Expected: FAIL against V2.1 `FlightTrail` body/head presentation.

- [ ] **Step 3: Replace active snake-render path**

In `src/main.ts`:
- remove `FlightTrail`, trail reserve/seeding/sampling helpers, and body sampling;
- render with `buildPixelSnakeRenderSnapshot(run)`;
- retain continuous steering and fixed-step simulation unchanged;
- keep `interpolateFlightPresentation` temporarily for camera guidance only.

- [ ] **Step 4: Add read-only snapped telemetry**

`exposeLogicalTelemetry(run)` must expose:

```text
data-head-cell
 data-head-yaw
 data-head-pitch
 data-head-point          // continuous navigation point
 data-head-direction      // latched cardinal visible direction
 data-head-render-world   // exact cellToWorld(head.cell)
```

Telemetry remains read-only and is never consumed by gameplay.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- tests/integration/main-v2-loop.test.ts tests/unit/grid-authority-boundary.test.ts tests/unit/pixel-snake-presentation.test.ts
npm test
git add src/main.ts tests/integration/main-v2-loop.test.ts tests/unit/grid-authority-boundary.test.ts
git commit -m "feat: snap active snake rendering to grid cells"
```

---

### Task 4: Snapped chase target with continuous camera guidance

**Files:**
- Create: `src/render/pixel-camera-presentation.ts`
- Create: `tests/unit/pixel-camera-presentation.test.ts`
- Modify: `src/render/flight-presentation.ts`
- Modify: `src/render/chase-camera.ts` only to decouple snapshot typing if needed
- Modify: `tests/unit/flight-presentation.test.ts`
- Modify: `tests/unit/chase-camera.test.ts`
- Modify: `src/main.ts`

**Interfaces:**

`flight-presentation.ts` exports the existing unwrapped conversion:

```ts
export function unwrappedWorldForGridPoint(
  point: GridPoint,
  config?: GridConfig
): Vec3;
```

New camera helper:

```ts
export function unwrapCellCenterNear(
  cell: GridCell,
  anchor: GridPoint,
  resolution: number
): GridPoint;

export function buildPixelChaseCameraSnapshot(
  run: Pick<RunState, 'snake' | 'config'>,
  navigation: FlightPresentation
): ChaseCameraSnapshot;
```

- [ ] **Step 1: Write RED camera-presentation tests**

Assert:
- while `navigation.unwrappedGridPoint` changes inside one strategic head cell, camera snapshot `headWorld` remains the same unwrapped cell center;
- forward/up still come from continuous navigation presentation;
- when head wraps cell `8 → 0`, unwrapped cell center remains spatially adjacent in unwrapped space and `displayWrapOffset` changes by exactly one `worldSize`;
- displayed snapped head equals `cellToWorld(headCell)`.

- [ ] **Step 2: Run RED**

```bash
npm test -- tests/unit/pixel-camera-presentation.test.ts tests/unit/chase-camera.test.ts
```

Expected: FAIL because snapped camera adapter does not exist.

- [ ] **Step 3: Implement snapped camera adapter**

Move the generic unwrapped cell-center-near logic out of `main.ts`. Use continuous navigation point only to choose the nearest toroidal image of the **discrete** strategic head cell; it must not affect snake rendering.

- [ ] **Step 4: Integrate camera in `main.ts`**

Build one continuous navigation presentation per render frame, then pass `buildPixelChaseCameraSnapshot(run, navigation)` to `ChaseCameraController`. Overview camera remains unchanged.

- [ ] **Step 5: Extend camera behavior tests**

Prove damping still converges after a one-cell snap and wrap relocation occurs before damping. Continuous yaw/pitch guidance remains allowed so camera direction does not become six-axis jerky.

- [ ] **Step 6: Verify and commit**

```bash
npm test -- tests/unit/pixel-camera-presentation.test.ts tests/unit/flight-presentation.test.ts tests/unit/chase-camera.test.ts
npm test
git add src/render/pixel-camera-presentation.ts src/render/flight-presentation.ts src/render/chase-camera.ts src/main.ts tests/unit/pixel-camera-presentation.test.ts tests/unit/flight-presentation.test.ts tests/unit/chase-camera.test.ts
git commit -m "feat: chase snapped voxel head with smooth camera"
```

---

### Task 5: One-lattice food, pickup, growth, and background registration

**Files:**
- Modify: `tests/unit/gameplay-presentation.test.ts`
- Modify: `tests/unit/render-config.test.ts`
- Modify: `tests/integration/grid-run-state.test.ts`
- Modify: `src/main.ts` for diagnostics only
- No behavioral change expected: `src/game/food.ts`, `src/render/food-renderer.ts`, `src/render/scene.ts`

**Produces:** automated proof that head, body, food, and visible grid share one spatial lattice.

- [ ] **Step 1: Write RED/strengthened lattice tests**

Assert:
- equal head/food `GridCell` values produce exactly equal world coordinates through `cellToWorld`;
- `CUBE_GRID_DIVISIONS === GRID_CONFIG.resolution` and cell spacing remains `GRID_CONFIG.cellSize`;
- `SNAKE_VOXEL_FILL === FOOD_VOXEL_FILL === 0.8`;
- every body sample from Task 2 is a strategic cell center.

- [ ] **Step 2: Add pickup coincidence integration test**

Create a run whose food is the next entered cell, capture `consumedFoodCell` and `cellToWorld(consumedFoodCell)` before the step, execute collection, then assert the committed strategic head cell is the captured food cell and its `cellToWorld` equals the captured food world even though `run.food` may already have respawned.

Also keep `+2` growth and stable-ID assertions.

- [ ] **Step 3: Add collection telemetry without delaying respawn**

Around each `stepRun` in `main.ts`, retain the pre-step food cell and previous food count. If collection count increases, expose only diagnostics:

```text
data-last-food-pickup-cell
data-last-food-pickup-world
data-last-food-pickup-head-world
```

Both world values must be derived with `cellToWorld` from the consumed cell/current committed head. Do not add a gameplay delay or continuous food coordinate.

- [ ] **Step 4: Verify and commit**

```bash
npm test -- tests/unit/gameplay-presentation.test.ts tests/unit/render-config.test.ts tests/integration/grid-run-state.test.ts
npm test
git add src/main.ts tests/unit/gameplay-presentation.test.ts tests/unit/render-config.test.ts tests/integration/grid-run-state.test.ts
git commit -m "test: lock snake and food to one voxel lattice"
```

---

### Task 6: V2.2 ruleset and persistence isolation

**Files:**
- Modify: `src/game/grid-config.ts`
- Modify: `src/app/identity.ts`
- Modify: `src/app/app-controller.ts`
- Modify: `tests/unit/grid-config.test.ts`
- Modify: `tests/unit/identity.test.ts`
- Modify: `tests/unit/task11-v2-boundary.test.ts`
- Modify: `tests/unit/session-gateway-capability.test.ts`
- Modify: `tests/integration/app-flow.test.ts`
- Modify: `tests/integration/app-ranking-flow.test.ts`
- Modify: `tests/integration/grid-run-state.test.ts`
- Modify later in Task 8: `tests/e2e/ranked.spec.ts`

**Interfaces:**

```ts
export const V2_2_LOCAL_BEST_KEY = 'snek.localBest.pixelGridV2_2';
export function loadPixelGridV2_2Best(storage: StorageLike): number;
export function savePixelGridV2_2Best(storage: StorageLike, score: number): number;
```

- [ ] **Step 1: Write RED persistence/ruleset tests**

Require:

```ts
expect(RULESET_ID).toBe('pixel-flight-grid-v2-2');
expect(V2_2_LOCAL_BEST_KEY).toBe('snek.localBest.pixelGridV2_2');
```

Seed historical V1/V2/V2.1 values; save V2.2 best; assert every old key remains unchanged. Local gateway supports V2.2; HTTP gateway remains false without network call.

- [ ] **Step 2: Run RED**

```bash
npm test -- tests/unit/grid-config.test.ts tests/unit/identity.test.ts tests/unit/task11-v2-boundary.test.ts tests/unit/session-gateway-capability.test.ts
```

Expected: FAIL on missing V2.2 symbols/ID.

- [ ] **Step 3: Implement V2.2 identity and migrate active AppController**

Change only active ruleset/key. Keep all historical helper functions and stored values. `AppController` loads/saves only V2.2 best after migration.

- [ ] **Step 4: Update active-ruleset fixtures**

Change test fixtures that intentionally represent the active current ruleset from `pixel-flight-grid-v2-1` to `pixel-flight-grid-v2-2`. Do not rewrite historical V2.1 tests/comments into false history.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- tests/unit/grid-config.test.ts tests/unit/identity.test.ts tests/unit/task11-v2-boundary.test.ts tests/unit/session-gateway-capability.test.ts tests/integration/app-flow.test.ts tests/integration/app-ranking-flow.test.ts tests/integration/grid-run-state.test.ts
npm test
git add src/game/grid-config.ts src/app/identity.ts src/app/app-controller.ts tests
git commit -m "feat: isolate Pixel Flight Grid V2.2 persistence"
```

---

### Task 7: Retire FlightTrail and harden V2.2 authority boundaries

**Files:**
- Delete if zero production consumers: `src/render/flight-trail.ts`
- Delete corresponding obsolete unit test: `tests/unit/flight-trail.test.ts`
- Modify: `tests/unit/grid-authority-boundary.test.ts`
- Modify: `tests/integration/main-v2-loop.test.ts`

**Produces:** architectural regression gate proving continuous presentation cannot regain snake-position authority.

- [ ] **Step 1: Verify zero active FlightTrail consumers**

```bash
grep -R "FlightTrail\|sampleBehind" -n src
```

Expected after Tasks 2–4: only `src/render/flight-trail.ts` itself, or no matches outside historical/non-runtime material.

- [ ] **Step 2: Write/strengthen authority scanner**

Rename active runtime list to V2.2 and include:

```text
main.ts
game/run-state.ts
input/keyboard.ts
input/joystick.ts
render/chase-camera.ts
render/flight-presentation.ts
render/pixel-snake-presentation.ts
render/pixel-camera-presentation.ts
render/snake-renderer.ts
```

Retain all existing forbidden discrete-authority patterns. Add V2.2 snake-placement checks so `main.ts`/`pixel-snake-presentation.ts` cannot use `FlightTrail.sampleBehind`, `flightTrail`, or `FlightPresentation.displayedHeadWorld` as snake-position authority.

- [ ] **Step 3: Delete obsolete render trail**

Delete `src/render/flight-trail.ts` and `tests/unit/flight-trail.test.ts` once Step 1 proves no production consumer.

- [ ] **Step 4: Verify and commit**

```bash
npm test -- tests/unit/grid-authority-boundary.test.ts tests/integration/main-v2-loop.test.ts
npm test
git add -A src/render tests/unit tests/integration
git commit -m "refactor: retire continuous snake trail authority"
```

---

### Task 8: Desktop/mobile E2E for continuous control + pixel motion

**Files:**
- Modify: `tests/e2e/game.spec.ts`
- Modify: `tests/e2e/ranked.spec.ts`
- Modify: `src/main.ts` only for E2E-only harness if pickup placement control is required

**Consumes telemetry from Tasks 3 and 5.**

- [ ] **Step 1: Add helper to parse triplet telemetry**

In `game.spec.ts`, add a helper for comma-separated `data-head-point`, `data-head-cell`, and `data-head-render-world` values.

- [ ] **Step 2: Extend desktop continuous-control test with pixel-motion assertions**

Keep existing held right/left/up/down yaw/pitch assertions. Additionally sample multiple animation frames and require:
- there is at least one interval where continuous `data-head-point` changes while `data-head-cell` and `data-head-render-world` remain identical;
- every sampled `data-head-render-world` coordinate lies on a valid cell-center lattice (`(world + worldSize/2)/cellSize - 0.5` is integer within epsilon);
- when `data-head-cell` changes, rendered world changes atomically to the new cell center, never an in-between value;
- `data-head-direction` remains unchanged during intra-cell steering and changes only after a cell-entry boundary when appropriate.

Do not assert a second movement clock or fixed browser-frame count.

- [ ] **Step 3: Extend mobile tests**

Preserve the same-pointer `right → center → left` test and diagonal steering test. Add lattice assertions proving visible head remains snapped in both portrait and landscape projects while yaw/pitch remain continuous.

- [ ] **Step 4: Add deterministic pickup-coincidence E2E**

If random spawn cannot make this deterministic, extend the existing E2E-only harness (never normal production mode) with a minimal `setFoodCell(cell)` action. Place food in the next neutral `+Z` entry cell, wait for collection, and assert:

```text
data-last-food-pickup-world === data-last-food-pickup-head-world
```

and the recorded pickup cell matches that world center. The runtime still respawns immediately.

- [ ] **Step 5: Migrate ranked E2E fixture**

Change active `RULESET` and harness result type to `pixel-flight-grid-v2-2`; continue proving the HTTP API receives zero game/ranking requests because it does not advertise V2.2 support.

- [ ] **Step 6: Run E2E**

```bash
npm run test:e2e
```

Expected: desktop, mobile portrait, mobile landscape, and ranked project gates pass; only intentional project-filter skips remain.

- [ ] **Step 7: Commit**

```bash
git add src/main.ts tests/e2e/game.spec.ts tests/e2e/ranked.spec.ts
git commit -m "test: verify V2.2 pixel motion across desktop and mobile"
```

---

### Task 9: Documentation closeout and full candidate verification

**Files:**
- Modify: `README.md`
- Modify: V2.2 spec/amendment status headers to approved/canonical wording
- No gameplay changes unless verification finds a defect

- [ ] **Step 1: Update README active architecture**

Replace the active V2.1 presentation description with V2.2:
- control/navigation continuous;
- snake/body positions exact cell centers only;
- food exact same lattice/cell transform;
- cardinal visible head direction latched by entry;
- chase camera smooth with continuous orientation guidance;
- no `FlightTrail` active runtime;
- active local key `snek.localBest.pixelGridV2_2`;
- V1/V2/V2.1 values historical and untouched;
- HTTP validator unsupported for V2.2;
- link canonical V2.2 spec, amendment, and this R1 plan.

- [ ] **Step 2: Mark approved docs canonically**

Update the V2.2 design header to `APPROVED — CANONICAL DESIGN` and the amendment header to `APPROVED — CANONICAL AMENDMENT R1`, preserving their content/history.

- [ ] **Step 3: Run exact full verification**

```bash
npm audit --omit=dev --audit-level=moderate
npm test
npm run test:worker
npm run typecheck
npm run worker:build
npm run build
npm run test:e2e
```

Expected: all PASS. Record exact test counts and any Playwright skips; inspect skips to confirm they are project-selection skips, not feature failures.

- [ ] **Step 4: Whole-branch audit against spec + amendment**

Explicitly verify:
1. input is continuous;
2. `FlightPose` remains continuous 60 Hz navigation;
3. DDA tie semantics unchanged;
4. strategic occupancy exact-cell;
5. visible head position only `cellToWorld(head.cell)`;
6. body positions only `cellToWorld(segment.cell)`;
7. stable segment IDs preserved;
8. food only `cellToWorld(food.cell)`;
9. pickup visible-world coincidence proven;
10. visible direction cardinal and cell-entry latched;
11. X>Y>Z tie priority proven;
12. no active `FlightTrail` snake authority;
13. camera smooth and wrap-aware;
14. 9³/.40/+2/6 cells/s/0.8 voxel values unchanged;
15. V2.2 persistence isolated;
16. HTTP ranking unsupported;
17. desktop/mobile continuous control retained;
18. no retired V2 discrete authority reintroduced.

- [ ] **Step 5: Run code-review workflow**

Read/use `superpowers:requesting-code-review`. If no independent reviewer/subagent exists in the harness, state that explicitly and perform an inline whole-branch review; never label it independent.

- [ ] **Step 6: Freeze exact candidate SHA and open draft PR**

Only after every automated gate is green. Suggested title:

```text
feat: launch Pixel Flight Grid V2.2 pixel motion
```

PR body must record exact candidate SHA, verification commands/results, architecture summary, and `Human playtest: PENDING`.

- [ ] **Step 7: Human playtest gate**

Human must explicitly confirm:
- snake moves visibly in voxel/cell steps;
- keyboard/joystick still steer continuously;
- no latch/rearm/FIFO feeling;
- body remains discrete, not a smooth curve;
- food sits on the same lattice and pickup looks like real contact;
- chase camera remains comfortable;
- toroidal wrap looks correct;
- mobile portrait and landscape retain the same semantics.

Do not merge before explicit acceptance.

- [ ] **Step 8: Release only after acceptance**

Use `superpowers:finishing-a-development-branch` and `superpowers:verification-before-completion`. Merge normally with the accepted expected head SHA, then verify:
- `main` HEAD is the merge SHA;
- post-merge CI is green on that exact SHA;
- GitHub Pages deployment is green on that exact SHA.

No direct push to `main` and no auto-delete requirement for the feature branch.

---

## Self-Review Record

- **Spec coverage:** Sections 1–8 are covered by Tasks 1–3; orientation amendment/Section 9 by Task 1–2; body/food/grid Sections 10–12 by Tasks 2, 5, 7; camera/wrap Sections 13–14 by Task 4; timing Section 15 preserved globally and tested in Task 1/8; ruleset/persistence Section 16 by Task 6; forbidden paths Section 18 by Task 7; automated/human/release Sections 19–21 by Tasks 8–9.
- **Step scan:** each task has a RED test gate before implementation where behavior changes; documentation/release-only steps do not manufacture RED failures.
- **Type consistency:** `GridDirection` remains the existing six-value type; `RunState.visibleDirection` feeds `buildPixelSnakeRenderSnapshot`; camera consumes a separate `ChaseCameraSnapshot`; snake renderer remains a dumb snapshot consumer.
- **Review Focus coverage:** DDA ties Task 1/9; wrap Task 4/8; intra-cell steering Task 1/3/8; pickup respawn Task 5/8; growth/IDs Task 2/5.
- **Proportion:** new source surface is intentionally small: one game quantizer plus two focused render adapters. The plan avoids rebuilding DDA/input/renderer systems that already satisfy V2.2.

## Canonical Execution Order

```text
Task 0  isolate + baseline
Task 1  cardinal visible-direction latch
Task 2  cell-centered snake snapshot
Task 3  browser render path / remove FlightTrail authority
Task 4  smooth camera on snapped target
Task 5  one-lattice food + pickup proof
Task 6  V2.2 persistence/ruleset
Task 7  retire FlightTrail + authority scanner
Task 8  desktop/mobile/ranked E2E
Task 9  docs + full verification + review + human gate + release
```

No task may bypass its targeted test gate, and no release action may occur before human acceptance of the exact fully verified candidate SHA.
