# SNEK RENAISSANCE — Pixel Flight Grid V2 Design

Status: DESIGN APPROVED / AWAITING WRITTEN SPEC REVIEW  
Date: 2026-10-16  
Repository: `Liquifinity/snekrenaissance`  
Baseline branch: `main`  
Baseline SHA: `3b557097aac54c8f5854944e8b95dbb3c564ccae`  
Ruleset ID: `pixel-flight-grid-v2`

## 1. Purpose

Pixel Flight Grid V2 changes the spatial authority of SNEK RENAISSANCE from continuous free-flight to a deterministic three-dimensional voxel grid while preserving smooth visual motion, toroidal wrap, the browser-first product flow, local-first identity/persistence, mobile controls, the existing camera toggle, and the future ranking seam.

The product objective is not to place a conventional 2D Snake inside a box. The intended result is a three-dimensional Snake whose core difficulty emerges from progressive occupation of a finite volumetric world:

- each logical body element occupies a recognizable voxel;
- safe routes shrink as the snake grows;
- self-collision becomes a spatial planning problem;
- movement remains visually smooth through interpolation;
- difficulty is driven primarily by space pressure rather than extreme speed.

The target aesthetic is retro-futuristic voxel space: precise, low-resolution, legible, minimal, blue/white, and intentionally digital rather than organic or generically cyberpunk.

## 2. Relationship to V1

The canonical V1 design dated 2026-10-15 explicitly specifies continuous movement and no logical movement grid. Pixel Flight Grid V2 intentionally supersedes those spatial and movement contracts.

V1 remains historical documentation and must not be silently edited to imply it always described grid gameplay.

V2 preserves the following product DNA unless this spec explicitly supersedes it:

- single-player browser gameplay;
- toroidal wrap on X, Y and Z;
- walls do not kill the player;
- self-collision is the primary loss condition;
- username without account creation;
- local-first active experience;
- personal best persistence;
- future online ranking seam;
- desktop keyboard controls;
- mobile joystick controls;
- camera switching through `X` / mobile camera button;
- GitHub Pages deployment from the public repository;
- the existing completion flow and supplied completion image, subject to the provisional target rule in section 15.

## 3. Current baseline and reason for redesign

At the baseline SHA, the gameplay authority is continuous:

- the head advances by `position += forward × speed × dt`;
- orientation is continuous yaw/pitch;
- body positions are sampled from a continuous trail;
- self-collision uses toroidal Euclidean distance and a radius;
- food spawns at continuous random coordinates and is collected by radius;
- the cube displays 24 visual subdivisions that do not correspond to logical cells;
- snake and food are sphere-based render geometry;
- Three.js antialiasing is enabled.

The existing design therefore allows the snake to remain spatially sparse for too long. Growth increases length, but the world does not become strategically constrained early enough. V2 addresses this by making occupancy, adjacency, wrap and collision cell-exact.

## 4. Architectural decision

Three approaches were considered:

### A. Strict six-axis controls

The player directly chooses one of `±X`, `±Y`, `±Z`.

Advantages: simplest and most deterministic.  
Disadvantage: abandons too much of the existing flight-control identity.

### B. Analog/directional intent resolved into a discrete local grid frame — selected

Keyboard and joystick continue to express left/right/up/down relative to the snake. The simulation converts those intentions into 90-degree turns in a local orthonormal `GridFrame`. Each logical step enters exactly one face-adjacent cell.

Advantages:

- preserves a flight-like control vocabulary;
- keeps the logical topology deterministic;
- prevents diagonal cell traversal;
- gives all six spatial axes equal status;
- supports desktop and joystick input without making floats authoritative.

### C. Continuous flight with voxel stamping

The existing free-flight trajectory would remain authoritative and touched voxels would be marked along it.

Rejected because diagonal traversal, tunneling, ambiguous occupancy and collision ordering would make the grid a derived effect rather than the gameplay authority.

## 5. Core invariants

The V2 simulation must maintain these invariants:

1. Gameplay positions are `GridCell` values with integer coordinates only.
2. Gameplay is never advanced from Three.js/world-space coordinates.
3. Each logical movement step changes exactly one axis by exactly one cell before toroidal wrap.
4. Logical diagonal transitions do not exist.
5. The grid is toroidal on all three axes.
6. The snake body is an ordered occupancy chain of cells.
7. Self-collision is based on exact cell occupancy, not distance thresholds.
8. Food occupies exactly one free logical cell.
9. Growth changes body occupancy deterministically.
10. Rendering consumes logical state; it never defines logical state.
11. Visual interpolation may use floats, but those floats never feed collision, food, scoring or topology.
12. The visual grid resolution equals the logical grid resolution.

