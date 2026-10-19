# SNEK RENAISSANCE Public Repository Purification / 7D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert SNEK RENAISSANCE into a purist, public, local-only TypeScript browser/PWA repository with no ranking/backend/Cloudflare residue, while preserving current gameplay, player-local state, PWA behavior, forkability and GitHub Pages deployment.

**Architecture:** Keep the existing single-package domain boundaries (`app`, `game`, `input`, `render`, `ui`) and remove the remote-session vertical slice rather than replacing it with another abstraction. The final runtime is browser/PWA only: `src/main.ts` composes local application state, deterministic game state, input, Three.js rendering and DOM UI; GitHub Pages is the only deployment path.

**Tech Stack:** TypeScript, Three.js, Vite, vite-plugin-pwa, Vitest, jsdom, Playwright, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-18-snek-public-repository-purification-7d.md`

## Global Constraints

- TypeScript remains the canonical application language.
- English is the canonical public language for source naming, comments, errors and public documentation.
- Canonical product is local browser/PWA only; no backend, remote ranking, Worker, D1, Cloudflare Pages or Wrangler remains.
- Keep Three.js + Vite + PWA; do not introduce React, another framework, another application language, a monorepo or npm-package publishing.
- Preserve current gameplay, camera feel, controls and 33-food completion target.
- Preserve keyboard contract: W/A/S/D + arrows work, E is into-screen, Q is unbound, editable fields do not trigger movement.
- Preserve current local username UX.
- Preserve existing player best data under `snek.localBest.coreV5`; do not migrate or erase it merely to remove the version suffix.
- Preserve PWA prompt/waiting update semantics and offline relaunch contract.
- Preserve canonical `/snekrenaissance/` and synthetic fork-path PWA builds.
- GitHub Pages is the sole deployment workflow.
- `main` stays canonical and protected; implementation occurs on an isolated branch.
- Final public tree must not retain internal Superpowers specs/plans; Git history is the historical archive.
- For every `VERIFY` source artifact, prove import/reference status before deletion; unexpected live consumers stop that deletion and require plan revision.

## Review Focus

1. Existing users with `snek.username` and `snek.localBest.coreV5` must keep both values after the refactor; Task 2 adds explicit persistence coverage.
2. Removing session/ranking orchestration must not reintroduce the username/WASD keyboard bug or bind Q; Task 2 reruns the keyboard regression suite and E2E flow.
3. Removing backend compatibility fields must not alter the 33rd-food completion transition or completion image flow; Task 3 pins the result shape and completion behavior.
4. Removing Wrangler/ranked Vite modes must not break PWA/offline behavior or arbitrary GitHub fork base paths; Task 4 keeps canonical + synthetic fork verification and PWA E2E.
5. Dead-code deletion must not remove an indirectly consumed grid/render utility; Task 5 requires `rg` proof plus typecheck/tests before each VERIFY-group deletion commit.

---

## Target File Structure

Final current tree is expected to contain these product/public areas only:

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

`ARCHITECTURE.md` and `CONTRIBUTING.md` are included because they have direct public value: one explains current ownership/runtime boundaries; the other gives the exact clone/test/PR path. `SECURITY.md` is not added because no real reporting policy has been established.

---

### Task 1: Establish a fresh baseline and add local-only RED contracts

**Files:**
- Create: `tests/unit/local-only-app-contract.test.ts`
- Modify: `tests/integration/app-flow.test.ts`

**Interfaces:**
- Consumes: current `AppController`, current app state, current UI and localStorage behavior.
- Produces: failing tests that define the absence of remote-session/ranking state and the local `PERSONAL BEST` navigation contract.

- [ ] **Step 1: Create an isolated implementation branch from the planning branch**

Use branch name `refactor/public-repo-purification-7d`, starting from the commit containing this plan so the spec and plan travel with execution until the final cleanup task.

- [ ] **Step 2: Establish the pre-change green baseline**

Run:

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

Expected: all current canonical gates pass. Record any pre-existing failure by exact command/test name and stop before refactoring if the baseline is not green.

- [ ] **Step 3: Write `local-only-app-contract.test.ts` as a failing architecture contract**

The test reads `src/app/app-controller.ts`, `src/app/app-state.ts` and `src/main.ts` as UTF-8 source and asserts the combined text does **not** contain these retired concepts:

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

Name the test `canonical runtime has no remote ranking/session boundary`.

- [ ] **Step 4: Change the local personal-best flow expectation in `app-flow.test.ts`**

Replace the current rank-navigation assertions with the target local semantics:

```ts
expect(root.querySelector('[data-action="best"]')).not.toBeNull();
click('[data-action="best"]', root);
expect(controller.screen).toBe('best');
expect(root.textContent).toContain('PERSONAL BEST');
expect(root.textContent).toContain('24');
expect(root.textContent).not.toContain('WORLD');
expect(root.textContent).not.toContain('RANK');
```

- [ ] **Step 5: Run the new/changed tests and verify RED**

Run:

```bash
npx vitest run tests/unit/local-only-app-contract.test.ts tests/integration/app-flow.test.ts
```

Expected: FAIL because the current app still contains gateway/ranking state and exposes `data-action="rank"` / `screen === 'rank'`.

- [ ] **Step 6: Commit only the RED tests**

```bash
git add tests/unit/local-only-app-contract.test.ts tests/integration/app-flow.test.ts
git commit -m "test: define local-only application boundary"
```

---

### Task 2: Collapse application state, UI and persistence to local-only

**Files:**
- Create: `src/app/persistence.ts`
- Create: `src/ui/personal-best-view.ts`
- Create: `tests/unit/local-persistence.test.ts`
- Modify: `src/app/app-controller.ts`
- Modify: `src/app/app-state.ts`
- Modify: `src/main.ts`
- Modify: `src/ui/username-view.ts`
- Modify: `src/ui/game-over-view.ts`
- Modify: `tests/integration/app-flow.test.ts`
- Modify: any current E2E fixtures that refer to ranked/session-only test hooks
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

**Interfaces:**
- Produces `AppControllerOptions = { root: HTMLElement; storage?: StorageLike }`.
- Produces `AppScreen = 'intro' | 'username' | 'game' | 'game-over' | 'complete' | 'best'`.
- Produces `AppState = { screen; username; localBest; run }` with no remote/session/submission fields.
- Produces persistence API:
  - `StorageLike = Pick<Storage, 'getItem' | 'setItem'>`
  - `USERNAME_KEY = 'snek.username'`
  - `LOCAL_BEST_KEY = 'snek.localBest.coreV5'`
  - `loadUsername(storage: StorageLike): string`
  - `saveUsername(storage: StorageLike, username: string): void`
  - `loadLocalBest(storage: StorageLike): number`
  - `saveLocalBest(storage: StorageLike, score: number): number`
- Produces `renderUsernameView(container, initialUsername, onPlay)` with no session-status model.
- Produces `renderGameOverView(container, { score, best }, onReplay, onBest)` with no world/submission state.
- Produces `renderPersonalBestView(container, best, onBack)` using `data-view="best"`.

- [ ] **Step 1: Write `local-persistence.test.ts` RED tests**

Use an in-memory `StorageLike` and assert:

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

- [ ] **Step 2: Run persistence + Task 1 RED tests**

Run:

```bash
npx vitest run tests/unit/local-persistence.test.ts tests/unit/local-only-app-contract.test.ts tests/integration/app-flow.test.ts
```

Expected: FAIL for the new local persistence module and existing remote/rank concepts.

- [ ] **Step 3: Implement `src/app/persistence.ts` with only username + current local best**

Use the signatures above. Keep the existing storage key exactly `snek.localBest.coreV5`. Do not read, migrate, write or expose V1/V2/V2.1/V2.2/V3/V4 keys.

- [ ] **Step 4: Simplify `src/app/app-state.ts`**

Remove `playerId`, `worldRank`, `ranked`, `activeSessionId`, `SessionStatus`, `SubmissionStatus`, submission errors and remote lifecycle fields. Rename the local personal-best screen from `rank` to `best`.

- [ ] **Step 5: Simplify `src/ui/username-view.ts`**

Remove `UsernameViewModel`, `sessionStatus`, `STARTING…`, remote retry state and disablement tied to session creation. Keep blank-username validation, max length, autofocus and trimmed submission.

- [ ] **Step 6: Simplify `src/ui/game-over-view.ts` and add `personal-best-view.ts`**

Target game-over model:

```ts
export type GameOverViewModel = {
  score: number;
  best: number;
};
```

Target actions: `PLAY AGAIN` (`data-action="replay"`) and `BEST` (`data-action="best"`). No `WORLD`, `PENDING`, submission status/error or retry-rank UI.

`renderPersonalBestView()` renders `PERSONAL BEST`, the numeric best and `BACK`; use `data-view="best"`.

- [ ] **Step 7: Simplify `AppController` to direct local orchestration**

Constructor accepts only `{ root, storage = localStorage }`. Load/save username and best through `persistence.ts`. A valid username starts gameplay immediately. On game over, save the best and render the local game-over view. `BEST` opens the personal-best screen; back returns to game over when a finished run exists, otherwise intro. Remove all Promise-based gateway calls and identity/session helpers.

- [ ] **Step 8: Simplify `src/main.ts` composition and E2E hook**

Remove gateway creation and `VITE_RANKING_API_BASE`. Construct `new AppController({ root: app })`. `e2eMode` becomes `import.meta.env.MODE === 'e2e'`. Remove `apiBase` and `gatewayKind` from `window.__SNEK_TEST__`; keep deterministic gameplay/camera hooks still consumed by current E2E tests.

- [ ] **Step 9: Delete remote-only runtime/UI/tests listed in this task**

No replacement gateway abstraction is created.

- [ ] **Step 10: Update `app-flow.test.ts` fixtures to current local APIs while preserving behavior**

Keep tests for intro, username, blank rejection, gameplay start, progress, completion image, game over, personal best, username reload, local-best persistence and replay. Replace historical-key preservation assertions with the current continuity assertion: pre-seed `snek.localBest.coreV5`, verify a lower score does not overwrite it and a higher score does.

- [ ] **Step 11: Run targeted GREEN tests**

```bash
npx vitest run tests/unit/local-persistence.test.ts tests/unit/local-only-app-contract.test.ts tests/integration/app-flow.test.ts tests/unit/keyboard.test.ts
```

Expected: PASS.

- [ ] **Step 12: Run the whole frontend suite and typecheck**

```bash
npm test
npm run typecheck
```

Expected: PASS except tests intentionally assigned to later tasks because they still encode backend/result compatibility; record those exact files before proceeding.

- [ ] **Step 13: Commit the local-only application slice**

```bash
git add src tests
git commit -m "refactor: make application state local only"
```

---

### Task 3: Remove backend compatibility from the game result model

**Files:**
- Modify: `src/game/run-state.ts`
- Modify: `src/game/grid-config.ts`
- Modify: `tests/unit/completion-target.test.ts`
- Modify: `tests/integration/app-flow.test.ts`
- Modify: current run-state/integration/E2E fixtures that construct `RunResult` or mutate `foodEaten`
- Modify/Delete: tests whose only assertion is historical `RULESET_ID` compatibility

**Interfaces:**
- `RunState` no longer exposes `foodEaten`.
- `RunResult` no longer exposes `foodEaten` or `rulesetId`.
- `GridConfig` remains unchanged; `RULESET_ID` is removed if no current non-backend consumer remains.
- Completion/score authority remains `foodsCollected` + `score`; completion target remains 33.

- [ ] **Step 1: Change `completion-target.test.ts` to the target result shape and verify RED**

After the 33rd food, assert:

```ts
expect(run.foodsCollected).toBe(33);
expect(run.score).toBe(33);
expect(run).not.toHaveProperty('foodEaten');
expect(run.phase).toBe('completed');
expect(run.result).toMatchObject({ foodsCollected: 33, score: 33 });
expect(run.result).not.toHaveProperty('foodEaten');
expect(run.result).not.toHaveProperty('rulesetId');
```

Run:

```bash
npx vitest run tests/unit/completion-target.test.ts
```

Expected: FAIL because current state/result still exposes backend compatibility properties.

- [ ] **Step 2: Remove `foodEaten` and `rulesetId` from `run-state.ts`**

Delete the compatibility properties and assignments. Keep `score`, `foodsCollected`, `length`, `maxLength`, `durationMs`, phase transitions and completion behavior unchanged.

- [ ] **Step 3: Remove `RULESET_ID` from `grid-config.ts` if reference proof shows no current product consumer**

Before deletion run:

```bash
rg -n "RULESET_ID|snek-core-v5" src tests --glob '!docs/**'
```

Expected after Task 2: remaining hits are test/result compatibility only. Remove or rewrite those assertions to current product behavior; if a live current-product consumer remains, stop and revise this task rather than deleting the symbol blindly.

- [ ] **Step 4: Update all current test fixtures to use only canonical result/state fields**

Remove manual `foodEaten` mutations and `rulesetId` fixture properties. Do not weaken gameplay assertions.

- [ ] **Step 5: Run targeted + full GREEN verification**

```bash
npx vitest run tests/unit/completion-target.test.ts tests/integration/app-flow.test.ts tests/integration/grid-run-state.test.ts tests/integration/v5-determinism.test.ts
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game tests
git commit -m "refactor: remove retired ranking result compatibility"
```

---

### Task 4: Remove Cloudflare/ranked toolchain and reduce CI to the canonical PWA

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

**Interfaces:**
- Final package scripts: `dev`, `build`, `verify:pwa`, `test`, `typecheck`, `test:e2e`.
- Final direct runtime dependency remains `three`.
- Final dev dependencies retain only current frontend/PWA/test/tooling consumers; `wrangler` is removed.
- `vite.config.ts` has no ranked mode proxy.
- `playwright.config.ts` starts only the canonical Vite preview and keeps desktop/mobile current-product projects; no ranked project/server.
- CI keeps install, production audit, frontend tests, typecheck, canonical PWA build, synthetic fork PWA build and E2E.

- [ ] **Step 1: Add `repository-purity.test.ts` and verify RED**

The test uses `existsSync`/`readFileSync` from the repository root and asserts:

```text
worker/ absent
migrations/ absent
wrangler.jsonc absent
vitest.worker.config.ts absent
.env.e2e-ranked absent
.github/workflows/deploy-production.yml absent
```

Parse `package.json` and assert:
- no `wrangler` dependency/devDependency;
- no script key starts with `worker:`;
- no `render:wrangler:production`;
- no `test:worker`;
- no historical `test:tuning`;
- no duplicate `e2e` alias when `test:e2e` is retained.

Read `vite.config.ts`, `playwright.config.ts` and `.github/workflows/ci.yml`; assert none contains `e2e-ranked`, `wrangler`, `test:worker`, `worker:build`, `render:wrangler:production` or Cloudflare deployment language.

Run:

```bash
npx vitest run tests/unit/repository-purity.test.ts
```

Expected: FAIL on the current infrastructure.

- [ ] **Step 2: Simplify `package.json` and regenerate the lockfile**

Remove `wrangler` and retired scripts. Run `npm install --package-lock-only` (or `npm install` if required by the installed npm version) and verify `npm ci` succeeds from the regenerated lockfile.

- [ ] **Step 3: Simplify Vite and Playwright configs**

`vite.config.ts`: remove mode-dependent `/rank` proxy; retain `base`, PWA plugin and sourcemap.

`playwright.config.ts`: one canonical Vite build/preview web server at port 4173; retain desktop Chrome, Pixel 7 portrait and Pixel 7 landscape projects; remove ranked ignore/match rules and ranked server/project.

- [ ] **Step 4: Simplify `ci.yml`**

Remove Worker tests, Wrangler rendered-config verification and Worker dry-run. Preserve:

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

Keep the job id/name stable as `test` so it can become the required ruleset status check.

- [ ] **Step 5: Delete retired infrastructure/config/scripts/tests**

Delete all files/directories listed in this task. Keep `.github/workflows/deploy-pages.yml` and `scripts/verify-pwa-build.mjs` unchanged unless a current test proves an adjustment is necessary.

- [ ] **Step 6: Simplify `.gitignore`**

Final entries should cover current generated artifacts only:

```text
node_modules/
dist/
playwright-report/
test-results/
```

Remove `.wrangler.production.jsonc` and Superpowers-local artifact patterns from the public product ignore file.

- [ ] **Step 7: Run repository purity + canonical toolchain GREEN**

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

### Task 5: Prove and remove historical/dead source and tests

**Files — DELETE without further product justification:**
- `tests/metrics/grid-tuning.test.ts`
- `tests/unit/historical-v3-persistence.test.ts`
- `tests/unit/historical-v4-persistence.test.ts`
- `tests/unit/v22-persistence.test.ts`
- `tests/unit/task11-v2-boundary.test.ts`
- all `.gitkeep` files inside directories that are non-empty after purification

**Files — VERIFY before delete:**
- `src/game/flight.ts`
- `src/game/grid-traversal.ts`
- `src/game/torus.ts`
- `src/game/constants.ts`
- `src/game/types.ts`
- `src/render/flight-presentation.ts`
- `src/render/pixel-resolution.ts`
- their dedicated tests when the source is proven non-current

**Interfaces:**
- Produces a source/test graph where every surviving TypeScript module has at least one current runtime/build/test justification.
- Does not alter active game mechanics to make deletion possible.

- [ ] **Step 1: Delete explicitly historical-only tests and obsolete `.gitkeep` files**

These artifacts preserve history rather than a current contract. Git history already retains them.

- [ ] **Step 2: Prove references for each VERIFY candidate with `rg`**

Run from repository root:

```bash
for symbol in \
  "game/flight" \
  "game/grid-traversal" \
  "game/torus" \
  "game/constants" \
  "game/types" \
  "render/flight-presentation" \
  "render/pixel-resolution"; do
  echo "=== $symbol ==="
  rg -n "$symbol|$(basename "$symbol")" src tests --glob '*.ts'
