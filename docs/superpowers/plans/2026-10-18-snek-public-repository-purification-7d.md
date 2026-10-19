# SNEK RENAISSANCE Public Repository Purification / 7D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert SNEK RENAISSANCE into a purist, public, local-only TypeScript browser/PWA repository with no ranking/backend/Cloudflare residue, while preserving current gameplay, player-local state, PWA behavior, forkability and GitHub Pages deployment.

**Architecture:** Keep the existing single-package domain boundaries (`app`, `game`, `input`, `render`, `ui`) and delete the remote-session vertical slice instead of replacing it with another abstraction. The final runtime is browser/PWA only: `src/main.ts` composes local application state, deterministic game state, input, Three.js rendering and DOM UI; GitHub Pages is the only deployment path.

**Tech Stack:** TypeScript, Three.js, Vite, vite-plugin-pwa, Vitest, jsdom, Playwright, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-18-snek-public-repository-purification-7d.md`

## Global Constraints

- TypeScript remains the canonical application language; public source/docs are English-first.
- Canonical product is local browser/PWA only: no backend, remote ranking, Worker, D1, Cloudflare Pages or Wrangler remains.
- Preserve Three.js, Vite and the existing PWA; do not add React, another framework/language, a monorepo or npm-package publishing.
- Preserve current gameplay, camera feel, controls and the 33-food completion target.
- Preserve keyboard contract: W/A/S/D + arrows work, E is into-screen, Q is unbound, editable fields do not trigger movement.
- Preserve current username UX and existing player data under `snek.username` and `snek.localBest.coreV5`.
- Preserve PWA prompt/waiting update semantics, offline relaunch, canonical `/snekrenaissance/` build and arbitrary fork-path build.
- GitHub Pages is the sole deployment workflow.
- `main` stays canonical/protected; implementation occurs on an isolated branch and reaches `main` only through the approved integration gate.
- Final public tree must not retain internal Superpowers specs/plans or dated internal audits; Git history is the historical archive.
- Every `VERIFY` deletion requires reference proof. A live current-product consumer stops that deletion and requires plan revision.

## Review Focus

1. Existing `snek.username` and `snek.localBest.coreV5` values survive the refactor; Task 2 tests this directly.
2. Local-only orchestration must not regress username typing/WASD or bind Q; Task 2 reruns keyboard and app-flow regressions.
3. Removing backend compatibility fields must not alter the 33rd-food completion transition or completion image flow; Task 3 pins both.
4. Removing ranked/Cloudflare configuration must not break PWA/offline behavior or fork-safe paths; Task 4 retains both build-path checks and PWA E2E.
5. Dead-code pruning must not remove indirectly consumed grid/render utilities; Task 5 requires reference proof plus green typecheck/tests before commit.

---

## Target Public Tree

```text
.github/workflows/
  ci.yml
  deploy-pages.yml
docs/readme/
  snek-renaissance-hero.jpg
public/
  completed-water.jpg
  icons/
scripts/
  verify-pwa-build.mjs
src/
  app/
  game/
  input/
  render/
  ui/
  main.ts
  styles.css
tests/
  e2e/
  integration/
  unit/
