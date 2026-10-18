# SNEK CORE V4 Board-Space Absolute Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace snake-relative steering and chase-camera authority with deterministic six-axis board-space controls and one fixed oblique cube camera, while preserving toroidal topology, 6 Hz strategic movement, collision, food, growth, scoring and completion semantics.

**Architecture:** V4 makes `GridDirection` the strategic movement authority through `RunState.heading` and `RunState.pendingDirection`; `GridFrame` and local turn intents leave the active runtime. A new board camera is centered on the cube, uses a fixed oblique position ray and changes only for viewport fit or manual zoom. Desktop emits six absolute directions from keyboard mappings; mobile exposes six discrete direction buttons. Rendering derives head orientation from `heading` only.

**Tech Stack:** TypeScript 5.8, Three.js 0.180, Vitest 3.2, Playwright 1.55, Vite 7, Wrangler 4.150.

**Spec:** `docs/superpowers/specs/2026-10-18-snek-core-v4-board-space-design.md`

## Global Constraints

- Base authority for this plan: `main@c794973d6b64a31a1c8879e7170633a0528015f2` plus the approved V4 spec commits on `docs/snek-core-v4-board-space-design`.
- Ruleset ID: `snek-core-v4`.
- Local-best key: `snek.localBest.coreV4`; V1/V2/V2.1/V2.2/V3 keys remain byte-for-byte historical data and are never migrated into V4.
- Strategic cadence remains `stepsPerSecond = 6`.
- Initial heading remains `+Z`.
- Legal headings remain exactly `+X | -X | +Y | -Y | +Z | -Z`.
- Direct opposite of the committed heading is rejected; repeated current heading is allowed.
- Newest valid command received before the next strategic step wins.
- Keyboard mapping is fixed: `W/ArrowUp -> +Y`, `S/ArrowDown -> -Y`, `A/ArrowLeft -> -X`, `D/ArrowRight -> +X`, `Q -> +Z`, `E -> -Z`.
- Mobile exposes six discrete commands for the same six directions; analog steering is removed.
- Board-camera position ray is `normalize(0.65, 0.55, 1.0)` from cube center toward the camera; target is always `(0,0,0)` and world `+Y` is the up reference.
- Board-camera FOV is `60°`.
- Board-camera framing margin is fixed by this plan at `1.10` over the bounding-sphere fit required by the spec.
- Camera zoom bounds remain `0.65..5`, default `1`.
- Camera never consumes snake head position, `heading`, wrap state, or strategic frame state.
- Toroidal wrap never moves, rebases, smooths or zooms the camera.
- Existing collision, food spawn/pickup, growth, score, completion target and elapsed strategic-time ordering remain unchanged.
- No new runtime dependency is introduced.

## Review Focus

1. **Opposite input while another direction is pending:** reject based on committed `heading`, not the uncommitted pending command; a later valid input must still be able to replace the pending value.
2. **Extreme portrait/landscape aspect ratios:** recompute whole-cube fit after resize/orientation without rotating the camera ray or changing the stored zoom factor.
3. **Wrap at each of X/Y/Z while zoom is unchanged:** camera position and target must remain exactly invariant even though the logical head jumps to the opposite cell coordinate.
4. **Mobile multi-touch:** direction-button activation must emit one discrete movement command, while two-finger pinch on the canvas emits no direction command.
5. **Held/repeated desktop keys:** browser key repeat must not enqueue repeated strategic directions; blur/release must re-arm the physical key edge.

---

## File Structure

### Strategic authority
- Modify `src/game/grid-types.ts`: remove V4 runtime dependence on `TurnIntent` and `GridFrame`; retain `GridCell`, `GridDirection`, `AxisVector`, `GridStep`.
- Modify `src/game/grid-direction.ts`: add exact opposite-direction helpers while preserving any historical helper still consumed outside V4.
- Modify `src/game/run-state.ts`: replace `frame/pendingTurn/queueTurn` with `heading/pendingDirection/queueDirection`; advance through `advanceGridStep` directly.
- Delete `src/game/grid-frame.ts` and `src/game/grid-movement.ts` after all active consumers migrate.

### Input
- Modify `src/input/keyboard.ts`: emit `GridDirection` directly and remove camera-toggle semantics.
- Create `src/input/direction-pad.ts`: construct/bind six discrete mobile direction controls.
- Delete `src/input/joystick.ts` after V4 integration.