done
```

Then inspect each hit, distinguishing production/runtime consumers from dedicated tests. Also use direct filename/import searches where basename matching is ambiguous.

- [ ] **Step 3: Delete only candidates with zero current production consumers**

For each proven-dead source, delete the source and tests whose only subject is that source. Expected likely removals from the current map are `flight.ts`, `torus.ts`, `flight-presentation.ts` and their dedicated tests; `grid-traversal.ts`, `constants.ts`, `types.ts` and `pixel-resolution.ts` remain evidence-gated.

If any candidate has a live current-product consumer, keep it and record the consumer in the implementation report; do not refactor gameplay merely to satisfy a smaller file count.

- [ ] **Step 4: Run dead-reference search after deletions**

```bash
rg -n "Pixel Flight|V2\.1|V2\.2|SNEK CORE V3|SNEK CORE V4|historical|flight-presentation|torus" src tests package.json .github scripts --glob '!docs/**'
```

Expected: no retired-version/history-only references, except a current term whose semantic meaning is still genuinely part of the game and is explicitly justified.

- [ ] **Step 5: Run GREEN verification**

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
git commit -m "refactor: remove historical and dead code"
```

---

### Task 6: Publish concise current architecture/contribution docs and purge internal process artifacts

**Files:**
- Create: `ARCHITECTURE.md`
- Create: `CONTRIBUTING.md`
- Keep: `README.md`
- Keep: `docs/readme/snek-renaissance-hero.jpg`
- Delete: `docs/security/2026-10-15-dependency-audit.md`
- Delete: `docs/superpowers/**` including this spec and implementation plan
- Modify: `tests/unit/repository-purity.test.ts`

