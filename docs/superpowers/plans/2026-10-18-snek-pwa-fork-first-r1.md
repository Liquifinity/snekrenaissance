# SNEK RENAISSANCE PWA + Fork-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the accepted current SNEK RENAISSANCE build into an installable offline-capable PWA and a fork-first GitHub project without changing gameplay behavior.

**Architecture:** Keep one Vite/TypeScript/Three.js application and add `vite-plugin-pwa` as distribution infrastructure only. GitHub Pages derives its base path from the repository name so forks publish without source edits; current gameplay remains untouched, and repository cleanup is limited to historical documentation proven not to be a runtime/test dependency.

**Tech Stack:** TypeScript 5.8, Vite 7.1, Three.js 0.180, Vitest 3.2, Playwright 1.55, GitHub Actions/Pages, `vite-plugin-pwa` 2.0.0, Workbox generated through `generateSW`.

**Spec:** `docs/superpowers/specs/2026-10-18-snek-pwa-fork-first-design.md`

## Global Constraints

- Baseline is `main@e3bdb7d26eadb51187ba419b3b8ea454d30d1618`.
- Do not alter gameplay, camera, input, progression, HUD, completion flow, replay flow, ruleset identity, or scoring semantics.
- Preserve `33 foods = 100% completion`.
- Preserve current view-relative controls and accepted vertical orbit drag direction.
- Preserve `completed-water.jpg` and current completion-view behavior.
- Browser and installed versions must be the same application/build, not separate codebases.
- No Electron, Tauri, `.exe`, `.msi`, `.dmg`, or native wrapper.
- Use `vite-plugin-pwa` with `generateSW`; do not handwrite a service worker.
- Do not configure forced reload/`autoUpdate` behavior during an active game.
- PWA paths must work under both `/snekrenaissance/` and arbitrary fork repository paths.
- Local development remains `npm install` + `npm run dev` at `/`.
- Do not rewrite Git history.
- Do not remove Worker/ranking/runtime files merely for visual cleanliness; current CI/test/release dependencies take precedence.
- Add MIT only after explicit asset-rights verification for distributable assets.
- No merge to `main` until automated verification and human install/offline/gameplay acceptance are complete and the user explicitly authorizes merge.

## Review Focus

- **Subpath installation:** `/snekrenaissance/` and `/snek-experiment/` must both generate manifest/service-worker URLs inside their own scope; Task 4 tests both builds.
- **Active-run update safety:** a new service worker must not force reload or takeover semantics that interrupt a run; Tasks 1 and 5 pin prompt/waiting lifecycle behavior.
- **Offline first relaunch:** after one successful online load, the intro/local game must reopen with the network disabled; Task 5 exercises this in Chromium.
- **Fork workflow portability:** the Pages workflow must use the fork repository name rather than a canonical hard-coded path; Task 4 tests the workflow text and build matrix.
- **Repository cleanup regression:** historical docs may disappear, but gameplay/backend/test files must remain unless proven unused; Task 8 audits references and Task 9 reruns the full suite after cleanup.

---

## Planned File Structure Changes

**Create**
- `pwa.config.ts` — single declarative PWA/manifest/Workbox contract.
- `public/icons/snek-192.png` — standard install icon.
- `public/icons/snek-512.png` — high-resolution install icon.
- `public/icons/snek-maskable-512.png` — maskable install icon.
- `scripts/verify-pwa-build.mjs` — deterministic post-build contract verifier.
- `tests/unit/pwa-config.test.ts` — manifest/update/offline configuration contract.
- `tests/unit/pwa-assets.test.ts` — icon presence and PNG dimensions.
- `tests/unit/pages-workflow.test.ts` — fork-safe Pages workflow policy.
- `tests/unit/repository-presentation.test.ts` — current-only README/cleanup policy.
- `tests/e2e/pwa.spec.ts` — manifest registration + offline relaunch in Chromium.
- `LICENSE` — only after the asset-rights gate passes.

**Modify**
- `package.json` / `package-lock.json` — add exact `vite-plugin-pwa@2.0.0`; add PWA verification script.
- `vite.config.ts` — install `VitePWA(...)` using `pwa.config.ts`; retain current base/server/build behavior.
- `.github/workflows/ci.yml` — add canonical/fork PWA build verification without removing existing worker/typecheck/E2E gates.
- `.github/workflows/deploy-pages.yml` — derive `VITE_BASE_PATH` from `github.event.repository.name`.
- `README.md` — replace historical version narrative with PLAY · INSTALL · FORK current-state README.

