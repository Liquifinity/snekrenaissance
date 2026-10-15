# SNEK RENAISSANCE Leaderboard Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent ranked sessions, basic server-side score validation, public leaderboard/rank APIs, and frontend integration using a Cloudflare Worker + D1 without changing Core Game simulation authority.

**Architecture:** The browser remains authoritative for V1 gameplay simulation, while a Cloudflare Worker owns ranked session creation, result acceptance, rate limiting, idempotency, and leaderboard queries. D1 stores players, game sessions, and accepted scores; the frontend integrates through the existing `SessionGateway` seam, which becomes explicitly session-aware so every submitted result is bound to the server-created game session that preceded it.

**Tech Stack:** TypeScript, existing Vite/Three.js frontend, Cloudflare Workers, Cloudflare D1, Wrangler `>=4.36`, existing Vitest test runner, Wrangler `createTestHarness()` for Worker integration tests, existing Playwright browser smoke tests.

**Spec:** `docs/superpowers/specs/2026-10-15-snek-renaissance-v1-design.md`

## Global Constraints

- `Liquifinity/snekrenaissance` remains the public source of truth.
- Preserve the canonical opening copy exactly: `just because ChatGPT` / `didn't complete my image.`
- No account, email, password, OAuth, or globally unique username requirement in V1.
- Duplicate display usernames remain allowed; stable anonymous `player_id` remains distinct from username.
- Ranking authority is greatest accepted `max_length`, then lower `duration_ms`, then older `accepted_at`; exact timestamp ties use score row ID only as a deterministic final ordering key.
- Public leaderboard returns one ranked row per `player_id`, using that player's best accepted run under the canonical ordering; this prevents one player from occupying multiple leaderboard positions while preserving every accepted run in storage.
- Initial body length is `12`; each food adds exactly `4`; result validation must enforce `max_length = 12 + food_eaten × 4`.
- The server is basic integrity protection only; do not introduce authoritative server simulation in this plan.
- Core movement, toroidal topology, collision, food spawning, rendering, and input logic under `src/game`, `src/render`, and `src/input` must not depend on network state.
- Ranked gameplay must not silently begin if server session creation fails; present a concise retry state.
- Result submission failure must preserve the local game-over result and expose a retry action; replay must remain available.
- Leaderboard read failure must not block replay.
- No production Cloudflare resource provisioning or production deploy in this plan. Real Worker/D1 IDs, Pages routing, secrets, and rollout belong to the separate release/deployment plan.
- Use prepared D1 statements for all user-controlled values.
- D1 result finalization must be idempotent: repeating the same accepted result for the same `game_session_id` returns the accepted outcome; a conflicting second payload returns `409`.
- HTTP error responses use a stable JSON envelope: `{ "error": { "code": string, "message": string, "retryable": boolean } }`.
- Username server validation: trim, Unicode NFC normalization, `1..24` Unicode code points, reject C0/C1 control characters; do not restrict language or require ASCII.
- `player_id` server validation: `1..128` ASCII characters matching `[A-Za-z0-9._:-]+`.
- Session IDs are server-generated with `crypto.randomUUID()`.
- Session lifetime is at most `6h` from server start timestamp.
- Client active `duration_ms` may be less than server wall time because tab suspension pauses simulation; require only `duration_ms <= server_elapsed_ms + 5000` and sane non-negative integer bounds.
- Basic growth plausibility requires at least `200ms` of active duration per collected food, a deliberately conservative lower bound below the current theoretical minimum travel time.
- `food_eaten` is an integer in `0..10000`.
- Rate limits: session creation `20/60s` per `IP + player_id`; result submission `30/60s` per `IP + player_id`; leaderboard/rank reads `120/60s` per IP.
- Keep existing Vitest 3 tests stable; do not upgrade the entire test stack solely to use the Cloudflare Vitest plugin. Use current Wrangler test-harness APIs for Worker integration.

## Review Focus

