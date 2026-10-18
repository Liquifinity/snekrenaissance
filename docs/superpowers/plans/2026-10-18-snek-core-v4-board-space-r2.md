# SNEK CORE V4 Board-Space Absolute Control Implementation Plan R2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace snake-relative steering and chase-camera authority with deterministic six-axis board-space controls and one fixed oblique cube camera, while preserving toroidal topology, 6 Hz strategic movement, collision, food, growth, scoring and completion semantics.

**Architecture:** V4 makes `GridDirection` the active strategic authority through `RunState.heading` and `RunState.pendingDirection`. The migration is deliberately staged: legacy `GridFrame`/`TurnIntent` type definitions remain temporarily available until their old modules are removed, but V4 runtime stops consuming them immediately. A new board camera is fixed to cube center and changes only for viewport fit or manual zoom. Desktop and mobile both emit the same six absolute `GridDirection` values; head render orientation is derived from `heading` only.

**Tech Stack:** TypeScript 5.8, Three.js 0.180, Vitest 3.2, Playwright 1.55, Vite 7, Wrangler 4.150.

**Spec:** `docs/superpowers/specs/2026-10-18-snek-core-v4-board-space-design.md`

**Supersedes:** `docs/superpowers/plans/2026-10-18-snek-core-v4-board-space-r1.md`. R2 is the canonical execution plan; R1 must not be executed.

## Global Constraints

- Base authority: `main@c794973d6b64a31a1c8879e7170633a0528015f2` plus approved V4 spec/plan documentation.
- Ruleset: `snek-core-v4`.
- Local-best key: `snek.localBest.coreV4`; historical keys remain untouched and are not migrated.
- Strategic cadence: exactly `6 Hz`.
- Initial heading: `+Z`.
- Directions: exactly `+X | -X | +Y | -Y | +Z | -Z`.
- Reject only the direct opposite of committed `heading`; repeated current heading is legal.
- Newest valid command before the next strategic step wins.
- Keyboard: `W/↑ +Y`, `S/↓ -Y`, `A/← -X`, `D/→ +X`, `Q +Z`, `E -Z`.
- Mobile: six discrete controls mapped to the same six directions; no analog steering.
- Camera position ray: `normalize(0.65, 0.55, 1.0)` from cube center; target `(0,0,0)`; up reference `+Y`.
- Camera FOV `60°`; framing margin `1.10`; zoom clamp `0.65..5`; default `1`.
- Camera never consumes snake head position, heading, wrap state or render orientation.
- Toroidal wrap never moves/rebases/smooths/zooms the camera.
- Grid resolution, `cellSize`, initial length, growth, collision, food, score and completion semantics remain unchanged.
- No new runtime dependency.

## Review Focus

1. Opposite input is validated against committed `heading`, not a pending direction; invalid input must not erase an already-valid pending command.
2. Very narrow portrait/wide landscape resize recomputes whole-cube distance without changing camera ray or stored zoom.
3. X/Y/Z wraps at fixed zoom/aspect leave camera pose invariant.
4. Mobile direction `pointerdown` emits one command while two-finger canvas pinch emits zero commands.
5. Held desktop keys do not repeat strategic input; keyup/blur re-arms the edge.

---

### Task 1: Establish Absolute Strategic Heading Authority

**Files:**
- Modify: `src/game/grid-direction.ts`
- Modify: `src/game/run-state.ts`
- Create: `tests/unit/v4-board-space.test.ts`
- Modify: `tests/unit/grid-authority-boundary.test.ts`

**Interfaces:**
- Produce `oppositeGridDirection(direction: GridDirection): GridDirection`.
- Produce `isOppositeGridDirection(a: GridDirection, b: GridDirection): boolean`.
- Produce `RunState.heading: GridDirection`.
- Produce `RunState.pendingDirection: GridDirection | null`.
- Produce `queueDirection(state: RunState, direction: GridDirection): RunState`.
- Consume existing `advanceGridStep(cell, direction, config)`.
- Temporary compatibility: do **not** remove `GridFrame`, `TurnIntent`, `grid-frame.ts` or `grid-movement.ts` in this task; they remain compilable but become unreachable from active V4 runtime.

