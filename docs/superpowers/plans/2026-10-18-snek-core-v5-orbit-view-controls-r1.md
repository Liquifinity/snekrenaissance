# SNEK CORE V5 Orbit Camera + View-Relative Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add free manual orbit around the cube while mapping keyboard/mobile movement to the player's current screen-relative orientation without changing deterministic six-axis gameplay.

**Architecture:** Preserve `RunState` as absolute `GridDirection` authority. Add a pure `ViewFrame` layer that quantizes the continuous camera basis into one of 24 orthogonal cube orientations with hysteresis, and resolve physical inputs through that frame at event time. Refactor the V4 board camera into a persistent spherical orbit camera and isolate pointer/pinch ownership in a dedicated orbit-input controller.

**Tech Stack:** TypeScript, Three.js, Vitest, jsdom, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-18-snek-core-v5-orbit-view-controls-design.md`

## Global Constraints

- Base authority: `main@c1bd449bbefda98624d93b5d1e8d8203d67a9783`.
- Ruleset identity becomes exactly `snek-core-v5`.
- Local best key becomes exactly `snek.localBest.coreV5`; V4 storage remains untouched.
- Strategic movement remains only `+X/-X/+Y/-Y/+Z/-Z` at 6 Hz.
- Direct 180-degree reversal remains invalid through existing `queueDirection()` behavior.
- No chase, auto-rotation, wrap rebase, auto-centering, release snap, inertia/damping, camera pan, or free roll.
- Camera target remains exactly `(0,0,0)`.
- Initial camera position direction remains the normalized ray derived from `(0.65, 0.55, 1.0)`.
- Polar angle is clamped to `[1°, 179°]`.
- `BOARD_CAMERA_ZOOM_MIN = 0.65`, `BOARD_CAMERA_ZOOM_MAX = 5`, `BOARD_CAMERA_ZOOM_DEFAULT = 1`.
- `VIEW_FRAME_SWITCH_MARGIN = 0.15`.
- Initial `ViewFrame` is `up=+Y`, `right=+X`, `intoScreen=-Z`.
- Input is mapped to an absolute `GridDirection` when the key/button event occurs; later camera movement must not reinterpret an already-buffered command.
- `ViewFrame` must never be stored in `RunState` or read back from DOM telemetry.

## Review Focus

- Pointer transition from one touch → two touches → one touch must establish new baselines without camera jumps.
- Near-pole orbit at 1°/179° must preserve finite camera basis and stable `ViewFrame` selection.
- Diagonal camera boundaries must not oscillate between two discrete frames unless the challenger exceeds the current score by `0.15`.
- Resize during a non-default orbit must preserve orientation while recomputing fit distance for the new aspect.
- A valid buffered command must remain the same absolute direction if the camera is rotated before the next 6 Hz step.

---

### Task 1: Pure `ViewFrame` authority

**Files:**
- Create: `src/render/view-frame.ts`
- Create: `tests/unit/view-frame.test.ts`

**Interfaces:**
- Consumes: `GridDirection`, `oppositeGridDirection()`.
- Produces:
  - `export type ViewCommand = 'up' | 'down' | 'left' | 'right' | 'towardViewer' | 'intoScreen'`
  - `export type CameraBasis = Readonly<{ intoScreen: Vec3; up: Vec3; right: Vec3 }>`
  - `export type ViewFrame = Readonly<{ up: GridDirection; right: GridDirection; intoScreen: GridDirection }>`
  - `export const VIEW_FRAME_SWITCH_MARGIN = 0.15`
  - `export const INITIAL_VIEW_FRAME: ViewFrame`
  - `export function enumerateViewFrames(): readonly ViewFrame[]`
  - `export function selectViewFrame(basis: CameraBasis, current: ViewFrame): ViewFrame`
  - `export function mapViewCommand(frame: ViewFrame, command: ViewCommand): GridDirection`

- [ ] **Step 1: Write failing unit tests for the 24-frame lattice**

Assert exactly 24 unique frames; every frame uses three mutually perpendicular signed axes; `right = cross(intoScreen, up)`; and `INITIAL_VIEW_FRAME` equals `{ up: '+Y', right: '+X', intoScreen: '-Z' }`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/unit/view-frame.test.ts`
Expected: FAIL because `src/render/view-frame.ts` does not exist.

- [ ] **Step 3: Implement frame enumeration and command mapping**

Use exact `ViewCommand` semantics:

```text
up            -> frame.up
down          -> opposite(frame.up)
right         -> frame.right
left          -> opposite(frame.right)
intoScreen    -> frame.intoScreen
towardViewer  -> opposite(frame.intoScreen)
```