**Cleanup after audit**
- Remove `.superpowers/` historical progress material.
- Under `docs/superpowers/`, remove superseded specs/plans/execution ledgers while retaining only:
  - `docs/superpowers/specs/2026-10-18-snek-pwa-fork-first-design.md`
  - `docs/superpowers/plans/2026-10-18-snek-pwa-fork-first-r1.md`
- Retain `docs/security/` unless a separate current security review proves it obsolete.
- Retain Worker/D1/migrations/ranking/release tooling because the present CI and test harness reference them; this migration does not remove them.

---

### Task 1: Pin the PWA configuration contract

**Files:**
- Create: `pwa.config.ts`
- Create: `tests/unit/pwa-config.test.ts`
- Modify: `vite.config.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `export const PWA_OPTIONS: Partial<VitePWAOptions>` from `pwa.config.ts`.
- `vite.config.ts` consumes `PWA_OPTIONS` through `VitePWA(PWA_OPTIONS)`.
- Manifest uses relative `start_url: '.'` and `scope: '.'` so Vite's deployed base path controls installation scope.

- [ ] **Step 1: Add the failing configuration test**

Create `tests/unit/pwa-config.test.ts` asserting:

```ts
expect(PWA_OPTIONS.registerType).toBe('prompt');
expect(PWA_OPTIONS.strategies).toBe('generateSW');
expect(PWA_OPTIONS.manifest).toMatchObject({
  name: 'SNEK RENAISSANCE',
  short_name: 'SNEK',
  start_url: '.',
  scope: '.',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#ffffff'
});
expect(PWA_OPTIONS.workbox).toMatchObject({
  skipWaiting: false,
  clientsClaim: false
});
expect(PWA_OPTIONS.workbox?.globPatterns).toContain('**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}');
```

Also assert three manifest icon entries exist for `/icons/snek-192.png`, `/icons/snek-512.png`, and `/icons/snek-maskable-512.png`, with the maskable entry carrying `purpose: 'maskable'`.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npm test -- tests/unit/pwa-config.test.ts
```

Expected: FAIL because `pwa.config.ts` and/or `PWA_OPTIONS` do not exist.

- [ ] **Step 3: Install the exact PWA dependency**

Run:

```bash
npm install --save-dev --save-exact vite-plugin-pwa@2.0.0
```

Expected: `package.json` records `vite-plugin-pwa: "2.0.0"`; lockfile updates deterministically.

- [ ] **Step 4: Implement `PWA_OPTIONS`**

Create `pwa.config.ts` with `VitePWAOptions` typing and the exact manifest/update/cache values pinned by Step 1. Keep `includeAssets`/Workbox configuration limited to current static application assets; do not add runtime caching for ranking API responses.

- [ ] **Step 5: Integrate the plugin without changing existing Vite semantics**

Modify `vite.config.ts` to import `VitePWA` and `PWA_OPTIONS`, add `plugins: [VitePWA(PWA_OPTIONS)]`, and leave these existing behaviors intact:

- `base: process.env.VITE_BASE_PATH ?? '/'`;
- ranked E2E proxy configuration;
- `build: { sourcemap: true }`.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
npm test -- tests/unit/pwa-config.test.ts
npm run typecheck
npm run build
```

Expected: all commands PASS and build emits PWA-related output.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts pwa.config.ts tests/unit/pwa-config.test.ts
git commit -m "feat: add declarative PWA configuration"
```

---

### Task 2: Create minimal project-owned install icons

**Files:**
- Create: `public/icons/snek-192.png`
- Create: `public/icons/snek-512.png`
- Create: `public/icons/snek-maskable-512.png`
- Create: `tests/unit/pwa-assets.test.ts`

**Interfaces:**
- Consumes icon paths declared in `PWA_OPTIONS.manifest.icons`.
- Produces PNG assets copied by Vite into the same relative `/icons/...` paths.

- [ ] **Step 1: Write the failing icon asset test**

Create `tests/unit/pwa-assets.test.ts` using Node `fs` to read PNG buffers and PNG IHDR width/height values. Assert:

```text
snek-192.png          = 192 × 192
snek-512.png          = 512 × 512
snek-maskable-512.png = 512 × 512
```

