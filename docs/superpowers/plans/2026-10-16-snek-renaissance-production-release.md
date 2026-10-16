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
- Create: `tests/unit/production-config.test.ts`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Consumes: canonical `wrangler.jsonc` containing the all-zero D1 placeholder.
- Produces: generated `.wrangler.production.jsonc` with the exact runtime config and production D1 UUID; script exits non-zero on missing/placeholder/invalid UUID.

- [ ] **Step 1: Write failing tests**

Tests assert the renderer:
- rejects missing `CLOUDFLARE_D1_DATABASE_ID`;
- rejects `00000000-0000-0000-0000-000000000000`;
- rejects malformed UUID text;
- replaces only `database_id` and preserves Worker name, D1 database name, compatibility date, migrations directory, and rate-limit bindings.

- [ ] **Step 2: Verify RED**

Run: `npm test -- production-config`

Expected: FAIL because renderer does not exist.

- [ ] **Step 3: Implement renderer**

Add script `render:wrangler:production` that writes `.wrangler.production.jsonc`. Add generated file to `.gitignore`. Do not mutate committed `wrangler.jsonc`.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- production-config && CLOUDFLARE_D1_DATABASE_ID=11111111-1111-4111-8111-111111111111 npm run render:wrangler:production && npx wrangler deploy --dry-run --config .wrangler.production.jsonc`

Expected: PASS and dry-run succeeds.

- [ ] **Step 5: Commit**

Commit message: `build: render production wrangler config`

---

### Task 3: Manual-gated production deployment workflow

**Files:**
- Create: `.github/workflows/deploy-production.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: GitHub Secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`; output of Task 2; `dist/` frontend build.
- Produces: one manual production workflow that migrates D1, deploys Worker, resolves its `workers.dev` origin, builds a ranked frontend, ensures Pages project existence, deploys Pages, and emits both production URLs.

- [ ] **Step 1: Add static workflow contract tests/checks**

Extend an existing test or add a lightweight unit test that reads `.github/workflows/deploy-production.yml` and asserts:
- trigger is `workflow_dispatch` only;
- job uses GitHub `environment: production`;
- permissions are read-only for repository contents;
- the three required Cloudflare secret names are referenced;
- deploy sequence places full verification before remote migration;
- remote migration precedes Worker deploy;
- Worker deploy precedes frontend production build;
- frontend build receives non-empty `VITE_RANKING_API_BASE`;
- Pages deploy is last mutation before smoke tests.

- [ ] **Step 2: Verify RED**

Run: `npm test -- deploy-production`

Expected: FAIL because workflow is absent.

- [ ] **Step 3: Implement workflow**

Workflow order:
1. checkout current `main` SHA;
2. setup Node and `npm ci`;
3. validate all three required secrets are non-empty;
4. production dependency audit;
5. frontend tests, Worker tests, typecheck, Worker dry-run, frontend neutral build;
6. render `.wrangler.production.jsonc`;
7. `wrangler d1 migrations list snekrenaissance-leaderboard --remote --config .wrangler.production.jsonc`;
8. `wrangler d1 migrations apply snekrenaissance-leaderboard --remote --config .wrangler.production.jsonc`;
9. `wrangler deploy --config .wrangler.production.jsonc`;
10. resolve the account Workers subdomain through Cloudflare API and construct `https://snekrenaissance-api.<subdomain>.workers.dev`;
11. set `VITE_RANKING_API_BASE` to that exact HTTPS origin and rebuild `dist/`;
12. inspect `wrangler pages project list --json`; create `snekrenaissance --production-branch main` only if absent; fail if a conflicting/unusable project state is returned;
13. `wrangler pages deploy dist --project-name snekrenaissance --branch main --commit-hash "$GITHUB_SHA"`;
14. capture the production Pages URL and Worker URL in the GitHub Actions summary;
15. run Task 4 smoke tests.

Do not create or delete D1 in this workflow. Production D1 is a prerequisite so an accidental rerun cannot replace persistent ranking data.

- [ ] **Step 4: Verify workflow structurally and through CI dry gates**

Run: `npm test && npm run test:worker && npm run typecheck && npm run worker:build && npm run build`

Expected: PASS. Do not dispatch production yet.

- [ ] **Step 5: Update README**

Document required Cloudflare resource names, secret names, first-time D1 prerequisite, manual workflow trigger, production URLs, and rollback commands/procedure.

- [ ] **Step 6: Commit**

Commit message: `ci: add manual production deployment`

---

### Task 4: Production smoke verification and rollback evidence