- [ ] **Step 4: Add failing hysteresis/scoring tests**

Test the approved score:

```text
dot(actualInto, candidate.intoScreen)
+ dot(actualUp, candidate.up)
+ dot(actualRight, candidate.right)
```

Assert a challenger does not replace `current` at `currentScore + 0.15` or less, but does replace it when strictly greater than that margin. Include finite near-pole bases corresponding to 1° and 179°.

- [ ] **Step 5: Implement `selectViewFrame()` and run GREEN**

Run: `npm test -- tests/unit/view-frame.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/render/view-frame.ts tests/unit/view-frame.test.ts
git commit -m "feat: add V5 view-frame authority"
```

### Task 2: Refactor physical input to semantic `ViewCommand`

**Files:**
- Modify: `src/input/keyboard.ts`
- Modify: `src/input/direction-pad.ts`
- Modify: `tests/unit/keyboard.test.ts`
- Modify: `tests/unit/direction-pad.test.ts`

**Interfaces:**
- Consumes: `ViewCommand` from Task 1.
- Produces:
  - `KeyboardInputOptions.onCommand?: (command: ViewCommand) => void`
  - `createDirectionPad(onCommand: (command: ViewCommand) => void): HTMLDivElement`

- [ ] **Step 1: Rewrite keyboard tests to RED on semantic commands**

Assert edge-trigger/repeat suppression remains unchanged and mappings are exactly:

```text
W / ArrowUp    -> up
S / ArrowDown  -> down
A / ArrowLeft  -> left
D / ArrowRight -> right
Q              -> towardViewer
E              -> intoScreen
```

- [ ] **Step 2: Rewrite direction-pad tests to RED on semantic commands**

Assert six controls emit `up/down/left/right/towardViewer/intoScreen`; visible labels remain `↑ ↓ ← → FRENTE FUNDO`; normal player UI does not expose `+X/-X/+Y/-Y/+Z/-Z`; pointer events are stopped/prevented at the pad boundary so they cannot become canvas orbit gestures.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `npm test -- tests/unit/keyboard.test.ts tests/unit/direction-pad.test.ts`
Expected: FAIL because V4 inputs still emit absolute world directions.

- [ ] **Step 4: Implement semantic input adapters**

Preserve keyboard `pressed` state, blur reset, and keydown/keyup prevention behavior.

- [ ] **Step 5: Run GREEN**

Run: `npm test -- tests/unit/keyboard.test.ts tests/unit/direction-pad.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/input/keyboard.ts src/input/direction-pad.ts tests/unit/keyboard.test.ts tests/unit/direction-pad.test.ts
git commit -m "feat: make V5 input view-relative"
```

### Task 3: Persistent spherical board-camera orbit

**Files:**
- Modify: `src/render/board-camera.ts`
- Modify: `tests/unit/board-camera.test.ts`

**Interfaces:**
- Consumes: existing `GridConfig` and camera fit calculation.
- Produces:
  - `export const BOARD_CAMERA_POLAR_MIN = Math.PI / 180`
  - `export const BOARD_CAMERA_POLAR_MAX = 179 * Math.PI / 180`
  - `BoardCameraController.orbitBy(deltaAzimuth: number, deltaPolar: number): void`
  - `BoardCameraController.apply(aspect?: number): BoardCameraPose`
  - `BoardCameraPose` additionally exposes `basis: CameraBasis`
  - `BoardCameraController` preserves azimuth/polar across `apply()`, zoom, and resize.

- [ ] **Step 1: Add failing camera-state tests**

Assert initial orientation matches normalized `(0.65,0.55,1.0)`, `orbitBy()` changes position direction but not target/distance, polar clamps at 1°/179°, release requires no later camera method call, and invalid non-finite orbit deltas throw `RangeError`.

- [ ] **Step 2: Add failing resize/zoom-isolation tests**

At a non-default orbit, assert `setZoomFactor()` changes scalar distance only and `apply(newAspect)` preserves normalized position ray while recomputing fit distance.

- [ ] **Step 3: Run focused test and verify RED**

Run: `npm test -- tests/unit/board-camera.test.ts`
Expected: FAIL because V4 `apply()` always reconstructs the fixed ray and exposes no orbit state/basis.

- [ ] **Step 4: Implement spherical state**

Use position-ray convention:

```text
x = sin(polar) * sin(azimuth)
y = cos(polar)
z = sin(polar) * cos(azimuth)
```

Initialize `azimuth = atan2(initialRay.x, initialRay.z)` and `polar = acos(initialRay.y)`. Keep camera `up=(0,1,0)`, target origin, and derive returned continuous `CameraBasis` from the resulting look direction.