Also assert each file starts with the PNG signature bytes.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npm test -- tests/unit/pwa-assets.test.ts
```

Expected: FAIL because the icon files do not exist.

- [ ] **Step 3: Generate one minimal master icon and derived sizes**

Use a project-owned minimal SNEK mark: no third-party logo, no OpenAI/ChatGPT branding, no text dependency. Keep the composition readable at 192px and maintain safe padding in the maskable version. Generate the 512px source/master visual, then derive the exact PNG dimensions above without changing in-game visuals.

- [ ] **Step 4: Human visual checkpoint**

Confirm the three assets read clearly as the same SNEK identity at small and large sizes and that the maskable mark has adequate safe-area padding. Do not proceed with an unrelated visual redesign.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm test -- tests/unit/pwa-assets.test.ts tests/unit/pwa-config.test.ts
npm run build
```

Expected: PASS; generated build contains the icon files.

- [ ] **Step 6: Commit**

```bash
git add public/icons tests/unit/pwa-assets.test.ts
git commit -m "feat: add SNEK install icons"
```

---

### Task 3: Add deterministic build-contract verification

**Files:**
- Create: `scripts/verify-pwa-build.mjs`
- Modify: `package.json`
- Create: `tests/unit/pwa-build-contract.test.ts`

**Interfaces:**
- Produces CLI: `node scripts/verify-pwa-build.mjs --base=<base-path>`.
- Default base when `--base` is omitted: `/`.
- Exit code `0` means the built PWA contract is valid; nonzero means a named contract failure.

- [ ] **Step 1: Write failing verifier tests**

Create `tests/unit/pwa-build-contract.test.ts` around an exported `verifyPwaBuild({ distDir, basePath })` function. Use temporary fixture directories and assert it rejects:

- missing `manifest.webmanifest`;
- missing `sw.js`;
- wrong manifest `name`/`display`/`start_url`/`scope`;
- missing expected icon entries/files;
- an `index.html` manifest URL outside `basePath`;
- a service worker that does not reference `completed-water.jpg` and the install icons.

Also assert a complete fixture passes.

- [ ] **Step 2: Run the verifier test and verify RED**

```bash
npm test -- tests/unit/pwa-build-contract.test.ts
```

Expected: FAIL because the verifier does not exist.

- [ ] **Step 3: Implement the verifier**

Implement `verifyPwaBuild({ distDir, basePath })` in `scripts/verify-pwa-build.mjs`. Keep it read-only and deterministic: parse JSON/HTML/text; do not start a server or mutate `dist`.

- [ ] **Step 4: Add the package script**

Add:

```json
"verify:pwa": "node scripts/verify-pwa-build.mjs"
```

- [ ] **Step 5: Verify real canonical build output**

Run:

```bash
VITE_BASE_PATH=/snekrenaissance/ npm run build
npm run verify:pwa -- --base=/snekrenaissance/
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/verify-pwa-build.mjs tests/unit/pwa-build-contract.test.ts package.json package-lock.json
git commit -m "test: verify generated PWA build contract"
```

---

### Task 4: Make Pages and CI fork-first

**Files:**
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `.github/workflows/ci.yml`
- Create: `tests/unit/pages-workflow.test.ts`

**Interfaces:**
- Pages workflow derives deployment base from `${{ github.event.repository.name }}`.
- CI proves both canonical `/snekrenaissance/` and synthetic fork `/snek-experiment/` builds.

- [ ] **Step 1: Write the failing workflow policy test**

Create `tests/unit/pages-workflow.test.ts` that reads `.github/workflows/deploy-pages.yml` and asserts:

```ts
expect(workflow).toContain('github.event.repository.name');
expect(workflow).not.toContain('VITE_BASE_PATH: /snekrenaissance/');
```

Also read `.github/workflows/ci.yml` and assert it contains both `/snekrenaissance/` and `/snek-experiment/` PWA verification builds.

- [ ] **Step 2: Run the test and verify RED**

```bash
npm test -- tests/unit/pages-workflow.test.ts
```

Expected: FAIL on the current hard-coded deploy path and missing fork matrix.

- [ ] **Step 3: Make Pages derive the repository path**

In `.github/workflows/deploy-pages.yml`, replace the hard-coded base with:

```yaml
env:
  VITE_BASE_PATH: /${{ github.event.repository.name }}/
```

Keep checkout, Node 22, `npm ci`, build, Pages setup/upload/deploy structure intact.

- [ ] **Step 4: Extend CI with PWA canonical/fork build checks**

