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

Task 2: RED verified in GitHub Actions run 38934727163: the new production-config contract failed because scripts/render-production-wrangler.mjs did not exist while the existing frontend suite remained green.
Task 2: Ruling: production D1 identity is injected only into ignored .wrangler.production.jsonc; committed wrangler.jsonc retains the all-zero placeholder and is never rewritten with an account UUID.
Task 2: GREEN verified in GitHub Actions run 38936340930: production-config tests passed and the CI step `Verify rendered production Worker config` successfully rendered a non-placeholder test UUID and completed `wrangler deploy --dry-run --config .wrangler.production.jsonc`.
Task 2: complete — missing/placeholder/malformed IDs fail before output; valid UUID replacement preserves all unrelated Worker configuration.

Task 3: Ruling: use a focused tests/unit/deploy-production.test.ts for static workflow contract checks.
Task 3: RED verified in GitHub Actions run 38934995998: all 4 deployment-workflow contracts failed because .github/workflows/deploy-production.yml was absent; the other 98 tests passed.
Task 3: Ruling: workflow always checks out canonical main even if workflow_dispatch is initiated from another selectable ref; RELEASE_SHA is captured from the checked-out main commit.
Task 3: Ruling: production workflow never creates D1. Pages project `snekrenaissance` may be created exactly once if absent; subsequent releases reuse it.
Task 3: Initial GREEN verified in GitHub Actions run 38936340930: deployment-workflow unit contracts, full frontend/Worker suites, typecheck, both Worker dry-runs, build and browser E2E all passed.
Task 3: Late review found avoidable mutation ordering: Workers subdomain and Pages project availability were checked only after remote D1 migration/Worker deployment. A fifth contract now requires both managed targets to be resolved before the first D1 mutation.
Task 3: Ordering RED verified in GitHub Actions run 38936808613: 106 tests passed and only `validates managed origins before the first D1 mutation` failed against the old order.
Task 3: Ordering GREEN verified in GitHub Actions run 38937031880: the complete CI gate passed after moving Workers subdomain resolution and exact Pages project validation/creation ahead of remote D1 migration apply.
Task 3: complete — manual-only GitHub production workflow validates credentials, Worker origin and Pages target before D1 mutation; then applies migrations, deploys Worker, builds ranked frontend, deploys Pages, runs smoke, and records rollback identifiers.

Task 4: Ruling: the approved Vite frontend renders the meme from src/ui/intro-view.ts at runtime; index.html contains only the application shell. Production smoke therefore checks #app in Pages HTML and requires both canonical meme strings plus the resolved Worker origin inside the deployed JavaScript bundle. Requiring meme text in static HTML would be a false negative without changing product rendering architecture.
Task 4: RED verified in GitHub Actions run 38935679229: 102 existing tests passed and the 4 new production-smoke tests failed exactly because scripts/smoke-production.mjs was absent.
Task 4: Debugging: first GREEN implementation passed all 106 frontend tests and 28 Worker tests, then typecheck correctly rejected the new .mjs module because it lacked a declaration. scripts/smoke-production.d.mts was added as the minimal type interface; runtime logic was unchanged.
Task 4: GREEN verified in GitHub Actions run 38936340930: production smoke unit contracts, Worker CORS contracts, typecheck, rendered production Wrangler dry-run, neutral Worker dry-run, frontend build and Playwright E2E all passed.
Task 4: complete — smoke verifies Worker health, leaderboard JSON, preflight/CORS, Pages shell, canonical meme in the bundle, and compiled ranked Worker origin without creating a fake score. README documents Worker rollback, Pages rollback, and forward-only D1 recovery.

Final release-tooling verification: GitHub Actions run 38937302200 on head 9944d21b5ebfdbec4a17cbb3d957e3d1bdc7a509 passed production audit, all frontend tests, all Worker tests, typecheck, rendered-production Worker dry-run, neutral Worker dry-run, frontend build, Chromium installation, and browser E2E.

Task 5: production mutation is intentionally gated by account-owned resources/credentials. No Cloudflare production resource has been created or mutated by Tasks 1–4. Release tooling may be integrated into main safely because deployment is workflow_dispatch-only. Actual dispatch requires: create or identify D1 `snekrenaissance-leaderboard`; configure GitHub `production` secrets CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_D1_DATABASE_ID; then manually dispatch `deploy production` from main.