- [ ] **Step 5: Run GREEN**

Run: `npm test -- tests/unit/board-camera.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/render/board-camera.ts tests/unit/board-camera.test.ts
git commit -m "feat: add persistent V5 board orbit pose"
```

### Task 4: Pointer/touch orbit interaction controller

**Files:**
- Create: `src/render/board-orbit.ts`
- Create: `tests/unit/board-orbit.test.ts`

**Interfaces:**
- Consumes: `BoardCameraController` state methods from Task 3.
- Produces:
  - `export const BOARD_ORBIT_RADIANS_PER_PIXEL = 0.005`
  - `export type BoardOrbitPort = Pick<BoardCameraController, 'zoomFactor' | 'orbitBy' | 'setZoomFactor'>`
  - `export function attachBoardOrbit(target: HTMLElement, camera: BoardOrbitPort, onChange: () => void): () => void`

- [ ] **Step 1: Write failing desktop-pointer tests in jsdom**

Assert only primary-button mouse drag owns orbit; horizontal pixels produce `deltaAzimuth = -dx * 0.005`; vertical pixels produce `deltaPolar = dy * 0.005`; pointer release ends motion with no inertia callback afterward.

- [ ] **Step 2: Write failing touch-transition tests**

Assert one touch orbits; second touch pauses orbit and establishes pinch baseline; two-touch distance changes call `setZoomFactor(pinchStartZoom * currentDistance/startDistance)`; returning to one touch establishes a fresh orbit baseline so the first subsequent move cannot jump.

- [ ] **Step 3: Run focused test and verify RED**

Run: `npm test -- tests/unit/board-orbit.test.ts`
Expected: FAIL because the module does not exist.

- [ ] **Step 4: Implement `attachBoardOrbit()`**

Use Pointer Events and pointer capture where available. The controller owns only canvas pointer state; it must never pan, mutate target, schedule animation, or start damping/inertia.

- [ ] **Step 5: Run GREEN**

Run: `npm test -- tests/unit/board-orbit.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/render/board-orbit.ts tests/unit/board-orbit.test.ts
git commit -m "feat: add V5 manual orbit gestures"
```

### Task 5: Wire camera-relative commands into runtime

**Files:**
- Modify: `src/main.ts`
- Modify: `tests/integration/main-v4-loop.test.ts` -> rename to `tests/integration/main-v5-loop.test.ts`
- Modify: `tests/e2e/camera-zoom.spec.ts`
- Modify: `tests/e2e/game.spec.ts`
- Modify: `tests/e2e/v4-core.spec.ts` -> rename to `tests/e2e/v5-core.spec.ts`

**Interfaces:**
- Consumes: `selectViewFrame()`, `mapViewCommand()`, `INITIAL_VIEW_FRAME`, `attachBoardOrbit()`.
- Produces runtime diagnostics:
  - `data-camera-mode="orbit-board"`
  - `data-view-up`
  - `data-view-right`
  - `data-view-into`
  - E2E `getViewFrame()` in `window.__SNEK_TEST__`.

- [ ] **Step 1: Write integration RED for event-time command resolution**

Model: `currentViewFrame=A`; receive `up`; map/queue absolute direction; change frame to `B`; execute strategic step; assert the queued absolute direction from A is consumed unchanged.

- [ ] **Step 2: Write integration RED for camera/gameplay isolation**

Take a run snapshot of `heading`, `pendingDirection`, snake cells, food, score, and fixed-clock accumulator; simulate orbit-only camera changes; assert strategic snapshot is byte-for-byte unchanged.

- [ ] **Step 3: Update E2E contracts to RED**

Cover: default V4-equivalent mapping; ~90° orbit changes W/A/S/D/Q/E world outputs according to the discrete frame; diagonal-boundary hysteresis; no snap/post-release motion; non-default-angle toroidal wrap leaves camera unchanged; reversal remains rejected; resize preserves orbit direction; one-touch → pinch → one-touch transition has no jump.

- [ ] **Step 4: Run integration/E2E and verify RED**

Run: `npm test -- tests/integration/main-v5-loop.test.ts`
Expected: FAIL until `main.ts` consumes `ViewCommand` through the active frame.

Run: `npm run test:e2e`
Expected: FAIL on V5 diagnostics/orbit behavior.

- [ ] **Step 5: Integrate runtime**

Maintain `let currentViewFrame = INITIAL_VIEW_FRAME`. After every camera change/apply, call `selectViewFrame(pose.basis, currentViewFrame)` and expose diagnostics. Keyboard/pad callback must map `ViewCommand` immediately with `mapViewCommand(currentViewFrame, command)` and only then call existing `queueDirection()`.

