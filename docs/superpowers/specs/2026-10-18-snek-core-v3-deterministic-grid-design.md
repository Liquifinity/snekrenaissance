# SNEK CORE V3 — Deterministic Grid Movement

Status: SPEC DRAFT FOR REVIEW  
Date: 2026-10-18  
Baseline `main`: `b0f92be886ba7d3fa30cc2472cd5491e33873dc2`  
Supersedes as movement authority: Pixel Flight Grid V2.2 continuous `FlightPose` + DDA locomotion

## 1. Product intent

SNEK exists to be immediately understandable, responsive, playful, and reliable. The player must be able to infer why the snake entered its current cell and predict the next cell from visible state plus their own input.

The V2.2 runtime is deterministic internally, but it violates this product requirement because visible snake positions are discrete `GridCell` centers while the next cell is still selected by an invisible continuous `FlightPose` trajectory crossing voxel boundaries through DDA. That hidden subcell state makes movement difficult to predict even when the implementation is mathematically deterministic.

SNEK CORE V3 removes that mismatch.

## 2. Core design rule

### Visible State Authority Rule

Any state that can change gameplay must have one authoritative representation whose meaning corresponds directly to what the player can see.

For locomotion, the only authority is:

```text
GridCell + GridFrame + PendingTurn
```

The next snake cell MUST NOT depend on:

- continuous position;
- subcell position;
- `FlightPose`;
- yaw or pitch accumulation;
- continuous forward vectors;
- ray/segment voxel traversal;
- DDA;
- interpolated render state;
- camera state.

A valid implementation must make it possible to determine `nextCell` using only the current strategic grid state and the current pending turn.

## 3. Goals

V3 MUST provide:

1. deterministic face-adjacent movement;
2. exactly one strategic cell transition per gameplay step;
3. relative 3D Snake controls: left, right, up, down;
4. edge-triggered keyboard turns: one press means one turn;
5. a single pending turn where the latest valid input before the next step wins;
6. a joystick state machine that generates turn intents without continuous yaw/pitch;
7. toroidal wrapping with no diagonal transition;
8. collision, food, growth, scoring, and rendering all based on the same `GridCell` authority;
9. pixel/voxel movement with no positional interpolation of the snake;
10. smooth camera motion that is presentation-only;
11. architectural tests preventing V2.1/V2.2 continuous locomotion authority from returning.

## 4. Non-goals

V3 does NOT introduce:

- continuous flight steering;
- analog snake speed;
- acceleration;
- roll;
- diagonal snake movement;
- arbitrary-angle snake orientation;
- path prediction or pathfinding;
- multiplayer;
- online V3 leaderboard support;
- a new rendering style;
- a redesign of score/growth rules unless required for deterministic movement.

## 5. Strategic state

The runtime authority should converge on the following conceptual state:

```ts
RunState {
  phase
  config
  snake
  frame
  pendingTurn
  food
  foodsCollected
  score
  maxLength
  elapsedMs
  result
}
```

### 5.1 `snake`

The snake remains a strategic ordered chain of stable segment IDs and `GridCell`s.

The head is `snake.segments[0].cell`.

No continuous position belongs to snake gameplay state.

### 5.2 `GridFrame`

`GridFrame` defines the snake's current local orientation:

```ts
GridFrame {
  forward: GridDirection
  right: GridDirection
  up: GridDirection
}
```

`GridDirection` remains exactly:

```text
+X -X +Y -Y +Z -Z
```

Initial frame:

```text
F = +Z
R = -X
U = +Y
```

Invariant:

```text
right = cross(forward, up)
```

No orientation outside the six cardinal directions is valid gameplay state.

### 5.3 `pendingTurn`

Exactly one pending strategic intent is allowed:

```ts
'left' | 'right' | 'up' | 'down' | 'none'
```

There is no command queue.

If several valid turn inputs arrive before the next strategic step, the most recent input replaces the previous `pendingTurn`.

After a strategic step consumes the pending turn, it resets to `none`.

## 6. GridFrame turn algebra

Turns are exact discrete transforms.

Given `(F, R, U)`:

```text
LEFT:
F' = -R
R' =  F
U' =  U

RIGHT:
F' =  R
R' = -F
U' =  U

UP:
F' =  U
R' =  R
U' = -F

DOWN:
F' = -U
R' =  R
U' =  F
```

Every transform MUST preserve an orthonormal cardinal frame and the `right = cross(forward, up)` invariant.

A turn changes orientation once. Holding the same physical control does not repeatedly turn the snake.

## 7. Input semantics

### 7.1 Keyboard

Keyboard input is edge-triggered for turns.

Mappings:

```text
A / ArrowLeft  -> LEFT
D / ArrowRight -> RIGHT
W / ArrowUp    -> UP
S / ArrowDown  -> DOWN
X               -> camera toggle, unchanged
```

A physical keydown creates at most one turn intent until that same key is released.

Operating contract:

```text
keydown D
-> pendingTurn = RIGHT

D remains held
-> no additional RIGHT intents

keyup D
-> D becomes eligible to generate a future RIGHT intent
```

If another turn key is pressed before the next gameplay step, that newer intent replaces the older pending intent.

Example:

```text
RIGHT
then UP
before next step
=> pendingTurn = UP
```

There is no historical command queue and no delayed playback of stale inputs.

### 7.2 Joystick

The joystick is NOT an analog yaw/pitch controller in V3.

It is a four-sector turn-intent selector around a neutral deadzone:

```text
       UP

LEFT        RIGHT

      DOWN
```

Required state machine:

```text
NEUTRAL -> RIGHT  => emit RIGHT once
RIGHT   -> RIGHT  => emit nothing
RIGHT   -> UP     => emit UP once
UP      -> NEUTRAL => emit nothing
NEUTRAL -> UP     => emit UP once
```

A sector transition may replace `pendingTurn` immediately before the next strategic step.

Returning to neutral re-enables emission of the same sector later. Moving directly from one non-neutral sector to another emits the new sector without requiring pointer-up.

The joystick may retain analog pointer coordinates for UI knob placement only. Magnitude and continuous angle MUST NOT influence `nextCell`.

## 8. Strategic step clock

Snake gameplay is discrete and uses one strategic movement cadence.

Initial V3 cadence:

```text
GRID_STEPS_PER_SECOND = 6
GRID_STEP_SECONDS = 1 / 6
```

The exact implementation may reuse the existing timing infrastructure, but there MUST be exactly one authority that decides when a strategic snake step occurs.

`requestAnimationFrame` is presentation timing only.

A display running at 60 Hz, 120 Hz, or 144 Hz must produce the same strategic trajectory for the same ordered input events and elapsed gameplay steps.

No hidden 60 Hz locomotion simulation may move a continuous snake between strategic steps.

## 9. Strategic movement transaction

Each gameplay step performs one transaction in this order:

```text
1. read pendingTurn
2. transform GridFrame at most once
3. reset pendingTurn to none
4. compute nextCell from head + frame.forward
5. apply toroidal wrap
6. evaluate precommit self-collision with existing tail-vacate semantics
7. if collision: game-over; do not commit movement
8. commit exactly one head cell
9. resolve food collection
10. apply growth
11. respawn food if needed
12. update score/maxLength/result state
```

### 9.1 `nextCell`

`nextCell` MUST be computed from the current head cell and one cardinal `frame.forward` vector.

For non-wrap movement, Manhattan distance from old head to new head MUST equal exactly 1.

For wrap movement, exactly one axis wraps by one logical cell transition. A step MUST NOT alter two or three axes simultaneously.

### 9.2 No DDA

`traverseGridSegment()` MUST NOT participate in V3 run-state movement.

DDA may remain temporarily as historical code while migration is in progress, but the architectural boundary test must reject any import or call from active V3 locomotion.

## 10. Collision

Collision remains cell-exact.

Before committing `nextCell`, V3 calls the existing collision rule with the intended destination and preserves correct tail-vacate behavior.

A collision has no partial movement and no intermediate geometric state.

```text
valid destination -> commit one cell
invalid destination -> commit zero cells + game-over
```

## 11. Food

Food remains exactly one valid `GridCell` in the same lattice as the snake.

Rendering:

```text
snake cell -> cellToWorld()
food cell  -> cellToWorld()
```

Collection condition:

```text
head.cell === food.cell
```

Therefore a successful food pickup necessarily means that the visible head and visible food share the same world-space cell center at the moment of collection.

Food spawn MUST exclude currently occupied snake cells.

V3 does not introduce a second food coordinate system, projected food plane, or continuous food position.

## 12. Growth and score

Unless a later product decision explicitly changes them, V3 preserves the current product rules:

```text
growthPerFood = existing configured value
score = foodsCollected
completion target = existing configured target
```

Growth is applied only after an exact cell pickup.

## 13. Rendering

Snake rendering remains pixel/voxel discrete.

Head and body positions derive only from strategic segment cells:

```text
segment.cell -> cellToWorld()
```

There is no snake-position interpolation between cell centers.

Stable segment IDs are preserved.

The renderer MUST NOT import or consume continuous locomotion state to determine snake voxel positions.

## 14. Camera

The chase camera remains smooth and presentation-only.

It may damp toward snapped snake targets using frame time.

Camera state MUST NOT affect:

- `GridFrame`;
- turn interpretation;
- `nextCell`;
- collision;
- food;
- score.

The overview camera toggle remains presentation-only.

## 15. What V3 removes from gameplay authority

The following concepts are explicitly retired from active locomotion authority:

```text
FlightPose.unwrappedPosition
FlightPose.wrappedPosition
FlightPose.orientation
continuous yaw
continuous pitch
STEERING_RATE
MAX_PITCH
FLIGHT_SPEED_CELLS_PER_SECOND
advanceFlightPose() for snake movement
forward-vector quantization for next movement
traverseGridSegment() / DDA for next movement
continuous SteeringInput as movement authority
```

They may survive temporarily in historical modules or tests during migration, but active V3 movement must not depend on them.

## 16. Components preserved from V2.2

V3 should reuse proven components where their authority remains correct:

- `GridCell` and `GridDirection` types;
- toroidal grid topology helpers;
- `GridConfig` resolution/cell sizing;
- strategic snake occupancy and stable segment IDs;
- tail-vacate self-collision semantics;
- growth bookkeeping;
- food spawning and exact-cell collection concepts;
- `cellToWorld()`;
- voxel snake renderer;
- food renderer;
- chase/overview camera presentation infrastructure;
- UI flow;
- persistence framework;
- CI, unit, integration, and Playwright infrastructure.

Reuse is subordinate to the V3 authority rules. A V2.2 component that requires hidden continuous movement authority must be adapted or removed rather than preserved by inertia.

## 17. Ruleset and persistence

V3 receives its own ruleset identity and local-best namespace so behavioral semantics do not collide with V2.2 history.

Normative identifiers:

```text
RULESET_ID = snek-core-v3
local best key = snek.localBest.coreV3
```

V1/V2/V2.1/V2.2 persistence remains untouched.

The current HTTP ranking backend remains unsupported for V3 unless separately designed and versioned.

## 18. Determinism contract

Given:

- identical initial state;
- identical RNG sequence for food spawn;
- identical ordered turn-intent events assigned to the same strategic step boundaries;

V3 MUST produce identical:

- `GridFrame` sequence;
- head-cell sequence;
- body-cell sequence;
- food pickups;
- collision outcome;
- score;
- result.

Render framerate and camera state must not alter any of these outputs.

## 19. Required architectural boundary tests

V3 must add tests that fail if active run-state locomotion regains hidden continuous authority.

At minimum, active V3 movement files must reject runtime dependence on:

```text
advanceFlightPose
traverseGridSegment
FlightPose
SteeringInput yaw/pitch authority
quantizeForwardToGridDirection for movement
FlightPresentation for movement
camera state for movement
```

The tests should inspect both imports and prohibited active symbols where practical.

## 20. Required behavioral tests

### 20.1 GridFrame algebra

Test all four turns from representative frames and prove:

- cardinal outputs only;
- orthogonal axes;
- right-hand invariant;
- four RIGHT turns return to the original frame;
- four LEFT turns return to the original frame;
- four UP turns return to the original frame;
- four DOWN turns return to the original frame.

