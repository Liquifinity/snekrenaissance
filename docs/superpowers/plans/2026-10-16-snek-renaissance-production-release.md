# SNEK RENAISSANCE Production Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the integrated SNEK RENAISSANCE V1 to Cloudflare production with a real D1 leaderboard, a deployed ranking Worker, a Cloudflare Pages frontend, deterministic smoke tests, and a documented rollback path.

**Architecture:** Preserve the approved split architecture: Cloudflare Pages serves the Vite frontend; `snekrenaissance-api` runs as a separate Cloudflare Worker bound to the production `snekrenaissance-leaderboard` D1 database. Because Pages and Workers use different production origins, the public ranking API explicitly supports browser CORS. Production deployment is manual-gated through a GitHub Actions `workflow_dispatch` job using Cloudflare credentials stored only in GitHub Secrets; no Cloudflare secret or account-specific D1 UUID is committed.

**Tech Stack:** Vite 7, TypeScript 5, Three.js, Cloudflare Workers, Cloudflare D1, Cloudflare Pages, Wrangler 4.150.0, GitHub Actions, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-15-snek-renaissance-v1-design.md`

## Global Constraints

- Keep `main` as the stable production authority; deployment work occurs on a branch and PR first.
- Worker name remains exactly `snekrenaissance-api`.
- D1 database name remains exactly `snekrenaissance-leaderboard`.
- Pages project name is exactly `snekrenaissance`; if Cloudflare rejects that exact project name, stop instead of silently renaming production.
- Frontend production build must set `VITE_RANKING_API_BASE` to the deployed Worker origin; an empty value would intentionally fall back to local `UNRANKED` and is a release failure.
- Production D1 UUID is supplied at deploy time through `CLOUDFLARE_D1_DATABASE_ID`; the placeholder UUID in `wrangler.jsonc` remains safe for local/dry-run use.
- GitHub production secrets required: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`.
- Cloudflare API token must be least-privilege and able to deploy/create the Worker, apply D1 migrations, inspect the Workers subdomain, and create/deploy Pages content.
- No cookies or credentialed browser requests are used by the ranking API. CORS therefore permits public origins and must not be treated as an anti-abuse control; server validation and rate limits remain authoritative.
- First production release is manual only (`workflow_dispatch`), not automatic on every `main` push.
- Do not attach a custom domain in V1 release. First release uses Cloudflare-managed `pages.dev` and `workers.dev` URLs; custom domain work is a separate change.
- Never delete or recreate an existing production D1 database during deployment.

## Review Focus

1. Browser preflight from a Pages origin must succeed for JSON POST requests without weakening server-side score validation.
2. Missing or placeholder Cloudflare identifiers must fail the deploy before any production mutation.
3. A failed D1 migration must stop before Worker/Pages promotion; a successful migration is not rolled back by code rollback.
4. A successful Worker deploy followed by a failed Pages deploy must leave the prior Pages production deployment active and produce enough output to roll the Worker back.
5. The deployed frontend must actually be `RANKED`; smoke tests must prove the production bundle points to the live Worker rather than silently falling back to `LocalSessionGateway`.

---

### Task 1: Production browser CORS contract

**Files:**
- Create: `worker/src/cors.ts`
- Modify: `worker/src/index.ts`
- Modify: `worker/src/errors.ts`
- Test: `worker/tests/api.test.ts`

**Interfaces:**
- Consumes: existing `routeRequest(request, env)` and JSON response helpers.
- Produces: `corsHeaders(): HeadersInit`, `withCors(response: Response): Response`, and `preflightResponse(): Response` used by the Worker entrypoint.

- [ ] **Step 1: Write failing Worker tests**

Add tests asserting:
- `OPTIONS /api/games` returns `204`;
- response includes `Access-Control-Allow-Origin: *`;
- response allows `GET, POST, OPTIONS` and header `Content-Type`;
- normal health, leaderboard, validation-error and internal JSON responses also include `Access-Control-Allow-Origin: *`.

- [ ] **Step 2: Verify RED**

Run: `npm run test:worker`

Expected: new CORS/preflight assertions fail while existing Worker contracts remain green.