**Interfaces:**
- `ARCHITECTURE.md` documents only the current browser/PWA structure and ownership boundaries.
- `CONTRIBUTING.md` documents exact install/dev/test/build/PR workflow.
- README remains brand-first and concise; do not re-expand it into an architecture manual.

- [ ] **Step 1: Write `ARCHITECTURE.md`**

Keep it concise. Required sections:

```text
Runtime
Directory ownership
State and persistence
PWA/build
Deployment
Quality gates
```

State explicitly: local-only, no backend; `src/game` owns gameplay authority; `src/main.ts` composes; GitHub Pages is deployment; localStorage contains username + current best.

- [ ] **Step 2: Write `CONTRIBUTING.md`**

Include only actionable commands and contribution rules:

```bash
npm ci
npm run dev
npm test
npm run typecheck
npm run build
npm run test:e2e
```

Require short-lived branch -> tests -> PR -> green CI. State English-first source/docs and no backend/framework expansion without an explicit product decision.

- [ ] **Step 3: Extend `repository-purity.test.ts` for final-tree documentation purity**

Assert:
- `ARCHITECTURE.md` exists;
- `CONTRIBUTING.md` exists;
- `docs/security/2026-10-15-dependency-audit.md` absent;
- `docs/superpowers` absent;
- no populated-directory `.gitkeep` remains.

