# SNEK CORE V4 — Board-Space Absolute Control Design

Date: 2026-10-18
Status: design candidate for human review
Base authority: `main@c794973d6b64a31a1c8879e7170633a0528015f2`
Supersedes for V4 gameplay/control purposes: SNEK CORE V3 local `GridFrame` steering and chase-camera authority.

## 1. Problem statement

SNEK CORE V3 currently mixes two different spatial references:

- the player sees a cube/world reference;
- steering is expressed as local turns relative to the snake `GridFrame`;
- the chase camera follows the snake head and performs toroidal pose rebasing when the head wraps.

This creates two user-visible failures:

1. crossing a toroidal boundary can visually disturb the camera because the camera pose itself is rebased and subsequently smoothed;
2. `up/down/left/right` changes semantic meaning after the snake rotates in 3D, making controls difficult to predict from the fixed cube/world reference.

V4 resolves both by establishing one dominant reference system: the cube/world.

## 2. Design objective

The cube is the board.

The player must be able to predict a command without reasoning about the snake's accumulated local frame. Camera motion must never be caused by snake translation, snake rotation, or toroidal wrap.

Success means:

- a toroidal wrap produces no camera translation, rotation, zoom impulse, rebase, or smoothing artifact;
- each input maps to the same world-axis direction for the entire run;
- movement remains deterministic at the existing fixed strategic cadence;
- direct 180-degree reversal remains forbidden, as in classical Snake;
- the full cube is visible by default;
- manual zoom remains available on desktop and mobile;
- V3 and V4 ranked results are not mixed.

## 3. Ruleset identity

V4 changes the set of legal strategic movement transitions. This is a gameplay rules change, not a presentation-only patch.

Canonical ruleset ID:

```ts
export const RULESET_ID = 'snek-core-v4' as const;
```

Local-best persistence must use a distinct namespace:

```text
snek.localBest.coreV4
```

Any backend/ranking payload that currently carries `rulesetId` continues doing so, now with `snek-core-v4` for V4 runs. V3 results remain historically valid under `snek-core-v3` but are not directly comparable to V4.

## 4. Strategic movement authority

### 4.1 Remove local-turn authority

`GridFrame` must no longer be the strategic authority for choosing the next cell.

V4 strategic state uses world-space direction directly:

```ts
RunState {
  heading: GridDirection
  pendingDirection: GridDirection | null
  ...
}
```

Where:

```ts
type GridDirection = '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z';
```

The initial heading remains `+Z` to preserve the existing initial movement direction unless a later explicitly approved design changes it.

### 4.2 Step rule

At each accepted strategic step:

```text
1. Read pendingDirection.
2. Clear pendingDirection.
3. If the pending direction is legal, commit it to heading.
4. Advance exactly one face-adjacent GridCell using heading.
5. Apply existing toroidal topology.
6. Apply existing self-collision, food, growth, completion and scoring rules.
```

Conceptually:

```ts
const direction = state.pendingDirection ?? state.heading;
state.pendingDirection = null;
state.heading = direction;
const step = advanceGridStep(headCell, state.heading, config);
```

The actual implementation must preserve the project's existing deterministic fixed-step semantics and collision ordering.

### 4.3 Direct reversal rule

A command is illegal only when it is the exact opposite of the currently committed `heading`.

Opposite pairs:

```text
+X <-> -X
+Y <-> -Y
+Z <-> -Z
```

Examples:

```text
heading +X, request -X  -> reject
heading +X, request +X  -> accept / continue straight
heading +X, request +Y  -> accept
heading +X, request -Y  -> accept
heading +X, request +Z  -> accept
heading +X, request -Z  -> accept
```

Validity is evaluated against the committed heading, not against an uncommitted pending direction. Therefore the newest valid command received before the next strategic step may replace an earlier pending command.

### 4.4 Pending-input semantics

V4 preserves the good V3 buffering property:

- one pending strategic direction exists at a time;
- newest valid pre-step direction wins;
- repeated same-direction input is allowed and means continue straight;
- keyboard key repeat while physically held must not generate repeated strategic events;
- during fixed-clock catch-up, only the first owed strategic step consumes the pending direction; subsequent owed steps continue with the committed heading unless a new real input arrives between rendered frames.

## 5. Desktop input mapping

World-space keyboard authority is fixed for the entire run:

```text
W / ArrowUp    -> +Y
S / ArrowDown  -> -Y
A / ArrowLeft  -> -X
D / ArrowRight -> +X
Q               -> +Z
E               -> -Z
```

These bindings do not depend on:

- snake orientation;
- previous turns;
- camera zoom;
- toroidal wrap;
- which cube face the snake crossed.

