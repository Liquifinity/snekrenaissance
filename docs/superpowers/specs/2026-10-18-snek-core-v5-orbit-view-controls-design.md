# SNEK CORE V5 — Orbit Camera + View-Relative Controls

Status: design specification
Date: 2026-10-18
Base authority: `main@c1bd449bbefda98624d93b5d1e8d8203d67a9783` (SNEK CORE V4 board-space)

## 1. Intent

V4 fixed the camera/world reference and removed chase/rebase jitter. V5 adds a manual camera orbit without reintroducing automatic camera authority.

The player may click/touch and drag the game canvas to orbit around the cube, inspect different faces, and leave the camera at any chosen angle. Controls follow the current visual frame so the player commands what is seen on screen rather than invisible world axes.

The strategic simulation remains a six-direction Cartesian grid. Camera movement never moves the snake, cube, food, topology, or simulation state.

## 2. Core invariants

1. The cube remains the spatial object of reference.
2. Camera movement is manual only.
3. No chase, auto-rotation, wrap rebase, auto-centering, or release snap.
4. Releasing a drag leaves the camera at exactly the chosen orientation.
5. The camera always targets the cube center.
6. Strategic snake movement remains only `+X/-X/+Y/-Y/+Z/-Z`.
7. Wrap, collision, food, growth, score, and 6 Hz strategic cadence remain unchanged.
8. Direct 180-degree reversal remains invalid.
9. Manual orbit and zoom do not alter deterministic gameplay state.

## 3. Version identity

This is `snek-core-v5`.

Reason: although grid topology and scoring are unchanged, the control authority changes from fixed world-axis input to camera/view-relative input. That materially changes player interaction and ranked comparability.

Persistence must therefore use a distinct local key:

```text
snek.localBest.coreV5
```

V4 persistence remains untouched as historical data.

## 4. Camera authority

### 4.1 State

The camera is an orbit camera around `(0,0,0)`.

Logical camera state consists of:

```text
orientation: continuous orbit orientation around cube center
zoomFactor: manual scalar distance from center
```

No snake position or heading participates in camera pose calculation.

### 4.2 Initial pose

The initial V5 view must match the current V4 board camera as closely as possible. The current normalized ray derived from `(0.65, 0.55, 1.0)` remains the initial camera position direction.

This preserves the initial V4 visual orientation and therefore the initial screen-relative mapping:

```text
W / ↑ -> +Y
S / ↓ -> -Y
A / ← -> -X
D / → -> +X
Q     -> +Z  (toward viewer)
E     -> -Z  (into screen)
```

### 4.3 Framing

The default distance continues to use the cube bounding-sphere calculation so the entire cube fits the viewport with the existing framing margin.

Because the fit is based on the cube circumsphere, arbitrary orbit orientation does not require a new fit computation.

### 4.4 Orbit interaction

Desktop:

- primary-button drag on the canvas rotates the camera around cube center;
- horizontal drag changes azimuth;
- vertical drag changes elevation;
- no snap occurs on pointer release;
- no inertia/damping continues after release.

Touch:

- one-finger drag rotates;
- two-finger pinch changes zoom;
- when a second touch joins an active one-finger orbit, orbit pauses and pinch becomes authoritative;
- returning to one finger establishes a new orbit baseline, preventing jumps.

The camera must not pan away from `(0,0,0)`.

### 4.5 Vertical orbit limit

Orbit is visually free but uses a near-pole safety limit to avoid singular camera-up behavior:

```text
polar angle ∈ [1°, 179°]
```

This allows viewing every cube face, including near-top and near-bottom views, without crossing an exact pole.

### 4.6 Zoom

Wheel and pinch remain manual-only zoom controls.

Existing V4 limits remain authoritative:

```text
BOARD_CAMERA_ZOOM_MIN = 0.65
BOARD_CAMERA_ZOOM_MAX = 5
BOARD_CAMERA_ZOOM_DEFAULT = 1
```

Zoom changes distance only. It must not alter orbit orientation or current control frame.

