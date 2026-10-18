# SDD ledger — plan: docs/superpowers/plans/2026-10-18-snek-pwa-fork-first-r2.md

Execution mode: Native via GitHub connector + GitHub Actions CI.

Ruling: this harness exposes no local repository worktree/terminal, so task-start/task-done shell helpers cannot run locally; preserve their contract with an isolated `feat/pwa-fork-first` branch, per-task commits, CI-observed RED/GREEN, and this ledger — cost if wrong: slower feedback and weaker local command parity, mitigated by the repository's own CI environment.

Pre-flight: Task 1 produces PWA config consumed by Tasks 2–5; icon paths must remain relative for Pages subpaths.
Pre-flight: Task 3 produces `verify:pwa`, consumed by Task 4 CI canonical/fork builds.
Pre-flight: Task 4 produces fork-safe deploy/base-path behavior exercised by Task 5 and Task 10.
Pre-flight: Task 7 gates LICENSE on asset-rights verification; cleanup must not pre-empt that decision.
Pre-flight: Tasks 8–9 consume dependency/reference audit results; Worker/ranking tooling remains because current CI/E2E references it.

Task 1 RED: `31e6443` — CI run 39174003851; 292 existing tests passed, `tests/unit/pwa-config.test.ts` failed exactly because `../../pwa.config` does not exist.
Task 1: Ruling: no local npm execution is available, so generate the exact npm lockfile in an ephemeral GitHub Actions job and consume its artifact before production config is committed — preserves `npm install --save-dev --save-exact vite-plugin-pwa@2.0.0` semantics — cost if wrong: lockfile drift; mitigated by subsequent `npm ci` CI gate.