1. **Accepted result but lost HTTP response:** a retry with the identical payload must return the same accepted outcome instead of creating a duplicate score or reporting a false conflict. Task 4 owns this test.
2. **Stale asynchronous session response:** a late `startRun()`/`submitResult()` from an older run must not mark a newer run ranked or overwrite its world rank. Task 7 owns this test.
3. **Long wall-clock pause:** a hidden/background tab may make server elapsed time much greater than client active `duration_ms`; valid paused runs must not be rejected solely because wall time is larger. Task 3 owns this test.
4. **Untrusted public username:** Unicode and duplicate names are allowed, but control characters/oversized names are rejected and UI rendering remains text-only. Tasks 3 and 8 own these tests.
5. **Concurrent/double finalization:** only one score row may exist per game session; conflicting second submissions must resolve deterministically under the unique `game_id` constraint and D1 batch finalization. Tasks 2 and 4 own these tests.

---

## File Map

### Shared API contract

- `src/shared/ranking-api.ts` — request/response DTOs and leaderboard types shared by browser and Worker.

### Worker

- `worker/src/env.ts` — Worker binding types and common constants.
- `worker/src/errors.ts` — typed HTTP/API errors and JSON error responses.
- `worker/src/validation.ts` — identity, username, session-age, length, and plausibility validation.
- `worker/src/repository.ts` — prepared D1 reads/writes and atomic result finalization.
- `worker/src/ranking.ts` — canonical best-per-player leaderboard/rank queries.
- `worker/src/routes.ts` — route handlers for sessions, results, leaderboard, and player rank.
- `worker/src/index.ts` — Worker `fetch` entry point and route dispatch only.
- `worker/tests/validation.test.ts` — pure validation tests.
- `worker/tests/api.test.ts` — local Worker+D1 HTTP integration tests.
- `migrations/0001_leaderboard.sql` — initial D1 schema/indexes.
- `wrangler.jsonc` — local Worker/D1/rate-limit binding configuration; production IDs remain deferred.

### Frontend integration

- `src/app/session-gateway.ts` — session-aware interface plus local unranked implementation.
- `src/app/http-session-gateway.ts` — HTTP implementation of `SessionGateway`.
- `src/app/app-state.ts` — active session, submission status, leaderboard state.
- `src/app/app-controller.ts` — ranked start lifecycle, result retry, stale-response guards, leaderboard reads.
- `src/ui/game-over-view.ts` — submission pending/failed/accepted states and retry action.
- `src/ui/leaderboard-view.ts` — public leaderboard/loading/error/player-rank UI.
- `src/main.ts` — gateway selection only; no gameplay/network rules.
- `src/vite-env.d.ts` — optional `VITE_RANKING_API_BASE` typing.
- `tests/unit/http-session-gateway.test.ts` — HTTP request/response mapping.
- `tests/integration/app-ranking-flow.test.ts` — controller state and stale-response behavior.
- `tests/e2e/game.spec.ts` — preserve existing local/unranked smoke behavior.

### Repository gates

- `package.json` / `package-lock.json` — Wrangler and backend scripts.
- `.github/workflows/ci.yml` — add Worker tests/build validation.
- `README.md` — local Worker/D1 development commands and ranking status.

---

### Task 1: Shared Ranking API Contract + Worker Test Harness

**Files:**
- Create: `src/shared/ranking-api.ts`
- Create: `worker/src/env.ts`
- Create: `worker/src/index.ts`
- Create: `wrangler.jsonc`
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `worker/tests/api.test.ts`

**Interfaces:**
- Produces shared DTOs:
  - `StartGameRequest { playerId: string; username: string }`
  - `StartGameResponse { sessionId: string; startedAt: number }`
  - `SubmitResultRequest { playerId: string; username: string; maxLength: number; foodEaten: number; durationMs: number }`
  - `SubmitResultResponse { accepted: true; worldRank: number }`
  - `LeaderboardEntry { rank: number; username: string; maxLength: number; durationMs: number; acceptedAt: number }`
  - `LeaderboardResponse { entries: LeaderboardEntry[] }`
  - `PlayerRankResponse { rank: number; username: string; maxLength: number; durationMs: number }`
  - `ApiErrorEnvelope { error: { code: string; message: string; retryable: boolean } }`
