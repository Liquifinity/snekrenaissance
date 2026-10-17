# SNEK RENAISSANCE — Pixel Flight Grid V2.1 Smooth Control Design

Status: DESIGN APPROVED IN PRINCIPLE / AWAITING WRITTEN SPEC REVIEW  
Date: 2026-10-17  
Repository: `Liquifinity/snekrenaissance`  
Baseline branch: `main`  
Baseline SHA: `37378a2e4890b258aa529ed5478c1a637c9488b9`  
Current ruleset: `pixel-flight-grid-v2`  
Proposed ruleset: `pixel-flight-grid-v2-1`

## 1. Purpose

Pixel Flight Grid V2.1 corrects the control architecture of Pixel Flight Grid V2.

V2 successfully established a compact voxel arena, deterministic cell occupancy, exact food placement, voxel rendering, toroidal topology, local-first persistence and a pressure-based difficulty model. However, its steering contract is too discrete for the intended product feel:

- keyboard emits one `TurnIntent` per key-down edge;
- joystick emits one `TurnIntent` per deflection and requires re-centering before another turn;
- movement consumes turns only at a 6 Hz logical cell cadence;
- a FIFO can retain up to two historical turns;
- additional turns can be rejected when the FIFO is full;
- visual interpolation can still be showing one turn while the simulation has already queued another.

The result is technically deterministic but perceptually delayed and difficult to play smoothly.

V2.1 restores continuous flight steering while preserving the voxel/grid systems that made V2 strategically stronger.

The product objective is:

> The player should be able to hold or continuously move a control and feel the snake respond immediately and proportionally, while food, growth, body occupancy and self-collision remain exact against the finite 9×9×9 toroidal grid.

## 2. Scope

V2.1 changes the authority of these subsystems:

- steering input;
- orientation;
- head motion;
- mapping a continuous trajectory to occupied grid cells;
- render pose generation where needed to display the continuous head trajectory.

V2.1 preserves these V2 systems unless explicitly superseded below:

- 9×9×9 baseline logical grid;
- `cellSize = 0.40`;
- `worldSize = resolution × cellSize`;
- toroidal wrapping on X/Y/Z;
- snake body occupancy represented as an ordered cell chain;
- exact occupied-cell self-collision;
- exact one-cell food authority;
- growth of `+2` occupied cells per food;
- initial occupied length of 6 cells;
- voxel snake renderer and food renderer;
- food voxel footprint equal to snake voxel footprint (`0.8 × cellSize`);
- low-resolution pixel pipeline;
- chase/overview camera product flow;
- local-first persistence;
- browser/mobile/desktop support;
- completion target unless separately amended.

## 3. Diagnosis of the current V2 control problem

At the baseline SHA:

1. `KeyboardInput` converts each new key-down edge to one `TurnIntent`.
2. `JoystickInput` converts a deflection above `0.55` to one `TurnIntent`, then disarms until the stick returns below `0.25`.
3. `TurnIntentQueue` holds at most two pending turns.
4. `GridMovementClock` advances at 6 logical steps per second, giving a nominal 166.67 ms cell interval.
5. The main loop ignores the boolean returned when a turn cannot be enqueued.
6. Each accepted turn rotates `GridFrame` by exactly 90° before the next cell advance.

This architecture creates three independent sources of poor control feel:

- **input latching:** a held input does not continue steering;
- **quantization latency:** orientation changes only at the next 6 Hz cell step;
- **historical command latency:** queued turns can execute after the player has already changed intent.

Increasing `stepsPerSecond` alone is not sufficient because the edge-triggered/latching/FIFO behavior remains.

## 4. Architectural approaches considered

### A. Faster discrete grid steering

Keep `TurnIntent`, `GridFrame` and face-adjacent movement, but raise the logical step rate and repeatedly emit turns while input is held.

Advantages:

- smallest migration;
- retains exact V2 topology unchanged.

Disadvantages:

- still quantizes steering to 90°;
- still makes responsiveness depend on cell cadence;
- repeated held turns can rotate uncontrollably unless additional gating is introduced;
- does not recover the free-flight control identity.

Rejected as the final architecture. It may reduce lag but does not solve the underlying steering model.

### B. Continuous flight pose with deterministic voxel traversal — selected

Steering and head motion become continuous at the existing 60 Hz fixed simulation cadence. The head moves through continuous logical grid space. Each continuous movement segment is traversed by a deterministic 3D voxel traversal algorithm that enumerates every logical cell entered in order. Body occupancy, food and collision are updated from that ordered cell-entry stream.

Advantages:

- continuous and proportional controls;
- no input FIFO and no stale turns;
- no 166.67 ms steering quantization;
- grid occupancy remains deterministic and exact;
- no tunneling even when one fixed step crosses a cell boundary;
- voxel renderer and finite-space pressure remain useful;
- clean separation between continuous flight authority and discrete occupancy authority.

Cost:

- requires a new continuous logical pose and a cell-crossing bridge;
- requires explicit tie handling for simultaneous boundary crossings;
- some V2 interpolation code becomes unnecessary or changes responsibility.

Selected.

### C. Continuous presentation only

Keep V2 gameplay unchanged but make the renderer anticipate/curve turns immediately.

Rejected because presentation would visibly diverge from collision and food authority. The game would look responsive while still executing stale logical turns.

## 5. Core authority model

V2.1 deliberately separates two authorities.

### 5.1 Flight authority

The following are authoritative for steering and head movement:

```ts
type FlightPose = Readonly<{
  position: GridPoint;
  orientation: FlightOrientation;
}>;

type GridPoint = Readonly<{
  x: number;
  y: number;
  z: number;
}>;
```

`GridPoint` is continuous **logical grid space**, not Three.js world space.

For resolution `N`, each axis is canonicalized to `[0, N)`.

Cell centers are:

```text
cell (i,j,k) center = (i+0.5, j+0.5, k+0.5)
```

The current occupied head cell is:

```text
floor(position.x), floor(position.y), floor(position.z)
```

after canonicalization.

World rendering derives from logical coordinates:

```text
world = gridPoint × cellSize - worldSize/2
```

Three.js/world coordinates never feed back into gameplay.

### 5.2 Occupancy authority

The following remain authoritative for strategic gameplay:

- ordered occupied body cells;
- pending growth;
- food cell;
- exact self-collision;
- occupancy metrics;
- score/foods collected.

Continuous flight cannot directly remove, skip or invent occupied cells. Occupancy changes only through the deterministic cell-entry stream produced by trajectory traversal.

## 6. Continuous input contract

### 6.1 Unified steering state

The runtime consumes a continuous steering state every fixed simulation step:

```ts
type SteeringInput = Readonly<{
  yaw: number;   // -1..+1
  pitch: number; // -1..+1
}>;
```

Canonical screen/control semantics:

```text
left  -> yaw < 0
right -> yaw > 0
up    -> pitch > 0
down  -> pitch < 0
```

This sign convention must be shared by keyboard, joystick, diagnostics and tests.

No adapter may expose one sign convention for presentation and a different sign convention for gameplay.

### 6.2 Keyboard

Keyboard is state-based, not edge-based:

```text
A / ArrowLeft  held -> yaw = -1
D / ArrowRight held -> yaw = +1
W / ArrowUp    held -> pitch = +1
S / ArrowDown  held -> pitch = -1
```

Opposing keys cancel on the same axis.

Releasing a key updates steering immediately.

There is no movement `pendingIntent` and no repeated-key logic for steering.

`X` remains an edge-triggered camera toggle and is not part of `SteeringInput`.

### 6.3 Joystick

Joystick is continuously sampled while the pointer remains active.

Required behavior:

- physical right -> positive yaw;
- physical left -> negative yaw;
- physical up -> positive pitch;
- physical down -> negative pitch;
- magnitude is proportional to radial deflection;
- no activation latch;
- no rearm requirement;
- no discrete intent emission.