ARCHITECTURE.md
CONTRIBUTING.md
LICENSE
README.md
index.html
package.json
package-lock.json
playwright.config.ts
pwa.config.ts
tsconfig.json
vite.config.ts
vitest.config.ts
```

`ARCHITECTURE.md` and `CONTRIBUTING.md` stay because they directly reduce contributor ambiguity. `SECURITY.md` is not added without a real reporting policy.

---

### Task 1: Establish baseline and RED local-only contracts

**Files:**
- Create: `tests/unit/local-only-app-contract.test.ts`
- Modify: `tests/integration/app-flow.test.ts`

**Interfaces:**
- Consumes current app/controller/UI behavior.
- Produces a failing architecture contract for “no remote session/ranking boundary” and a failing behavior contract for local personal-best navigation.

- [ ] **Step 1: Create implementation branch**

Create `refactor/public-repo-purification-7d` from the planning branch commit containing this plan/spec so both remain available during execution and are removed only in Task 6.

- [ ] **Step 2: Establish a fresh green baseline**

```bash
npm ci
npm audit --omit=dev --audit-level=moderate
npm test
npm run typecheck
npm run build -- --base=/snekrenaissance/
npm run verify:pwa -- --base=/snekrenaissance/
npm run build -- --base=/snek-experiment/
npm run verify:pwa -- --base=/snek-experiment/
npx playwright install --with-deps chromium
npm run test:e2e
```

Expected: all current gates pass. If not, stop and report exact pre-existing failures before changing code.

- [ ] **Step 3: Add RED architecture test**

`tests/unit/local-only-app-contract.test.ts` reads `src/app/app-controller.ts`, `src/app/app-state.ts` and `src/main.ts` and has one test named `canonical runtime has no remote ranking/session boundary` asserting the combined source does not contain:

```text
SessionGateway
HttpSessionGateway
LocalSessionGateway
createSessionGateway
worldRank
activeSessionId
submissionStatus
VITE_RANKING_API_BASE
e2e-ranked
```

- [ ] **Step 4: Change app-flow expectation from RANK to BEST**

Target assertions:

```ts
expect(root.querySelector('[data-action="best"]')).not.toBeNull();
click('[data-action="best"]', root);
expect(controller.screen).toBe('best');
expect(root.textContent).toContain('PERSONAL BEST');
expect(root.textContent).toContain('24');
expect(root.textContent).not.toContain('WORLD');
expect(root.textContent).not.toContain('RANK');
```

- [ ] **Step 5: Verify RED**

```bash
npx vitest run tests/unit/local-only-app-contract.test.ts tests/integration/app-flow.test.ts
```

Expected: FAIL because remote/session concepts and `rank` UI/state still exist.

- [ ] **Step 6: Commit RED tests**

```bash
git add tests/unit/local-only-app-contract.test.ts tests/integration/app-flow.test.ts
git commit -m "test: define local-only application boundary"
```

---

### Task 2: Collapse app, UI and persistence to local-only

**Files:**
- Create: `src/app/persistence.ts`
- Create: `src/ui/personal-best-view.ts`
- Create: `tests/unit/local-persistence.test.ts`
- Modify: `src/app/app-controller.ts`
- Modify: `src/app/app-state.ts`
- Modify: `src/main.ts`
- Modify: `src/styles.css`
- Modify: `src/ui/username-view.ts`
- Modify: `src/ui/game-over-view.ts`
- Modify: `tests/integration/app-flow.test.ts`
- Modify: any current E2E fixture that references ranked/session-only test hooks
- Delete: `src/app/identity.ts`
- Delete: `src/app/gateway-selection.ts`
- Delete: `src/app/http-session-gateway.ts`
- Delete: `src/app/session-gateway.ts`
- Delete: `src/ui/leaderboard-view.ts`
- Delete: `src/ui/local-rank-view.ts`
- Delete: `tests/integration/app-ranking-flow.test.ts`
- Delete: `tests/e2e/ranked.spec.ts`
- Delete: `tests/unit/gateway-selection.test.ts`
- Delete: `tests/unit/http-session-gateway.test.ts`
- Delete: `tests/unit/session-gateway-capability.test.ts`
- Delete: `tests/unit/identity.test.ts`
- Delete: `tests/unit/v5-persistence.test.ts`
- Delete: `tests/unit/historical-v3-persistence.test.ts`
- Delete: `tests/unit/historical-v4-persistence.test.ts`
- Delete: `tests/unit/v22-persistence.test.ts`
- Delete: `tests/unit/task11-v2-boundary.test.ts`

**Interfaces:**
- `AppControllerOptions = { root: HTMLElement; storage?: StorageLike }`.
- `AppScreen = 'intro' | 'username' | 'game' | 'game-over' | 'complete' | 'best'`.
- `AppState = { screen: AppScreen; username: string; localBest: number; run: RunState | null }`.
- Persistence API:
  - `StorageLike = Pick<Storage, 'getItem' | 'setItem'>`
  - `USERNAME_KEY = 'snek.username'`
  - `LOCAL_BEST_KEY = 'snek.localBest.coreV5'`
  - `loadUsername(storage: StorageLike): string`
  - `saveUsername(storage: StorageLike, username: string): void`
  - `loadLocalBest(storage: StorageLike): number`
  - `saveLocalBest(storage: StorageLike, score: number): number`
- `renderUsernameView(container, initialUsername, onPlay)` has no session-status model.
- `renderGameOverView(container, { score, best }, onReplay, onBest)` has no world/submission model.
- `renderPersonalBestView(container, best, onBack)` uses `data-view="best"`.

- [ ] **Step 1: Write RED persistence tests**

`tests/unit/local-persistence.test.ts` uses in-memory `StorageLike` and asserts:

```ts
expect(LOCAL_BEST_KEY).toBe('snek.localBest.coreV5');
expect(loadLocalBest(storage)).toBe(0);
expect(saveLocalBest(storage, 24)).toBe(24);
expect(saveLocalBest(storage, 18)).toBe(24);
expect(storage.getItem('snek.localBest.coreV5')).toBe('24');
saveUsername(storage, '  ren  ');
expect(loadUsername(storage)).toBe('ren');
```

Expected initial failure: `src/app/persistence.ts` does not exist.

- [ ] **Step 2: Verify RED**

```bash
npx vitest run tests/unit/local-persistence.test.ts tests/unit/local-only-app-contract.test.ts tests/integration/app-flow.test.ts
```

- [ ] **Step 3: Implement `src/app/persistence.ts` only for current local state**

Use the exact API above. Do not expose player IDs or V1/V2/V2.1/V2.2/V3/V4 persistence helpers. Preserve the V5 key exactly.

- [ ] **Step 4: Simplify `app-state.ts`**

Remove remote identity/session/ranking/submission fields and types; rename local personal-best screen from `rank` to `best`.

- [ ] **Step 5: Simplify username and game-over views**

`username-view.ts`: remove `UsernameViewModel`, STARTING/RETRY session states and remote-session disablement; keep blank validation, trim, maxLength and focus.

`game-over-view.ts` target model:

```ts
export type GameOverViewModel = { score: number; best: number };
```

Target actions: `PLAY AGAIN` (`data-action="replay"`) and `BEST` (`data-action="best"`). Remove world rank, pending/submission status, errors and retry-rank action.

- [ ] **Step 6: Add `personal-best-view.ts` and update styles**

Render `PERSONAL BEST`, numeric best and `BACK`, using `section.className = 'screen personal-best'` and `data-view="best"`.

Rename/remove CSS selectors that exist only for `.local-rank`, `.rank-status`, `.rank-best`; retain equivalent styling under current semantic names such as `.personal-best` and `.best-value` only when still used.

- [ ] **Step 7: Simplify `AppController`**

Constructor accepts only `{ root, storage = localStorage }`. Valid username starts gameplay immediately. Game over saves current best, renders local metrics, `BEST` opens personal-best, and back returns to game-over when a finished run exists or intro otherwise. Remove all Promise/gateway/identity/session/ranking code.

- [ ] **Step 8: Simplify `main.ts`**

Remove gateway creation and `VITE_RANKING_API_BASE`; instantiate `new AppController({ root: app })`. `e2eMode` becomes `import.meta.env.MODE === 'e2e'`. Remove `apiBase` and `gatewayKind` from `window.__SNEK_TEST__`; retain deterministic gameplay/camera hooks still used by current E2E.

- [ ] **Step 9: Update/delete every import of retired app modules before deleting them**

Run:

```bash
rg -n "app/identity|gateway-selection|http-session-gateway|session-gateway|leaderboard-view|local-rank-view" src tests
```

Update current-product consumers; delete the explicitly historical/ranking tests listed in this task. The command must return no live references before source deletion.

- [ ] **Step 10: Update `app-flow.test.ts` for current persistence only**

Keep intro, username, blank rejection, gameplay start, progress, completion, game-over, personal-best, username reload and replay tests. Replace the old multi-generation storage test with:

```ts
localStorage.setItem('snek.localBest.coreV5', '24');
// finish a lower-scoring run -> best remains 24
// finish a higher-scoring run -> best becomes higher score
```

No historical key contract remains.

- [ ] **Step 11: Targeted GREEN**

```bash
npx vitest run tests/unit/local-persistence.test.ts tests/unit/local-only-app-contract.test.ts tests/integration/app-flow.test.ts tests/unit/keyboard.test.ts
```

Expected: PASS.

- [ ] **Step 12: Whole-suite GREEN before commit**

```bash
npm test
npm run typecheck
```

Expected: PASS. Do not commit this task with known failing frontend tests.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "refactor: make application state local only"
```