- Produces `WorkerEnv` with `DB: D1Database` plus `START_LIMITER`, `RESULT_LIMITER`, `READ_LIMITER` rate-limit bindings.
- `worker/src/index.ts` initially exposes a minimal health response only; product routes arrive in later tasks.

- [ ] **Step 1: Add a failing Worker harness smoke test**

Test name: `worker boots with local bindings`.

Assertions:
- `createTestHarness()` can start `wrangler.jsonc`;
- `GET /api/health` returns `200` and `{ ok: true }`;
- local D1 and rate-limit bindings resolve without remote resources.

- [ ] **Step 2: Run the Worker smoke test and verify RED**

Run: `npm run test:worker -- worker/tests/api.test.ts`
Expected: FAIL because Wrangler config/Worker entry/scripts do not exist.

- [ ] **Step 3: Add Wrangler without upgrading existing Vitest**

Add a current Wrangler 4.x dependency satisfying `>=4.36.0` and scripts:

```text
worker:dev     -> wrangler dev
worker:types   -> wrangler types
worker:build   -> wrangler deploy --dry-run
worker:migrate -> wrangler d1 migrations apply snekrenaissance-leaderboard --local
test:worker    -> vitest run worker/tests
```

- [ ] **Step 4: Create `wrangler.jsonc` for local-only development**

Required configuration:
- name: `snekrenaissance-api`;
- entry: `worker/src/index.ts`;
- compatibility date: `2026-10-15`;
- D1 binding name: `DB`;
- database name: `snekrenaissance-leaderboard`;
- production `database_id` remains a clearly marked zero UUID placeholder in this plan;
- `preview_database_id`: `snekrenaissance-local`;
- migrations directory: `migrations`;
- three rate-limit bindings matching Global Constraints.

Do not add Cloudflare account IDs, API tokens, production routes, or deploy secrets.

- [ ] **Step 5: Add the shared DTO file and minimal health Worker**

Worker default export signature:

```ts
export default {
  fetch(request: Request, env: WorkerEnv): Promise<Response>
}
```

`/api/health` returns JSON only; all unknown routes return `404`.

- [ ] **Step 6: Run smoke test + existing frontend tests**

Run: `npm run test:worker -- worker/tests/api.test.ts && npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/shared worker/src worker/tests wrangler.jsonc package.json package-lock.json
git commit -m "build: scaffold ranked worker"
```

---

### Task 2: D1 Schema + Repository Finalization Primitives

**Files:**
- Create: `migrations/0001_leaderboard.sql`
- Create: `worker/src/repository.ts`
- Modify: `worker/tests/api.test.ts`

**Interfaces:**
- Produces repository functions:
  - `upsertPlayer(db, playerId, username, nowMs): Promise<void>`
  - `createGame(db, gameId, playerId, startedAtMs): Promise<void>`
  - `getGame(db, gameId): Promise<GameRow | null>`
  - `getScoreByGame(db, gameId): Promise<ScoreRow | null>`
  - `finalizeAcceptedScore(db, input): Promise<ScoreRow>`
- `finalizeAcceptedScore` uses `D1Database.batch()` so the score insert and game finalization are one D1 transaction.

- [ ] **Step 1: Write failing migration/repository integration tests**

Assertions after local migration:
- players can be upserted without changing `created_at`;
- games start with `status='started'`;
- one game accepts exactly one score row;
- `scores.game_id` is unique;
- failed/conflicting second score insertion cannot create a second row;
- ranking indexes exist and migration re-application is controlled by Wrangler migrations rather than raw schema replay.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm run test:worker -- worker/tests/api.test.ts`
Expected: FAIL because migration/repository do not exist.

- [ ] **Step 3: Create the schema**

Required tables:

```text
players
- id TEXT PRIMARY KEY
- username TEXT NOT NULL
- created_at INTEGER NOT NULL
- updated_at INTEGER NOT NULL

games
- id TEXT PRIMARY KEY
- player_id TEXT NOT NULL
- started_at INTEGER NOT NULL
- finalized_at INTEGER NULL
- status TEXT NOT NULL CHECK(status IN ('started','accepted','rejected'))

