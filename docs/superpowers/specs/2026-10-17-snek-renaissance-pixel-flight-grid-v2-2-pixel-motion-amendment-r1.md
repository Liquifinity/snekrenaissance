# SNEK RENAISSANCE — Pixel Flight Grid V2.2 Orientation Amendment R1

Status: **DRAFT FOR HUMAN REVIEW**  
Date: 2026-10-17  
Applies to: `docs/superpowers/specs/2026-10-17-snek-renaissance-pixel-flight-grid-v2-2-pixel-motion-design.md`  
Baseline `main`: `fd852aa54081a1026d146ead06c4778738c2f6ef`

## Reason for amendment

The approved V2.2 design states that visible head orientation is the cardinal direction of the most recently committed cell transition.

The current V2.1 DDA intentionally treats simultaneous two-axis and three-axis corner crossings as **one geometric event** and emits only the diagonal destination `GridCell`. Therefore a committed transition may change two or three cell coordinates at once and does not always define one unique cardinal `±X/±Y/±Z` direction.

The position contract remains unchanged. This amendment only makes the visible head-orientation rule implementable and deterministic without changing DDA semantics.

## Normative override for Section 9 — Head orientation

Head position remains fully discrete and authoritative from `GridCell`:

```text
visibleHeadWorld === cellToWorld(snakeHead(run.snake).cell, run.config)
```

Visible head orientation remains restricted to exactly six cardinal directions:

```text
+X
-X
+Y
-Y
+Z
-Z
```

The canonical visible direction is now obtained by quantizing the continuous navigation vector **only when a new cell entry commits**:

```text
GridCellEntry committed
        ↓
run.flight.forward for that fixed step
        ↓
quantizeForwardToGridDirection(forward)
        ↓
visible cardinal head orientation
```

`quantizeForwardToGridDirection()` selects the axis with greatest absolute magnitude. The sign of that component selects positive or negative direction.

For exact equal-magnitude ties, priority is deterministic:

```text
X > Y > Z
```

Examples:

```text
{ x:  0.8, y: 0.2, z: 0.5 } → +X
{ x: -0.8, y: 0.2, z: 0.5 } → -X
{ x:  0.2, y: 0.9, z: 0.3 } → +Y
{ x:  0.2, y: 0.3, z:-0.9 } → -Z
{ x:  1.0, y: 1.0, z: 1.0 } → +X
```

The visible direction is **latched to the last committed cell entry**. It must not change merely because `FlightPose.forward` changes while the head remains inside the same `GridCell`.

Initial visible direction is `+Z`, matching the initial `FlightPose.forward`.

This does not restore queued or 90-degree steering. Continuous yaw/pitch still drives navigation every 60 Hz fixed tick; only the voxel head mesh is cardinalized at cell-entry boundaries.

## Test additions

V2.2 acceptance additionally requires:

- unit coverage for all six cardinal outputs of `quantizeForwardToGridDirection()`;
- explicit equal-magnitude tie coverage proving `X > Y > Z`;
- integration coverage proving orientation remains unchanged while `FlightPose.forward` changes inside the current cell;
- integration coverage proving orientation updates on the next committed `GridCellEntry`;
- coverage for two-axis and three-axis DDA corner events showing they still emit one destination cell while visible orientation remains deterministic;
- no modification to DDA tie semantics solely for presentation.

## Unchanged V2.2 invariants

This amendment does not modify:

- continuous keyboard and joystick steering;
- 60 Hz `FlightPose` navigation;
- toroidal DDA gameplay authority;
- discrete visible snake position;
- discrete body position;
- food/head exact cell-center coincidence;
- smooth camera behavior;
- `pixel-flight-grid-v2-2` ruleset identity;
- release gates.