### Camera and presentation
- Create `src/render/board-camera.ts`: whole-cube fit, fixed ray, zoom state and camera application.
- Modify `src/render/pixel-snake-presentation.ts`: derive head quaternion from `heading` and canonical visual-up rules.
- Delete `src/render/chase-camera.ts`, `src/render/overview-camera.ts`, and `src/render/pixel-camera-presentation.ts` after integration.

### Runtime/UI/persistence
- Modify `src/main.ts`: wire `queueDirection`, direction pad, board camera, pinch/wheel zoom, telemetry and E2E hooks; remove chase/overview mode and joystick code.
- Modify `src/styles.css`: replace joystick/camera-toggle styling with the six-button mobile pad.
- Modify `src/game/grid-config.ts`: set V4 ruleset identity without changing grid geometry or cadence.
- Modify `src/app/identity.ts`: add V4 best namespace/functions while preserving all prior namespaces.
- Modify `src/app/app-controller.ts`: read/write V4 best.

### Tests
- Create `tests/unit/v4-board-space.test.ts`.
- Create `tests/unit/direction-pad.test.ts`.
- Create `tests/unit/board-camera.test.ts`.
- Create `tests/unit/v4-persistence.test.ts`.
- Modify `tests/unit/keyboard.test.ts`, `tests/unit/pixel-snake-presentation.test.ts`, `tests/unit/camera-zoom.test.ts`, `tests/unit/grid-config.test.ts`, `tests/unit/grid-authority-boundary.test.ts`, `tests/unit/v3-persistence.test.ts`, and `tests/unit/simulation-step.test.ts`.
- Delete obsolete V3-local-authority tests together with their production modules: `grid-frame.test.ts`, `grid-movement.test.ts`, `joystick.test.ts`, `chase-camera.test.ts`, `compact-arena-overview.test.ts`, `pixel-camera-presentation.test.ts`.
- Replace `tests/e2e/v3-core.spec.ts` with `tests/e2e/v4-core.spec.ts`.
- Modify `tests/e2e/camera-zoom.spec.ts`, `tests/e2e/game.spec.ts`, and `tests/e2e/ranked.spec.ts`.

---

### Task 1: Replace Local `GridFrame` Movement with Absolute `heading`

**Files:**
- Modify: `src/game/grid-types.ts`
- Modify: `src/game/grid-direction.ts`
- Modify: `src/game/run-state.ts`
- Create: `tests/unit/v4-board-space.test.ts`
- Modify: `tests/unit/grid-authority-boundary.test.ts`

**Interfaces:**
- Produces: `oppositeGridDirection(direction: GridDirection): GridDirection`.
- Produces: `isOppositeGridDirection(a: GridDirection, b: GridDirection): boolean`.
- Produces: `RunState.heading: GridDirection` and `RunState.pendingDirection: GridDirection | null`.
- Produces: `queueDirection(state: RunState, direction: GridDirection): RunState`.
- Consumes: existing `advanceGridStep(cell, direction, config)` from `src/game/grid-topology.ts`.

- [ ] **Step 1: Write failing V4 strategic-authority tests**

Add tests asserting:

```ts
const run = startRun(createRun(stableRng));
expect(run.heading).toBe('+Z');
expect(run.pendingDirection).toBeNull();
```