scores
- id INTEGER PRIMARY KEY AUTOINCREMENT
- game_id TEXT NOT NULL UNIQUE
- player_id TEXT NOT NULL
- username_snapshot TEXT NOT NULL
- max_length INTEGER NOT NULL
- food_eaten INTEGER NOT NULL
- duration_ms INTEGER NOT NULL
- accepted_at INTEGER NOT NULL
```

Add foreign keys and indexes for `scores(player_id, max_length, duration_ms, accepted_at)` and canonical leaderboard ordering.

- [ ] **Step 4: Implement prepared repository operations**

All values use `prepare(...).bind(...)`. No string interpolation for identifiers supplied by requests.

`finalizeAcceptedScore()` batch order:
1. insert unique score row;
2. update game from `started` → `accepted`, set `finalized_at`.

A failed batch must leave neither partial score nor partially finalized game.

- [ ] **Step 5: Run migration/repository tests**

Run: `npm run worker:migrate && npm run test:worker -- worker/tests/api.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add migrations worker/src/repository.ts worker/tests/api.test.ts
git commit -m "feat: add leaderboard persistence"
```

---

### Task 3: Identity + Score Validation

**Files:**
- Create: `worker/src/validation.ts`
- Test: `worker/tests/validation.test.ts`

**Interfaces:**
- Consumes current game constants from `src/game/constants.ts` for `INITIAL_BODY_SEGMENTS`, `GROWTH_PER_FOOD`, `SNAKE_SPEED`, `FOOD_HEAD_EXCLUSION_RADIUS`, and `FOOD_PICKUP_RADIUS`; do not duplicate gameplay authority.
- Produces:
  - `normalizeUsername(input: unknown): string`
  - `validatePlayerId(input: unknown): string`
  - `validateStartRequest(input: unknown): StartGameRequest`
  - `validateResultRequest(input: unknown, serverElapsedMs: number): SubmitResultRequest`
  - `validateSessionAge(serverElapsedMs: number): void`

- [ ] **Step 1: Write failing validation tests**

Assertions:
- duplicate usernames are valid;
- Unicode names are normalized NFC and accepted;
- blank names fail;
- 25-code-point username fails;
- C0/C1 control characters fail;
- valid UUID/fallback-style player IDs pass; whitespace/slash/HTML payload IDs fail;
- `foodEaten`, `maxLength`, `durationMs` must be finite non-negative integers;
- exact length arithmetic `12 + food × 4` is required;
- `foodEaten > 10000` fails;
- `durationMs < foodEaten × 200` fails;
- client duration greater than server elapsed by more than `5000ms` fails;
- server elapsed greater than client duration is valid, covering long hidden-tab pauses;
- session age over `6h` fails.

- [ ] **Step 2: Run validation tests and verify RED**

Run: `npm run test:worker -- worker/tests/validation.test.ts`
Expected: FAIL because validation module does not exist.

- [ ] **Step 3: Implement validation as pure functions**

Do not import D1, Fetch API request objects, or UI modules into `validation.ts`.

- [ ] **Step 4: Run validation tests**

Run: `npm run test:worker -- worker/tests/validation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add worker/src/validation.ts worker/tests/validation.test.ts
git commit -m "feat: validate ranked runs"
```

---

### Task 4: Ranked Session + Result HTTP Endpoints

**Files:**
- Create: `worker/src/errors.ts`
- Create: `worker/src/routes.ts`
- Modify: `worker/src/index.ts`
- Modify: `worker/tests/api.test.ts`

**Interfaces:**
- Produces routes:
  - `POST /api/games`
  - `POST /api/games/:sessionId/result`
- `POST /api/games` consumes `StartGameRequest`, upserts player, creates UUID game session, returns `201 StartGameResponse`.
- `POST /api/games/:sessionId/result` consumes `SubmitResultRequest`, requires the submitted `playerId` to match the session owner, validates run/session, finalizes once, and returns `200 SubmitResultResponse`.
- Consumes `rankPlayer()` from Task 5 only by an interface callback until Task 5 lands; temporary test stub may return rank `1`.

- [ ] **Step 1: Write failing session/result API tests**

Assertions:
- valid session start returns `201` with server UUID and start timestamp;
- invalid identity returns `400` stable error envelope;
- start rate limit returns `429` retryable error;
- unknown session result returns `404`;
- mismatched `playerId` returns `409` or `403` without revealing another player's data; use `409 SESSION_OWNER_MISMATCH` canonically;
- impossible growth/duration returns `400` and does not finalize the session;
- expired session returns `409 SESSION_EXPIRED` and marks no score accepted;
- first valid result creates one score and finalizes the game;
- identical second submission returns `200` with the same accepted semantics and still exactly one score row;
- conflicting second submission returns `409 SESSION_FINALIZED`;
- result rate limit returns `429`;
- malformed JSON returns `400 INVALID_JSON`, not an uncaught Worker exception.

- [ ] **Step 2: Run API tests and verify RED**

Run: `npm run worker:migrate && npm run test:worker -- worker/tests/api.test.ts`
Expected: FAIL because product routes do not exist.

- [ ] **Step 3: Implement error envelopes and route parsing**

`ApiError` carries `status`, `code`, `message`, and `retryable`; `index.ts` is responsible for converting known errors to JSON and unknown exceptions to `500 INTERNAL_ERROR` without leaking stack traces.

- [ ] **Step 4: Implement rate-limit keys**

Use `CF-Connecting-IP` when available; fallback to `unknown`. Start/result key is `${ip}:${playerId}`. Reads use IP only in Task 5.

- [ ] **Step 5: Implement idempotent result finalization**

Before a new finalization:
1. query `scores` by `game_id`;
2. if present and all submitted metrics/player match stored values, return accepted outcome;
3. if present and payload differs, return `409 SESSION_FINALIZED`;
4. otherwise validate and call atomic `finalizeAcceptedScore()`.

If a concurrent unique-constraint race occurs, re-read `scores.game_id` and apply the same identical-vs-conflicting rule.

- [ ] **Step 6: Run API tests**

Run: `npm run worker:migrate && npm run test:worker -- worker/tests/api.test.ts`
Expected: PASS for session/result cases.

- [ ] **Step 7: Commit**

```bash
git add worker/src worker/tests/api.test.ts
git commit -m "feat: add ranked session endpoints"
```

---

### Task 5: Canonical Leaderboard + Player Rank Queries

**Files:**
- Create: `worker/src/ranking.ts`
- Modify: `worker/src/routes.ts`
- Modify: `worker/tests/api.test.ts`

**Interfaces:**
- Produces:
  - `getLeaderboard(db: D1Database, limit: number): Promise<LeaderboardEntry[]>`
  - `getPlayerRank(db: D1Database, playerId: string): Promise<PlayerRankResponse | null>`
  - `rankPlayer(db: D1Database, playerId: string): Promise<number | null>`
- Produces routes:
  - `GET /api/leaderboard?limit=N`
  - `GET /api/player/:playerId/rank`

- [ ] **Step 1: Write failing canonical ordering tests**

Seed multiple players/runs and assert:
- only each player's best accepted run occupies a leaderboard position;
- greater `max_length` ranks first;
- equal length uses lower `duration_ms`;
- equal length/duration uses older `accepted_at`;
- exact accepted-time tie is deterministic by score ID;
- current `players.username` is displayed, while `username_snapshot` remains stored for audit;
- duplicate usernames from different player IDs can occupy different ranks;
- player without an accepted run returns `404` from rank route;
- default leaderboard limit is `50`, maximum accepted limit is `100`;
- invalid limit returns `400`;
- read rate limit returns `429`.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm run test:worker -- worker/tests/api.test.ts`
Expected: FAIL because ranking module/routes do not exist.