- [ ] **Step 3: Implement the minimal CORS layer**

`worker/src/cors.ts` owns the public API headers. `worker/src/index.ts` handles `OPTIONS` before route dispatch and wraps every returned response, including error paths. Do not add credentials support.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test:worker && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `fix: enable production ranking API cors`

---

### Task 2: Deterministic production Wrangler config rendering

**Files:**
- Create: `scripts/render-production-wrangler.mjs`
- Modify: `.gitignore`
- Modify: `package.json`
- Test: `tests/unit/production-config.test.ts`

**Interfaces:**
- Consumes: committed `wrangler.jsonc` with one all-zero production `database_id` placeholder and runtime env `CLOUDFLARE_D1_DATABASE_ID`.
- Produces: ignored `.wrangler.production.jsonc` with only that D1 UUID substituted.

- [ ] **Step 1: Write failing renderer tests**

Pin these cases:
- missing ID fails before output;
- all-zero placeholder fails;
- malformed non-UUID fails;
- valid UUID replaces exactly one D1 `database_id` and preserves Worker name, entrypoint, compatibility date, rate limits, binding name, database name, preview identifier, and migrations directory.

- [ ] **Step 2: Verify RED**

Run: `npm test -- production-config`

Expected: FAIL because the renderer does not exist.

- [ ] **Step 3: Implement deterministic rendering**

Create `renderProductionWrangler({ databaseId?, inputPath?, outputPath? })` in `scripts/render-production-wrangler.mjs`. Reject zero/missing/malformed IDs, require exactly one known placeholder, write `.wrangler.production.jsonc`, and never rewrite committed `wrangler.jsonc`.

Add `.wrangler.production.jsonc` to `.gitignore` and expose `npm run render:wrangler:production`.

- [ ] **Step 4: Verify GREEN and Wrangler parseability**

Run with a test UUID:

```bash
CLOUDFLARE_D1_DATABASE_ID=11111111-1111-4111-8111-111111111111 npm run render:wrangler:production
npx wrangler deploy --dry-run --config .wrangler.production.jsonc
```

Expected: renderer tests PASS and Wrangler dry-run accepts the generated config.

- [ ] **Step 5: Commit**

Commit message: `build: render production wrangler config`

---

### Task 3: Manual-gated production deployment workflow

**Files:**
- Create: `.github/workflows/deploy-production.yml`
- Modify: `.github/workflows/ci.yml`
- Test: `tests/unit/deploy-production.test.ts`

**Interfaces:**
- Consumes: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, `render:wrangler:production`, `migrations/`, and production build.
- Produces: `WORKER_URL`, `PAGES_URL`, `WORKER_VERSION_ID`, `PAGES_DEPLOYMENT_ID` as release evidence.

- [ ] **Step 1: Write failing static workflow tests**

Pin that production workflow:
- is `workflow_dispatch` only;
- runs under GitHub environment `production`;
- grants only `contents: read` to `GITHUB_TOKEN`;
- references all three required Cloudflare secrets;
- checks out canonical `main`;
- runs production audit/tests/typecheck/build/dry-runs before production mutation;
- resolves Workers subdomain and validates/creates exact Pages project before remote D1 mutation;
- never executes `wrangler d1 create`;
- lists/applies remote D1 migrations before Worker deployment;
- deploys Worker before ranked frontend build;
- compiles `VITE_RANKING_API_BASE` from live Worker URL;
- deploys Pages after ranked build;
- runs smoke last;
- records Worker version and Pages deployment IDs.

- [ ] **Step 2: Verify RED**

Run: `npm test -- deploy-production`

Expected: FAIL because the workflow is absent.

- [ ] **Step 3: Implement workflow**

Use `actions/checkout@v4`, `actions/setup-node@v4`, Node 22, `npm ci`, secret validation, all canonical verification gates, production config rendering, Cloudflare target preflight, remote migrations, Worker deploy, ranked frontend build, Pages deploy, smoke, and rollback evidence.

The workflow may create Pages project `snekrenaissance` only when absent. It must stop rather than rename if Cloudflare rejects that exact project. It must never create or delete D1.