## 6. Grid model

The grid configuration must be explicit and centralized.

```ts
type GridConfig = {
  resolution: number;
  cellSize: number;
  worldSize: number;
  stepsPerSecond: number;
  initialLength: number;
  growthPerFood: number;
};
```

Required invariant:

```text
worldSize = resolution × cellSize
```

Baseline experimental values:

```text
GRID_RESOLUTION       = 9
CELL_SIZE             = 0.40
WORLD_SIZE            = 3.60
GRID_STEPS_PER_SECOND = 6.0
INITIAL_LENGTH        = 6 total cells
GROWTH_PER_FOOD       = 2 cells
```

`WORLD_SIZE` is therefore presentation scale derived from grid configuration, not an independently tuned gameplay constant.

### 6.1 Logical cell representation

```ts
type GridCell = {
  x: number; // integer 0..resolution-1
  y: number;
  z: number;
};
```

For a 9-cell axis, coordinates are `0..8`. Resolution 9 is the initial baseline because it has a natural center cell and creates 729 total cells.

### 6.2 Direction and orientation

```ts
type GridDirection =
  | '+X' | '-X'
  | '+Y' | '-Y'
  | '+Z' | '-Z';

type GridFrame = {
  forward: GridDirection;
  right: GridDirection;
  up: GridDirection;
};
```

`GridFrame` is the gameplay orientation authority. The three axes must always form a valid orthonormal basis in grid space.

Continuous Euler angles or quaternions may be derived for rendering/camera presentation, but they must not decide the next logical cell.

## 7. Cell/world conversion authority

### 7.1 `cellToWorld()` — normal production conversion

`cellToWorld()` converts a logical cell center to Three.js coordinates. It is the normal bridge from simulation to rendering.

For an axis coordinate `c`:

```text
world = (c + 0.5) × CELL_SIZE - WORLD_SIZE / 2
```

With odd resolution 9, the center cell maps exactly to world origin.

### 7.2 `worldToCell()` — restricted utility only

`worldToCell()` may exist only for:

- tests;
- debug tooling;
- visualization tools;
- development diagnostics.

It must not be called by normal gameplay simulation, collision, food collection, growth, steering, score or persistence code.

This restriction is architectural, not stylistic. V2 gameplay is born in `GridCell` and remains in `GridCell`; world-space floats are never converted back into authoritative gameplay state.

A static dependency test or equivalent architectural test should prevent accidental production imports of `worldToCell()` into gameplay modules.

## 8. Toroidal topology

Logical wrapping is integer modulo arithmetic.

```text
wrapCellAxis(i, N) = ((i % N) + N) % N
```

For `N = 9`:

```text
8 + 1 -> 0
0 - 1 -> 8
```

The same rule applies independently to X, Y and Z.

`advanceGridStep(cell, direction)` must:

1. produce the adjacent unwrapped integer cell;
2. apply modulo wrap to the changed axis;
3. return the canonical wrapped `GridCell`;
4. return enough transition metadata for rendering to know whether the step crossed a toroidal boundary.

No epsilon or floating-point boundary comparison is permitted in logical wrap.

## 9. Movement and input

The existing fixed-timestep infrastructure may remain as the outer runtime clock. Grid movement uses a logical step accumulator driven by `stepsPerSecond`.

With the baseline of 6 cells/second, a logical transition duration is approximately 166.67 ms.

### 9.1 Turn intent

The gameplay input abstraction becomes discrete intent:

```ts
type TurnIntent = 'left' | 'right' | 'up' | 'down' | 'none';
```

Desktop mapping remains:

```text
A / Left  -> left
D / Right -> right
W / Up    -> up
S / Down  -> down
```

`X` remains reserved for camera switching.

### 9.2 Grid-frame rotation

At a logical step boundary, a queued turn rotates `GridFrame` by 90 degrees around its local axes. The resulting `forward` determines the next cell.

Direct 180-degree reversal into the immediately trailing cell is illegal.

The system may buffer a small number of future turn intents, but it must never consume more than one direction change per logical cell transition.