### 20.2 One-step movement

For all six forward directions:

- exactly one axis changes;
- non-wrap Manhattan distance is 1;
- wrap changes the expected axis only;
- no diagonal entries exist.

### 20.3 Pending-turn semantics

Prove:

```text
no input -> forward
RIGHT once -> one RIGHT transform
RIGHT held -> no repeated transform
RIGHT then UP before step -> UP wins
pending turn consumed -> none
```

### 20.4 Keyboard

Prove one intent per keydown/release cycle and no autorepeat-induced additional turns.

### 20.5 Joystick

Prove:

- neutral emits none;
- neutral -> sector emits once;
- same sector held emits no repeats;
- sector -> different sector emits new intent immediately;
- neutral re-arms the same sector;
- pointer-up/cancel returns neutral;
- analog magnitude never changes strategic destination.

### 20.6 Collision

Prove collision is evaluated before commit and preserves tail-vacate semantics.

### 20.7 Food

Prove a pickup can occur only when committed head cell equals food cell and both map to identical `cellToWorld()` coordinates.

### 20.8 Deterministic long-run harness

Run long deterministic scenarios, including at least 1,000 strategic steps where no terminal collision is intentionally introduced, and prove identical trajectories across repeated runs with the same inputs/RNG.

The harness must additionally assert that every committed step is face-adjacent modulo toroidal wrap.

### 20.9 Browser E2E

Browser-level tests must prove:

- visible snake motion is pixel-stepped;
- one keyboard press causes exactly one relative turn;
- holding a key does not continuously spin the snake;
- a newer turn before the next step replaces the older pending turn;
- joystick sector transitions are predictable;
- mobile sector changes work without pointer-up;
- food pickup is visibly cell-coincident;
- camera remains smooth but cannot change strategic direction;
- wrap remains deterministic.

## 21. Product acceptance criteria

Human playtest acceptance requires all of the following:

1. Without input, the snake travels straight indefinitely until gameplay state causes a collision.
2. A single LEFT/RIGHT/UP/DOWN command causes exactly one understandable 90-degree relative turn.
3. Holding a turn control does not make the snake spiral or continue rotating.
4. The player can look at the snake's current heading and predict the next cell.
5. Every visible movement is one voxel step.
6. No diagonal jumps occur.
7. Food contact visually matches food collection.
8. Mobile joystick changes feel immediate but not unstable.
9. Camera motion does not change steering behavior.
10. Repeating the same deterministic test input produces the same path.

## 22. Migration strategy

V3 is an authority replacement, not a tuning patch.

Recommended migration order:

```text
1. establish new V3 GridFrame + pending-turn contracts with RED tests
2. establish exact cardinal nextCell stepping with RED tests
3. migrate RunState away from FlightPose/DDA movement authority
4. migrate keyboard to edge-triggered turn intents
5. migrate joystick to explicit sector-state intents
6. render directly from strategic cells
7. adapt chase camera to GridFrame/snapped head presentation only
8. version ruleset/persistence as V3
9. strengthen architecture scanner
10. retire unreachable continuous locomotion modules from active runtime
11. full unit/integration/E2E verification
12. human playtest
13. only then merge/release
```

At no point should V2.2 continuous locomotion be partially mixed with V3 cardinal movement in the same active run-state path.

## 23. Release gate

No merge to `main` until all automated gates are green on the exact candidate SHA and human playtest explicitly accepts V3 behavior.

The V2.2 production baseline remains recoverable until V3 is accepted and released.

## 24. Design summary

The V3 runtime contract is:

```text
INPUT EVENT
    ↓
ONE PENDING RELATIVE TURN
    ↓
GRIDFRAME
    ↓
ONE CARDINAL NEXT CELL
    ↓
COLLISION
    ↓
COMMIT ONE GRIDCELL
    ↓
FOOD / GROWTH / SCORE
    ↓
VOXEL RENDER

CAMERA = PRESENTATION ONLY
```

The essential product rule is:

```text
PRESS
↓
TURN ONCE
↓
STEP ONE CELL
↓
SEE EXACTLY WHAT YOU EXPECTED
```