---

### Task 3: Remove retired backend compatibility from game state/results

**Files:**
- Modify: `src/game/run-state.ts`
- Modify: `src/game/grid-config.ts`
- Modify: `tests/unit/completion-target.test.ts`
- Modify: `tests/integration/app-flow.test.ts`
- Modify: all current run-state/integration/E2E fixtures that construct `RunResult` or mutate `foodEaten`
- Modify/Delete: tests whose only purpose is historical `RULESET_ID` compatibility

**Interfaces:**
- `RunState` has no `foodEaten`.
- `RunResult` has no `foodEaten` or `rulesetId`.
- `RULESET_ID` is removed if reference proof shows no current non-backend consumer.
- `score`, `foodsCollected`, `length`, `maxLength`, `durationMs`, phase transitions and 33-food completion semantics remain.

- [ ] **Step 1: Change completion contract and verify RED**

After the 33rd food:

```ts
expect(run.foodsCollected).toBe(33);
expect(run.score).toBe(33);
expect(run).not.toHaveProperty('foodEaten');
expect(run.phase).toBe('completed');
expect(run.result).toMatchObject({ foodsCollected: 33, score: 33 });
expect(run.result).not.toHaveProperty('foodEaten');
expect(run.result).not.toHaveProperty('rulesetId');
```