- [ ] **Step 4: Verify GREEN**

Run complete CI on the branch.

Expected: frontend tests, Worker tests, typecheck, rendered production config dry-run, neutral Worker dry-run, frontend build, Playwright all PASS.

- [ ] **Step 5: Commit**

Commit message: `ci: add manual production deployment`

---

### Task 4: Production smoke verification and rollback documentation

**Files:**
- Create: `scripts/smoke-production.mjs`
- Create: `scripts/smoke-production.d.mts`
- Modify: `README.md`
- Test: `tests/unit/production-smoke.test.ts`

**Interfaces:**
- Consumes: `WORKER_URL`, `PAGES_URL`, public production HTTP endpoints.
- Produces: fail-fast release acceptance result without inserting a fake leaderboard score.

- [ ] **Step 1: Write failing smoke tests**

Mock production HTTP and assert:
- health must be 200 + `{ ok: true }` + public CORS;
- leaderboard must be 200 JSON with entries array + public CORS;
- preflight must be 204 and allow POST + Content-Type;
- Pages root must expose `#app` and JavaScript assets;
- deployed JS must contain the canonical meme copy and exact live Worker origin;
- missing Worker origin in bundle is a release failure, because it would produce UNRANKED fallback.

- [ ] **Step 2: Verify RED**

Run: `npm test -- production-smoke`

Expected: FAIL because smoke module is absent.

- [ ] **Step 3: Implement smoke CLI**

Export `smokeProduction({ workerUrl?, pagesUrl?, fetchImpl? })`. Require HTTPS origins, verify Worker health/leaderboard/preflight, fetch Pages root and referenced JavaScript bundles, require canonical meme strings and Worker origin, return `{ workerUrl, pagesUrl, ranked: true }`. CLI reads env and exits non-zero on failure.

Do not POST a fake result in production.

- [ ] **Step 4: Document rollback model**

README must state:
- list Worker versions with `wrangler versions list`;
- rollback Worker with `wrangler rollback <VERSION_ID>`;
- list Pages production deployments;
- use Cloudflare Pages rollback UI/API for selected previous deployment;
- D1 remains persistent and migrations are forward-only;
- rerun production smoke after any rollback.

- [ ] **Step 5: Verify GREEN**

Run complete CI.

Expected: all gates PASS.

- [ ] **Step 6: Commit**

Commit message: `test: add production release smoke verification`

---

### Task 5: First production dispatch and acceptance

**Files:**
- No source mutation required unless production evidence reveals a defect.
- Update release evidence/ledger only after actual production dispatch.

**Interfaces:**
- Consumes: merged `main`, D1 `snekrenaissance-leaderboard`, GitHub `production` environment secrets, manual `deploy production` workflow.
- Produces: public Worker and Pages URLs plus live production acceptance evidence.

- [ ] **Step 1: Provision/identify the persistent D1 resource**

Create exactly once or reuse `snekrenaissance-leaderboard`; capture its UUID. Do not commit it.

- [ ] **Step 2: Configure GitHub production environment**

Store only in GitHub Secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`

Do not paste secret values into issues, PRs, commits, logs, or chat.

- [ ] **Step 3: Merge release tooling to main and verify main CI**

Expected: same canonical CI gates PASS on the integrated tree.

- [ ] **Step 4: Dispatch production manually**

Run GitHub Actions workflow `deploy production` from `main`.

Expected order: credential validation → verification → config dry-run → target preflight → D1 migrations → Worker → ranked frontend → Pages → smoke → rollback evidence.

- [ ] **Step 5: Verify live public endpoints**

Required:
- Worker health 200;
- leaderboard 200;
- CORS preflight 204;
- Pages root 200;
- production smoke reports `RANKED`;
- no fake leaderboard row created by release verification.

- [ ] **Step 6: Human acceptance**

On desktop and mobile confirm welcome meme, username flow, gameplay, joystick/keyboard, game-over, leaderboard, and rank behavior.

- [ ] **Step 7: Record release evidence**

Record release SHA, public URLs, Worker version ID, Pages deployment ID, smoke result, and acceptance result. Do not record secrets.