- [ ] Write RED tests covering initial `+Z`, all six face-adjacent directions, direct reversal rejection, same-heading acceptance, newest-valid-pending wins, and invalid-opposite-does-not-erase-valid-pending.
- [ ] Run `npm test -- tests/unit/v4-board-space.test.ts tests/unit/grid-authority-boundary.test.ts`; verify RED for missing V4 authority.
- [ ] Add opposite helpers to `grid-direction.ts`.
- [ ] Replace `RunState.frame/pendingTurn` with `heading/pendingDirection` in active `run-state.ts`; `queueDirection` validates against committed heading; `stepRun` clears one pending direction, commits it, then calls `advanceGridStep` directly before unchanged collision/food/growth logic.
- [ ] Update authority-boundary tests to require `heading`, `pendingDirection`, `queueDirection`, `advanceGridStep` and forbid active `GridFrame`, `pendingTurn`, `queueTurn`, `advanceGridMovement` usage in `run-state.ts`.
- [ ] Run `npm test -- tests/unit/v4-board-space.test.ts tests/unit/grid-authority-boundary.test.ts tests/unit/collision.test.ts tests/unit/food.test.ts tests/unit/snake-grid.test.ts tests/unit/grid-topology.test.ts`; verify GREEN.
- [ ] Commit: `feat: add V4 absolute heading authority`.

---

### Task 2: Convert Keyboard to Six Absolute Directions

**Files:**
- Modify: `src/input/keyboard.ts`
- Modify: `tests/unit/keyboard.test.ts`

**Interfaces:**
- Consume `GridDirection`.
- Produce `KeyboardInputOptions.onDirection?: (direction: GridDirection) => void`.
- Remove active `onTurnIntent` and `onCameraToggle` semantics.

- [ ] Rewrite keyboard tests for the exact W/S/A/D/Q/E + arrow mapping, edge-trigger behavior, blur re-arm, newer different key before release, and `X` ignored.
- [ ] Run `npm test -- tests/unit/keyboard.test.ts`; verify RED.
- [ ] Implement `directionForKey(key): GridDirection | null`, preserving the existing pressed-key edge set and `preventDefault` only for movement keys.
- [ ] Run the focused test; verify GREEN.
- [ ] Commit: `feat: map keyboard to V4 world directions`.

---

### Task 3: Add Six Discrete Mobile Direction Controls

**Files:**
- Create: `src/input/direction-pad.ts`
- Create: `tests/unit/direction-pad.test.ts`

**Interfaces:**
- Produce `createDirectionPad(onDirection: (direction: GridDirection) => void): HTMLElement`.
- Root: `data-direction-pad`.
- Six buttons: `data-world-direction="+X|-X|+Y|-Y|+Z|-Z"`.
- Depth labels: `FRENTE` = `+Z`, `FUNDO` = `-Z`.

- [ ] Write jsdom RED tests: exactly six unique directions, one `pointerdown` = one callback, pointer movement does not synthesize another command, depth labels are distinguishable.
- [ ] Run `npm test -- tests/unit/direction-pad.test.ts`; verify RED.
- [ ] Implement the component with cardinal arrows plus FRENTE/FUNDO; use `pointerdown`, `preventDefault`, no analog state/deadzone/hysteresis.
- [ ] Run focused test; verify GREEN.
- [ ] Commit: `feat: add six-direction mobile controls`.

---

### Task 4: Build the Fixed Whole-Cube Board Camera

**Files:**
- Create: `src/render/board-camera.ts`
- Create: `tests/unit/board-camera.test.ts`
- Modify: `tests/unit/camera-zoom.test.ts`

**Interfaces:**
- Constants: `BOARD_CAMERA_FOV = 60`, `BOARD_CAMERA_FRAMING_MARGIN = 1.10`, zoom min/max/default `0.65/5/1`.
- Produce `computeBoardCameraDistance(config: GridConfig, aspect: number, fovDegrees?: number): number`.
- Produce `BoardCameraController` with `zoomFactor`, `setZoomFactor(factor)`, `apply(aspect?)`.
- Returned target always origin; normalized position direction always approved ray.

- [ ] Write RED tests for ray invariance at 16:9, 9:16 and 1:1; bounding-sphere fit; margin 1.10; zoom clamp; repeated apply invariance; resize changes only scalar distance.
- [ ] Run `npm test -- tests/unit/board-camera.test.ts tests/unit/camera-zoom.test.ts`; verify RED.
- [ ] Implement vertical half-FOV, horizontal half-FOV `atan(tan(vHalf)*aspect)`, limiting half-FOV, `cubeRadius = sqrt(3)*worldSize/2`, base distance `cubeRadius/sin(limitHalfFov)*1.10`, then multiply by zoom.
- [ ] Apply camera up `(0,1,0)`, fixed-ray position and `lookAt(0,0,0)`; reject invalid aspect/zoom input before clamping zoom.
- [ ] Rewrite zoom unit tests to measure distance from cube center only; no head/chase/overview assertions.
- [ ] Run focused camera tests; verify GREEN.
- [ ] Commit: `feat: add fixed whole-cube board camera`.