- [ ] **Step 3: Implement best-per-player query**

Use a window-function CTE or semantically equivalent SQL:
- rank scores inside each `player_id` by canonical ordering;
- retain `player_best = 1`;
- apply global canonical ordering and `ROW_NUMBER()`;
- join `players` for current display username.

Do not rank rejected/unfinalized games.

- [ ] **Step 4: Replace Task 4's temporary rank callback with `rankPlayer()`**

After accepting or idempotently re-reading a result, `SubmitResultResponse.worldRank` is the player's current canonical rank.

- [ ] **Step 5: Run all Worker tests**

Run: `npm run test:worker`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add worker/src/ranking.ts worker/src/routes.ts worker/tests/api.test.ts
git commit -m "feat: add public leaderboard ranking"
```

---

### Task 6: Session-Aware Frontend Gateway + HTTP Client

**Files:**
- Modify: `src/app/session-gateway.ts`
- Create: `src/app/http-session-gateway.ts`
- Create: `src/vite-env.d.ts`
- Test: `tests/unit/http-session-gateway.test.ts`

**Interfaces:**
- `SessionGateway` becomes:
  - `startRun(identity: PlayerIdentity): Promise<SessionStart>`
  - `submitResult(identity: PlayerIdentity, sessionId: string, result: RunResult): Promise<SessionSubmission>`
  - `getLeaderboard(limit?: number): Promise<LeaderboardResponse>`
  - `getPlayerRank(playerId: string): Promise<PlayerRankResponse | null>`
- `SessionStart` remains discriminated by `ranked`; ranked starts always carry non-null `sessionId`.
- `LocalSessionGateway` remains available and returns unranked/null results without network access.
- `HttpSessionGateway` consumes the shared DTOs from Task 1 and a base URL.

- [ ] **Step 1: Write failing HTTP gateway tests**

Mock `fetch` and assert:
- start maps to `POST /api/games` JSON;
- result includes the explicit `sessionId` in the route and never reads a mutable global session;
- leaderboard/rank GET requests map DTOs correctly;
- `404` player rank maps to `null`;
- structured retryable API errors are surfaced as typed client errors;
- malformed success JSON rejects instead of silently inventing rank data;
- usernames are sent as JSON and never interpolated into a URL except `playerId`, which is encoded.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- tests/unit/http-session-gateway.test.ts`
Expected: FAIL because HTTP gateway and new interface do not exist.