## 5. ViewFrame — discrete control authority

The camera orientation is continuous; strategic input must remain discrete. V5 introduces a derived `ViewFrame`.

```ts
ViewFrame {
  up: GridDirection
  right: GridDirection
  intoScreen: GridDirection
}
```

The frame obeys:

```text
right = cross(intoScreen, up)
```

`up`, `right`, and `intoScreen` are mutually perpendicular signed Cartesian directions.

There are exactly 24 valid orthogonal `ViewFrame` states:

```text
6 choices for intoScreen × 4 orthogonal choices for up = 24
```

`ViewFrame` is presentation/input authority only. It is never stored in `RunState` and never participates in deterministic strategic simulation.

## 6. Mapping camera orientation to ViewFrame

### 6.1 Continuous camera basis

From the actual camera pose:

```text
actualInto = normalize(target - cameraPosition)
actualRight = normalize(cross(actualInto, cameraUp))
actualUp = normalize(cross(actualRight, actualInto))
```

### 6.2 Candidate scoring

Enumerate all 24 valid discrete frames.

For each frame:

```text
score(frame) =
    dot(actualInto, frame.intoScreen)
  + dot(actualUp, frame.up)
  + dot(actualRight, frame.right)
```

The highest-scoring frame is the nearest discrete cube orientation to the current visual orientation.

### 6.3 Hysteresis

The current `ViewFrame` must not switch merely because two candidates are nearly tied around a diagonal boundary.

Use a fixed score margin:

```text
VIEW_FRAME_SWITCH_MARGIN = 0.15
```

A challenger replaces the current frame only when:

```text
challengerScore > currentScore + VIEW_FRAME_SWITCH_MARGIN
```

This provides stable controls while the camera crosses diagonal boundaries.

The initial frame is explicitly:

```text
up         = +Y
right      = +X
intoScreen = -Z
```

## 7. Input mapping

Keyboard and mobile controls become screen-relative.

```text
W / ↑ = viewFrame.up
S / ↓ = opposite(viewFrame.up)
D / → = viewFrame.right
A / ← = opposite(viewFrame.right)
E     = viewFrame.intoScreen
Q     = opposite(viewFrame.intoScreen)
```

Semantic meaning:

```text
W = move visually upward
S = move visually downward
A = move visually left
D = move visually right
Q = move toward the viewer
E = move deeper into the screen
```

The user never needs to reason about `+X/-X/+Y/-Y/+Z/-Z` during normal play.

## 8. Input buffering and reversal

V4 strategic buffering remains unchanged.

At input time:

1. map the physical control through the current `ViewFrame` to a `GridDirection`;
2. submit that absolute direction to `queueDirection()`;
3. if it is the exact opposite of committed `run.heading`, reject it;
4. otherwise newest valid direction before the next strategic step wins.

A camera movement after a key press does not reinterpret an already-buffered direction. The mapping is resolved at the instant the input event occurs.

This prevents a pending command from mutating merely because the player continues rotating the camera before the 6 Hz step executes.

## 9. Mobile direction pad

The six-command pad remains, but labels express visual semantics rather than world axes:

```text
       ↑
    ←     →
       ↓

   FRENTE   FUNDO
```

Mapping:

```text
↑      -> viewFrame.up
↓      -> opposite(viewFrame.up)
→      -> viewFrame.right
←      -> opposite(viewFrame.right)
FRENTE -> opposite(viewFrame.intoScreen)
FUNDO  -> viewFrame.intoScreen
```

No `+X`, `+Y`, or `+Z` labels should be exposed in the normal player UI.

## 10. Interaction ownership

Camera pointer gestures and movement controls must not compete.

Desktop:

- canvas drag owns camera orbit;
- keyboard continues to own movement;
- wheel owns zoom.

Mobile:

- touch on canvas owns orbit/pinch;
- direction-pad buttons own movement;
- direction-pad pointer events must not propagate into canvas camera controls.

## 11. Proposed component boundaries

### `src/render/board-camera.ts`

Remain responsible for:

- default fit distance;
- zoom bounds;
- initial ray;
- applying camera target/position constraints.

Extend or refactor it so arbitrary orbit orientation is preserved instead of resetting to the fixed initial ray on every `apply()`.

### `src/render/view-frame.ts` — new

Pure module responsible for:

- the 24 valid frames;
- continuous camera basis -> candidate scores;
- hysteretic frame selection;
- physical/screen command -> absolute `GridDirection` mapping.

No DOM or Three.js controller dependency is required for its pure core; tests should use plain vectors.

### `src/render/board-orbit.ts` — new or equivalent

Responsible for canvas camera interaction:

- pointer drag orbit;
- pinch/wheel integration or delegation;
- fixed center target;
- no pan;
- no damping/inertia;
- orbit change callback.

Using Three.js `OrbitControls` is acceptable because Three.js is already a project dependency, provided pan/damping are disabled and testable camera authority remains isolated.

### `src/main.ts`

Responsible for wiring:

```text
camera orbit change
  -> derive/update ViewFrame

keyboard/pad event
  -> map through current ViewFrame
  -> queueDirection(run, absoluteGridDirection)
```

It must not place `ViewFrame` into `RunState`.

## 12. Renderer/head orientation

Snake head rendering remains derived from committed absolute `run.heading` exactly as in V4.

Rotating the camera must not mutate snake quaternion, strategic heading, body coordinates, or food coordinates.

## 13. Telemetry for deterministic E2E verification

Browser diagnostics may expose read-only values:

```text
data-camera-mode="orbit-board"
data-view-up="+Y"
data-view-right="+X"
data-view-into="-Z"
```

These are test diagnostics only and must never be read back into gameplay logic.

The E2E harness may expose the current camera position and discrete `ViewFrame` for verification.

## 14. TDD contracts

### Camera orbit

Tests must prove:

- dragging changes camera position but not target;
- releasing leaves the camera exactly at the final orientation;
- there is no post-release motion;
- camera distance remains constant during pure orbit;
- zoom changes distance without changing orientation;
- wrap of the snake produces zero camera change;
- resize preserves current orbit orientation while recomputing fit/zoom distance as necessary.

### ViewFrame

Tests must cover all 24 frames and prove:

- every frame is orthogonal;
- `right = cross(intoScreen, up)`;
- initial V4 view resolves to `up=+Y, right=+X, into=-Z`;
- each physical command maps correctly for representative rotated views;
- hysteresis prevents oscillation around a boundary;
- a sufficiently better challenger eventually switches frames.

### Gameplay isolation

Tests must prove camera movement does not change:

- `run.heading`;
- `pendingDirection`;
- snake cells;
- food cell;
- score;
- strategic clock state.

### Input timing

Tests must prove an input is resolved through the `ViewFrame` that exists at the time of the input event, not at strategic-step consumption time.

## 15. E2E acceptance scenarios

1. Start in default view and confirm V4-equivalent mapping.
2. Drag camera approximately 90° around the cube; press W and verify snake moves upward on screen using the new world axis.
3. Rotate through several diagonal boundaries and confirm controls do not flicker between axes.
4. Rotate while a direction is buffered; confirm the buffered absolute direction does not change.
5. Perform one-finger orbit on mobile, then add a second finger for pinch; confirm no camera jump.
6. Cross a toroidal face while camera is at a non-default angle; confirm camera pose remains unchanged.
7. Release drag and observe no snap or inertial continuation.
8. Verify direct reversal remains rejected in every `ViewFrame`.

## 16. Non-goals

V5 does not add:

- automatic face snapping;
- chase camera;
- camera pan;
- free roll control;
- diagonal snake movement;
- camera-dependent simulation state;
- replay migration from V4;
- V4 record migration into V5.

## 17. Success definition

The feature is successful when the player can freely orbit the cube, leave the camera at any chosen angle, and continue to control the snake according to what is visually up/down/left/right/front/back on screen, while the underlying deterministic six-axis grid and toroidal rules remain unchanged.