---

### Task 5: Derive Snake-Head Presentation from `heading`

**Files:**
- Modify: `src/render/pixel-snake-presentation.ts`
- Modify: `tests/unit/pixel-snake-presentation.test.ts`
- Modify: `tests/unit/v3-lattice.test.ts`

**Interfaces:**
- Produce `quaternionForHeading(heading: GridDirection)`.
- `buildPixelSnakeRenderSnapshot` consumes `snake + heading + config`, not `frame`.

- [ ] Write RED quaternion tests for canonical up: `±X/±Z -> +Y`, `+Y -> -Z`, `-Y -> +Z`; verify local forward maps to all six headings.
- [ ] Preserve exact `cellToWorld` position and stable segment-ID assertions; rename V3 descriptions in lattice tests to V4 where they describe current runtime.
- [ ] Run `npm test -- tests/unit/pixel-snake-presentation.test.ts tests/unit/v3-lattice.test.ts`; verify RED.
- [ ] Implement quaternion basis from `forward=heading`, canonical up, `right=cross(forward,up)`, preserving model convention `localX=-right`, `localY=up`, `localZ=forward`.
- [ ] Run `npm test -- tests/unit/pixel-snake-presentation.test.ts tests/unit/v3-lattice.test.ts tests/unit/voxel-renderer.test.ts`; verify GREEN.
- [ ] Commit: `feat: orient V4 snake head from heading`.

---

### Task 6: Integrate Board-Space Runtime, Mobile UI and Camera Invariance

**Files:**
- Modify: `src/main.ts`
- Modify: `src/styles.css`
- Create: `tests/e2e/v4-core.spec.ts`
- Modify: `tests/e2e/game.spec.ts`
- Modify: `tests/e2e/camera-zoom.spec.ts`

**Interfaces:**
- Consume `queueDirection`, `KeyboardInput.onDirection`, `createDirectionPad`, `BoardCameraController`.
- Telemetry: `data-head-direction`, `data-pending-direction`, `data-camera-mode="board"`, `data-camera-zoom-factor`.
- Remove active `data-head-up`, `data-pending-turn`, joystick-sector and camera-toggle contracts.

- [ ] Create RED `v4-core.spec.ts` proving absolute six-axis commands, reversal rejection, newest valid pre-step wins, catch-up behavior, face-adjacent lattice movement, and camera invariance across repeated X/Y/Z wraps.
- [ ] Rewrite `game.spec.ts` expectations to one board camera, no X CAMERA button, and six mobile direction buttons.
- [ ] Rewrite `camera-zoom.spec.ts` to measure camera distance from origin and prove pinch emits no pending direction.
- [ ] Run the three E2E specs on desktop; verify RED against V3 runtime.
- [ ] Rewire `main.ts`: all keyboard/pad input goes through `queueDirection`; instantiate direction pad; remove joystick/camera toggle and camera modes.
- [ ] Apply board camera only on initialization, zoom change, resize and orientation change. Never update camera from `RunState` inside the render loop.
- [ ] Preserve wheel multiplier and pinch distance-ratio behavior; pinch remains canvas-only; direction buttons remain separate DOM surface.
- [ ] Replace joystick CSS with responsive direction-pad layout shown on mobile/coarse pointer only.
- [ ] Update telemetry/E2E harness to heading/pending direction; retain deterministic clock, food placement, camera position and forced game-over hooks.
- [ ] Run `npx playwright test tests/e2e/v4-core.spec.ts tests/e2e/game.spec.ts tests/e2e/camera-zoom.spec.ts`; verify GREEN across configured desktop/mobile projects.
- [ ] Commit: `feat: integrate V4 board-space runtime`.

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
- `RULESET_ID = 'snek-core-v4'`.
- `V4_LOCAL_BEST_KEY = 'snek.localBest.coreV4'`.
- `loadSnekCoreV4Best(storage)` / `saveSnekCoreV4Best(storage, score)`.

- [ ] Write RED persistence tests: V4 isolated from all historical keys; existing V3 value does not seed V4; all historical strings remain byte-for-byte unchanged.
- [ ] Convert `v3-persistence.test.ts` to historical-key preservation only; it must no longer claim current RULESET_ID is V3.
- [ ] Run focused persistence/config tests; verify RED.
- [ ] Change only ruleset identity in config; add V4 identity functions; switch AppController current best load/save to V4. Do not modify grid balance or HTTP/Worker validation.
- [ ] Update ranked E2E ruleset literal/descriptions to V4 and preserve local-first behavior because current HTTP gateway supports no versioned ruleset.
- [ ] Run unit persistence/config/http tests and `npx playwright test tests/e2e/ranked.spec.ts`; verify GREEN.
- [ ] Commit: `feat: separate SNEK CORE V4 ruleset persistence`.

