# SNEK RENAISSANCE — Pixel Flight Grid V2.2 Pixel Motion Design

Status: **APPROVED — CANONICAL DESIGN**  
Date: 2026-10-17  
Baseline `main`: `fd852aa54081a1026d146ead06c4778738c2f6ef`  
Supersedes: presentation/motion portions of Pixel Flight Grid V2.1 only.  
Preserves: V2.1 continuous steering, 60 Hz simulation, toroidal DDA traversal, exact GridCell gameplay authority, 9³ arena, voxel sizes, growth rules, and collision semantics unless explicitly changed below.

---

## 1. Problem statement

Pixel Flight Grid V2.1 corrected the control architecture by replacing discrete queued 90° commands with continuous keyboard/joystick steering and continuous `FlightPose` navigation. That solved input latency, joystick rearm/latch behavior, stale command FIFO behavior, and non-smooth steering.

However, V2.1 coupled continuous navigation to continuous visible snake placement. The rendered head follows interpolated `FlightPose` coordinates every frame, and body voxels are sampled from a continuous `FlightTrail`. This removed an important product identity: **the snake itself must move in visibly discrete pixel/voxel steps.**

V2.1 also creates a visual mismatch between snake and food. Gameplay consumes food when the DDA enters the food's `GridCell`, but the food mesh is fixed to that cell center while the head can traverse any continuous point inside the cell. Therefore gameplay can report a pickup without the head visibly occupying the same point as the food.

V2.2 corrects both problems without reverting V2.1 steering.

---

## 2. Product intent

The intended feel is:

```text
CONTROL        smooth / continuous
NAVIGATION     smooth / continuous internally
CELL ENTRY     discrete and exact
SNAKE MOTION   visibly pixelated / snapped
BODY           visibly pixelated / snapped
FOOD           exact same lattice as snake
COLLISION      exact GridCell authority
CAMERA         smooth
```

The core principle is:

> **Quantize the spatial outcome, not the input.**

Holding a direction must remain continuously responsive, but the visible snake must only occupy discrete voxel-cell positions.

---

## 3. Non-goals

V2.2 does **not**:

- restore `TurnIntentQueue`;
- restore `GridMovementClock` as a second movement authority;
- restore joystick activation/rearm thresholds;
- restore one-turn-per-keypress semantics;
- return to mandatory 90° steering decisions;
- remove 60 Hz continuous steering/navigation;
- convert the game into a permanent 2D slice;
- change the 9×9×9 toroidal arena;
- add tweening between visible snake cells;
- use a shader-only pixelation trick as a substitute for real spatial quantization.

---

## 4. Canonical authority model

V2.2 has two deliberately separate domains.

### 4.1 Navigation authority

Navigation remains continuous and invisible:

```text
Keyboard / Joystick
        ↓
SteeringInput { yaw, pitch }
        ↓
FlightPose @ 60 Hz
        ↓
continuous unwrapped trajectory
        ↓
Toroidal DDA
        ↓
ordered GridCellEntry[]
```

`FlightPose` remains authoritative for steering direction and trajectory generation only.

### 4.2 Visible gameplay authority

Visible snake placement is discrete:

```text
GridCellEntry
        ↓
GridSnakeState
        ↓
segment.cell
        ↓
cellToWorld(segment.cell)
        ↓
voxel renderer
```

No visible snake voxel may derive its position directly from interpolated `FlightPose`, `FlightTrail.sampleBehind()`, or arbitrary continuous world coordinates.

---

## 5. Hard invariants

The following invariants are normative.

### 5.1 Head placement

For the active head segment:

```text
visibleHeadWorld === cellToWorld(snakeHead(run.snake).cell, run.config)
```

The head is stationary between logical cell entries and snaps exactly once when a new cell entry commits.

### 5.2 Body placement

For every body segment `segment`:

```text
visibleSegmentWorld(segment.id) === cellToWorld(segment.cell, run.config)
```

Stable segment IDs remain mandatory.

### 5.3 Food placement

For active food:

```text
visibleFoodWorld === cellToWorld(run.food, run.config)
```

### 5.4 Pickup visual identity

Immediately before food respawn, if:

```text
head.cell === food.cell
```

then necessarily:

```text
visibleHeadWorld === visibleFoodWorld
```

A food pickup must never be logically valid while appearing spatially disconnected from the head.

### 5.5 One lattice

Background grid, snake cells, food cells, collision cells, and growth occupancy all use the same `GridConfig` and the same `cellToWorld()` transform.

There is no second visual grid.

### 5.6 No visible interpolation of snake position

The snake renderer must not receive linearly interpolated position samples between adjacent cells.

Orientation and camera may smooth independently, but snake voxel position may not.

---

## 6. Meaning of “same plane”

For V2.2, “food on the same plane as the snake” means the food and snake are registered to the **same voxel lattice and exact cell-center transform**, such that a valid pickup occurs only when the visible head occupies the same rendered cell position as the food.

This does not reduce the 3D arena to one fixed 2D plane. The snake may still steer through X/Y/Z space. The contract is spatial registration, not dimensional reduction.

