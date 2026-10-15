# SNEK RENAISSANCE Core Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a complete single-player browser game that implements the approved meme intro, username flow, continuous flying snake in a toroidal 3D cube, food/growth, self-collision, desktop controls, mobile controls, game-over flow, and local best score, without depending on the leaderboard backend yet.

**Architecture:** Keep simulation deterministic and independent from WebGL. Pure TypeScript modules own toroidal math, orientation, trail sampling, growth, spawn, collision, and run state. Three.js only renders simulation snapshots; keyboard and joystick are input adapters; DOM UI is a thin state-driven shell. Backend integration is deferred to the next implementation plan through explicit gateway interfaces.

**Tech Stack:** TypeScript, Vite, Three.js, Vitest, Playwright, browser-native Pointer Events and DOM APIs.

**Spec:** `docs/superpowers/specs/2026-10-15-snek-renaissance-v1-design.md`

## Global Constraints

- Repository source of truth: `Liquifinity/snekrenaissance`.
- Canonical opening copy must be exactly: `just because ChatGPT` / `didn't complete my image.`
- V1 is single-player.
- Movement is continuous XYZ flight; no logical grid.
- World topology is a cubic 3D torus with wrap on all six faces.
- Walls never cause game over.
- Self-collision is the only gameplay game-over condition.
- Initial body length is `12` segments.
- Each food adds exactly `4` body segments.
- Exactly `1` food item is active at a time.
- Speed is constant in V1; no boost or throttle.
- Desktop controls: `A/←`, `D/→`, `W/↑`, `S/↓`.
- Mobile uses one virtual joystick: X = yaw, Y = pitch.
- Head, body segments, and food remain visually small and close in scale.
- Portrait and landscape mobile layouts must remain playable.
- No account, email, password, React, or large application framework in this plan.
- Product must not present itself as an official OpenAI/ChatGPT product.
- This plan delivers a locally playable/unranked frontend seam; leaderboard persistence and Cloudflare backend are implemented in a later plan.

## Review Focus

1. **Corner/edge wrap:** crossing two or three axes in one update must wrap each axis independently without corrupting direction or trail continuity. Covered in Task 1 tests.
2. **Large frame delta after tab suspension:** a delayed frame must not move the snake through an arbitrarily large distance or destabilize steering. Covered in Task 2 fixed-step/clamp tests.
3. **Nearly saturated spawn space:** food placement must terminate with a deterministic failure result rather than loop forever. Covered in Task 4 tests.
4. **Touch interruption/orientation change:** `pointercancel`, lost pointer, or resize must return joystick input to neutral instead of leaving a stuck turn. Covered in Task 8 tests.
5. **Self-collision across opposite faces:** head/body collision must use toroidal distance, including when visually separated by a cube boundary. Covered in Task 4 tests.

---

## File Structure

```text
index.html
package.json
tsconfig.json
vite.config.ts
vitest.config.ts
playwright.config.ts
src/
├─ main.ts
├─ styles.css
├─ app/
│  ├─ app-controller.ts
│  ├─ app-state.ts
│  ├─ identity.ts
│  └─ session-gateway.ts
├─ game/
│  ├─ constants.ts
│  ├─ types.ts
│  ├─ torus.ts
│  ├─ steering.ts
│  ├─ trail.ts
│  ├─ snake.ts
│  ├─ food.ts
│  ├─ collision.ts
│  ├─ run-state.ts
│  └─ simulation.ts
├─ input/
│  ├─ input-state.ts
│  ├─ keyboard.ts
│  └─ joystick.ts
├─ render/
│  ├─ scene.ts
│  ├─ snake-renderer.ts
│  ├─ food-renderer.ts
│  └─ chase-camera.ts
└─ ui/
   ├─ intro-view.ts
   ├─ username-view.ts
   ├─ hud-view.ts
   ├─ game-over-view.ts
   └─ local-rank-view.ts
tests/
├─ unit/
├─ integration/
└─ e2e/
.github/workflows/ci.yml
```

---

### Task 1: Toolchain + Toroidal World Math

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `src/game/types.ts`
- Create: `src/game/constants.ts`
- Create: `src/game/torus.ts`
- Test: `tests/unit/torus.test.ts`

**Interfaces:**
- Produces: `Vec3`, `WORLD_SIZE`, `wrapScalar(value, size)`, `wrapVec3(position, size)`, `shortestWrappedDelta(a, b, size)`, `toroidalDistanceSq(a, b, size)`.