- [ ] **Step 3: Update `SessionGateway` and local implementation**

Keep network-free local development behavior intact.

- [ ] **Step 4: Implement `HttpSessionGateway`**

Constructor signature:

```ts
new HttpSessionGateway(baseUrl: string, fetchImpl: typeof fetch = fetch)
```

Normalize trailing `/`; default path semantics remain `/api/...`.

- [ ] **Step 5: Run gateway + existing frontend tests**

Run: `npm test -- tests/unit/http-session-gateway.test.ts tests/integration/app-flow.test.ts && npm run typecheck`
Expected: PASS after updating test fakes to the new explicit session signature.

- [ ] **Step 6: Commit**

```bash
git add src/app/session-gateway.ts src/app/http-session-gateway.ts src/vite-env.d.ts tests/unit/http-session-gateway.test.ts tests/integration/app-flow.test.ts
git commit -m "feat: add ranked HTTP gateway"
```

---

### Task 7: Ranked Start Lifecycle + Submission Retry + Stale-Response Guards

**Files:**
- Modify: `src/app/app-state.ts`
- Modify: `src/app/app-controller.ts`
- Modify: `src/ui/username-view.ts`
- Modify: `src/ui/game-over-view.ts`
- Test: `tests/integration/app-ranking-flow.test.ts`

**Interfaces:**
- App state adds:
  - `activeSessionId: string | null`
  - `sessionStatus: 'idle' | 'starting' | 'ranked' | 'unranked' | 'failed'`
  - `submissionStatus: 'idle' | 'submitting' | 'accepted' | 'failed'`
  - `submissionError: string | null`
- Controller owns a monotonically increasing private run-attempt token; async callbacks must compare the captured token before mutating current-run state.

- [ ] **Step 1: Write failing ranked lifecycle tests**