Cover all six directions from a center cell, direct reversal rejection, repeated current heading, newest valid pending direction, and the Review Focus case where an invalid opposite command does not erase an already valid pending command.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- tests/unit/v4-board-space.test.ts tests/unit/grid-authority-boundary.test.ts`

Expected: FAIL because `heading`, `pendingDirection`, `queueDirection` and opposite-direction helpers do not exist and the authority-boundary test still requires `GridFrame`/`pendingTurn`.

- [ ] **Step 3: Implement absolute direction authority**

In `grid-direction.ts`, add the exact opposite mapping and helpers. In `run-state.ts`, initialize `heading: '+Z'`, store `pendingDirection: null`, reject only `oppositeGridDirection(state.heading)`, allow same-direction input, and replace pending direction only when the incoming command is valid against the committed heading. At each `stepRun`, consume/clear one pending direction, commit it to `heading`, then call `advanceGridStep(snakeHead(...).cell, state.heading, config)` before existing collision/food/growth logic.

Do not alter fixed-step clock, topology, collision ordering, food semantics or scoring.

- [ ] **Step 4: Update the active-authority boundary contract**

Change `grid-authority-boundary.test.ts` so active V4 runtime explicitly requires `heading`, `pendingDirection`, `queueDirection`, and `advanceGridStep`, while forbidding strategic `GridFrame`, `TurnIntent`, `pendingTurn`, `queueTurn`, `advanceGridMovement` and render/Three.js imports from `run-state.ts`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm test -- tests/unit/v4-board-space.test.ts tests/unit/grid-authority-boundary.test.ts tests/unit/collision.test.ts tests/unit/food.test.ts tests/unit/snake-grid.test.ts tests/unit/grid-topology.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/grid-types.ts src/game/grid-direction.ts src/game/run-state.ts tests/unit/v4-board-space.test.ts tests/unit/grid-authority-boundary.test.ts
git commit -m "feat: add V4 absolute heading authority"
```

---

### Task 2: Map Desktop Keyboard Directly to Six World Directions

**Files:**
- Modify: `src/input/keyboard.ts`
- Modify: `tests/unit/keyboard.test.ts`

**Interfaces:**
- Consumes: `GridDirection` from Task 1.
- Produces: `KeyboardInputOptions.onDirection?: (direction: GridDirection) => void`.
- Removes: `onTurnIntent` and `onCameraToggle` from active V4 keyboard API.

- [ ] **Step 1: Rewrite keyboard tests to the V4 mapping**

Use table assertions for:

```text
ArrowUp/W    +Y
ArrowDown/S  -Y
ArrowLeft/A  -X
ArrowRight/D +X
Q            +Z
E            -Z
```

Keep edge-trigger tests: three `handleKeyDown` calls without `handleKeyUp` emit once; a release or blur re-arms the key. Add a test that `X` is unrelated and emits nothing.

- [ ] **Step 2: Run keyboard tests and verify RED**

Run: `npm test -- tests/unit/keyboard.test.ts`

Expected: FAIL on absolute directions, Q/E and removal of camera-toggle behavior.

- [ ] **Step 3: Implement `KeyboardInput` world-direction events**

Change `turnForKey` to `directionForKey(key: string): GridDirection | null`; rename callback to `onDirection`; preserve the existing physical-key `pressed` set and event `preventDefault()` behavior only for actual movement keys.

- [ ] **Step 4: Run keyboard tests and verify GREEN**

Run: `npm test -- tests/unit/keyboard.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/input/keyboard.ts tests/unit/keyboard.test.ts
git commit -m "feat: map keyboard to V4 world directions"
```

---

### Task 3: Replace the Analog Joystick with Six Discrete Mobile Controls

**Files:**
- Create: `src/input/direction-pad.ts`
- Create: `tests/unit/direction-pad.test.ts`

**Interfaces:**
- Consumes: `GridDirection` from Task 1.
- Produces: `createDirectionPad(onDirection: (direction: GridDirection) => void): HTMLElement`.
- DOM contract: root carries `data-direction-pad`; six buttons carry `data-world-direction` with exact values `+X/-X/+Y/-Y/+Z/-Z`.

- [ ] **Step 1: Write failing direction-pad tests**

Using jsdom, assert the factory creates exactly six buttons; their directions are unique and exhaustive; one `pointerdown` on one button calls `onDirection` exactly once with that button's `GridDirection`; movement of a held pointer does not synthesize another direction.

Also assert the visible text/ARIA contract distinguishes the depth controls as `FRENTE` (`+Z`) and `FUNDO` (`-Z`).

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- tests/unit/direction-pad.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the direction-pad component**