After existing typecheck/worker checks and before Playwright, run:

```bash
VITE_BASE_PATH=/snekrenaissance/ npm run build
npm run verify:pwa -- --base=/snekrenaissance/
VITE_BASE_PATH=/snek-experiment/ npm run build
npm run verify:pwa -- --base=/snek-experiment/
```

Do not remove `npm test`, worker tests, production Worker verification, worker dry-run build, typecheck, or E2E.

- [ ] **Step 5: Verify GREEN**

```bash
npm test -- tests/unit/pages-workflow.test.ts
VITE_BASE_PATH=/snek-experiment/ npm run build
npm run verify:pwa -- --base=/snek-experiment/
```

Expected: PASS and every generated URL remains inside `/snek-experiment/` where applicable.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/deploy-pages.yml .github/workflows/ci.yml tests/unit/pages-workflow.test.ts
git commit -m "ci: make Pages deployment fork-safe"
```

---

### Task 5: Prove install registration and offline relaunch in Chromium

**Files:**
- Create: `tests/e2e/pwa.spec.ts`
- Modify only if required: `playwright.config.ts`

**Interfaces:**
- Uses the existing production-style `vite build --mode e2e` + `vite preview` server at `http://127.0.0.1:4173`.
- Must not create another gameplay code path.

- [ ] **Step 1: Write the failing PWA E2E test**

Create `tests/e2e/pwa.spec.ts`. Run it only in `desktop-chromium` via `testInfo.project.name` guard. Test:

1. `page.goto('/')` loads `[data-view="intro"]`.
2. `link[rel="manifest"]` exists and its fetched JSON reports `SNEK RENAISSANCE`, `display: standalone`, `start_url: '.'`, `scope: '.'`.
3. `navigator.serviceWorker.ready` resolves with a registration.
4. After the online load completes, set `context.setOffline(true)`.
5. Reload `/` and assert `[data-view="intro"]` and `[data-action="continue"]` still render.
6. Restore `context.setOffline(false)` in `finally` cleanup.

- [ ] **Step 2: Run the test and verify RED or expose missing behavior**

```bash
npx playwright test tests/e2e/pwa.spec.ts --project=desktop-chromium
```

Expected before full PWA wiring: FAIL on missing registration/offline contract.

- [ ] **Step 3: Apply only infrastructure fixes required by the failing test**

If registration is not injected by current plugin settings, configure `vite-plugin-pwa` registration through its supported generated registration path. Do not add a custom game-level service-worker controller or update UI.

- [ ] **Step 4: Verify GREEN**

```bash
npx playwright test tests/e2e/pwa.spec.ts --project=desktop-chromium
```

Expected: PASS.

- [ ] **Step 5: Run existing gameplay E2E immediately after offline test**

```bash
npm run test:e2e
```

Expected: all existing desktop/mobile/ranked E2E tests remain PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/pwa.spec.ts playwright.config.ts vite.config.ts pwa.config.ts
git commit -m "test: cover PWA install and offline relaunch"
```

Only include modified files in the commit; if `playwright.config.ts`/Vite files did not change, do not stage them.

---

### Task 6: Replace the public README with current PLAY · INSTALL · FORK information

**Files:**
- Modify: `README.md`
- Create: `tests/unit/repository-presentation.test.ts`

**Interfaces:**
- Canonical play URL: `https://liquifinity.github.io/snekrenaissance/`.
- Local developer commands remain `npm install` and `npm run dev`.

- [ ] **Step 1: Write the failing README contract test**

Create `tests/unit/repository-presentation.test.ts` asserting the README contains:

- `SNEK RENAISSANCE`;
- `conquer the space`;
- canonical PLAY URL;
- explicit PWA installation wording;
- explicit Fork/development wording;
- `npm install`;
- `npm run dev`;
- `npm run build`;
- `npm test`.

Assert it does **not** contain:

- `SNEK CORE V3 candidate`;
- `300 foods = 100%`;
- historical V1/V2/V2.1/V2.2 architecture narrative.

- [ ] **Step 2: Run the test and verify RED**

```bash
npm test -- tests/unit/repository-presentation.test.ts
```

Expected: FAIL on the historical README.

- [ ] **Step 3: Replace README rather than patching historical sections**

Use this hierarchy and keep it concise:

```text
SNEK RENAISSANCE
conquer the space

PLAY · INSTALL · FORK

What it is
Play
Install
Fork / Development
Build / Test
License
```