### 9.3 Joystick discretization

The mobile joystick remains analog as an input device but produces discrete turn intents.

Initial thresholds:

```text
activation threshold = 0.55
rearm threshold      = 0.25
```

Rules:

- choose the dominant absolute joystick axis;
- crossing the activation threshold emits one intent;
- holding the joystick does not emit a turn every cell;
- another turn requires returning within the rearm threshold first;
- diagonal joystick deflection still resolves to one discrete local turn.

These thresholds are tuning values, not topology rules, and may be adjusted during responsive/game-feel tuning if the intent semantics remain unchanged.

## 10. Snake body authority

The continuous `TrailBuffer` ceases to be gameplay authority.

The logical snake is an ordered chain of occupied `GridCell` values:

```text
head -> body[0] -> body[1] -> ... -> tail
```

The implementation may use a deque, ring buffer or another efficient ordered structure, provided ordering and exact occupancy are preserved.

A companion occupancy index such as a packed integer set is recommended for constant-time collision and food validation.

### 10.1 Occupancy key

For resolution `N`, a cell may be encoded as:

```text
key = x + y*N + z*N*N
```

The exact encoding is internal, but it must be deterministic and collision-free within the configured grid.

### 10.2 Growth

Growth is represented by `pendingGrowth`.

When food is collected:

```text
pendingGrowth += GROWTH_PER_FOOD
```

For each subsequent logical step:

- the head enters the next cell;
- if `pendingGrowth > 0`, the tail is retained and `pendingGrowth--`;
- otherwise the tail vacates its current cell.

Baseline growth is exactly +2 occupied cells per food.

### 10.3 Tail-vacate collision rule

A move into the current tail cell is legal only when that tail cell will be vacated during the same logical step.

If `pendingGrowth > 0`, the tail will not vacate and that cell remains collidable.

This rule must be explicit in collision ordering; it may not depend on incidental mutation order in an array.

## 11. Collision

Self-collision becomes exact logical occupancy.

A proposed next head cell is colliding when it is already occupied after accounting for the tail-vacate rule.

There is no V2 self-collision radius and no near-head exclusion radius.

Walls never cause game over; boundary crossing wraps before occupancy evaluation.

The expected common terminal state for a skilled run is spatial self-trapping followed by self-collision, not loss caused by an arbitrary wall or unmanageable speed.

## 12. Food

Food occupies one `GridCell`.

Food spawn must select from free logical cells, not continuous coordinates.

Recommended algorithm for the V2 grid sizes:

```text
all cells
- snake occupied cells
- optional explicit exclusion cells
= valid food cells
```

Select one valid cell using the run RNG.

Because the experimental maximum is only `10^3 = 1000` cells, enumerating free cells is inexpensive and removes retry/failure behavior caused by random continuous candidates.

Food collection occurs when:

```text
headCell == foodCell
```

There is no logical pickup radius.

Visual food size may be tuned independently from this exact logical rule.

## 13. Simulation/render separation

The simulation must publish logical snapshots. Rendering must never read partially mutated gameplay state during a transition.

At minimum, each active transition needs:

```ts
type LogicalSnapshot = {
  head: GridCell;
  body: readonly GridCell[];
  frame: GridFrame;
};

type RenderTransition = {
  previous: LogicalSnapshot;
  current: LogicalSnapshot;
  alpha: number; // [0, 1]
  wrap: transition metadata;
};
```

`alpha` is presentation-only.

Collision, food, score and growth must observe only canonical logical state at step boundaries.

## 14. Normative wrap interpolation algorithm

Wrap interpolation must never lerp from one canonical edge cell through the interior of the entire cube to the opposite canonical edge cell.

The algorithm below is normative for the head and every body segment.

### 14.1 Stable per-transition correspondence

A render transition must be constructed at the moment a logical step commits, before previous state is discarded.

For the head:

```text
previous.head -> current.head
```

For existing body elements, render correspondence is by body-chain index across that single transition:

```text
previous.body[i] -> current.body[i]
```

This corresponds to each visible body voxel moving into the cell previously occupied by the voxel ahead of it.

If growth introduces new tail elements that have no `previous.body[i]`, each new element receives an explicit birth transition rather than inheriting an unrelated previous index. Its initial render position is the previous tail position (or its own current tail position when identical), with an optional small scale-pop. It must never interpolate from another region of the cube.