Create a DOM component with four cardinal buttons (`↑`, `↓`, `←`, `→`) plus the dedicated `FRENTE` and `FUNDO` buttons. Emit from `pointerdown`, call `preventDefault()`, and do not maintain analog position, sectors, deadzones or hysteresis.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- tests/unit/direction-pad.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/input/direction-pad.ts tests/unit/direction-pad.test.ts
git commit -m "feat: add six-direction mobile controls"
```

---

### Task 4: Introduce the Fixed Whole-Cube Board Camera

**Files:**
- Create: `src/render/board-camera.ts`
- Create: `tests/unit/board-camera.test.ts`
- Modify: `tests/unit/camera-zoom.test.ts`

**Interfaces:**
- Produces constants: `BOARD_CAMERA_FOV = 60`, `BOARD_CAMERA_FRAMING_MARGIN = 1.10`, `CAMERA_ZOOM_MIN = 0.65`, `CAMERA_ZOOM_MAX = 5`, `CAMERA_ZOOM_DEFAULT = 1`.
- Produces: `computeBoardCameraDistance(config: GridConfig, aspect: number, fovDegrees?: number): number`.
- Produces: `BoardCameraController` with `zoomFactor`, `setZoomFactor(factor: number): void`, and `apply(aspect?: number): CameraPose`.
- `CameraPose` target is always `{x:0,y:0,z:0}`; normalized position direction is always the approved ray.

- [ ] **Step 1: Write failing board-camera geometry tests**

Assert:

- position ray normalized from `(0.65, 0.55, 1.0)` is invariant at aspect `16/9`, `9/16` and `1`;
- `computeBoardCameraDistance` uses `cubeRadius = sqrt(3) * worldSize / 2`, limiting vertical/horizontal half-FOV and margin `1.10`;
- default zoom contains the cube bounding sphere for desktop and portrait aspects;
- zoom clamps to `0.65..5` and scales only scalar distance;
- repeated `apply()` calls at unchanged aspect/zoom return exactly the same pose;
- resize/aspect changes may alter distance but not the normalized ray or target.

- [ ] **Step 2: Run board-camera tests and verify RED**

Run: `npm test -- tests/unit/board-camera.test.ts tests/unit/camera-zoom.test.ts`

Expected: FAIL because `board-camera.ts` does not exist and zoom tests still target chase/overview cameras.

- [ ] **Step 3: Implement the board camera**

Normalize the approved ray once. Compute vertical half-FOV from 60°, horizontal half-FOV with `atan(tan(verticalHalfFov) * aspect)`, use the smaller half-FOV, compute sphere-fit distance and multiply by `1.10 * zoomFactor`. Apply `camera.up.set(0,1,0)`, position on the fixed ray, and `lookAt(0,0,0)`.

Reject non-finite/non-positive aspect and zoom input with `RangeError`; retain zoom clamp behavior after validation.

- [ ] **Step 4: Migrate camera-zoom unit tests**

Replace all chase/overview assertions with board-camera assertions. No test may measure distance from the snake head; distance is from cube center.

- [ ] **Step 5: Run camera tests and verify GREEN**

Run: `npm test -- tests/unit/board-camera.test.ts tests/unit/camera-zoom.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/render/board-camera.ts tests/unit/board-camera.test.ts tests/unit/camera-zoom.test.ts
git commit -m "feat: add fixed whole-cube board camera"
```

---

### Task 5: Derive Head Orientation from `heading` Only

**Files:**
- Modify: `src/render/pixel-snake-presentation.ts`
- Modify: `tests/unit/pixel-snake-presentation.test.ts`
- Modify: `tests/unit/v3-lattice.test.ts` (rename V4 descriptions/authority expectations, preserving lattice assertions)

**Interfaces:**
- Consumes: `RunState.heading` from Task 1.
- Produces: `quaternionForHeading(heading: GridDirection)`.
- `buildPixelSnakeRenderSnapshot` consumes `Pick<RunState, 'snake' | 'heading' | 'config'>`.

- [ ] **Step 1: Write failing canonical-up presentation tests**

For each heading, rotate model-local forward `(0,0,1)` and local up `(0,1,0)` through the returned quaternion and assert:

```text
+Z -> forward +Z, up +Y
-Z -> forward -Z, up +Y
+X -> forward +X, up +Y
-X -> forward -X, up +Y
+Y -> forward +Y, up -Z
-Y -> forward -Y, up +Z
```

Also retain exact `cellToWorld` body/head position and stable segment-ID assertions.

- [ ] **Step 2: Run presentation tests and verify RED**

Run: `npm test -- tests/unit/pixel-snake-presentation.test.ts tests/unit/v3-lattice.test.ts`

Expected: FAIL because presentation still requires `GridFrame`.

- [ ] **Step 3: Implement heading-only quaternion derivation**

Use `directionVector(heading)` for forward, select canonical up from the table, compute `right = cross(forward, up)`, preserve the current model-basis convention (`localXWorld = -right`, `localYWorld = up`, `localZWorld = forward`), build and normalize the quaternion.

- [ ] **Step 4: Run presentation tests and verify GREEN**

Run: `npm test -- tests/unit/pixel-snake-presentation.test.ts tests/unit/v3-lattice.test.ts tests/unit/voxel-renderer.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render/pixel-snake-presentation.ts tests/unit/pixel-snake-presentation.test.ts tests/unit/v3-lattice.test.ts
git commit -m "feat: orient V4 snake head from heading"
```

---

### Task 6: Integrate Board-Space Input and Camera into the Browser Runtime

**Files:**
- Modify: `src/main.ts`
- Modify: `src/styles.css`
- Modify: `tests/e2e/game.spec.ts`
- Create: `tests/e2e/v4-core.spec.ts`
- Modify: `tests/e2e/camera-zoom.spec.ts`

**Interfaces:**
- Consumes: `queueDirection`, `KeyboardInput.onDirection`, `createDirectionPad`, `BoardCameraController`.
- Telemetry produces: `data-head-direction`, `data-pending-direction`, `data-camera-mode="board"`, `data-camera-zoom-factor`.
- Removes active telemetry/control contracts: `data-head-up`, `data-pending-turn`, `data-joystick-sector`, `data-camera-toggle`, chase/overview switching.

- [ ] **Step 1: Write failing E2E contracts before runtime rewiring**

Create `v4-core.spec.ts` from the deterministic structure of `v3-core.spec.ts`, but assert absolute commands. Required cases:

- `D` moves exactly `+X`; `A` moves `-X`; `W` moves `+Y`; `S` moves `-Y`; `Q` moves `+Z`; `E` moves `-Z` whenever not direct reversal.
- direct reversal is ignored.
- newest valid pre-step command wins.
- catch-up consumes the pending command on the first owed step and continues the committed heading for later owed steps.
- repeated toroidal wrap on X, Y and Z never changes camera position at constant zoom/aspect.
- each committed step remains one toroidally face-adjacent cell.

Update `game.spec.ts` to require `data-camera-mode="board"`, absence of the camera-toggle element, and visibility/operation of six mobile direction buttons. Update `camera-zoom.spec.ts` to measure camera distance from origin, not from head, and assert pinch leaves `data-pending-direction="none"`.

- [ ] **Step 2: Run selected E2E tests and verify RED**

Run: `npx playwright test tests/e2e/v4-core.spec.ts tests/e2e/game.spec.ts tests/e2e/camera-zoom.spec.ts --project=desktop-chromium`

Expected: FAIL because current runtime still exposes local turns/chase camera.

- [ ] **Step 3: Rewire strategic input in `main.ts`**

Replace `queueTurn` callbacks with `queueDirection`. Instantiate keyboard with `onDirection`. Create and append one direction-pad component whose callback uses the same `queueDirection` path.

- [ ] **Step 4: Rewire camera lifecycle**

Instantiate `BoardCameraController(scene.camera)`. Set `data-camera-mode="board"` once. Apply the board camera on run initialization, after `scene.resize`, after orientation/resize, and after zoom changes. Do not update camera pose inside the animation frame based on `RunState`.

Keep the existing wheel multiplier and pinch distance-ratio behavior; both now call `setZoomFactor` then `apply(scene.camera.aspect)`. Pinch listeners stay on the canvas, separate from mobile direction buttons.

- [ ] **Step 5: Replace mobile DOM/CSS and telemetry**

Remove joystick shell/knob and `X CAMERA` button. Add responsive `.direction-pad` styles shown on mobile/coarse-pointer layouts only, with four planar controls plus two depth controls. Update diagnostics to `run.heading` and `run.pendingDirection ?? 'none'`. Remove per-frame joystick visual updates and joystick reset lifecycle; touch reset now only clears camera pinch pointer state.

- [ ] **Step 6: Update E2E harness**

Keep deterministic `setManualClock`, `consumeFrame`, `setFoodCell`, `getCameraPosition`, `forceGameOver`. Rename V3 harness types/descriptions to V4. No harness method may set or derive movement from render orientation.

- [ ] **Step 7: Run desktop and mobile E2E subsets**

Run: `npx playwright test tests/e2e/v4-core.spec.ts tests/e2e/game.spec.ts tests/e2e/camera-zoom.spec.ts`

Expected: PASS across configured desktop/mobile projects, including orientation change, whole-cube board mode and pinch/input separation.

- [ ] **Step 8: Commit**

```bash
git add src/main.ts src/styles.css tests/e2e/v4-core.spec.ts tests/e2e/game.spec.ts tests/e2e/camera-zoom.spec.ts
git commit -m "feat: integrate V4 board-space runtime"
```

---

### Task 7: Move Ruleset and Local Persistence to V4

**Files:**
- Modify: `src/game/grid-config.ts`
- Modify: `src/app/identity.ts`
- Modify: `src/app/app-controller.ts`
- Modify: `tests/unit/grid-config.test.ts`
- Modify: `tests/unit/v3-persistence.test.ts`
- Create: `tests/unit/v4-persistence.test.ts`
- Modify: `tests/e2e/ranked.spec.ts`

**Interfaces:**
- Produces: `RULESET_ID = 'snek-core-v4'`.
- Produces: `V4_LOCAL_BEST_KEY = 'snek.localBest.coreV4'`.
- Produces: `loadSnekCoreV4Best(storage)` and `saveSnekCoreV4Best(storage, score)`.
- AppController consumes V4 load/save functions only for current gameplay.

- [ ] **Step 1: Write failing V4 persistence/ruleset tests**

Assert current `RULESET_ID` is V4; saving/loading V4 touches only `snek.localBest.coreV4`; prepopulate every historical best including V3 and assert bytes are unchanged; V4 begins at 0 even when V3 has a higher value.

Keep `v3-persistence.test.ts` as a historical-storage contract only; remove its assertion that the current `RULESET_ID` is V3.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- tests/unit/grid-config.test.ts tests/unit/v3-persistence.test.ts tests/unit/v4-persistence.test.ts`