The UI may describe `Q/E` as the two depth-axis commands, but the underlying authority is always `+Z/-Z`.

## 6. Mobile input design

The current four-sector 2D joystick is not sufficient as the sole authority for six absolute 3D directions.

V4 mobile controls use six explicit world-space commands:

```text
          +Y
           ^
           |
-X  <---- [ ] ----> +X
           |
           v
          -Y

      +Z          -Z
```

Requirements:

- four cardinal controls produce `±X/±Y`;
- two dedicated depth controls produce `+Z/-Z`;
- controls are discrete/edge-triggered strategic commands, not analog steering;
- touch input must never emit more than one direction for a single activation transition;
- pinch gestures on the game canvas remain camera-only and must not emit movement commands;
- mobile control labels/icons must make the depth pair visually distinguishable from the four planar commands.

Exact final iconography is presentation detail and does not alter the six-direction authority.

## 7. Fixed board camera

### 7.1 Camera authority

V4 removes chase-camera behavior from normal gameplay.

The gameplay camera:

- is fixed relative to the cube center;
- never follows the snake head;
- never consumes `GridFrame`, `heading`, snake position, or wrap events to determine orientation;
- never performs `wrapRebase`;
- never applies snake-motion smoothing;
- never changes FOV because of snake movement;
- changes only when the viewport changes or the player manually changes zoom.

This guarantees that toroidal wrap cannot create the current zoom/shake artifact.

### 7.2 Oblique orientation

The camera uses a stable oblique world-space direction so all three cube axes are visually legible.

Canonical view direction should be derived from a fixed normalized vector close to:

```text
(0.65, 0.55, 1.0)
```

with world `+Y` as the camera up reference and target `(0, 0, 0)`.

The exact scalar distance is computed from the cube size, viewport aspect and FOV; the direction itself remains fixed.

This orientation is intentionally biased toward the Z axis so:

- `±X` reads primarily as horizontal movement;
- `±Y` reads primarily as vertical movement;
- `±Z` reads primarily as depth movement.

No automatic camera rotation is allowed during gameplay.

### 7.3 Fit-whole-cube invariant

At default zoom, the entire cube must remain visible with a small safety margin on supported desktop and mobile aspect ratios.

The implementation should fit a bounding sphere around the cube rather than use a hard-coded distance multiplier:

```text
cubeRadius = sqrt(3) * worldSize / 2
limitingHalfFov = min(verticalHalfFov, horizontalHalfFov)
baseDistance >= cubeRadius / sin(limitingHalfFov)
baseDistance *= framingMargin
```

A framing margin greater than 1 must be used so cube edges do not touch the viewport boundary.

The implementation may use an equivalent mathematically correct box-fit calculation, but the invariant is authoritative: default view contains the entire cube.

### 7.4 Manual zoom

Existing user-controlled zoom remains:

- desktop mouse wheel;
- mobile two-finger pinch;
- zoom changes camera distance from the cube center only;
- target and view direction remain unchanged;
- no zoom value is changed by snake movement or wrap.

V4 may retain the existing clamp values unless tests reveal a usability problem:

```text
min = 0.65
max = 5
initial = 1
```

The semantic direction remains the existing one: wheel/pinch operation must feel consistent with the currently accepted zoom feature.

### 7.5 Camera modes

The current chase/overview toggle is no longer meaningful as a normal V4 gameplay distinction.

V4 canonical gameplay has one board camera authority. The existing `X CAMERA` toggle should be removed from normal gameplay rather than preserve a route back to chase behavior.

If a future alternate camera is desired, it requires a separate design and must not silently reintroduce snake-relative authority.

## 8. Head presentation without strategic GridFrame

The rendered head may still visually rotate to show its committed heading, but this orientation must be derived from `heading`, not from a strategic `GridFrame`.

A deterministic canonical visual-up rule removes roll ambiguity:

```text
heading +Z / -Z -> visual up +Y
heading +X / -X -> visual up +Y
heading +Y       -> visual up -Z
heading -Y       -> visual up +Z
```

A render quaternion is derived from:

- forward = heading;
- up = canonical visual up;
- right = orthogonal cross-product result.

This is presentation-only. It must not feed back into movement authority.

The body continues to render from exact `GridCell -> world` positions with stable segment IDs.

## 9. Toroidal topology

Toroidal gameplay remains unchanged:

- every strategic step advances one face-adjacent cell;
- crossing an edge wraps the changed axis into the opposite cell coordinate;
- `wrappedAxis` and `wrapSign` semantics remain available where currently used;
- food, body occupancy and collision remain in logical cell space.

Critical V4 presentation rule:

```text
Toroidal wrap moves the snake logically.
Toroidal wrap never moves the camera.
```

No camera compensation, camera teleport, camera pose rebase or camera interpolation is permitted as a response to wrap.

## 10. Simulation cadence and determinism

V4 preserves the existing strategic cadence from grid configuration:

```text
stepsPerSecond = 6
```

No continuous steering is introduced.

The fixed-step clock remains the sole strategic time authority. Render framerate, camera zoom and viewport events must not affect cell transitions.

## 11. Collision, food, scoring and completion

Unless required solely for the ruleset/persistence namespace transition, V4 must not alter:

- self-collision semantics;
- food spawn semantics;
- food pickup semantics;
- growth amount;
- score authority;
- completion target;
- elapsed strategic time accounting.

The intent of V4 is reference-system correction, not game-balance redesign.

## 12. Telemetry and diagnostics

Browser/E2E diagnostics should expose world-space authority directly.

Recommended fields:

```text
data-head-direction = heading
data-pending-direction = pendingDirection | none
data-camera-mode = board
data-camera-zoom-factor = current zoom
```

Legacy `headUp` telemetry tied to `GridFrame` should be removed when no longer consumed by tests or diagnostics.

E2E camera diagnostics should be able to prove that camera position is invariant across snake movement and wrap for a constant viewport and zoom factor.

## 13. Testing contract

Implementation must follow TDD. Minimum required contracts:

### Strategic movement

- each of six absolute directions advances the correct axis by one cell;
- direct opposite of committed heading is rejected;
- non-opposite direction is accepted;
- repeated current heading continues straight;
- newest valid pending direction wins before a step;
- catch-up consumes pending direction only on the first owed step;
- wrap semantics remain correct on X/Y/Z;
- collision/food behavior remains unchanged under absolute heading authority.

### Keyboard

- W/ArrowUp emits +Y;
- S/ArrowDown emits -Y;
- A/ArrowLeft emits -X;
- D/ArrowRight emits +X;
- Q emits +Z;
- E emits -Z;
- held key repeat does not emit repeated direction transitions.

### Mobile

- six controls map exactly to six directions;
- each activation emits one discrete command;
- camera pinch never emits a movement command.

### Camera

- camera pose is independent of head cell and heading at constant zoom/viewport;
- wrapping the head across X/Y/Z does not change camera pose;
- default camera fit contains the cube bounding volume;
- wheel/pinch changes only camera distance/zoom state;
- resize/orientation recomputes fit without changing world-space view direction.

### Presentation

- head quaternion is derived from heading with deterministic canonical up;
- no strategic movement code reads visual orientation back from render state.

### Ruleset/persistence

- V4 reports `snek-core-v4`;
- local best uses V4 namespace;
- V3 stored values are not read as V4 authority.

## 14. Migration and compatibility

V4 is implemented as a forward ruleset transition on the current codebase.

Requirements:

- no migration of V3 leaderboard/local-best values into V4 values;
- existing backend transport shape should remain compatible when it already carries `rulesetId`;
- obsolete chase-camera code may be removed once no tests or runtime paths require it;
- obsolete `GridFrame` strategic code may remain temporarily only if another non-V4 compatibility path still requires it, but V4 runtime must not depend on it;
- dead compatibility code should be removed rather than retained without a consumer.

## 15. Explicit non-goals

This design does not introduce:

- free-flight movement;
- analog snake steering;
- camera orbit controls;
- automatic camera rotation;
- camera following;
- camera recentering on the head;
- gameplay speed changes;
- new scoring rules;
- level geometry changes;
- non-toroidal boundaries.

## 16. Acceptance criteria

V4 is acceptable only when all of the following are true:

1. The player can cross any cube boundary repeatedly with zero camera shake/zoom/rebase caused by wrap.
2. The cube remains the stable visual reference for the entire run.
3. W/S/A/D/Q/E always mean the same six world directions.
4. Mobile exposes six unambiguous discrete world-direction controls.
5. Direct 180-degree reversal is rejected.
6. `GridFrame` is not strategic movement authority.
7. Default camera framing shows the entire cube with margin.
8. Manual zoom works without changing orientation or gameplay.
9. Deterministic 6 Hz movement, toroidal topology, collision, food and growth remain correct.
10. V4 ranking/persistence identity is separated from V3.
11. Full unit, worker, typecheck, production config, build and browser/E2E verification pass on the exact release candidate.

## 17. Implementation boundary

This document defines architecture and behavior only. No implementation is authorized by the document itself.

After human approval of this written spec, the next required artifact is an implementation plan produced from this exact design. The implementation plan must identify TDD order, affected files, migration/removal sequence, verification commands and release gate before product code is changed.
