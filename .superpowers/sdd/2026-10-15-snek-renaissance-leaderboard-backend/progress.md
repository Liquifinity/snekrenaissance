# SDD ledger — plan: docs/superpowers/plans/2026-10-15-snek-renaissance-leaderboard-backend.md

Execution mode: Native.
Workspace ruling: local package/network execution is unavailable; GitHub Actions is the authoritative RED/GREEN runner, matching the prior Core Game execution pattern.
Pre-flight: Task 1 shared DTOs and WorkerEnv are consumed by Tasks 3–6; signatures match the approved plan.
Pre-flight: Task 2 repository primitives are consumed by Tasks 4–5; finalization and score uniqueness contracts align.
Pre-flight: Task 3 validation is consumed by Task 4; canonical gameplay constants remain imported from src/game/constants.ts.
Pre-flight: Task 4 session/result routes feed Task 5 ranking and Task 6 frontend gateway; no interface conflict found.
Pre-flight: Task 5 leaderboard DTOs feed Tasks 6–9; best-per-player ordering is canonical.
Pre-flight: Task 6 explicit sessionId gateway is consumed by Task 7 controller lifecycle.
Pre-flight: Task 7 controller state is consumed by Task 8 leaderboard UI and Task 9 E2E.
Pre-flight: Task 9 runtime selection is consumed by Task 10 CI/release documentation.
Ruling: Wrangler 4.150.0 is pinned for reproducible execution; it satisfies the approved >=4.36 floor and current Cloudflare harness documentation.
Task 1: Ruling: existing vitest.config.ts intentionally includes only tests/**/*.test.ts, so Worker tests use a separate vitest.worker.config.ts and CI invokes test:worker explicitly; this preserves the frontend suite while making Worker RED/GREEN independently visible.
Task 1: RED verified in GitHub Actions run 38824489303: frontend suite passed, Worker suite failed exactly because package `wrangler` was absent.
Task 1: Ruling: package-lock regeneration ran in an isolated GitHub Actions helper because the execution sandbox cannot access npm; the helper committed only the deterministic lockfile and was then removed.
Task 1: Debugging: first GREEN attempt reached the Worker harness but workerd rejected compatibility_date 2026-10-15 because Wrangler 4.150.0 embeds a runtime supporting at most 2026-10-13.
Task 1: Ruling: compatibility_date is 2026-10-13, the newest date supported by the pinned runtime; this changes Worker compatibility selection only and does not alter product semantics.
Task 1: complete — GitHub Actions run 38824969609 passed the Worker harness with D1 + three rate-limit bindings, all 76 existing tests, typecheck, and production frontend build. Draft implementation PR #4 opened against main.
Task 2: RED verified in GitHub Actions run 38825096984: Worker suite failed exactly because `worker/src/repository.ts` did not exist.
Task 2: complete — GitHub Actions run 38825171246 passed D1 migration, player upsert, started game persistence, atomic accepted-score finalization, one-score-per-game uniqueness, ranking indexes, and migration idempotency; existing frontend tests remained green.
Task 3: RED verified in GitHub Actions run 38825241454: repository tests remained green and validation suite failed exactly because `worker/src/validation.ts` was absent.
Task 3: complete — GitHub Actions run 38825329705 passed Unicode/NFC username validation, player-id validation, exact `12 + food*4` arithmetic, food/duration bounds, hidden-tab wall-time tolerance, +5000ms client clock grace, and six-hour session age checks.
Task 4: RED verified in GitHub Actions run 38825429622: validation and repository remained green while all eight new HTTP contracts received the old Worker 404 path.
Task 4: Ruling: accepted-result retries are checked before session-age expiry so a lost successful response remains recoverable even if the retry happens after the six-hour session-start window; conflicting finalized payloads still return 409.
Task 4: complete — GitHub Actions run 38825608222 passed session creation, malformed/invalid request envelopes, session ownership, impossible-result rejection, expiry, idempotent result retry, conflicting finalization, start/result rate limits, all existing Worker tests, typecheck, and build.
Task 5: complete — canonical best-per-player ranking queries, leaderboard pagination/limit semantics, duplicate-username handling, player rank lookup, and read rate limits are implemented and were reverified in the full branch gate run 38833124380.
Task 6: complete — `HttpSessionGateway` implements explicit `sessionId` submission, structured API errors, leaderboard/rank reads, and malformed-success rejection; full integration reverified in run 38833124380.
Task 7: complete — app lifecycle tracks session start/submission/retry state and uses run/rank attempt guards so stale async responses cannot overwrite newer run or rank state; integration coverage reverified in run 38833124380.
Task 8: complete — game-over submission state, retry controls, public leaderboard loading/error/ready states, self-row highlighting, and replay-safe error handling are integrated; full browser coverage reverified in run 38833124380.
Task 9: RED/debugging — ranked E2E initially failed before any `/api/games` request despite `VITE_RANKING_API_BASE=/rank` and a concrete `HttpSessionGateway`. Receiver-focused unit coverage reproduced `TypeError: Illegal invocation` when a browser-native fetch implementation was invoked as `this.fetchImpl(...)` (run 38832817870).
Task 9: fix — `HttpSessionGateway` now wraps the injected/native fetch with `fetchImpl.call(globalThis, input, init)`, preserving the required browser receiver while keeping injectable test fetches. A subsequent Playwright-only timing issue was corrected by releasing the held start request before removing its route interception; no product logic changed for that harness fix.
Task 9: complete — GitHub Actions run 38833124380 passed 96 frontend tests, 25 Worker tests, typecheck, production build, and all 5 Playwright tests including the real ranked Worker+D1 flow, delayed session start, accepted score/world rank, leaderboard self-row, forced leaderboard read failure, and replay after failure.
Task 10: security RED — GitHub Actions run 38833250805 executed full `npm audit --json` and reported three advisories, all confined to the Vitest development/test tree: `@vitest/mocker` moderate GHSA-82fw-gwwq-j7x9 and `tinypool` critical GHSA-5gmw-xhrv-c9v3 / GHSA-85c8-ppgw-ccpr. npm's automatic remediation requires a Vitest 5 semver-major migration.
Task 10: ruling — do not mix a Vitest 3→5 test-infrastructure migration into the backend feature because the advisories are absent from the deployable production dependency graph. CI instead enforces `npm audit --omit=dev --audit-level=moderate` as a blocking production-security gate; the full dev-only findings and rationale are retained in `docs/security/2026-10-15-dependency-audit.md` rather than suppressed.
Task 10: verification — `npm run worker:build` (`wrangler deploy --dry-run`) is now a canonical CI step, production dependency audit is blocking, README documents local Worker/D1 and ranked frontend setup, and no production Cloudflare IDs/secrets/routing are provisioned in this feature.
Task 10: complete on pre-ledger head — pull-request run 38833354546 passed `npm ci`, production dependency audit, 96 frontend tests, 25 Worker tests, typecheck, Worker dry-run, frontend build, Chromium installation, and all 5 E2E tests. A final fresh run is required after this ledger commit before completion is claimed.