Expected: FAIL because V4 key/functions/ruleset do not exist.

- [ ] **Step 3: Implement identity/ruleset migration**

Change only `RULESET_ID`; leave resolution/cell size/cadence/growth unchanged. Add V4 persistence functions without deleting V3 functions. Switch AppController initial local best and completed/game-over save paths to V4.

HTTP ranking gateway remains unsupported for V4 because it returns false for all current rulesets; do not change backend transport or Worker validation in this task.

- [ ] **Step 4: Update ranked E2E contract**

Change test ruleset literal and descriptions to `snek-core-v4`; confirm HTTP-configured frontend stays local-first and sends no ranking API calls because V4 is unsupported by historical HTTP ranking.

- [ ] **Step 5: Run persistence/ranked tests and verify GREEN**

Run: `npm test -- tests/unit/grid-config.test.ts tests/unit/v3-persistence.test.ts tests/unit/v4-persistence.test.ts tests/unit/http-session-gateway.test.ts`

Then: `npx playwright test tests/e2e/ranked.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/grid-config.ts src/app/identity.ts src/app/app-controller.ts tests/unit/grid-config.test.ts tests/unit/v3-persistence.test.ts tests/unit/v4-persistence.test.ts tests/e2e/ranked.spec.ts
git commit -m "feat: separate SNEK CORE V4 ruleset persistence"
```