Run `npx vitest run tests/unit/completion-target.test.ts`; expected FAIL on current compatibility fields.

- [ ] **Step 2: Remove compatibility fields from `run-state.ts`**

Delete `foodEaten` and `rulesetId` declarations/assignments. Do not alter movement, collision, growth, score or completion algorithms.

- [ ] **Step 3: Prove and remove `RULESET_ID` if now backend-only**

```bash
rg -n "RULESET_ID|snek-core-v5" src tests --glob '!docs/**'
```

Expected after Task 2: only historical/result-compatibility hits. Remove/rewrite those. If a live current-product consumer remains, stop this deletion and revise the plan.

- [ ] **Step 4: Update all current fixtures to canonical fields only**

Remove manual `foodEaten` mutations and `rulesetId` fixture values without weakening behavior assertions.

- [ ] **Step 5: GREEN**

```bash
npx vitest run tests/unit/completion-target.test.ts tests/integration/app-flow.test.ts tests/integration/grid-run-state.test.ts tests/integration/v5-determinism.test.ts
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove retired ranking result compatibility"
```

---

### Task 4: Remove Cloudflare/ranked toolchain and reduce CI to canonical PWA

**Files:**
- Create: `tests/unit/repository-purity.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vite.config.ts`
- Modify: `playwright.config.ts`
- Modify: `.github/workflows/ci.yml`
- Modify: `.gitignore`
- Delete: `.github/workflows/deploy-production.yml`
- Delete: `.env.e2e-ranked`
- Delete: `wrangler.jsonc`
- Delete: `vitest.worker.config.ts`
- Delete: `worker/**`
- Delete: `migrations/**`
- Delete: `scripts/render-production-wrangler.mjs`
- Delete: `scripts/smoke-production.mjs`
- Delete: `scripts/smoke-production.d.mts`
- Delete: `tests/unit/deploy-production.test.ts`
- Delete: `tests/unit/production-config.test.ts`
- Delete: `tests/unit/production-smoke.test.ts`
- Delete: `tests/metrics/grid-tuning.test.ts`