A small radial deadzone is allowed for center stability. Baseline:

```text
JOYSTICK_DEADZONE = 0.15
```

Outside the deadzone, magnitude is re-scaled so the usable range still maps smoothly to `0..1`.

### 6.4 Input combination

If keyboard and joystick are active simultaneously, axes are added and clamped to `[-1,+1]`, matching the current presentation combination model.

## 7. Continuous orientation

V2.1 restores a continuous flight orientation derived from the successful V1 steering model, but represented as a clean V2.1 subsystem.

Baseline constants:

```text
FIXED_SIMULATION_HZ  = 60
STEERING_RATE        = π × 0.9 rad/s   // 162 degrees/s at full input
MAX_PITCH            = 80 degrees
```

`applySteering()` runs on every fixed 60 Hz simulation tick.

Yaw and pitch integrate proportionally to input magnitude and `dt`.

Requirements:

- neutral input preserves orientation;
- held input continues rotating every fixed tick;
- no 90° snapping;
- no `GridFrame` authority;
- no render quaternion may be converted back into gameplay orientation;
- quaternions/vectors may be derived from the authoritative yaw/pitch orientation for rendering and camera use.

V2.1 initially keeps roll at zero. Roll/banking is presentation-only future work and is out of scope.

## 8. Continuous head motion

The head advances every fixed simulation step using the current continuous forward vector.

Baseline logical speed:

```text
FLIGHT_SPEED_CELLS_PER_SECOND = 6.0
```

This preserves the approximate forward progression rate of V2 while removing the 6 Hz steering cadence.

Per fixed step:

```text
unwrappedNext = unwrappedCurrent + forward × speedCellsPerSecond × dt
```

At 60 Hz and 6 cells/s, nominal travel is 0.1 cell per fixed tick.

This is intentionally much smaller than one cell, allowing smooth orientation changes before cell boundaries are crossed.

## 9. Toroidal continuous coordinates

Simulation keeps both an unwrapped local trajectory for robust traversal and a canonical wrapped logical position for gameplay/render addressing.

For each axis:

```text
wrapPointAxis(v, N) = ((v % N) + N) % N
```

Crossing `N` wraps to `0`; crossing below `0` wraps to `N`.

The wrap operation must not create a long visual interpolation across the cube.

Camera and renderer must use either:

- the unwrapped trajectory plus a presentation offset; or
- a canonical point plus an explicit wrap offset.

They must never lerp directly from approximately `N` to `0` through the full arena.

## 10. Deterministic voxel traversal bridge

### 10.1 Purpose

A continuous trajectory can cross a logical cell boundary between fixed ticks. Gameplay must know every cell entered and must never rely on sampling only the final point.

V2.1 therefore introduces a deterministic 3D voxel traversal function conceptually equivalent to Amanatides–Woo DDA:

```ts
traverseGridSegment(
  fromUnwrapped: GridPoint,
  toUnwrapped: GridPoint,
  config: GridConfig
): readonly GridCellEntry[]
```

It returns cells entered **after** the starting cell, in traversal order.

### 10.2 No tunneling

Even if a future speed/timestep change allows a segment to cross multiple cell boundaries in one fixed tick, every crossed cell must be emitted and processed sequentially.

No gameplay system may determine occupancy only by `floor(toPosition)`.

### 10.3 Toroidal mapping

Traversal operates on the unwrapped segment so boundary order is geometrically stable.

Each emitted integer voxel coordinate is canonicalized with modulo `N` before it is presented to occupancy gameplay.

Example:

```text
unwrapped X cells: 8 -> 9 -> 10
canonical N=9:     8 -> 0 -> 1
```

### 10.4 Simultaneous boundary ties

When the segment reaches multiple voxel boundaries at the same parameter `t`, V2.1 must use a deterministic supercover rule rather than an implementation-order accident.

Required contract:

- all boundary crossings at the same minimum `t` are resolved as one geometric event;
- the destination voxel after that event is emitted once;
- duplicate canonical cells are suppressed within the same fixed segment;
- tests cover two-axis and three-axis ties.

This prevents platform-dependent diagonal corner behavior.

## 11. Occupancy updates

The existing `GridSnakeState` cell chain remains the strategic body authority.

For each cell emitted by `traverseGridSegment()`:

1. evaluate self-collision against the candidate cell using the existing tail-vacate semantics;
2. if collision occurs, terminate the run immediately and do not process later cells from that same fixed tick;
3. commit one snake occupancy step into that cell;
4. update growth bookkeeping;
5. test food equality against that cell;
6. if food is collected, increment score, add pending growth and respawn food;
7. record occupancy metrics;
8. continue to the next traversed cell, if any.

A fixed tick that does not enter a new cell changes flight pose only; the occupied body chain does not advance.

This makes continuous steering responsive without converting collision into radius-based V1 behavior.

## 12. Initial state

Baseline grid remains 9³.

Initial occupied snake remains 6 cells long and aligned along the initial forward axis.

The initial flight pose must place the head at the exact center of the current logical head cell.

Initial orientation:

```text
yaw   = 0
pitch = 0
forward = +Z
```

This preserves the current launch direction.

The initial continuous trail must be coherent with the initial occupied body chain so no body pop occurs on the first movement tick.

## 13. Food

Food remains exactly one free `GridCell`.

Presentation remains centered on that cell and uses the same voxel footprint as snake segments:

```text
FOOD_VOXEL_FILL = 0.8
SNAKE_VOXEL_FILL = 0.8
```

Collection changes only in timing:

- V2 collects food when a discrete cell step lands on the food cell;
- V2.1 collects food when the continuous head trajectory **enters** the food cell according to DDA traversal.

There is no food pickup radius.

## 14. Growth

Growth contract remains:

```text
GROWTH_PER_FOOD = 2 occupied cells
```

Growth is consumed on subsequent occupancy advances exactly as in V2.

Continuous ticks that remain inside the same head cell do not consume growth because no new occupied body cell has been committed.

## 15. Self-collision

Self-collision remains exact cell occupancy.

There is no Euclidean collision radius.

The candidate entered cell is checked before commit, preserving the existing tail-vacate rule.

Continuous orientation or a visual curve cannot bypass an occupied cell: DDA emits the crossed cell and collision is evaluated.

## 16. Body presentation

The strategic body remains a cell chain, but presentation must no longer make steering feel quantized.

V2.1 uses two layers:

### 16.1 Head presentation

The head renders at the continuous flight pose every frame, interpolated between fixed 60 Hz states if necessary.

The head orientation follows the continuous flight orientation.

### 16.2 Body presentation

The existing voxel body remains based on stable segment IDs and occupied-cell history.

Body cells continue to interpolate smoothly between committed occupancy positions.

The render system may use the head's continuous position as the leading anchor so the first body segment does not visibly detach during a within-cell turn.

The implementation plan must choose the smallest render bridge that satisfies these invariants:

- no visible full-cell teleport;
- no body ID churn;
- no full-cube wrap lerp;
- no render state feeds gameplay;
- head and first body segment remain visually coherent.

A full resurrection of V1 `TrailBuffer` as gameplay authority is explicitly forbidden. A render-only continuous trail is allowed if needed.

## 17. Camera

The chase camera should consume continuous head position and continuous forward/up vectors.

This removes the current perceptual mismatch where camera interpolation can lag one grid turn behind queued input.

Existing chase offsets/FOV remain baseline unless playtesting identifies a separate camera problem.

Overview camera behavior remains unchanged.

## 18. Removal of discrete steering authority

The following V2 concepts lose gameplay authority in V2.1:

- `TurnIntent` as runtime movement input;
- `TurnIntentQueue`;
- `TURN_QUEUE_CAPACITY`;
- `GridMovementClock` as movement cadence authority;
- `rotateGridFrame()` as steering authority;
- 90° local-frame turns;
- joystick activation/rearm thresholds;
- keyboard movement `pendingIntent`.