---

### Task 8: Remove Retired V3 Authority Without Breaking Intermediate Commits

**Files:**
- Delete: `src/game/grid-frame.ts`
- Delete: `src/game/grid-movement.ts`
- Delete: `src/input/joystick.ts`
- Delete: `src/render/chase-camera.ts`
- Delete: `src/render/overview-camera.ts`
- Delete: `src/render/pixel-camera-presentation.ts`
- Modify: `src/game/grid-types.ts` — only now remove `TurnIntent` and `GridFrame` definitions.
- Delete tests: `grid-frame.test.ts`, `grid-movement.test.ts`, `joystick.test.ts`, `chase-camera.test.ts`, `compact-arena-overview.test.ts`, `pixel-camera-presentation.test.ts`.
- Delete: `tests/e2e/v3-core.spec.ts`.
- Modify: `tests/unit/grid-authority-boundary.test.ts`.
- Modify: `tests/unit/simulation-step.test.ts`.

**Interfaces:**
- Active runtime after this task contains no local-turn or chase-camera compatibility API.

- [ ] Strengthen authority-boundary RED/cleanup contract: active runtime file list is `main.ts`, `game/run-state.ts`, `input/keyboard.ts`, `input/direction-pad.ts`, `render/board-camera.ts`, `render/pixel-snake-presentation.ts`, `render/snake-renderer.ts`, `render/food-renderer.ts`; forbid `GridFrame`, `TurnIntent`, `queueTurn`, `pendingTurn`, `JoystickInput`, `ChaseCamera`, `wrapRebase`, `applyOverviewCamera`, `buildPixelChaseCameraSnapshot` in that active set.
- [ ] Rename simulation-step V3 labels to V4 while retaining exactly six strategic steps/sec and deterministic catch-up assertions.
- [ ] Delete retired modules/tests and old V3 E2E spec.
- [ ] Remove `TurnIntent` and `GridFrame` from `grid-types.ts` only after their production/test consumers are deleted.
- [ ] Do not delete unrelated historical continuous-flight modules unless separately proven dead; keep them unreachable from active V4 runtime.
- [ ] Run `npm test`; verify full Vitest GREEN.
- [ ] Run `npm run typecheck`; verify GREEN and no deleted-module imports.
- [ ] Commit: `refactor: remove retired V3 steering and chase camera`.

---

### Task 9: Full Release-Candidate Verification and Human Gate

**Files:** No planned product changes. Failures trigger systematic debugging plus a new focused TDD cycle before repeating this task.

**Interfaces:** Produces one exact candidate SHA with reproducible evidence.

- [ ] Run `npm audit --omit=dev --audit-level=high`, `npm test`, `npm run test:worker`; require PASS/no blocking production vulnerability.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test -- tests/unit/production-config.test.ts tests/unit/deploy-production.test.ts tests/unit/pages-deploy-contract.test.ts`.
- [ ] Run `npm run worker:build` and `npm run build`.
- [ ] Run `npm run test:e2e`; require every configured Playwright project GREEN.
- [ ] Compare implementation branch with `main@c794973d6b64a31a1c8879e7170633a0528015f2`; confirm no unintended grid/balance/collision/food/scoring changes.
- [ ] Create a **draft PR** containing approved spec, canonical R2 plan, base SHA, exact candidate SHA, RED/GREEN evidence and full verification evidence.
- [ ] Stop. Do not merge. Human gameplay acceptance of the exact candidate SHA is the release gate.

---

## Self-Review Result

- **Spec coverage:** all 17 spec sections map to Tasks 1–9.
- **Intermediate-build safety:** R2 corrects R1 by retaining legacy `GridFrame`/`TurnIntent` type definitions until Task 8, so earlier commits do not deliberately strand still-present legacy modules with missing types.
- **Type consistency:** keyboard, mobile pad, run state and presentation share `GridDirection`; runtime shares `queueDirection`; board camera has no `RunState` parameter and therefore cannot silently recouple to snake/wrap authority.
- **Review Focus:** opposite/pending race → Task 1; aspect extremes → Task 4/6; X/Y/Z wrap invariance → Task 6; multi-touch separation → Task 3/6; held-key edges → Task 2.
- **Release discipline:** candidate remains isolated in a draft PR until explicit human acceptance.