- [ ] **Step 1: Write failing torus tests**

Test names/assertions must cover:
- scalar wrap at positive and negative faces;
- independent X/Y/Z wrapping;
- simultaneous corner wrap on 2 axes;
- simultaneous corner wrap on 3 axes;
- shortest wrapped delta across opposite faces;
- toroidal squared distance across a boundary.

- [ ] **Step 2: Run unit test and verify RED**

Run: `npm test -- tests/unit/torus.test.ts`
Expected: FAIL because torus functions do not exist.

- [ ] **Step 3: Implement the minimal torus API**

Signatures:

```ts
export type Vec3 = { x: number; y: number; z: number };
export const WORLD_SIZE: number;
export function wrapScalar(value: number, size: number): number;
export function wrapVec3(position: Vec3, size: number): Vec3;
export function shortestWrappedDelta(a: number, b: number, size: number): number;
export function toroidalDistanceSq(a: Vec3, b: Vec3, size: number): number;
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- tests/unit/torus.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json vite.config.ts vitest.config.ts src/game tests/unit/torus.test.ts
git commit -m "feat: add toroidal world math"
```

---

### Task 2: Continuous Steering + Fixed-Step Motion

**Files:**
- Create: `src/game/steering.ts`
- Create: `src/game/simulation.ts`
- Modify: `src/game/constants.ts`
- Test: `tests/unit/steering.test.ts`
- Test: `tests/unit/simulation-step.test.ts`

**Interfaces:**
- Consumes: `Vec3`, torus functions from Task 1.
- Produces: `SteeringInput`, `OrientationState`, `createInitialOrientation()`, `applySteering()`, `forwardVector()`, `advanceHead()`, `FixedStepClock`.

- [ ] **Step 1: Write failing steering tests**

Assertions:
- neutral input preserves orientation;
- left/right produce opposite yaw changes;
- up/down produce opposite pitch changes;
- resulting forward vector remains normalized;
- no player-controlled roll is introduced.

- [ ] **Step 2: Write failing fixed-step tests**

Assertions:
- position advances at constant configured speed;
- wall crossing wraps without changing speed/direction;
- a very large frame delta is clamped/broken into bounded simulation steps rather than applied as one huge movement.

- [ ] **Step 3: Run tests and verify RED**

Run: `npm test -- tests/unit/steering.test.ts tests/unit/simulation-step.test.ts`
Expected: FAIL because steering/simulation APIs do not exist.

- [ ] **Step 4: Implement quaternion-based orientation and fixed-step update**

Use a quaternion-equivalent representation internally. Expose only the interfaces above. Fixed-step accumulator must cap catch-up work to a finite configured maximum so background-tab recovery cannot create an unbounded jump.

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test -- tests/unit/steering.test.ts tests/unit/simulation-step.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/steering.ts src/game/simulation.ts src/game/constants.ts tests/unit/steering.test.ts tests/unit/simulation-step.test.ts
git commit -m "feat: add continuous 3d steering"
```

---

### Task 3: Path-Sampled Snake Body + Growth

**Files:**
- Create: `src/game/trail.ts`
- Create: `src/game/snake.ts`
- Test: `tests/unit/trail.test.ts`
- Test: `tests/unit/snake-growth.test.ts`

**Interfaces:**
- Consumes: unwrapped head positions from Task 2.
- Produces: `TrailBuffer`, `sampleTrailAtDistance()`, `SnakeState`, `createSnakeState()`, `growSnake(state, amount)`, `sampleBodyPositions()`.

- [ ] **Step 1: Write failing trail tests**

Assertions:
- samples interpolate at a fixed distance along a polyline;
- sampling works across multiple path segments;
- unwrapped path coordinates remain continuous when visible coordinates wrap.

- [ ] **Step 2: Write failing growth tests**

Assertions:
- new snake has exactly `12` body segments;
- `growSnake(state, 4)` adds exactly `4` segments;
- segment spacing remains fixed after growth.

- [ ] **Step 3: Run tests and verify RED**

Run: `npm test -- tests/unit/trail.test.ts tests/unit/snake-growth.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement minimal trail/body APIs**