A renderer must consume this immutable transition mapping; it must not attempt to reconstruct correspondence later from two independently mutated body arrays.

An implementation may instead use stable segment IDs, but it must provide the same semantics. Stable IDs and immutable render-transition snapshots are equivalent acceptable strategies; at least one is mandatory.

### 14.2 Virtual unwrapped target

For each matched segment pair `from -> to`, compute each axis independently.

For resolution `N`:

- ordinary adjacent transition: use `to` directly;
- `N-1 -> 0`: use virtual target `N` on that axis;
- `0 -> N-1`: use virtual target `-1` on that axis.

All legal logical movement changes at most one axis by one cell under this rule.

Example:

```text
logical:       8 -> 0 on +X
render target: 8 -> 9 virtual
```

### 14.3 World interpolation and canonical display

Convert `from` and the virtual target to world-space cell centers, then:

```text
renderWorld = lerp(fromWorld, virtualToWorld, alpha)
```

The resulting render position is canonicalized toroidally for display. If it crosses the positive boundary it appears from the negative boundary; if it crosses the negative boundary it appears from the positive boundary.

The renderer may draw a temporary duplicate on the opposite face while a voxel overlaps a boundary plane to avoid clipping/pop, but any such duplicate is presentation-only and must never become logical occupancy.

### 14.4 Body wrap

The exact same virtual-target rule applies independently to every body transition. A body segment crossing a toroidal boundary must not be interpolated through the cube interior.

Growth and tail removal must not change the correspondence of pre-existing body elements within the active render transition.

## 15. Score, length, personal best and completion

V2 formally separates score from body length.

Canonical V2 score:

```text
score = foodsCollected
```

Length is a separate metric:

```text
length = occupied snake cells
```

With baseline values:

```text
length = 6 + foodsCollected × 2
```

subject to in-flight pending growth if the UI chooses to display current physical occupancy rather than eventual post-growth length. The score contract itself is unaffected.

### 15.1 Ruleset identity

All persisted or remotely submitted V2 run results must carry or be associated with:

```text
RULESET_ID = pixel-flight-grid-v2
```

V1 and V2 score/length values must never be compared as though they were the same ruleset.

### 15.2 Local persistence

Preserve existing identity keys. Preserve the historical V1 best rather than overwriting it with a different metric.

Recommended V2 record:

```text
snek.localBest.pixelGridV2
```

Its value is the best `foodsCollected` score for the V2 ruleset.

The exact storage encoding may use a versioned object instead of a separate key if migration is explicit and existing V1 data is preserved.

### 15.3 Future ranking seam

The current future-ranking backend was designed around V1 length arithmetic. V2 results must not be submitted silently to validation that assumes `12 + food × 4`.

Any future V2 server ranking must validate the V2 ruleset and rank by `foodsCollected` unless a later approved product spec changes the ranking metric.

### 15.4 300-food completion target — preserved provisionally

The current completion contract remains provisionally:

```text
10 foods = one progress stage
30 stages = 100%
300 foods = completion
```

This is not declared final V2 tuning.

At baseline `9^3`, initial length 6 and +2 growth per food, 300 foods imply eventual length 606 cells, approximately 83.1% of the 729-cell universe. This is mathematically possible but may be operationally near-impossible.

Phase 7 difficulty tuning is explicitly authorized to recommend a different completion target or progression curve based on measured playability. It is not authorized to change the target silently. Any change from 300 foods requires an explicit design/product approval and corresponding spec amendment before implementation or merge.

## 16. Resolution experiments

V2 must compare at least:

```text
8 × 8 × 8  = 512 cells
9 × 9 × 9  = 729 cells
10 × 10 × 10 = 1000 cells
```

Baseline for implementation/prototyping is 9³.

Reasons:

- odd resolution provides a natural center cell;
- 729 cells create stronger space pressure than 10³;
- unlike 8³, baseline growth can in principle coexist with the provisional 300-food completion target.

No final claim that 9³ is optimal may be made until Phase 7 metrics are gathered.

## 17. Difficulty and tuning metrics

The runtime or deterministic simulation harness should expose enough information to compare configurations without relying only on subjective feel.

Required metrics include:

```text
length at 30s
length at 60s
foods at 30s
foods at 60s
occupancy ratio at 30s / 60s
final foods score
final occupied length
run duration
cause of death
near-body encounters
first pressure time
first confinement time
```