Because this step creates a failing assertion while the internal docs still exist, run it now and verify RED before deletion.

- [ ] **Step 4: Delete dated/internal process documentation**

Delete `docs/security/2026-10-15-dependency-audit.md` and the full `docs/superpowers/**` tree. The plan/spec remain accessible from Git history after this commit.

- [ ] **Step 5: Review README for stale retired-platform language only**

Do not redesign the approved brand/storytelling. Change README only if it still mentions ranking, Worker, Cloudflare, D1 or retired commands. Preserve `PLAY · INSTALL · FORK`, hero image, PWA install, fork instructions, build/test essentials and MIT.

- [ ] **Step 6: Run documentation/repository GREEN tests**

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

### Task 7: Full 7D verification, PR gate and main governance

**Files:**
- No product files should change unless verification discovers a concrete defect.
- External repository setting: GitHub ruleset `Protect Main`.

**Interfaces:**
- Produces a releasable branch with a current-only public tree.
- Produces governance target: deletion blocked, non-fast-forward blocked, PR required, `test` status required, bypass list empty.

- [ ] **Step 1: Run final retired-concept search**

Run:

```bash
rg -n "Cloudflare|Wrangler|D1|VITE_RANKING_API_BASE|SessionGateway|HttpSessionGateway|LocalSessionGateway|worldRank|activeSessionId|submissionStatus|e2e-ranked|leaderboard|ranked" \
  . \
  --glob '!node_modules/**' \
  --glob '!dist/**' \
  --glob '!playwright-report/**' \
  --glob '!test-results/**' \
  --glob '!.git/**'
```