Replace V4 canvas pointer handlers with `attachBoardOrbit()`. Keep wheel zoom manual and call the same camera-change path after zoom/resize. `ViewFrame` must not enter `RunState`.

- [ ] **Step 6: Run GREEN**

Run: `npm test -- tests/integration/main-v5-loop.test.ts`
Expected: PASS.

Run: `npm run test:e2e`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/main.ts tests/integration/main-v5-loop.test.ts tests/e2e/camera-zoom.spec.ts tests/e2e/game.spec.ts tests/e2e/v5-core.spec.ts
git commit -m "feat: integrate V5 orbit-relative controls"
```

### Task 6: V5 ruleset and persistence isolation

**Files:**
- Modify: `src/game/grid-config.ts`
- Modify: `src/app/identity.ts`
- Modify: `src/app/app-controller.ts`
- Modify: `tests/unit/grid-config.test.ts`
- Add: `tests/unit/v5-persistence.test.ts`
- Modify/rename historical V4 persistence test as needed to prove V4 key remains untouched.

**Interfaces:**
- Produces `RULESET_ID = 'snek-core-v5'` and active local key `snek.localBest.coreV5`.

- [ ] **Step 1: Write persistence/ruleset RED**

Assert active runtime reads/writes only `snek.localBest.coreV5`, does not migrate/read V4 best as V5, and leaves `snek.localBest.coreV4` unchanged.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- tests/unit/grid-config.test.ts tests/unit/v5-persistence.test.ts`
Expected: FAIL because runtime identity is still V4.

- [ ] **Step 3: Implement V5 identity**

Change only ruleset/local-best authority; scoring/topology parameters remain unchanged.

- [ ] **Step 4: Run GREEN**

Run: `npm test -- tests/unit/grid-config.test.ts tests/unit/v5-persistence.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/grid-config.ts src/app/identity.ts src/app/app-controller.ts tests/unit/grid-config.test.ts tests/unit/v5-persistence.test.ts
git commit -m "feat: isolate SNEK CORE V5 identity"
```

### Task 7: Boundary cleanup and regression suite

**Files:**
- Modify: `tests/unit/grid-authority-boundary.test.ts`
- Modify: `tests/integration/v4-determinism.test.ts` -> rename to `tests/integration/v5-determinism.test.ts`
- Modify: any tests still naming V4 as active runtime authority.

**Interfaces:**
- Consumes all prior V5 interfaces.
- Produces no new production API; this task hardens architectural boundaries.

- [ ] **Step 1: Add boundary tests**

Assert `RunState` has no camera/ViewFrame fields; camera/view modules do not import `run-state`; strategic modules do not import render/orbit modules; DOM telemetry is write-only diagnostics from runtime and never a gameplay source.

- [ ] **Step 2: Add deterministic regression tests**

Run equivalent strategic input sequences with and without arbitrary camera orbit operations between input events/steps; once physical commands have been resolved to the same absolute directions, assert identical snake cells, food, score, collision, growth, and results.

- [ ] **Step 3: Run suite and resolve only V5 migration residues**

Run: `npm test`
Expected: PASS with zero failures.

- [ ] **Step 4: Commit**

```bash
git add tests
git commit -m "test: lock V5 orbit architecture boundaries"
```

### Task 8: Full verification and candidate PR

**Files:**
- No new production behavior.
- Update plan/spec only if execution discovers an approved architectural correction.

**Interfaces:**
- Candidate branch: `feat/snek-core-v5-orbit-view-controls` from `main@c1bd449bbefda98624d93b5d1e8d8203d67a9783` plus approved spec/plan history.

- [ ] **Step 1: Run full verification on one exact candidate SHA**

Run in order:

```bash
npm test
npm run test:worker
npm run typecheck
npm run worker:build
npm run build
npm run test:e2e
```

Expected: all commands exit 0.

- [ ] **Step 2: Compare candidate against base**

Confirm changes are limited to V5 spec/plan, camera/orbit/view-frame/input/runtime, V5 identity/persistence, UI semantics if needed, and tests. No unintended Worker/API/ranking-backend changes.

- [ ] **Step 3: Open a draft PR against `main`**

The PR body must record the exact candidate SHA, RED/GREEN evidence, full verification results, manual acceptance checklist, and an explicit no-merge gate pending player test.

- [ ] **Step 4: Do not merge**

Stop with the draft PR available for manual playtest. Merge only after explicit user acceptance of the tested V5 candidate.