Recommended derived values:

```text
occupancyRatio = occupiedCells / totalCells
```

`safeMoveCount` should count legal immediate local turn/forward options that do not cause immediate self-collision under the current grid frame and occupancy.

Suggested interpretation:

```text
pressure:    safeMoveCount <= 2
confinement: safeMoveCount <= 1
```

These definitions may be refined in the implementation plan if the final turn queue semantics require it, but the comparisons across 8³/9³/10³ must use one consistent definition.

Initial tuning goals, not guaranteed measured outcomes:

- first 10–15 seconds should not feel random or claustrophobic;
- body pressure should become perceptible within roughly 30–60 seconds of competent play;
- meaningful confinement should occur long before hundreds of foods in typical successful runs;
- speed should remain secondary to occupancy pressure;
- any later speed ramp should be moderate and separately approved if it materially changes the input-response contract.

## 18. Voxel renderer

The sphere-based snake and food are replaced by voxel geometry.

### 18.1 Snake

Recommended rendering:

- `BoxGeometry`;
- `InstancedMesh` for body;
- voxel fill approximately `0.80 × CELL_SIZE` per axis;
- small gap between adjacent occupied cells for legibility;
- flat/simple material with strong edges or face contrast;
- head footprint close to body footprint;
- head distinguishable through face treatment and two directional pixel-style eyes.

The head must not become an oversized mascot that breaks spatial reading.

### 18.2 Food

Food is a contrasting voxel/pixel object, initially approximately `0.60 × CELL_SIZE`.

Permitted feedback:

- small quantized pulse;
- brief scale-pop on collection;
- short digital flash;
- quantized rotation if used.

Avoid smooth particle systems that undermine the voxel language.

### 18.3 Grid

The cube grid is no longer decorative.

Required invariant:

```text
CUBE_GRID_DIVISIONS = GRID_RESOLUTION
```

A 9³ logical game must present 9×9 cells per cube face, not 24 decorative divisions.

## 19. Pixel rendering pipeline

The initial V2 pixel treatment should use the simplest robust pipeline before post-processing shaders are introduced.

Baseline:

```text
Three.js internal rendering at reduced resolution
antialias = false
controlled low internal pixel ratio / framebuffer size
CSS upscale to display size
image-rendering: pixelated where applicable
nearest-neighbor sampling for any textures
flat/simple materials
```

Initial internal render scale target:

```text
RENDER_SCALE = 0.50
```

The exact scale may vary by responsive breakpoint if required for legibility/performance, but the visual intent must remain deliberately low-resolution rather than merely aliased.

A post-processing pixel shader is a fallback only if low-resolution direct rendering cannot produce acceptable results.

## 20. Camera V2

The primary camera remains a chase camera but becomes higher and farther to support body reading and spatial planning.

Baseline in cell-relative units:

```text
CAMERA_DISTANCE   = 4.0 cells
CAMERA_HEIGHT     = 2.8 cells
CAMERA_LOOK_AHEAD = 2.0 cells
FOV               = 60 degrees
```

This corresponds to an initial elevation angle near 35 degrees.

The final tuned observation angle should generally remain within approximately 30–45 degrees above the local trajectory.

Camera requirements:

- target a point ahead of the interpolated head;
- derive local up/orientation from `GridFrame`, not blindly from world +Y;
- never feed camera state back into gameplay;
- never produce NaN/Infinity;
- remain coherent across toroidal wrap;
- avoid entering the head/body volume;
- remain stable and predictable during rapid discrete turns;
- work in desktop, mobile portrait and mobile landscape.

The existing `X`/mobile overview camera remains a secondary camera mode.

Dynamic pull-back is deferred until the fixed elevated camera is stable. Phase 7 may test a moderate pull-back, capped around 15%, based on body length or local congestion. Aggressive automatic zoom is out of scope.

## 21. Game feel

V2 may add restrained feedback aligned with cell-based movement:

- near-imperceptible micro-pulse on committed cell entry;
- stronger but short collection feedback;
- optional subtle near-miss feedback derived from logical adjacency;
- digital audio cues if/when audio is introduced, but audio remains nonessential to gameplay.

VFX must not obscure cell occupancy or make collision boundaries ambiguous.

## 22. Runtime and module boundaries

Preserve the current separation between simulation, render, camera, input, UI and persistence.