Expected: zero stale implementation/config/test/documentation hits. Any surviving occurrence must be current intentional prose and be reviewed explicitly rather than ignored.

- [ ] **Step 2: Run the complete fresh verification gate**

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

Expected: every command succeeds with no hidden skipped retired backend suite.

- [ ] **Step 3: Review branch scope against the pre-purification main**

Use:

```bash
git diff --stat main...HEAD
git diff --name-status main...HEAD
```

Confirm changes are restricted to repository purification: local-state simplification, backend/tool removal, dead/history removal, CI/PWA config simplification and public documentation. No camera/gameplay/control redesign is allowed.

- [ ] **Step 4: Open a PR to `main` and require branch CI to pass**

PR title: `refactor: purify public local PWA repository`

PR body must summarize the 7D result, explicitly state that ranking/Cloudflare were intentionally retired, list preserved invariants and include the final verification commands/results.

- [ ] **Step 5: Verify PR CI job `test` succeeds**

Do not merge on partial status. Inspect the job steps; all retained canonical gates must be green.

- [ ] **Step 6: Extend `Protect Main` ruleset after the stable `test` check exists**

Retain existing rules:
- deletion restricted;
- non-fast-forward blocked;
- bypass actors empty.

Add:
- pull request required for `~DEFAULT_BRANCH`;
- required status check: `test`;
- require branch to be up to date before merge if supported by the ruleset UI/API;
- zero mandatory approving reviews unless/until another human maintainer is intentionally part of governance.

Do not add signed-commit, merge-queue or deployment-success requirements as part of this purification.

This is a repository-administration action, not a source commit. The currently available GitHub connector can read rulesets but does not expose a ruleset-write action; perform this step in GitHub settings and then verify the ruleset through the API/read connector.

- [ ] **Step 7: Merge only through the protected PR flow after explicit human authorization**

No force-push/direct-main bypass. Prefer squash or rebase if linear history is later enforced; otherwise use the repository's allowed merge strategy.

- [ ] **Step 8: Verify integrated `main` and Pages deployment**

After merge, confirm:
- `main` points to the integrated purification commit;
- post-main CI succeeds;
- GitHub Pages workflow succeeds;
- published game loads;
- PWA remains installable;
- no backend/ranking failure state appears;
- repository current tree contains only current-use artifacts.

- [ ] **Step 9: Final completion report**

Report:
- final main SHA;
- PR number;
- CI run id/status;
- Pages run id/status;
- exact files/directories deleted;
- VERIFY candidates kept, if any, with their live consumers;
- final direct dependency list;
- confirmed `Protect Main` rule set.

Do not claim completion without fresh evidence from Step 2 and post-integration Step 8.