---

### Task 8: Remove Retired V3 Local-Steering and Chase-Camera Authority

**Files:**
- Delete: `src/game/grid-frame.ts`
- Delete: `src/game/grid-movement.ts`
- Delete: `src/input/joystick.ts`
- Delete: `src/render/chase-camera.ts`
- Delete: `src/render/overview-camera.ts`
- Delete: `src/render/pixel-camera-presentation.ts`
- Delete obsolete tests: `tests/unit/grid-frame.test.ts`, `tests/unit/grid-movement.test.ts`, `tests/unit/joystick.test.ts`, `tests/unit/chase-camera.test.ts`, `tests/unit/compact-arena-overview.test.ts`, `tests/unit/pixel-camera-presentation.test.ts`
- Delete: `tests/e2e/v3-core.spec.ts`
- Modify: `tests/unit/grid-authority-boundary.test.ts`
- Modify: `tests/unit/simulation-step.test.ts`

**Interfaces:**
- Active V4 runtime is limited to `heading`, absolute inputs, `board-camera`, grid topology and cell-based render presentation.

- [ ] **Step 1: Strengthen authority-boundary tests before deletion**

Set the active V4 runtime file list to:

```text
main.ts
game/run-state.ts
input/keyboard.ts
input/direction-pad.ts
render/board-camera.ts
render/pixel-snake-presentation.ts
render/snake-renderer.ts
render/food-renderer.ts
```