Recommended V2 concepts/modules:

```text
src/game/
  grid-config.ts
  grid-types.ts
  grid-topology.ts
  grid-frame.ts
  grid-movement.ts
  snake.ts
  collision.ts
  food.ts
  run-state.ts
  metrics.ts

src/render/
  interpolation.ts
  snake-renderer.ts
  food-renderer.ts
  scene.ts
  chase-camera.ts
  overview-camera.ts
```

Exact filenames may differ if existing repository conventions make another split clearer, but responsibilities must remain isolated.

The continuous V1 trail system may remain temporarily during migration, but it must be removed from V2 gameplay authority before V2 is accepted.

## 23. Implementation sequence

The implementation order is normative at subsystem level:

```text
logical authority
-> movement
-> body/collision/food
-> interpolation
-> voxel presentation
-> camera
-> tuning
-> release
```

Detailed phases:

### Phase 0 — Baseline

- create a feature/integration branch from the reviewed baseline;
- record branch/SHA;
- run existing verification;
- do not change `main` directly.

### Phase 1 — Grid model

- introduce `GridConfig`, `GridCell`, `GridDirection`, `GridFrame`;
- implement cell wrap and cell/world conversion;
- restrict `worldToCell()` to debug/test/tooling;
- prove topology with unit tests.

### Phase 2 — Voxel movement

- implement discrete logical step accumulator;
- resolve turn intent through `GridFrame`;
- preserve smooth render timing separately;
- validate keyboard and joystick semantics.

### Phase 3 — Body, collision and food

- replace continuous trail authority with ordered cell occupancy;
- implement tail-vacate rule and pending growth;
- implement exact self-collision;
- implement free-cell food spawning.

### Phase 4 — Interpolation

- introduce immutable render transitions or stable segment IDs;
- implement normative ordinary/wrap interpolation for head and body;
- verify growth/tail transitions do not pop across unrelated cells.

### Phase 5 — Voxel/pixel presentation

- replace spheres with voxels;
- bind visual grid to `GRID_RESOLUTION`;
- disable antialiasing;
- add low-resolution render/upscale pipeline.

### Phase 6 — Camera V2 and game feel

- implement elevated grid-frame-aware chase camera;
- retain overview camera;
- add restrained cell/food feedback.

### Phase 7 — Difficulty tuning

- compare 8³, 9³ and 10³ using common metrics;
- evaluate initial length/growth/steps-per-second;
- evaluate the operational feasibility of the provisional 300-food target;
- recommend, but do not silently make, any product-contract change.

### Phase 8 — Responsive/mobile

- verify desktop;
- mobile portrait;
- mobile landscape;
- resize/orientation changes;
- DPR behavior;
- joystick and camera controls.

### Phase 9 — Verification/release

- run all required repository gates;
- review regressions in local-first flow and future ranking seam;
- merge only after evidence is green;
- allow `main` to trigger production Pages deployment only after V2 acceptance.

## 24. Required tests

### 24.1 Grid mathematics

- wrap +X/-X;
- wrap +Y/-Y;
- wrap +Z/-Z;
- cell equality/key uniqueness;
- face adjacency;
- `cellToWorld()` correctness;
- `worldToCell()` debug/tooling behavior and production dependency restriction.

### 24.2 Movement

- deterministic forward step;
- 90-degree left/right/up/down turns;
- no 180-degree reverse;
- no diagonal logical transition;
- queued-turn ordering;
- fixed-time accumulation independent from render frame rate;
- joystick activation/rearm.

### 24.3 Body/collision/growth

- exact occupied cells;
- self-collision;
- toroidal self-collision;
- legal entry into a vacating tail cell;
- illegal entry into retained tail during pending growth;
- +2 growth baseline exactly;
- no duplicate logical occupancy except any explicitly modeled transient initialization state, which must not occur during normal play.

### 24.4 Food

- spawn only in free cell;
- never spawn inside body/head;
- deterministic seeded selection;
- collect only on same cell;
- valid behavior when free-cell count becomes very small.

### 24.5 Interpolation

- ordinary cell lerp;
- +X/-X wrap;
- +Y/-Y wrap;
- +Z/-Z wrap;
- no full-cube interpolation;
- body correspondence preserved;
- growth-tail birth transition does not originate from unrelated cell;
- alpha clamped/validated to `[0,1]`.

