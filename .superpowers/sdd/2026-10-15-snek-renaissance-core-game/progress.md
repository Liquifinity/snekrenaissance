# SDD ledger — plan: docs/superpowers/plans/2026-10-15-snek-renaissance-core-game.md

Execution mode: Native.
Workspace ruling: local git worktree unavailable because the sandbox cannot resolve github.com; implementation is isolated on public branch `feat/core-game-v1` and verified through GitHub Actions.
Ruling: CI workflow moved forward from the final CI task to Task 1 because the execution sandbox has no package-network access; GitHub Actions is the authoritative TDD runner. Product behavior is unchanged.
Pre-flight: Task 1 produces Vec3/torus APIs consumed by Tasks 2, 4, 5; signatures match plan.
Pre-flight: Task 2 produces orientation/motion consumed by Tasks 3, 5, 7; unwrapped path authority remains required by spec.
Pre-flight: Task 3 produces SnakeState/body samples consumed by Tasks 4, 5, 6; no interface conflict found.
Pre-flight: Task 4 produces food/collision consumed by Task 5; toroidal distance semantics match spec.
Pre-flight: Task 5 produces run snapshots consumed by rendering/UI tasks; renderer remains read-only.
Task 1: Ruling: WORLD_SIZE = 16 world units — matches the approved prototype scale while remaining a single tunable constant — wrong tuning would affect feel, not topology semantics.
Task 1: RED verified in GitHub Actions run 38814449349: setup-node and npm install succeeded; npm test failed before implementation.
Task 1: complete (tests + typecheck: GitHub Actions run 38814556126 → success; head b50d4e5).
Task 2: Ruling: OrientationState stores yaw/pitch plus a derived quaternion and literal roll=0 — preserves quaternion authority for rendering while making no-roll steering explicit and testable.
Task 2: Ruling: advanceHead returns both unwrappedPosition and wrappedPosition plus wrapOffset — Task 3 needs continuous trail coordinates and Task 7 needs coherent camera relocation.
Task 2: RED verified in GitHub Actions run 38814697243: install succeeded; npm test failed with steering/simulation implementations absent.
Task 2: complete (tests + typecheck: GitHub Actions run 38814836171 → success; head 68f84f9).
Task 3: Ruling: segment spacing = 0.42 world units; body positions sample the unwrapped head trail by arc length, newest-to-oldest, with immutable growth state.
Task 3: RED verified in GitHub Actions run 38814952396: install succeeded; npm test failed with trail/snake implementations absent.
Task 3: complete (tests + typecheck: GitHub Actions run 38815128341 → success; head 0df71d4).
Task 4: Ruling: food head exclusion = 1.2, body clearance = 0.38, pickup radius = 0.36, max spawn attempts = 64; all proximity uses toroidal distance.
Task 4: Ruling: self-collision radius = 0.30 and first 8 body segments are excluded, matching the approved near-head exclusion behavior.
Task 4: RED verified in GitHub Actions run 38815270147: install succeeded; npm test failed with food/collision implementations absent.
Task 4: complete (tests + typecheck: GitHub Actions run 38815372226 → success; head 38be8fa).
Task 5: Ruling: RunState is the single gameplay authority; rendering/input consume or mutate it only through the run APIs. Food may be temporarily null only when bounded spawn attempts fail, with respawn retried on subsequent steps.
Task 5: Ruling: game-over result is finalized once and subsequent stepRun calls return the same state unchanged.
Task 5: RED verified in GitHub Actions run 38815557131: install succeeded; npm test failed with run-state implementation absent.
Task 5: complete (tests + typecheck: GitHub Actions run 38815669236 → success; head 95acbf9).