Installation wording must state that install UI depends on browser/platform; do not imply every browser exposes an identical install button. Fork instructions should say to enable GitHub Pages with GitHub Actions after forking; no source base-path edit is required.

- [ ] **Step 4: Verify GREEN**

```bash
npm test -- tests/unit/repository-presentation.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md tests/unit/repository-presentation.test.ts
git commit -m "docs: present SNEK as play install fork"
```

---

### Task 7: Resolve open-source licensing through an asset-rights gate

**Files:**
- Inspect: `public/completed-water.jpg`
- Inspect: `public/icons/*.png`
- Create conditionally: `LICENSE`
- Modify conditionally: `README.md`

**Interfaces:**
- Preferred license is MIT.
- This task is a **hard human/legal provenance gate**, not an inference step.

- [ ] **Step 1: Inventory distributable non-code assets**

Record provenance for at least:

- `public/completed-water.jpg`;
- all new PWA icons;
- any other tracked image/font/audio asset discovered under `public/` or imported by current source.

- [ ] **Step 2: Confirm rights explicitly**

Require an explicit determination that each distributable asset is project-owned or otherwise redistributable under/alongside MIT. Do not infer ownership from the fact that the file is in Git.

- [ ] **Step 3A: If rights are confirmed, add MIT**

Create root `LICENSE` containing the standard MIT license and the correct copyright holder/year supplied or confirmed for the project.

Update README License section to link to `LICENSE`.

- [ ] **Step 3B: If rights are not confirmed, stop the public-license portion**

Do **not** add a misleading MIT license. Report the exact asset whose provenance blocks the fork-first public-release criterion. Do not replace `completed-water.jpg` because that would change the accepted game without separate approval.

- [ ] **Step 4: Verify licensing presentation**

If Step 3A executed:

```bash
test -f LICENSE
```

and ensure README says `MIT` only when `LICENSE` exists.

- [ ] **Step 5: Commit only if the gate passed**

```bash
git add LICENSE README.md
git commit -m "docs: license SNEK for open-source forks"
```

---

### Task 8: Remove historical development narratives from the current tree

**Files:**
- Delete after reference audit: `.superpowers/**`
- Delete superseded files under: `docs/superpowers/execution/**`
- Delete superseded files under: `docs/superpowers/specs/**`
- Delete superseded files under: `docs/superpowers/plans/**`
- Retain:
  - `docs/superpowers/specs/2026-10-18-snek-pwa-fork-first-design.md`
  - `docs/superpowers/plans/2026-10-18-snek-pwa-fork-first-r1.md`
- Modify: `tests/unit/repository-presentation.test.ts`

**Interfaces:**
- Cleanup affects documentation/current-tree presentation only.
- Worker/D1/ranking source, migrations, scripts, workflows and tests are explicitly retained in this migration because current CI/playwright/release tooling references them.

- [ ] **Step 1: Audit references before deletion**

Run repository searches for `.superpowers/` and each candidate `docs/superpowers/...` path outside the candidate documentation itself. Confirm none are imported, executed, or required by build/test workflows.

Also confirm current worker/ranking assets remain referenced by the existing CI/Playwright configuration; therefore do not delete them in this task.

- [ ] **Step 2: Extend the repository-presentation test and verify RED**

Add assertions that:

- root `.superpowers` does not exist;
- `docs/superpowers/execution` does not exist or is empty;
- `docs/superpowers/specs` contains only the approved PWA spec;
- `docs/superpowers/plans` contains only the PWA implementation plan.

Run:

```bash
npm test -- tests/unit/repository-presentation.test.ts
```

Expected: FAIL while historical files remain.

- [ ] **Step 3: Delete only the audited historical documentation**

Use `git rm` for the candidate files/directories while preserving the two current PWA documents above.

Do not delete `docs/security/`, `migrations/`, Worker source/configuration, ranking gateway source, or production-release workflow in this migration.

- [ ] **Step 4: Verify GREEN**

```bash
npm test -- tests/unit/repository-presentation.test.ts
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A .superpowers docs/superpowers tests/unit/repository-presentation.test.ts
git commit -m "chore: remove superseded development history from current tree"
```

Git history itself remains unchanged and still contains the removed documents.

---

### Task 9: Full regression, PWA matrix, and diff-scope verification

**Files:**
- No intentional product-code changes.
- Update only tests/configuration if verification finds a PWA-infrastructure defect.