### 24.6 Camera

- finite pose/no NaN;
- all six forward directions;
- extreme turn sequences;
- wrap stability;
- target remains coherent and ahead;
- camera does not penetrate head/body under baseline framing;
- responsive aspect ratios.

### 24.7 Browser/E2E

- desktop Chromium;
- mobile portrait Chromium;
- mobile landscape Chromium;
- resize;
- orientation change;
- representative DPR variants;
- keyboard;
- joystick;
- `X` camera toggle and mobile camera button;
- no horizontal overflow;
- intro -> username -> game -> game over/replay;
- completion flow;
- local personal best persistence.

## 25. Verification gate

Before declaring V2 implementation PASS, fresh evidence is required for all applicable existing repository commands:

```bash
npm audit --omit=dev --audit-level=moderate
npm test
npm run test:worker
npm run typecheck
npm run worker:build
npm run build
npm run test:e2e
```

Additional deterministic tuning/metrics harnesses introduced by V2 must also pass.

No PASS may be declared from stale CI or from a different commit than the proposed merge head.

## 26. Acceptance criteria

Pixel Flight Grid V2 is acceptable only when all conditions below are satisfied:

1. `GridConfig` is the source of truth for resolution, cell size and derived world size.
2. Normal gameplay state is born and remains in integer `GridCell` coordinates.
3. `worldToCell()` is restricted to debug/test/tooling and is not a gameplay authority.
4. Every logical movement step enters exactly one face-adjacent cell.
5. Logical diagonal movement is impossible.
6. `GridFrame` is the orientation authority for gameplay.
7. X/Y/Z wrap is deterministic integer modulo topology.
8. Body state is exact ordered cell occupancy.
9. Self-collision is exact occupancy with the tail-vacate rule.
10. Food exists on a free cell and is collected by exact cell equality.
11. Baseline growth adds exactly two occupied cells per food.
12. Rendering uses previous/current logical snapshots plus presentation alpha.
13. Wrap interpolation follows the normative virtual-target algorithm for head and body.
14. Segment correspondence during interpolation is stable through normal movement, growth and tail removal.
15. The visual grid has exactly `GRID_RESOLUTION` cells per face.
16. Snake and food use voxel geometry aligned to the logical cell scale.
17. The pixel pipeline uses a genuinely reduced internal resolution with antialiasing disabled before any shader fallback is considered.
18. The primary camera is elevated, stable, grid-frame-aware and wrap-coherent.
19. The secondary camera remains accessible through existing controls.
20. Desktop, portrait mobile and landscape mobile remain playable.
21. V2 score is `foodsCollected`; length is a separate metric.
22. V2 persistence/ranking data is namespaced by `pixel-flight-grid-v2` and does not overwrite or masquerade as V1 records.
23. Username, local-first operation, replay, personal best and future ranking seam remain intact.
24. 8³, 9³ and 10³ are compared using common metrics before the final resolution is declared tuned.
25. The 300-food completion target remains unchanged unless a separate explicit approval amends it after Phase 7 evidence.
26. Required unit, integration, browser, typecheck and build gates pass on the exact candidate commit.

## 27. Initial V2 configuration summary

The approved starting point for implementation and experiment is:

```text
RULESET_ID            = pixel-flight-grid-v2
GRID_RESOLUTION       = 9
CELL_SIZE             = 0.40
WORLD_SIZE            = 3.60 derived
GRID_STEPS_PER_SECOND = 6.0
INITIAL_LENGTH        = 6 total cells
GROWTH_PER_FOOD       = 2 cells
SCORE                  = foodsCollected
FOOD_LOGIC             = exact cell
COLLISION              = exact occupied cell
SNAKE_VOXEL_FILL       = 0.80
FOOD_VOXEL_FILL        = 0.60
RENDER_SCALE           = 0.50 baseline
ANTIALIAS               = false
CAMERA_DISTANCE        = 4.0 cells baseline
CAMERA_HEIGHT          = 2.8 cells baseline
CAMERA_LOOK_AHEAD      = 2.0 cells baseline
FOV                     = 60 degrees baseline
COMPLETION_TARGET      = 300 foods, preserved provisionally
```

These are experimental starting values where explicitly labeled baseline/provisional. Topology, integer authority, exact occupancy, score semantics, ruleset identity and the requirement for explicit approval before changing the completion contract are architectural requirements.