If a future design intentionally introduces a fixed or dynamically constrained 2D gameplay plane, that is a separate ruleset change and is out of scope for V2.2.

---

## 7. Steering behavior

V2.1 steering semantics remain unchanged.

### Keyboard

Holding a key continuously contributes steering input every fixed simulation tick:

```text
A / ←  continuous yaw
D / →  continuous yaw
W / ↑  continuous pitch
S / ↓  continuous pitch
```

No keydown-only logical command is allowed.

### Joystick

Joystick displacement remains proportional continuous input.

Required behavior:

- no rearm threshold;
- no one-command latch;
- right → center → left may happen within one pointer gesture;
- diagonal steering remains valid;
- releasing/centering input returns steering to neutral immediately.

---

## 8. Cell-entry quantization

The DDA remains the sole bridge between continuous navigation and discrete gameplay.

For each simulation tick:

1. advance `FlightPose` continuously;
2. traverse the segment from previous to next unwrapped position;
3. emit every crossed `GridCellEntry` in deterministic order;
4. process entries sequentially;
5. commit snake occupancy on each accepted cell entry;
6. render the resulting discrete `GridSnakeState`.

Visible motion therefore occurs only as a consequence of accepted cell entries.

This is spatial quantization at the gameplay boundary, not input quantization.

---

## 9. Head orientation

Head **position** is discrete. Head **orientation** must not reintroduce spatial smoothing artifacts.

V2.2 uses the direction of the most recently committed cell transition as the canonical visible head direction.

The renderer supports six deterministic cardinal orientations:

```text
+X
-X
+Y
-Y
+Z
-Z
```

When multiple cell entries occur in one simulation tick, the visible orientation after the tick corresponds to the last committed entry.

No fractional orientation is required for the voxel head itself.

The continuous `FlightPose.orientation` remains internal navigation state and camera guidance; it is not direct head-mesh orientation authority.

---

## 10. Body rendering

`FlightTrail` must cease to be visible body-position authority.

Canonical body render snapshot:

```text
run.snake.segments
    .slice(1)
    .map(segment => ({
      id: segment.id,
      position: cellToWorld(segment.cell, run.config)
    }))
```

The body remains voxelized, with one rendered body voxel per strategic body segment.

`FlightTrail` may be retained only if an independently justified non-gameplay consumer still needs it. Otherwise it should be retired from active runtime after tests prove it is unnecessary.

---

## 11. Food system

Food remains `GridCell`-authoritative.

### Spawn

Food spawns only in free strategic cells according to the existing free-cell authority unless a defect is demonstrated.

V2.2 does not add a separate continuous food coordinate.

### Render

Food render position is exactly:

```text
cellToWorld(foodCell, config)
```

### Size

The food voxel remains:

```text
0.8 × cellSize
```

matching the snake voxel footprint.

### Pickup

Pickup remains exact-cell based, but V2.2 adds the visual invariant that the consumed food cell and committed head cell have identical world-center coordinates at collection time.

The runtime may respawn food immediately after collection. Verification must capture the consumed cell/world center as part of the collection event or test fixture; no gameplay delay is introduced solely for observability.

---

## 12. Background grid registration

The six arena grid faces continue to use `GridConfig.worldSize` and `GridConfig.resolution`.

The visual grid is not gameplay authority, but its divisions must remain registered to the same cell dimensions used by snake and food.

No additional offset, scale, or alternate cell spacing is allowed between:

- grid-face divisions;
- `cellToWorld()` centers;
- snake voxel size;
- food voxel size.

A visual cell must read as the same spatial unit used by gameplay.

---

## 13. Camera behavior

The chase camera remains smooth.

The camera must not make the snake itself interpolate.

Recommended authority split:

```text
snake target position: discrete cell center
camera actual position: damped/smoothed
camera look direction: may use continuous FlightPose guidance where useful
```

The camera may smooth across a snake snap so the screen does not jerk at the same cadence as the voxel motion.

At toroidal wrap boundaries, camera smoothing must use wrap-aware shortest/continuous display space and must not visibly fly across the full cube.

Overview camera behavior remains unchanged unless required by registration tests.

---

## 14. Toroidal wrap

Snake snap across a wrap boundary must be visually atomic.

Example for resolution 9:

```text
cell 8 → cell 0
```

must render as a boundary wrap, not an interpolation through cells 7,6,5… or through the cube center.

Gameplay remains governed by toroidal DDA and wrapped `GridCell` coordinates.

---

## 15. Timing and cadence

Simulation remains fixed-step at 60 Hz.

Flight speed remains initially:

```text
6 cells / second
```

Therefore visible cell-entry cadence is trajectory-dependent but approximately 6 cell crossings per second for axis-aligned flight.

V2.2 does not introduce a second presentation clock.

If later playtesting requires a different visual cadence, tuning `FLIGHT_SPEED_CELLS_PER_SECOND` is allowed only through a separate measured tuning decision, not by adding another discrete movement authority.

---

## 16. Ruleset and persistence

Because V2.2 materially changes visible movement and pickup affordance while preserving the strategic scoring model, it receives a distinct local ruleset identity:

```text
RULESET_ID = 'pixel-flight-grid-v2-2'
local best key = 'snek.localBest.pixelGridV2_2'
```

Historical V1, V2, and V2.1 local best values remain intact and independent.

The legacy ranked HTTP backend remains unsupported unless separately upgraded to explicitly accept V2.2.

No V2.2 score may be silently submitted under an older ruleset ID.

---

## 17. Runtime modules expected to change

Likely active-runtime changes:

- `src/main.ts`
- `src/game/run-state.ts`
- `src/game/grid-types.ts` or a small direction helper if needed for last-entry direction
- `src/game/grid-config.ts`
- `src/app/identity.ts`
- `src/app/app-controller.ts`
- `src/render/snake-renderer.ts` only if snapshot contract needs tightening
- `src/render/chase-camera.ts`
- `src/render/flight-presentation.ts` may be reduced to camera/navigation presentation responsibilities
- `src/render/flight-trail.ts` may become historical/unused and removable
- tests across unit/integration/E2E
- README

Food renderer itself should remain simple and cell-centered unless tests expose another defect.

---

## 18. Architectural forbidden paths

Active V2.2 runtime must reject reintroduction of:

```text
TurnIntentQueue
GridMovementClock
queueTurnIntent
JOYSTICK_ACTIVATION_THRESHOLD
JOYSTICK_REARM_THRESHOLD
pendingIntent
takeIntent
LogicalTransition
buildRenderTransition
interpolateTransition
```

Additionally, active snake rendering must reject direct positional dependence on:

```text
FlightTrail.sampleBehind
FlightPresentation.unwrappedGridPoint
FlightPresentation.displayedHeadWorld
```

for snake voxel placement.

These values may remain valid for camera/debug/navigation only where explicitly justified.

---

## 19. Test contract

V2.2 is not accepted without automated proof of all of the following.

### Unit

- `cellToWorld()` gives identical world coordinates for equal head/food cells;
- head render position derives exactly from head `GridCell`;
- every body render position derives exactly from segment `GridCell`;
- six cardinal head orientations are deterministic;
- food and snake retain `0.8 × cellSize` footprint;
- V2.2 local best key is independent from V1/V2/V2.1;
- authority scanner rejects continuous snake-position sources.

### Integration

- held keyboard steering changes future DDA cell sequence continuously without repeated keydown;
- held joystick steering changes future DDA cell sequence continuously without rearm;
- snake render snapshot stays unchanged between cell entries even though `FlightPose` changes;
- one accepted cell entry produces one visible snap;
- food pickup occurs at exact visible head/food cell coincidence;
- growth preserves cell-aligned body positions and stable IDs;
- toroidal wrap produces correct discrete destination cell without cross-cube interpolation.

### E2E desktop

- hold left/right/up/down and observe continuous control with discrete visible snake steps;
- neutral input creates no latent turn behavior;
- repeated rendered positions between entries are identical;
- next cell entry changes head position by exactly one lattice step or one toroidal wrap step;
- food pickup visual coincidence is observable through test telemetry.

### E2E mobile

- joystick right → center → left in one pointer gesture remains continuous;
- diagonal joystick steering remains responsive;
- visible snake position remains cell-snapped throughout;
- portrait and landscape layouts preserve control behavior.

### Camera

- chase camera remains smooth while snake snaps;
- wrap does not cause camera to traverse the arena incorrectly.

---

## 20. Human acceptance criteria

Before merge to `main`, human playtest must explicitly confirm:

1. the snake visibly moves in pixel/voxel steps again;
2. controls still feel continuous and responsive;
3. no command queue/latch feeling returns;
4. food visually sits on the same grid/lattice as the snake;
5. every visible food pickup looks like real contact;
6. body voxels remain discrete rather than forming a smooth continuous curve;
7. camera remains comfortable despite discrete snake movement;
8. desktop and mobile both preserve the same control semantics.

---

## 21. Release gate

Release order is mandatory:

```text
spec approved
↓
implementation plan approved
↓
isolated feature branch
↓
TDD RED/GREEN by task
↓
full CI green on exact candidate SHA
↓
human playtest accepted
↓
normal PR merge to main
↓
post-merge CI green
↓
GitHub Pages deploy green on exact main SHA
```

No direct development on `main`.

---

## 22. Canonical V2.2 statement

Pixel Flight Grid V2.2 preserves **continuous steering and continuous internal navigation**, but restores **true discrete voxel motion** as the visible gameplay language.

The canonical split is:

```text
INPUT         = CONTINUOUS
NAVIGATION    = CONTINUOUS
DDA           = CONTINUOUS→DISCRETE BRIDGE
OCCUPANCY     = GRIDCELL
SNAKE POSITION= GRIDCELL CENTER ONLY
BODY POSITION = GRIDCELL CENTER ONLY
FOOD POSITION = GRIDCELL CENTER ONLY
PICKUP        = EXACT SAME CELL / SAME WORLD CENTER
CAMERA        = SMOOTH
```

This separation is the product identity and architectural invariant of V2.2.