**Interfaces:**
- Final package scripts: `dev`, `build`, `verify:pwa`, `test`, `typecheck`, `test:e2e`.
- Runtime direct dependency remains `three`.
- Dev dependencies retain only current frontend/PWA/test/tool consumers; `wrangler` is absent.
- Vite has no ranked proxy/mode.
- Playwright starts only canonical Vite preview and keeps current desktop/mobile projects.
- CI job remains named/id `test` and validates only canonical local/PWA product.

- [ ] **Step 1: Add RED repository-purity test**

Assert these paths are absent:

```text
worker/
migrations/
wrangler.jsonc
vitest.worker.config.ts
.env.e2e-ranked
.github/workflows/deploy-production.yml
```

Parse `package.json` and assert no `wrangler`, `worker:*`, `render:wrangler:production`, `test:worker`, historical `test:tuning`, or duplicate `e2e` alias when `test:e2e` is retained.

Read `vite.config.ts`, `playwright.config.ts`, `.github/workflows/ci.yml`; assert none contains `e2e-ranked`, `wrangler`, `test:worker`, `worker:build` or `render:wrangler:production`.

Run `npx vitest run tests/unit/repository-purity.test.ts`; expected FAIL.

- [ ] **Step 2: Simplify package manifest and regenerate lockfile**

Remove Wrangler and retired scripts. Preserve `"private": true`. Regenerate lockfile and verify `npm ci` from it.

- [ ] **Step 3: Simplify Vite/Playwright configs**

`vite.config.ts`: retain base path, PWA plugin, sourcemap; remove ranked proxy.

`playwright.config.ts`: one Vite build/preview server on 4173; retain desktop Chrome, Pixel 7 portrait and Pixel 7 landscape; remove ranked server/project and rank-specific match/ignore rules.

- [ ] **Step 4: Simplify `ci.yml`**

Keep exactly the obligations:

```text
npm ci
npm audit --omit=dev --audit-level=moderate
npm test
npm run typecheck
canonical PWA build + verify
synthetic fork PWA build + verify
Playwright Chromium install
npm run test:e2e
```

Keep CI job id/name `test` for later ruleset enforcement.

- [ ] **Step 5: Delete retired infrastructure/scripts/tests/metrics**

Delete all paths listed in this task. Keep `.github/workflows/deploy-pages.yml` and `scripts/verify-pwa-build.mjs` unless a current test proves a required adjustment.

- [ ] **Step 6: Simplify `.gitignore`**

Final current-product entries:

```text
node_modules/
dist/
playwright-report/
test-results/
```

- [ ] **Step 7: GREEN**

```bash
npm ci
npx vitest run tests/unit/repository-purity.test.ts
npm audit --omit=dev --audit-level=moderate
npm test
npm run typecheck
npm run build -- --base=/snekrenaissance/
npm run verify:pwa -- --base=/snekrenaissance/
npm run build -- --base=/snek-experiment/
npm run verify:pwa -- --base=/snek-experiment/
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: remove retired backend toolchain"
```

---

### Task 5: Prove and remove dead current-tree source/tests

**Files — DELETE:**
- all `.gitkeep` inside directories that remain non-empty after purification

**Files — VERIFY before delete:**
- `src/game/flight.ts`
- `src/game/grid-traversal.ts`
- `src/game/torus.ts`
- `src/game/constants.ts`
- `src/game/types.ts`
- `src/render/flight-presentation.ts`
- `src/render/pixel-resolution.ts`
- dedicated tests whose only subject is a source proven dead