Assert these files contain no `GridFrame`, `TurnIntent`, `queueTurn`, `pendingTurn`, `JoystickInput`, `ChaseCamera`, `wrapRebase`, `applyOverviewCamera`, or `buildPixelChaseCameraSnapshot` authority. Assert `pixel-snake-presentation.ts` reads `run.heading` and not `run.frame`.

- [ ] **Step 2: Update cadence test labels without changing cadence**

Rename V3 descriptions in `simulation-step.test.ts` to V4 and continue asserting exactly six strategic cell steps per second and deterministic bounded catch-up.

- [ ] **Step 3: Delete retired modules/tests**

Delete the files listed above. Do not delete unrelated historical continuous-flight modules unless they are separately proven dead; the boundary test only needs them unreachable from active V4 runtime.

- [ ] **Step 4: Run the entire unit suite**

Run: `npm test`

Expected: all Vitest tests PASS with no imports of deleted modules.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`

Expected: PASS with no `GridFrame`/`TurnIntent` references in active V4 code.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove retired V3 steering and chase camera"
```

---

### Task 9: Full Release-Candidate Verification and Human Gate

**Files:**
- No planned product-code changes. Any failure discovered here must be handled through systematic debugging and a new focused TDD cycle before repeating this task.

**Interfaces:**
- Produces one exact candidate SHA whose test evidence is attached to the release gate.

- [ ] **Step 1: Verify dependency and unit test gates**

Run:

```bash
npm audit --omit=dev --audit-level=high
npm test
npm run test:worker
```

Expected: all PASS / no blocking production vulnerability.

- [ ] **Step 2: Verify compile and production configuration**

Run:

```bash
npm run typecheck
npm test -- tests/unit/production-config.test.ts tests/unit/deploy-production.test.ts tests/unit/pages-deploy-contract.test.ts
npm run worker:build
npm run build
```

Expected: all PASS.

- [ ] **Step 3: Verify complete browser behavior**

Run: `npm run test:e2e`

Expected: all configured Playwright projects PASS, including desktop absolute six-axis control, mobile six-button control, wrap camera invariance, wheel/pinch zoom, resize/orientation and V4 local-first ranking behavior.

- [ ] **Step 4: Inspect exact release diff**

Compare implementation branch against `main@c794973d6b64a31a1c8879e7170633a0528015f2`. Confirm no changes to grid resolution, `cellSize`, `stepsPerSecond`, `initialLength`, `growthPerFood`, collision, food algorithm, completion target or scoring other than V4 identity/persistence names.

- [ ] **Step 5: Create a draft PR and record evidence**

PR body must include:

- approved spec path;
- this R1 plan path;
- base SHA;
- exact candidate SHA;
- TDD RED/GREEN evidence per major task;
- full verification results;
- explicit statement that `main` has not changed.

- [ ] **Step 6: Stop at human acceptance gate**

Do not merge. Provide the draft PR/candidate for gameplay test. Merge only after explicit human acceptance of the exact candidate SHA.

---

## Self-Review Result

- **Spec coverage:** ruleset, movement authority, six keyboard directions, six mobile controls, fixed oblique camera, whole-cube fit, manual zoom, heading-only render orientation, toroidal invariance, 6 Hz determinism, persistence separation, telemetry, cleanup and release verification are each owned by a task.
- **Type consistency:** Tasks 2/3/5/6 all consume the same `GridDirection`; runtime consumes `queueDirection`; camera API has no `RunState` input, structurally preventing head/wrap coupling.
- **Review Focus coverage:** opposite/pending race is Task 1; aspect extremes are Task 4/6; X/Y/Z wrap invariance is Task 6; mobile multi-touch separation is Task 3/6; held keyboard edges are Task 2.
- **Migration safety:** V3 persistence remains preserved while active V3 steering/camera modules are removed only after V4 runtime integration and tests are green.
- **Proportion:** implementation decisions are pinned at interface/test level; bodies are left to the implementer except the camera-fit formula and orientation rules already fixed by the approved spec.