`TrailBuffer` owns unwrapped samples and distance accumulation. Rendering/collision consumers request body points at fixed distances; no segment-to-segment chasing is authoritative.

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/unit/trail.test.ts tests/unit/snake-growth.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/trail.ts src/game/snake.ts tests/unit/trail.test.ts tests/unit/snake-growth.test.ts
git commit -m "feat: add path sampled snake body"
```

---

### Task 4: Food Spawn + Toroidal Self-Collision

**Files:**
- Create: `src/game/food.ts`
- Create: `src/game/collision.ts`
- Test: `tests/unit/food.test.ts`
- Test: `tests/unit/collision.test.ts`

**Interfaces:**
- Consumes: `SnakeState`, wrapped/toroidal math.
- Produces: `spawnFood()`, `isFoodCollected()`, `isSelfCollision()`.

- [ ] **Step 1: Write failing food tests**

Assertions:
- generated food lies inside canonical world bounds;
- food is not spawned overlapping body samples;
- food is not spawned inside the configured head exclusion radius;
- only one returned food position exists at a time;
- spawn returns an explicit failure result after a bounded maximum attempt count instead of looping forever in a saturated world.

- [ ] **Step 2: Write failing collision tests**

Assertions:
- near-head body indices are ignored;
- collision with a later body segment returns true;
- a body segment across the opposite cube face can collide through toroidal distance;
- a visually crossing but spatially distant segment does not collide.

- [ ] **Step 3: Run tests and verify RED**

Run: `npm test -- tests/unit/food.test.ts tests/unit/collision.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement spawn and collision APIs**

Use injected RNG in `spawnFood()` for deterministic tests. Collision radius/exclusion count are constants in `constants.ts`, not hidden magic numbers.

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/unit/food.test.ts tests/unit/collision.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/food.ts src/game/collision.ts src/game/constants.ts tests/unit/food.test.ts tests/unit/collision.test.ts
git commit -m "feat: add food and self collision"
```

---

### Task 5: Run State Machine + Canonical Scoring

**Files:**
- Create: `src/game/run-state.ts`
- Modify: `src/game/simulation.ts`
- Test: `tests/unit/run-state.test.ts`
- Test: `tests/integration/game-loop.test.ts`

**Interfaces:**
- Consumes: movement, snake, food, collision modules.
- Produces: `RunPhase = 'ready' | 'playing' | 'game-over'`, `RunState`, `createRun()`, `startRun()`, `stepRun()`, `RunResult`.

- [ ] **Step 1: Write failing run-state tests**

Assertions:
- run starts with body length `12` and one food;
- collecting one food increments `foodEaten` by `1` and body length by `4`;
- walls/wrap never transition to `game-over`;
- self-collision transitions to `game-over` exactly once;
- final result records maximum length and elapsed duration.

- [ ] **Step 2: Write failing integration test for repeated growth**

Simulate deterministic pickups and assert `length = 12 + foodEaten * 4` after each collection.

- [ ] **Step 3: Run tests and verify RED**

Run: `npm test -- tests/unit/run-state.test.ts tests/integration/game-loop.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement run state machine**

`stepRun()` is the only gameplay orchestrator; renderer/UI must not mutate simulation state directly.

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/unit/run-state.test.ts tests/integration/game-loop.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/run-state.ts src/game/simulation.ts tests/unit/run-state.test.ts tests/integration/game-loop.test.ts
git commit -m "feat: add canonical game loop"
```

---

### Task 6: Three.js Scene + Small-Scale Snake/Food Rendering

**Files:**
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/styles.css`
- Create: `src/render/scene.ts`
- Create: `src/render/snake-renderer.ts`
- Create: `src/render/food-renderer.ts`
- Test: `tests/unit/render-config.test.ts`

**Interfaces:**
- Consumes: immutable simulation snapshots.
- Produces: `createScene()`, `SnakeRenderer.render(snapshot)`, `FoodRenderer.render(food)`.

- [ ] **Step 1: Write failing render-config tests**

Assertions pin the approved visual ratios:
- head radius is close to body radius and not a mascot-scale multiple;
- food radius is close to body radius;
- cube walls are transparent/line-based rather than opaque;
- palette exports a near-white background, restrained gray guides, and blue gameplay accent.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- tests/unit/render-config.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement scene and renderers**

Use instancing for body segments so hundreds of segments do not create one draw call per sphere. Keep rendering logic free of gameplay mutation.

- [ ] **Step 4: Run unit tests and production build**

Run: `npm test -- tests/unit/render-config.test.ts && npm run build`
Expected: PASS; Vite production build exits 0.

