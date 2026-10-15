# SDD ledger — plan: docs/superpowers/plans/2026-10-15-snek-renaissance-core-game.md

Execution mode: Native.
Workspace ruling: local git worktree unavailable because the sandbox cannot resolve github.com; implementation is isolated on public branch `feat/core-game-v1` and verified through GitHub Actions.
Ruling: CI workflow moved forward from the final CI task to Task 1 because the execution sandbox has no package-network access; GitHub Actions is the authoritative TDD runner. Product behavior is unchanged.
Pre-flight: Task 1 produces Vec3/torus APIs consumed by Tasks 2, 4, 5; signatures match plan.
Pre-flight: Task 2 produces orientation/motion consumed by Tasks 3, 5, 7; unwrapped path authority remains required by spec.
Pre-flight: Task 3 produces SnakeState/body samples consumed by Tasks 4, 5, 6; no interface conflict found.
Pre-flight: Task 4 produces food/collision consumed by Task 5; toroidal distance semantics match spec.
Pre-flight: Task 5 produces run snapshots consumed by rendering/UI tasks; renderer remains read-only.