**Interfaces:**
- Candidate branch must remain behaviorally identical to baseline in game code.

- [ ] **Step 1: Verify production dependency audit**

```bash
npm audit --omit=dev --audit-level=moderate
```

Expected: exit 0 for production dependencies.

- [ ] **Step 2: Run all unit/integration tests**

```bash
npm test
```

Expected: PASS, zero failures.

- [ ] **Step 3: Run worker tests and typecheck**

```bash
npm run test:worker
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Verify current preserved Worker production configuration/build**

```bash
CLOUDFLARE_D1_DATABASE_ID=11111111-1111-4111-8111-111111111111 npm run render:wrangler:production
npx wrangler deploy --dry-run --config .wrangler.production.jsonc
npm run worker:build
```

Expected: PASS.

- [ ] **Step 5: Verify canonical PWA build**

```bash
VITE_BASE_PATH=/snekrenaissance/ npm run build
npm run verify:pwa -- --base=/snekrenaissance/
```

Expected: PASS.

- [ ] **Step 6: Verify fork PWA build**

```bash
VITE_BASE_PATH=/snek-experiment/ npm run build
npm run verify:pwa -- --base=/snek-experiment/
```

Expected: PASS.

- [ ] **Step 7: Run complete browser E2E suite**

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

Expected: PASS, including `tests/e2e/pwa.spec.ts` and all pre-existing gameplay/ranking tests.

- [ ] **Step 8: Audit source diff against the accepted baseline**

Compare candidate against `e3bdb7d26eadb51187ba419b3b8ea454d30d1618`.

Expected product-source policy:

- no changes under `src/game/`;
- no changes under `src/input/`;
- no changes under `src/render/`;
- no changes under `src/ui/`;
- no gameplay changes in `src/main.ts` or `src/app/`;
- allowed infrastructure changes are limited to PWA config, build scripts, workflows, assets, tests, README/license/docs cleanup.

Any unexpected gameplay-source diff is a release blocker.

- [ ] **Step 9: Commit any verification-only corrections**

Only if needed, commit narrowly scoped PWA/test/config corrections. Do not bundle unrelated refactors.

---

### Task 10: Human acceptance and release gate

**Files:** None required unless a defect is found.

**Interfaces:**
- This task produces the explicit human acceptance needed before merge.

- [ ] **Step 1: Browser gameplay acceptance**

Open the candidate build and verify the accepted game still behaves as baseline: controls, orbit, progress, 33-food completion, completion image, replay.

- [ ] **Step 2: Chromium installation acceptance**

On a supported Chromium desktop browser, verify the app is considered installable and install it through the browser UI.

- [ ] **Step 3: Standalone launch acceptance**

Launch the installed app and confirm it opens as an application/standalone surface rather than requiring normal tab navigation, where supported by the platform.

- [ ] **Step 4: Offline acceptance**

After one successful online load, close/reopen with network unavailable and verify the intro/local game can start. Confirm no remote ranking response is synthesized as authoritative data.

- [ ] **Step 5: Update lifecycle acceptance**

With an active game running, publish/load a candidate service-worker update scenario or inspect waiting-worker behavior and verify no forced page reload interrupts the run.

- [ ] **Step 6: Canonical Pages acceptance after deploy**

After PR merge authorization and deployment, verify `https://liquifinity.github.io/snekrenaissance/` loads the current game and the manifest/service worker are scoped to `/snekrenaissance/`.

- [ ] **Step 7: Fork-first acceptance**

Create or use a disposable fork/test repository named differently, enable Pages via GitHub Actions, and verify its workflow derives the new repository path without editing `vite.config.ts`.

- [ ] **Step 8: Final merge gate**

Do not merge solely because CI is green. Present exact candidate SHA, full automated evidence, licensing-gate status, and human acceptance result to the user. Merge only after explicit authorization.

---

## Execution Order and Stop Conditions

1. Tasks 1–5 establish PWA install/offline/fork infrastructure.
2. Task 6 replaces stale public presentation.
3. Task 7 may hard-stop the open-source license publication if asset rights are unresolved; unresolved rights do not justify inventing provenance.
4. Task 8 cleans historical documentation only after reference audit.
5. Task 9 is the complete automated release candidate verification.
6. Task 10 is mandatory human acceptance and explicit merge authorization.

Stop immediately if any task requires changing accepted gameplay semantics; that becomes a separate design request.