Assertions:
- clicking PLAY with HTTP/ranked gateway enters a start-pending UI and does not create a local `RunState` until session creation succeeds;
- successful session start stores its explicit `sessionId`, then starts gameplay;
- failed session start leaves no gameplay run and shows retry; retry can succeed without re-entering username;
- local gateway still starts unranked play;
- game-over submits with the exact session ID captured for that run;
- failed result submission preserves LENGTH/BEST and exposes `RETRY RANK` while `PLAY AGAIN` remains enabled;
- retry uses the same session/result payload;
- accepted retry updates WORLD rank;
- a late `startRun()` from attempt A cannot mutate attempt B;
- a late `submitResult()` from run A cannot overwrite WORLD rank for run B.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- tests/integration/app-ranking-flow.test.ts`
Expected: FAIL because app state/controller lack ranked lifecycle state.

- [ ] **Step 3: Implement run-attempt token and session state**

Do not modify `RunState`, `stepRun`, movement, collision, renderer, or input APIs.

- [ ] **Step 4: Add concise start failure/retry UI**

Username screen remains the retry surface. Do not silently fall back from a failed ranked start to unranked play.

- [ ] **Step 5: Add result submission retry state**

Game-over view accepts callbacks for `PLAY AGAIN`, `RANK`, and optional `RETRY RANK`; retry is rendered only when submission failed for a ranked session.

- [ ] **Step 6: Run app tests**

Run: `npm test -- tests/integration/app-ranking-flow.test.ts tests/integration/app-flow.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app src/ui/username-view.ts src/ui/game-over-view.ts tests/integration
git commit -m "feat: bind runs to ranked sessions"
```

---

### Task 8: Public Leaderboard UI + Safe Username Rendering

**Files:**
- Create: `src/ui/leaderboard-view.ts`
- Modify: `src/app/app-controller.ts`
- Modify: `src/ui/local-rank-view.ts`
- Modify: `src/styles.css`
- Test: `tests/integration/app-ranking-flow.test.ts`

**Interfaces:**
- `renderLeaderboardView(container, state, actions)` receives only DTO data, never HTML strings.
- Rank screen states: `loading`, `ready`, `empty`, `error`, `local-unranked`.
- Ranked mode fetches leaderboard and current player rank concurrently; local gateway preserves existing local-best-only view.

- [ ] **Step 1: Write failing leaderboard UI tests**

Assertions:
- RANK shows loading then canonical ordered entries;
- player's own rank is indicated without exposing `playerId` publicly;
- duplicate usernames render as separate rows when server ranks differ;
- username `<img src=x onerror=...>` renders as literal text and creates no image/script element;
- Unicode username renders unchanged after server normalization;
- leaderboard API failure shows concise error/back action and does not remove replay ability from game over;
- empty leaderboard is a valid state, not an error.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- tests/integration/app-ranking-flow.test.ts`
Expected: FAIL because leaderboard view does not exist.

- [ ] **Step 3: Implement leaderboard view with DOM text APIs only**

No `innerHTML` for server-returned username or leaderboard fields.

- [ ] **Step 4: Wire `showRank()` to gateway reads**

Guard async rank responses with the same app navigation/run-attempt semantics so a late response cannot overwrite a different screen.

- [ ] **Step 5: Run frontend tests**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui src/app/app-controller.ts src/styles.css tests/integration/app-ranking-flow.test.ts
git commit -m "feat: show public leaderboard"
```

---

### Task 9: Runtime Gateway Selection + Cross-Layer Browser Verification

**Files:**
- Modify: `src/main.ts`
- Modify: `tests/e2e/game.spec.ts`
- Modify: `playwright.config.ts` only if a second local server is required for ranked E2E; otherwise keep current config.
- Test: `worker/tests/api.test.ts`

**Interfaces:**
- If `import.meta.env.VITE_RANKING_API_BASE` is a non-empty string, `main.ts` injects `HttpSessionGateway`.
- If unset, `main.ts` injects `LocalSessionGateway` so ordinary local frontend development remains network-free and UNRANKED.
- Production enabling of `VITE_RANKING_API_BASE` is deferred to release/deployment plan.

- [ ] **Step 1: Write failing gateway-selection test/harness assertion**

Assert ranked HTTP gateway is selected only when the env value is provided; no `fetch()` occurs in default local mode.

- [ ] **Step 2: Add ranked browser integration flow**

Using local Wrangler Worker + D1 in test harness or an equivalent deterministic local server, verify:
1. intro exact meme copy;
2. username;
3. ranked session creation succeeds;
4. game starts only afterward;
5. a controlled game-over fixture submits a canonical result;
6. WORLD rank becomes numeric;
7. RANK shows the accepted entry;
8. replay remains functional if a subsequent leaderboard read is forced to fail.

Do not alter gameplay physics solely to make the E2E test easy; expose a test-only controller harness under existing test conventions.

- [ ] **Step 3: Run E2E and verify RED before wiring**

Run: `npm run test:e2e`
Expected: ranked flow fails before runtime gateway selection is wired.

- [ ] **Step 4: Wire gateway selection in `main.ts`**

No API URL logic belongs in `AppController` or game modules.

- [ ] **Step 5: Run full browser + Worker suite**

Run:

```text
npm test
npm run test:worker
npm run typecheck
npm run worker:build
npm run build
npm run test:e2e
```

Expected: all exit `0`.

- [ ] **Step 6: Commit**

```bash
git add src/main.ts tests/e2e worker/tests playwright.config.ts
git commit -m "test: verify ranked browser flow"
```

---

### Task 10: CI Backend Gate + Security/Dependency Triage + Documentation

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`
- Create: `docs/security/2026-10-15-dependency-audit.md`