- [ ] **Step 5: Commit**

```bash
git add index.html src/main.ts src/styles.css src/render tests/unit/render-config.test.ts
git commit -m "feat: render flying snake cube"
```

---

### Task 7: Chase Camera with Wrap Coherence

**Files:**
- Create: `src/render/chase-camera.ts`
- Test: `tests/unit/chase-camera.test.ts`

**Interfaces:**
- Consumes: wrapped head position, forward/up vectors, wrap event/offset.
- Produces: `ChaseCameraController.update(snapshot, dt)` and camera pose.

- [ ] **Step 1: Write failing camera tests**

Assertions:
- camera target remains behind/slightly above the head under ordinary motion;
- camera smoothing converges without overshoot outside configured tolerance;
- after +X→-X wrap, camera relocates to the equivalent wrapped frame rather than interpolating across the cube;
- equivalent tests cover Y and Z wrap.

- [ ] **Step 2: Run test and verify RED**

Run: `npm test -- tests/unit/chase-camera.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement wrap-aware chase camera**

Camera smoothing is visual only and must not feed back into steering physics.

- [ ] **Step 4: Run test and build**

Run: `npm test -- tests/unit/chase-camera.test.ts && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render/chase-camera.ts tests/unit/chase-camera.test.ts
git commit -m "feat: add wrap aware chase camera"
```

---

### Task 8: Desktop Keyboard + Mobile Joystick Input

**Files:**
- Create: `src/input/input-state.ts`
- Create: `src/input/keyboard.ts`
- Create: `src/input/joystick.ts`
- Test: `tests/unit/keyboard.test.ts`
- Test: `tests/unit/joystick.test.ts`

**Interfaces:**
- Produces: `InputState { yaw: number; pitch: number }`, `KeyboardInput`, `JoystickInput`.
- Both adapters normalize output to `[-1, 1]` and feed the same simulation interface.

- [ ] **Step 1: Write failing keyboard tests**

Assertions:
- Arrow/A/D/W/S mappings produce expected yaw/pitch signs;
- releasing keys returns the corresponding axis toward neutral;
- blur clears all keyboard input.

- [ ] **Step 2: Write failing joystick tests**

Assertions:
- pointer displacement maps to normalized yaw/pitch;
- movement outside joystick radius clamps to `[-1,1]`;
- `pointerup` resets to neutral;
- `pointercancel` resets to neutral;
- resize/orientation reset does not leave stale active pointer state.

- [ ] **Step 3: Run tests and verify RED**

Run: `npm test -- tests/unit/keyboard.test.ts tests/unit/joystick.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement both adapters using browser-native events**

Do not duplicate steering rules in input modules; they emit normalized intent only.

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/unit/keyboard.test.ts tests/unit/joystick.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/input tests/unit/keyboard.test.ts tests/unit/joystick.test.ts
git commit -m "feat: add desktop and mobile controls"
```

---

### Task 9: Meme Intro + Username + HUD + Game Over + Local Best

**Files:**
- Create: `src/app/app-state.ts`
- Create: `src/app/app-controller.ts`
- Create: `src/app/identity.ts`
- Create: `src/app/session-gateway.ts`
- Create: `src/ui/intro-view.ts`
- Create: `src/ui/username-view.ts`
- Create: `src/ui/hud-view.ts`
- Create: `src/ui/game-over-view.ts`
- Create: `src/ui/local-rank-view.ts`
- Modify: `src/main.ts`
- Modify: `src/styles.css`
- Test: `tests/integration/app-flow.test.ts`
- Test: `tests/unit/identity.test.ts`

**Interfaces:**
- Produces: `AppScreen = 'intro' | 'username' | 'game' | 'game-over' | 'rank'`.
- Produces: `PlayerIdentity`, `getOrCreatePlayerId()`, `SessionGateway` interface and `LocalSessionGateway` placeholder implementation.

- [ ] **Step 1: Write failing app-flow tests**

Assertions:
- first rendered screen contains exact two-line canonical meme copy;
- clicking the meme advances to username screen;
- blank/whitespace username cannot start;
- valid username starts a run without account/signup;
- HUD shows current length while playing;
- game over shows `LENGTH`, `BEST`, `WORLD` placeholder/unranked state, `PLAY AGAIN`, and `RANK`;
- replay does not require re-entering username.

- [ ] **Step 2: Write failing identity tests**

Assertions:
- first call creates a non-empty anonymous player ID;
- subsequent calls reuse the same browser-stored ID;
- username remains separate from player ID.

- [ ] **Step 3: Run tests and verify RED**

Run: `npm test -- tests/integration/app-flow.test.ts tests/unit/identity.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement state-driven UI and local gateway seam**