**Interfaces:**
- Every surviving TypeScript module has a current runtime/build/test justification.
- No gameplay refactor is performed merely to reduce file count.

- [ ] **Step 1: Remove obsolete `.gitkeep` files**

Delete `.gitkeep` only where the directory still contains real tracked files.

- [ ] **Step 2: Prove references for each VERIFY candidate**

Use exact import/path searches plus symbol searches. Minimum command:

```bash
for path in \
  src/game/flight.ts \
  src/game/grid-traversal.ts \
  src/game/torus.ts \
  src/game/constants.ts \
  src/game/types.ts \
  src/render/flight-presentation.ts \
  src/render/pixel-resolution.ts; do
  echo "=== $path ==="
  stem="$(basename "$path" .ts)"
  rg -n "$stem" src tests --glob '*.ts'
done
```

Inspect every hit and distinguish production consumers from dedicated tests.

- [ ] **Step 3: Delete only zero-production-consumer candidates**

Expected likely removals from the current map: `flight.ts`, `torus.ts`, `flight-presentation.ts` and their dedicated tests. `grid-traversal.ts`, `constants.ts`, `types.ts`, `pixel-resolution.ts` remain evidence-gated.

If a candidate has a live current-product consumer, keep it and record that consumer; do not change gameplay solely to enable deletion.

- [ ] **Step 4: Search for retired-generation residue**

```bash
rg -n "Pixel Flight|V2\.1|V2\.2|SNEK CORE V3|SNEK CORE V4|historical|flight-presentation|torus" src tests package.json .github scripts --glob '!docs/**'
```

Expected: no history-only references. Review any genuine current semantic match explicitly.

- [ ] **Step 5: GREEN**

```bash
npm test
npm run typecheck
npm run build -- --base=/snekrenaissance/
npm run verify:pwa -- --base=/snekrenaissance/
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove dead current-tree code"
```

---

### Task 6: Publish concise public docs and purge internal process artifacts

**Files:**
- Create: `ARCHITECTURE.md`
- Create: `CONTRIBUTING.md`
- Modify: `tests/unit/repository-purity.test.ts`
- Modify: `tests/unit/repository-presentation.test.ts`
- Modify: `README.md` only if stale retired-platform text is found
- Keep: `docs/readme/snek-renaissance-hero.jpg`
- Delete: `docs/security/2026-10-15-dependency-audit.md`
- Delete: `docs/superpowers/**` including this spec and plan

**Interfaces:**
- `ARCHITECTURE.md`: only current runtime, directory ownership, local state, PWA/build, deployment and quality gates.
- `CONTRIBUTING.md`: exact clone/install/dev/test/build/PR flow.
- README remains brand-first and concise.

- [ ] **Step 1: Write `ARCHITECTURE.md`**

Required concise sections: `Runtime`, `Directory ownership`, `State and persistence`, `PWA/build`, `Deployment`, `Quality gates`. State local-only/no backend, `src/game` gameplay authority, `src/main.ts` composition, localStorage username/current best, GitHub Pages sole deploy.

- [ ] **Step 2: Write `CONTRIBUTING.md`**

Include only actionable commands/rules:

```bash
npm ci
npm run dev
npm test
npm run typecheck
npm run build
npm run test:e2e
```

Document short-lived branch -> tests -> PR -> green CI; English-first source/docs; no backend/framework expansion without explicit product decision.

- [ ] **Step 3: Convert repository presentation/purity tests to the final documentation contract and verify RED**

`repository-presentation.test.ts`: replace the old assertion that specific Superpowers PWA spec/plan files remain with assertions that the current README still exposes `PLAY · INSTALL · FORK`, PWA/install/fork/build/license, while internal process docs are absent.

`repository-purity.test.ts`: assert `ARCHITECTURE.md` and `CONTRIBUTING.md` exist; `docs/security/2026-10-15-dependency-audit.md` and `docs/superpowers` do not; no obsolete `.gitkeep` remains.

Run these tests before deletion and verify they fail on the still-present internal docs.