**Interfaces:**
- CI remains one required logical gate and adds Worker verification without deployment.
- Dependency audit document classifies every `npm audit` finding as runtime or dev-only, affected package/path, available fix, and whether it blocks production release.

- [ ] **Step 1: Extend CI command set**

Required sequence:

```text
npm ci
npm audit --json   # capture/report; do not auto-force breaking upgrades
npm test
npm run test:worker
npm run typecheck
npm run worker:build
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

If `npm audit` exits non-zero for known findings, add a dedicated script that records the JSON and applies an explicit severity policy; do not use `|| true` without checking the report.

- [ ] **Step 2: Triage the currently observed npm advisories**

The prior CI reported `1 moderate` and `2 critical` advisories. Record the exact dependency paths and whether vulnerable code ships in the browser/Worker runtime or is dev-only. Fix non-breaking runtime advisories in this branch. Any breaking remediation that changes toolchain behavior becomes an explicit follow-up blocker for production, not an unreviewed `npm audit fix --force`.

- [ ] **Step 3: Update README local backend instructions**

Document:
- `npm run worker:migrate`;
- `npm run worker:dev`;
- frontend local mode remains UNRANKED unless `VITE_RANKING_API_BASE` is set;
- production Cloudflare resources are not yet provisioned by this plan.

- [ ] **Step 4: Run the exact final CI sequence locally or in GitHub Actions**

Expected: all product test/build commands pass; audit policy produces an explicit reviewed result.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml README.md docs/security package.json package-lock.json
git commit -m "ci: verify leaderboard backend"
```

---

## Completion Gate for This Plan

Before the backend/leaderboard implementation is considered complete, verify on the implementation branch:

```bash
npm ci
npm test
npm run test:worker
npm run typecheck
npm run worker:build
npm run build
npm run test:e2e
```

Then confirm manually/local integration:

- failed ranked session creation never starts a run falsely marked rankable;
- successful session creation binds one server `sessionId` to one browser run;
- exact `12 + food×4` arithmetic is enforced server-side;
- paused/background runs are not rejected merely because wall time exceeds active duration;
- impossible rapid growth is rejected;
- identical result retry is idempotent;
- conflicting second result is rejected;
- each player occupies at most one leaderboard position using their best run;
- duplicate usernames across different player IDs remain valid;
- malicious-looking username text renders literally;
- game-over submission failure exposes retry and does not block replay;
- leaderboard read failure does not block replay;
- local frontend remains playable UNRANKED without Worker running;
- no Cloudflare production resource or secret was created as part of this plan.

## Deferred Release Plan

After this plan is merged to `main`, write a separate production release/deployment plan covering:

1. Cloudflare account/project binding and real D1 creation.
2. Production `database_id` / environment configuration.
3. Remote D1 migration rollout and rollback evidence.
4. Pages frontend deployment and `/api` Worker routing/custom domain strategy.
5. `VITE_RANKING_API_BASE` production value.
6. Branch/ruleset protection if the connected GitHub app cannot configure it directly.
7. Production observability/logging and rate-limit verification.
8. Staging smoke test, production smoke test, and rollback gate.