**Files:**
- Create: `scripts/smoke-production.mjs`
- Create: `tests/unit/production-smoke.test.ts`
- Modify: `.github/workflows/deploy-production.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: `WORKER_URL` and `PAGES_URL` from Task 3.
- Produces: deterministic release acceptance with no persistent fake score rows.

- [ ] **Step 1: Write failing smoke-script tests**

Mock fetch and assert the script fails unless all conditions hold:
- `GET $WORKER_URL/api/health` returns `{ ok: true }`;
- `GET $WORKER_URL/api/leaderboard` returns valid JSON and CORS `*`;
- `OPTIONS $WORKER_URL/api/games` returns `204` and expected CORS headers;
- `GET $PAGES_URL` returns HTML containing the canonical meme text `just because ChatGPT` and `didn't complete my image.`;
- downloaded production JavaScript contains the resolved Worker origin, proving ranked configuration was compiled into the frontend.

- [ ] **Step 2: Verify RED**

Run: `npm test -- production-smoke`

Expected: FAIL because smoke script does not exist.

- [ ] **Step 3: Implement smoke script and workflow call**

The workflow runs the smoke script only after both deploys. Do not POST a fake completed score to production; POST/result semantics remain covered by the Worker+D1 E2E suite.

- [ ] **Step 4: Document rollback**

README must state:
- Worker code rollback: `npx wrangler rollback --name snekrenaissance-api` (or target a recorded version ID);
- Pages rollback: select the prior production deployment through Cloudflare Pages Deployments or call the Pages deployment rollback API;
- D1 migration rollback is not coupled to Worker rollback; migration failure is transactional per migration, but already-applied schema changes require a new forward migration rather than deleting the production DB.

- [ ] **Step 5: Verify GREEN**

Run full canonical gate:
`npm ci && npm audit --omit=dev --audit-level=moderate && npm test && npm run test:worker && npm run typecheck && npm run worker:build && npm run build && npm run test:e2e`

Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `test: add production release smoke gate`

---

### Task 5: Provisioning gate and first production dispatch

**Files:**
- No product code changes unless Cloudflare returns a concrete production-only incompatibility.
- Record evidence in: `.superpowers/sdd/2026-10-16-snek-renaissance-production-release/progress.md`

**Interfaces:**
- Consumes: merged release workflow on `main`; existing permanent Cloudflare account; production D1; GitHub Secrets.
- Produces: live Pages URL, live Worker URL, migrated production D1, green production smoke evidence, and rollback identifiers.

- [ ] **Step 1: Create the permanent D1 resource once**

In the intended Cloudflare account create exactly `snekrenaissance-leaderboard`. Capture its UUID. Do not create a second DB if that name already exists; inspect and reuse the intended empty/known database.

- [ ] **Step 2: Configure GitHub production secrets**

Set:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`

Token scope must be sufficient for the one-time Worker creation/deployment, D1 migration access, Workers subdomain read, and Pages project/deployment. No token value is committed or printed.

- [ ] **Step 3: Merge release PR to `main` only after canonical CI is green**

Use the verified head SHA when merging.

- [ ] **Step 4: Manually dispatch `deploy-production.yml` from `main`**

Expected: all preflight verification passes before the first remote mutation.

- [ ] **Step 5: Require production smoke PASS**

Capture in the SDD ledger:
- release commit SHA;
- GitHub Actions run ID;
- Worker production URL;
- Pages production URL;
- D1 database name/UUID suffix only (never credentials);
- Worker deployment/version identifier when available;
- Pages production deployment identifier;
- smoke result.

- [ ] **Step 6: Human acceptance on live URL**

Verify desktop and mobile: intro meme, username, ranked session starts, normal gameplay, game over, leaderboard read, and replay. This is the final release gate.

- [ ] **Step 7: Roll back if any production-only defect is found**

Rollback Worker/Pages code first; never delete the D1 database. Open a fix branch from `main`, reproduce the defect, and redeploy only after the canonical gate passes again.

---

## Self-Review

**Spec coverage:** Preserves Pages + Worker + D1 architecture, ranked browser configuration, persistent leaderboard, public access, anti-cheat validation, and desktop/mobile release acceptance. No custom domain or multiplayer scope added.

**Step scan:** Each task has an observable RED/GREEN or production gate. Remote mutations occur only after tests and credential/config validation.

**Type/config consistency:** Worker name, D1 database name, `DB` binding, `VITE_RANKING_API_BASE`, migrations directory, and existing rate-limit bindings remain unchanged.

**Review Focus coverage:** CORS is Task 1; identifier/secret validation Task 2/3; migration ordering Task 3; partial-deploy/rollback Task 4; ranked-bundle proof Task 4.

**Proportion:** The plan confines production changes to CORS, deployment config rendering, one manual workflow, smoke verification, and documented provisioning. It deliberately avoids automatic continuous production deploys and custom domains for the first release.