`LocalSessionGateway` marks runs unranked but preserves the exact interface the Cloudflare integration plan will replace. Store only anonymous player ID, selected username, and local best in browser storage.

- [ ] **Step 5: Run tests and build**

Run: `npm test -- tests/integration/app-flow.test.ts tests/unit/identity.test.ts && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app src/ui src/main.ts src/styles.css tests/integration/app-flow.test.ts tests/unit/identity.test.ts
git commit -m "feat: add meme first game flow"
```

---

### Task 10: Browser Integration, Pause/Resize, Mobile Layout

**Files:**
- Modify: `src/main.ts`
- Modify: `src/styles.css`
- Modify: `src/app/app-controller.ts`
- Test: `tests/integration/runtime-lifecycle.test.ts`
- Test: `tests/e2e/game.spec.ts`

**Interfaces:**
- Consumes all prior modules.
- Produces a complete locally playable browser runtime.

- [ ] **Step 1: Write failing runtime lifecycle tests**

Assertions:
- hidden tab pauses frame accumulation without producing a large simulation jump on resume;
- resize updates renderer/camera dimensions without resetting run state;
- orientation change clears active touch input;
- renderer failure produces a visible concise error state rather than a blank screen.

- [ ] **Step 2: Write failing Playwright smoke flow**

Flow:
1. open `/`;
2. assert canonical meme copy;
3. click meme;
4. enter username;
5. start game;
6. assert canvas/HUD visible;
7. verify keyboard event changes control state through an observable test hook or UI-neutral harness;
8. emulate mobile viewport and verify joystick is present without horizontal page overflow.

- [ ] **Step 3: Run integration/E2E and verify RED**

Run: `npm test -- tests/integration/runtime-lifecycle.test.ts && npm run test:e2e`
Expected: FAIL before lifecycle wiring exists.

- [ ] **Step 4: Wire runtime lifecycle and responsive layout**

Use bounded simulation delta/fixed-step from Task 2; do not add separate movement logic in `main.ts`.

- [ ] **Step 5: Run complete frontend verification**

Run: `npm test && npm run typecheck && npm run build && npm run test:e2e`
Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/main.ts src/styles.css src/app/app-controller.ts tests/integration/runtime-lifecycle.test.ts tests/e2e/game.spec.ts playwright.config.ts
git commit -m "feat: complete playable single player frontend"
```

---

### Task 11: Frontend CI Gate

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `README.md`
- Test: repository CI command set.

**Interfaces:**
- Produces: PR gate running install, tests, typecheck, production build, and Playwright smoke test.

- [ ] **Step 1: Define CI commands in workflow**

Required commands:

```text
npm ci
npm test
npm run typecheck
npm run build
npm run test:e2e
```

- [ ] **Step 2: Update README with local run instructions and current V1 scope**

README must preserve `SNEK RENAISSANCE`, `conquer the space`, canonical meme copy, local development commands, and explicit note that this is an independent experimental project not affiliated with OpenAI.

- [ ] **Step 3: Run the exact CI command sequence locally**

Expected: all commands exit 0.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml README.md
git commit -m "ci: verify playable frontend"
```

---

## Completion Gate for This Plan

Before this plan is considered complete, verify all of the following on the implementation branch:

```bash
npm ci
npm test
npm run typecheck
npm run build
npm run test:e2e
```

Then manually confirm on at least one desktop viewport and one mobile viewport:

- canonical meme intro appears first;
- username → play flow works;
- snake continuously flies in XYZ;
- all six faces wrap without death;
- camera remains coherent on wrap;
- food adds exactly four body segments;
- self-collision ends the run;
- head/body/food remain visually small and close in scale;
- keyboard and joystick both control the same steering model;
- portrait and landscape layouts remain usable;
- game-over replay works even with the local/unranked gateway.

## Deferred Plans

This plan deliberately does **not** implement:

1. Cloudflare Worker + D1 session/score/leaderboard persistence and anti-cheat validation.
2. Production Cloudflare Pages/Worker/D1 deployment wiring and migration rollout.

Those are separate implementation plans so the core game remains independently reviewable and playable before backend coupling.
