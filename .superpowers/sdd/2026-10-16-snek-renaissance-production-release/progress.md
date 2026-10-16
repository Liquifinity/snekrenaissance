# SDD ledger — plan: docs/superpowers/plans/2026-10-16-snek-renaissance-production-release.md

Execution mode: Native.
Workspace ruling: GitHub branch + GitHub Actions remain the authoritative workspace/runner because local package/network execution is unavailable in this harness.
Pre-flight: Task 1 CORS feeds Task 4 smoke expectations; headers must remain public/no-credentials.
Pre-flight: Task 2 generated production Wrangler config feeds Task 3 remote migration and Worker deploy; committed wrangler.jsonc remains immutable.
Pre-flight: Task 3 produces WORKER_URL/PAGES_URL consumed by Task 4 smoke verification.
Pre-flight: Task 4 smoke gate is consumed by Task 5 production acceptance.
Task 1: Ruling: use a focused worker/tests/cors.test.ts instead of enlarging worker/tests/api.test.ts; vitest.worker.config.ts already includes worker/tests/**/*.test.ts, behavior coverage is identical and review isolation is better.
Task 3: Ruling: use a focused tests/unit/deploy-production.test.ts for static workflow contract checks.