- [ ] **Step 4: Delete internal/dated documentation**

Delete `docs/security/2026-10-15-dependency-audit.md` and all `docs/superpowers/**`. History preserves the spec/plan.

- [ ] **Step 5: Review README only for stale retired-platform text**

Do not redesign approved storytelling. Change only if ranking/Worker/Cloudflare/D1/retired commands remain. Preserve hero, `PLAY · INSTALL · FORK`, install, fork, build/test essentials and MIT.

- [ ] **Step 6: GREEN**

```bash
npx vitest run tests/unit/repository-purity.test.ts tests/unit/repository-presentation.test.ts
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "docs: publish current repository architecture"
```

---

### Task 7: Final 7D verification, PR gate and main governance

**Files:**
- No product file should change unless verification discovers a concrete defect.
- External setting: repository ruleset `Protect Main`.

**Interfaces:**
- Releasable branch with current-only public tree.
- Governance target: deletion blocked, non-fast-forward blocked, PR required, CI `test` required, bypass list empty.

- [ ] **Step 1: Search final tree for retired concepts**

```bash
rg -n "Cloudflare|Wrangler|D1|VITE_RANKING_API_BASE|SessionGateway|HttpSessionGateway|LocalSessionGateway|worldRank|activeSessionId|submissionStatus|e2e-ranked|leaderboard|ranked" \
  . \
  --glob '!node_modules/**' \
  --glob '!dist/**' \
  --glob '!playwright-report/**' \
  --glob '!test-results/**' \
  --glob '!.git/**'
```

Expected: zero stale implementation/config/test/doc hits. Any surviving intentional prose must be explicitly reviewed.

- [ ] **Step 2: Run fresh completion gate**

```bash
rm -rf node_modules dist playwright-report test-results
npm ci
npm audit --omit=dev --audit-level=moderate
npm test
npm run typecheck
npm run build -- --base=/snekrenaissance/
npm run verify:pwa -- --base=/snekrenaissance/
npm run build -- --base=/snek-experiment/
npm run verify:pwa -- --base=/snek-experiment/
npx playwright install --with-deps chromium
npm run test:e2e
```

Expected: all succeed.

- [ ] **Step 3: Review scope against pre-purification `main`**

```bash
git diff --stat main...HEAD
git diff --name-status main...HEAD
```

Allow only local-state simplification, backend/tool removal, dead/history removal, CI/PWA config simplification and public documentation. No camera/gameplay/control redesign.

- [ ] **Step 4: Open PR**

Title: `refactor: purify public local PWA repository`

Body: summarize 7D result, intentional retirement of ranking/Cloudflare, preserved invariants and final verification evidence.

- [ ] **Step 5: Require PR CI `test` to succeed**

Inspect the job steps; do not merge on partial/pending status.

- [ ] **Step 6: Extend repository ruleset `Protect Main` after stable `test` check exists**

Retain:
- deletion restricted;
- non-fast-forward blocked;
- bypass actors empty.

Add:
- pull request required for default branch;
- required status check `test`;
- branch up-to-date requirement when supported;
- zero mandatory approving reviews until another human maintainer is intentionally added.

Do not add signed-commit, merge-queue or deployment-success requirements in this purification.

The available GitHub connector can read but not write rulesets, so this is an explicit repository-administration step in GitHub Settings; verify the resulting ruleset through the connector afterward.

- [ ] **Step 7: Merge only after explicit human authorization through protected PR flow**

No direct-main bypass or force push.

- [ ] **Step 8: Verify integrated `main` and Pages**

Confirm post-merge `main` SHA, post-main CI success, Pages deployment success, live game load/PWA installability and absence of backend/ranking failure UI.

- [ ] **Step 9: Final report**

Report final main SHA, PR number, CI/Page run IDs/statuses, deleted files/directories, any VERIFY candidates retained with live consumers, final direct dependency list and confirmed `Protect Main` rules.

Do not claim completion without fresh Task 7 Step 2 evidence and post-integration Step 8 evidence.
