# SNEK RENAISSANCE PWA + Fork-First Implementation Plan R2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the accepted SNEK RENAISSANCE game installable as an offline-capable PWA and make the GitHub repository fork-first, without changing gameplay.

**Architecture:** Keep one Vite/TypeScript/Three.js application. Add `vite-plugin-pwa` only at build/distribution level; derive GitHub Pages paths from repository context; verify canonical and fork subpaths; replace stale repository presentation; remove only historical documentation proven not to be required by runtime/tests.

**Tech Stack:** TypeScript 5.8, Vite 7.1, Three.js 0.180, Vitest 3.2, Playwright 1.55, GitHub Actions/Pages, `vite-plugin-pwa` 2.0.0, generated Workbox service worker.

**Spec:** `docs/superpowers/specs/2026-10-18-snek-pwa-fork-first-design.md`

## Global Constraints

- Baseline: `main@e3bdb7d26eadb51187ba419b3b8ea454d30d1618`.
- No gameplay, camera, input, progression, HUD, completion, replay, ruleset, or scoring changes.
- Preserve 33 foods = 100%, current view-relative controls, accepted vertical orbit drag, and `completed-water.jpg` completion behavior.
- Browser and installed versions are the same app/build.
- No Electron, Tauri, native installers, or second codebase.
- Use `vite-plugin-pwa` `generateSW`; no handwritten service worker.
- No forced active-run reload/update takeover.
- PWA must work at `/snekrenaissance/` and arbitrary fork paths such as `/snek-experiment/`.
- Local development remains `npm install` then `npm run dev` at `/`.
- Git history remains intact.
- Worker/ranking/migrations/release tooling remain unless a dependency audit proves they are unused; current CI already references them, so this plan retains them.
- MIT is added only after explicit distributable-asset rights verification.
- No merge without green automated verification, human PWA/game acceptance, and explicit user authorization.

## Review Focus

- **Subpath safety:** manifest, icons, service worker and registration stay inside canonical/fork Pages scopes; Task 4 tests both.
- **Update safety:** waiting worker does not force reload of an active run; Tasks 1 and 5 pin this.
- **Offline relaunch:** after one online load, intro/local gameplay can reopen offline; Task 5.
- **Fork portability:** Pages path comes from repository name, not `snekrenaissance`; Task 4.
- **Cleanup safety:** historical docs disappear without removing runtime/test/backend files; Tasks 8–9.

---

## File Map

**Create**
- `pwa.config.ts`
- `public/icons/snek-192.png`
- `public/icons/snek-512.png`
- `public/icons/snek-maskable-512.png`
- `scripts/verify-pwa-build.mjs`
- `tests/unit/pwa-config.test.ts`
- `tests/unit/pwa-assets.test.ts`
- `tests/unit/pwa-build-contract.test.ts`
- `tests/unit/pages-workflow.test.ts`
- `tests/unit/repository-presentation.test.ts`
- `tests/e2e/pwa.spec.ts`
- `LICENSE` only after rights gate

