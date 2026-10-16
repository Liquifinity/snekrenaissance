# SDD ledger — plan: docs/superpowers/plans/2026-10-16-snek-renaissance-production-release.md

Execution mode: Native.
Workspace ruling: GitHub branch + GitHub Actions remain the authoritative workspace/runner because local package/network execution is unavailable in this harness.
Pre-flight: Task 1 CORS feeds Task 4 smoke expectations; headers must remain public/no-credentials.
Pre-flight: Task 2 generated production Wrangler config feeds Task 3 remote migration and Worker deploy; committed wrangler.jsonc remains immutable.
Pre-flight: Task 3 produces WORKER_URL/PAGES_URL consumed by Task 4 smoke verification.
Pre-flight: Task 4 smoke gate is consumed by Task 5 production acceptance.
Task 1: Ruling: use a focused worker/tests/cors.test.ts instead of enlarging worker/tests/api.test.ts; vitest.worker.config.ts already includes worker/tests/**/*.test.ts, behavior coverage is identical and review isolation is better.
Task 1: Ruling: do not modify worker/src/errors.ts; wrapping every entrypoint response in withCors() covers health, ApiError and internal-error responses centrally and avoids duplicated header policy.
Task 1: RED verified in GitHub Actions run 38934403821: 25 existing Worker tests passed and the 3 new CORS tests failed exactly on OPTIONS 404 and missing Access-Control-Allow-Origin headers.
Task 1: GREEN verified in GitHub Actions run 38934541175: Worker suite and TypeScript typecheck passed on head affd8f1bc341933e1efffe81438130b8f0adad2c.
Task 1: complete — production API preflight and CORS wrapping are implemented without credentials support.
Task 3: Ruling: use a focused tests/unit/deploy-production.test.ts for static workflow contract checks.