They may temporarily exist during migration only while an old consumer remains, but no final V2.1 runtime path or V2.1 test may depend on them.

`GridFrame` may remain in historical V2 tests/docs but is not authoritative in the final V2.1 gameplay runtime.

## 19. Fixed-step and frame loop

The existing outer `FixedStepClock` remains the simulation scheduler at 60 Hz.

Main loop order becomes:

```text
read continuous keyboard state
read continuous joystick state
combine + clamp SteeringInput
↓
FixedStepClock @ 60 Hz
  applySteering(input, dt)
  advance continuous head pose
  traverse old->new unwrapped segment
  for each entered cell:
    collision
    occupancy commit
    food/growth
    metrics/result
↓
render interpolation alpha
continuous head/body presentation
camera
renderer
```

There is no second 6 Hz movement clock.

## 20. Responsiveness contract

Under normal 60 Hz fixed simulation:

- a changed held input begins affecting orientation on the next fixed step;
- nominal control latency attributable to simulation cadence is therefore ≤ 16.67 ms, excluding browser/event scheduling;
- steering does not wait for a cell boundary;
- steering does not wait for joystick recenter;
- steering does not wait behind historical turns.

This is the principal acceptance criterion for V2.1.

## 21. Persistence and ruleset identity

The movement model materially changes competitive difficulty. V2.1 must therefore use a distinct ruleset identity:

```text
RULESET_ID = 'pixel-flight-grid-v2-1'
```

V2 score remains:

```text
score = foodsCollected
```

V2.1 must not overwrite the existing V2 personal-best record.

Recommended new local key:

```text
snek.localBest.pixelGridV2_1
```

Existing V1 and V2 history remains preserved.

The current HTTP V1 ranking backend remains unsupported for V2.1 unless a separate backend contract is explicitly introduced.

## 22. Metrics and tuning

The current grid-pressure metrics remain useful, but tuning results from strict V2 are not directly comparable to V2.1 because movement freedom changes.

V2.1 tuning must record at least:

- foods collected;
- occupied length;
- duration;
- death cause;
- occupancy ratio;
- first pressure time;
- first confinement time;
- total grid-cell entries;
- average steering magnitude;
- maximum consecutive fixed ticks with non-zero steering.

The deterministic V2 greedy-turn policy is no longer a valid V2.1 control policy and must not be silently reused as if equivalent.

A deterministic V2.1 benchmark policy may be added later, but human playtesting is mandatory before declaring control feel accepted.

## 23. Test strategy

### 23.1 Input unit tests

Must prove:

- held keyboard right continuously exposes `yaw=+1` until release;
- held left exposes `yaw=-1`;
- held up exposes `pitch=+1`;
- held down exposes `pitch=-1`;
- opposing keys cancel;
- joystick right/left/up/down signs match keyboard signs;
- joystick deflection is proportional;
- joystick deadzone is stable;
- no rearm/latch behavior remains.

### 23.2 Steering tests

Must prove:

- full yaw input integrates by `STEERING_RATE × dt`;
- partial input integrates proportionally;
- held input continues rotating across multiple ticks;
- pitch clamps at ±80°;
- neutral input preserves orientation;
- deterministic fixed-step chunking produces equivalent orientation.

### 23.3 Traversal tests

Must prove:

- movement inside one cell emits no cell entry;
- one boundary emits exactly one new cell;
- multi-cell segment emits every cell in order;
- X/Y/Z wrap canonicalizes correctly;
- two-axis tie is deterministic;
- three-axis tie is deterministic;
- no duplicates from one geometric boundary event;
- high-speed traversal cannot skip an occupied collision cell or food cell.

### 23.4 RunState tests

Must prove:

- steering updates at 60 Hz independent of cell entry;
- occupancy changes only when a new cell is entered;
- food is collected on cell entry;
- growth remains +2 occupied cells;
- tail-vacate collision semantics remain correct;
- collision terminates processing of later cell entries in the same tick;
- score remains foods collected;
- ruleset/persistence are isolated from V2.

### 23.5 Browser/E2E tests

Must prove on desktop and mobile:

- holding right produces continuous right steering without repeated taps;
- holding left produces continuous left steering;
- holding up/down continuously changes pitch;
- joystick can move from right directly through center to left and continue steering without a discrete rearm protocol;
- joystick can trace a circular/diagonal motion without ignored commands;
- no stale queued turn executes after controls return neutral;
- camera remains coherent through continuous turns and toroidal wrap;
- V2.1 does not submit to the unsupported legacy ranking API.

## 24. Migration sequence

Implementation must proceed in this order so each layer has one authority:

1. introduce continuous input sign contract and steering state;
2. introduce continuous flight orientation and pose in logical grid coordinates;
3. implement deterministic toroidal voxel traversal with exhaustive tests;
4. feed cell-entry stream into existing snake occupancy/collision/food/growth;
5. replace RunState discrete movement clock and turn queue;
6. migrate main loop to continuous steering at the 60 Hz fixed clock;
7. adapt head/body presentation and camera;
8. introduce V2.1 persistence/ruleset identity;
9. remove obsolete runtime discrete-control authority;
10. run full unit/worker/typecheck/build/E2E verification;
11. human playtest control feel;
12. PR/review/merge only after the exact candidate SHA is green.

No task may leave both old and new movement authorities active in the final runtime path.

## 25. Explicit non-goals

V2.1 does not include:

- multiplayer;
- online V2.1 leaderboard backend;
- roll/banking gameplay;
- acceleration/throttle controls;
- free analog speed control;
- changing the 9³ baseline for this migration;
- changing growth per food;
- changing the completion target;
- redesigning the intro/username/game-over product flow;
- cosmetic redesign unrelated to control readability.

## 26. Acceptance criteria

V2.1 is acceptable only when all of the following are true:

1. Keyboard and joystick use one canonical continuous axis-sign convention.
2. Holding a direction continuously steers; repeated tapping is not required.
3. Joystick steering does not require recenter/rearm between commands.
4. No `TurnIntentQueue` participates in V2.1 runtime steering.
5. No 6 Hz movement clock gates orientation response.
6. Continuous steering is integrated at the existing 60 Hz fixed simulation cadence.
7. Head motion is continuous logical grid-space motion, not world-space gameplay authority.
8. Deterministic voxel traversal emits every cell entered by the continuous path.
9. Self-collision remains exact occupied-cell collision.
10. Food remains exactly one free logical cell and is collected by cell entry, not radius.
11. Growth remains +2 occupied cells per food.
12. Toroidal wrap remains correct on all three axes without long visual lerps.
13. Voxel snake/food visual identity remains intact.
14. V2.1 score/persistence is separated from V2 because the movement ruleset changed.
15. Full automated verification is green on the exact candidate SHA.
16. Human playtest confirms that control no longer feels latched, delayed or stale.

## 27. Verification gate

The final candidate must pass, at minimum:

```bash
npm audit --omit=dev --audit-level=moderate
npm test
npm run test:worker
npm run typecheck
npm run worker:build
npm run build
npm run test:e2e
```

Any new dedicated traversal/control benchmark command introduced by the implementation plan must also pass.

Fresh evidence must refer to the exact candidate SHA. A green run from a previous SHA is not sufficient.

## 28. Release discipline

Development must occur on an isolated feature branch derived from the accepted V2.1 documentation SHA.

`main` remains deployable until the V2.1 candidate is accepted.

Release sequence:

```text
written spec approved
-> implementation plan approved
-> isolated feature branch
-> TDD implementation
-> code review
-> fresh CI on candidate SHA
-> human control playtest
-> PR
-> merge
-> fresh main CI
-> GitHub Pages deploy verification
```

No direct development on `main`.