**Modify**
- `package.json`
- `package-lock.json`
- `vite.config.ts`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-pages.yml`
- `README.md`
- `playwright.config.ts` only if PWA E2E requires configuration

**Cleanup after reference audit**
- remove `.superpowers/`;
- remove superseded `docs/superpowers/execution/**`;
- remove superseded `docs/superpowers/specs/**` and `plans/**` while retaining only this approved PWA spec and canonical R2 plan;
- keep `docs/security/`, Worker/D1/ranking/migrations/release tooling in this migration.

---

### Task 1: PWA configuration contract

**Files:**
- Create: `pwa.config.ts`
- Create: `tests/unit/pwa-config.test.ts`
- Modify: `vite.config.ts`, `package.json`, `package-lock.json`

**Interfaces:**
- Produce `export const PWA_OPTIONS: Partial<VitePWAOptions>`.
- `vite.config.ts` consumes it with `VitePWA(PWA_OPTIONS)`.
- Manifest paths must be relative to the manifest location: `start_url: '.'`, `scope: '.'`, icon `src` values `icons/...` with no leading slash.

- [ ] **Step 1: Write failing config test**

Assert:

```ts
expect(PWA_OPTIONS.strategies).toBe('generateSW');
expect(PWA_OPTIONS.registerType).toBe('prompt');
expect(PWA_OPTIONS.manifest).toMatchObject({
  name: 'SNEK RENAISSANCE',
  short_name: 'SNEK',
  start_url: '.',
  scope: '.',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#ffffff'
});
expect(PWA_OPTIONS.workbox).toMatchObject({ skipWaiting: false, clientsClaim: false });
expect(PWA_OPTIONS.workbox?.globPatterns).toContain('**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}');
```

Assert icon entries are exactly `icons/snek-192.png`, `icons/snek-512.png`, `icons/snek-maskable-512.png`; maskable entry has `purpose: 'maskable'`.

- [ ] **Step 2: Verify RED**

```bash
npm test -- tests/unit/pwa-config.test.ts
```

Expected: FAIL because config does not exist.

- [ ] **Step 3: Install exact dependency**

```bash
npm install --save-dev --save-exact vite-plugin-pwa@2.0.0
```

- [ ] **Step 4: Implement `PWA_OPTIONS`**

Use the exact values above. Do not configure runtime caching for ranking/API data.

- [ ] **Step 5: Integrate `VitePWA`**

Add `plugins: [VitePWA(PWA_OPTIONS)]` while preserving current `base`, ranked E2E proxy, and `build.sourcemap` behavior.

- [ ] **Step 6: Verify GREEN**

```bash
npm test -- tests/unit/pwa-config.test.ts
npm run typecheck
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts pwa.config.ts tests/unit/pwa-config.test.ts
git commit -m "feat: add declarative PWA configuration"
```

---

### Task 2: Minimal project-owned install icons

**Files:**
- Create: `public/icons/snek-192.png`, `public/icons/snek-512.png`, `public/icons/snek-maskable-512.png`
- Create: `tests/unit/pwa-assets.test.ts`

**Interfaces:** Icon files match manifest-relative `icons/...` URLs.

- [ ] **Step 1: Write failing PNG asset test**

Read PNG headers with Node `fs`; assert PNG signature and exact IHDR sizes 192×192, 512×512, 512×512.

- [ ] **Step 2: Verify RED**

```bash
npm test -- tests/unit/pwa-assets.test.ts
```

- [ ] **Step 3: Generate icon family**

Create one minimal project-owned SNEK mark with no third-party/OpenAI branding and no text dependency; derive standard and maskable PNGs. Maskable artwork must retain safe padding.

- [ ] **Step 4: Human visual checkpoint**

Confirm the same mark remains legible at 192px and 512px and maskable cropping preserves it.

- [ ] **Step 5: Verify GREEN**

```bash
npm test -- tests/unit/pwa-assets.test.ts tests/unit/pwa-config.test.ts
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add public/icons tests/unit/pwa-assets.test.ts
git commit -m "feat: add SNEK install icons"
```

---

### Task 3: Deterministic built-PWA verifier

**Files:**
- Create: `scripts/verify-pwa-build.mjs`
- Create: `tests/unit/pwa-build-contract.test.ts`
- Modify: `package.json`

**Interfaces:**
- Export `verifyPwaBuild({ distDir, basePath })`.
- CLI: `node scripts/verify-pwa-build.mjs --base=<base-path>`; default base `/`.
- Add package script `"verify:pwa": "node scripts/verify-pwa-build.mjs"`.

- [ ] **Step 1: Write failing verifier unit tests**

Temporary fixtures must reject missing manifest, missing `sw.js`, wrong manifest contract, missing icon files, manifest link outside `basePath`, and service worker precache missing `completed-water.jpg` or install icons. A complete fixture must pass.

- [ ] **Step 2: Verify RED**

```bash
npm test -- tests/unit/pwa-build-contract.test.ts
```

- [ ] **Step 3: Implement verifier**

Read only `dist`; parse manifest/index/service-worker text; no server and no mutation.

- [ ] **Step 4: Verify canonical build portably**

```bash
npm run build -- --base=/snekrenaissance/
npm run verify:pwa -- --base=/snekrenaissance/
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-pwa-build.mjs tests/unit/pwa-build-contract.test.ts package.json package-lock.json
git commit -m "test: verify generated PWA build contract"
```

---

### Task 4: Fork-first Pages and CI

**Files:**
- Modify: `.github/workflows/deploy-pages.yml`, `.github/workflows/ci.yml`
- Create: `tests/unit/pages-workflow.test.ts`

**Interfaces:** Pages deploy uses `/${{ github.event.repository.name }}/`; CI proves canonical and synthetic fork builds.

- [ ] **Step 1: Write failing workflow policy test**

Assert deploy workflow contains `github.event.repository.name` and no hard-coded `VITE_BASE_PATH: /snekrenaissance/`. Assert CI contains verification for both `/snekrenaissance/` and `/snek-experiment/`.

- [ ] **Step 2: Verify RED**

```bash
npm test -- tests/unit/pages-workflow.test.ts
```

- [ ] **Step 3: Make deploy path dynamic**

Set build environment:

```yaml
env:
  VITE_BASE_PATH: /${{ github.event.repository.name }}/
```

Keep existing checkout/Node/npm/Pages upload/deploy sequence.

- [ ] **Step 4: Add canonical/fork PWA checks to CI**

Use portable Vite CLI base overrides:

```bash
npm run build -- --base=/snekrenaissance/
npm run verify:pwa -- --base=/snekrenaissance/
npm run build -- --base=/snek-experiment/
npm run verify:pwa -- --base=/snek-experiment/
```

Do not remove worker tests/config verification/typecheck/E2E.

- [ ] **Step 5: Verify GREEN**

```bash
npm test -- tests/unit/pages-workflow.test.ts
npm run build -- --base=/snek-experiment/
npm run verify:pwa -- --base=/snek-experiment/
```

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/deploy-pages.yml .github/workflows/ci.yml tests/unit/pages-workflow.test.ts
git commit -m "ci: make Pages deployment fork-safe"
```

---

### Task 5: Chromium registration and offline relaunch

**Files:**
- Create: `tests/e2e/pwa.spec.ts`
- Modify only if required: `playwright.config.ts`, `pwa.config.ts`, `vite.config.ts`

**Interfaces:** Reuse existing production-style Vite build/preview on port 4173; run PWA case only in `desktop-chromium`.

- [ ] **Step 1: Write failing E2E**

Test online intro load; fetch manifest and assert name/display/start/scope; await `navigator.serviceWorker.ready`; switch context offline; reload; assert `[data-view="intro"]` and `[data-action="continue"]`; always restore online state.

- [ ] **Step 2: Verify RED/missing contract**

```bash
npx playwright test tests/e2e/pwa.spec.ts --project=desktop-chromium
```

- [ ] **Step 3: Apply only supported generated-registration fixes if needed**

No custom game service-worker controller and no in-game update modal.

- [ ] **Step 4: Verify GREEN and regression E2E**

```bash
npx playwright test tests/e2e/pwa.spec.ts --project=desktop-chromium
npm run test:e2e
```

- [ ] **Step 5: Commit**

Stage only actually changed PWA/test/config files.

```bash
git commit -m "test: cover PWA install and offline relaunch"
```

---

### Task 6: Replace README with current PLAY · INSTALL · FORK presentation

**Files:**
- Modify: `README.md`
- Create: `tests/unit/repository-presentation.test.ts`

**Interfaces:** Canonical play URL `https://liquifinity.github.io/snekrenaissance/`; local path `npm install` + `npm run dev`.

- [ ] **Step 1: Write failing README test**

Require title, tagline, canonical play URL, install/PWA wording, Fork/development wording, `npm install`, `npm run dev`, `npm run build`, `npm test`. Reject `SNEK CORE V3 candidate`, `300 foods = 100%`, and old V1/V2/V2.1/V2.2 narrative.

- [ ] **Step 2: Verify RED**

```bash
npm test -- tests/unit/repository-presentation.test.ts
```

- [ ] **Step 3: Replace README**

Information hierarchy:

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

State that install UI varies by browser/platform. Fork instructions: enable Pages via GitHub Actions; repository-name base path is automatic.

- [ ] **Step 4: Verify GREEN and commit**

```bash
npm test -- tests/unit/repository-presentation.test.ts
git add README.md tests/unit/repository-presentation.test.ts
git commit -m "docs: present SNEK as play install fork"
```

---

### Task 7: Asset-rights and MIT license gate

**Files:**
- Inspect: all distributable files under `public/`, especially `completed-water.jpg` and PWA icons
- Create conditionally: `LICENSE`
- Modify conditionally: `README.md`

**Interfaces:** Preferred license MIT; no ownership inference.

- [ ] **Step 1: Inventory non-code distributable assets and provenance**
- [ ] **Step 2: Obtain explicit rights determination for each asset**
- [ ] **Step 3A: If all rights permit distribution, create standard MIT `LICENSE` using confirmed holder/year and link it from README**
- [ ] **Step 3B: If any asset is unresolved, stop license publication and report the exact blocker; do not replace `completed-water.jpg` without separate gameplay/visual approval**
- [ ] **Step 4: If gate passed, verify `LICENSE` exists and README says MIT only when that file exists**
- [ ] **Step 5: Commit passed license result**

```bash
git add LICENSE README.md
git commit -m "docs: license SNEK for open-source forks"
```

---

### Task 8: Remove superseded development narratives

**Files:**
- Delete after audit: `.superpowers/**`, old `docs/superpowers/execution/**`, old specs/plans
- Retain only:
  - `docs/superpowers/specs/2026-10-18-snek-pwa-fork-first-design.md`
  - `docs/superpowers/plans/2026-10-18-snek-pwa-fork-first-r2.md`
- Modify: `tests/unit/repository-presentation.test.ts`

**Interfaces:** Documentation cleanup only. Keep `docs/security/`, migrations, Worker/ranking code/config, production-release workflow, and their tests.

- [ ] **Step 1: Search all deletion candidates for references outside historical docs**

Confirm candidates are not imported/executed by runtime/build/tests. Confirm Worker/ranking resources remain referenced and therefore remain.

- [ ] **Step 2: Extend cleanliness test and verify RED**

Assert `.superpowers` absent; execution docs absent/empty; spec directory contains only PWA spec; plans directory contains only R2.

```bash
npm test -- tests/unit/repository-presentation.test.ts
```

Expected: FAIL before deletion.

- [ ] **Step 3: `git rm` only audited historical documentation**
- [ ] **Step 4: Verify GREEN**

```bash
npm test -- tests/unit/repository-presentation.test.ts
npm test
```

- [ ] **Step 5: Commit**

```bash
git add -A .superpowers docs/superpowers tests/unit/repository-presentation.test.ts
git commit -m "chore: remove superseded development history from current tree"
```

---

### Task 9: Full automated release-candidate verification

**Files:** No intentional gameplay-source changes.

- [ ] **Step 1: Production dependency audit**

```bash
npm audit --omit=dev --audit-level=moderate
```

- [ ] **Step 2: Full Vitest suite**

```bash
npm test
```

- [ ] **Step 3: Worker tests + typecheck**

```bash
npm run test:worker
npm run typecheck
```

- [ ] **Step 4: Preserved Worker production validation**

```bash
CLOUDFLARE_D1_DATABASE_ID=11111111-1111-4111-8111-111111111111 npm run render:wrangler:production
npx wrangler deploy --dry-run --config .wrangler.production.jsonc
npm run worker:build
```

- [ ] **Step 5: Canonical PWA build**

```bash
npm run build -- --base=/snekrenaissance/
npm run verify:pwa -- --base=/snekrenaissance/
```

- [ ] **Step 6: Fork-path PWA build**

```bash
npm run build -- --base=/snek-experiment/
npm run verify:pwa -- --base=/snek-experiment/
```

- [ ] **Step 7: Browser E2E**

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

- [ ] **Step 8: Diff-scope gate against baseline**

Expected: no changes under `src/game/`, `src/input/`, `src/render/`, `src/ui/`; no gameplay changes in `src/main.ts` or `src/app/`. Allowed changes: PWA/build config, workflows, assets, tests, README/license, audited docs cleanup. Unexpected gameplay diff blocks release.

---

### Task 10: Human acceptance and merge gate

**Files:** None unless a defect is found.

- [ ] **Step 1: Play candidate and confirm existing controls/orbit/progress/33-food completion/completion image/replay**
- [ ] **Step 2: On supported Chromium desktop, confirm browser offers/permits installation**
- [ ] **Step 3: Launch installed app and confirm standalone app surface where platform supports it**
- [ ] **Step 4: After online load, relaunch offline and confirm local game starts**
- [ ] **Step 5: Confirm a waiting update does not force-reload an active run**
- [ ] **Step 6: After authorized merge/deploy, confirm canonical Pages path and PWA scope**
- [ ] **Step 7: Use a disposable differently named fork/repository and confirm Pages deploy works without editing `vite.config.ts`**
- [ ] **Step 8: Present candidate SHA, automated evidence, license-gate status, and human acceptance; merge only after explicit user authorization**

---

## Execution Order / Stop Conditions

1. Tasks 1–5: installable/offline/fork-safe PWA infrastructure.
2. Task 6: current-only public repository presentation.
3. Task 7: hard provenance gate for MIT; unresolved asset rights block the open-source license claim.
4. Task 8: historical documentation cleanup after reference proof.
5. Task 9: complete automated RC verification.
6. Task 10: human acceptance and explicit merge gate.

Stop and return to design if any implementation step requires changing accepted gameplay semantics.