# SNEK RENAISSANCE — PWA + Fork-First Repository Design

Date: 2026-10-18
Status: Approved specification
Baseline: `main@e3bdb7d26eadb51187ba419b3b8ea454d30d1618`

## 1. Intent

Transform the current SNEK RENAISSANCE web game into an installable Progressive Web App while preserving the current approved game exactly as the gameplay baseline.

The same product must support three primary entry paths:

1. **Play** — run directly from GitHub Pages in a browser.
2. **Install** — install the same web build as a PWA on supported devices.
3. **Fork** — let developers fork the repository, run it locally, change the game and publish their own variant with minimal repository-specific configuration.

The repository must present the current product, not its historical development sequence. Historical versions remain recoverable through Git history rather than occupying the public-facing README and current source narrative.

## 2. Non-goals

This project does **not** introduce:

- Electron, Tauri or another native desktop wrapper;
- `.exe`, `.msi`, `.dmg` or platform-specific installers;
- gameplay, camera, input, progression, HUD or completion-flow changes;
- a new ranking architecture;
- forced service-worker reloads during an active game;
- rewritten Git history;
- a second codebase for the installed version.

The browser version and installed version remain one application and one build artifact.

## 3. Existing baseline

The current frontend is already a suitable PWA host:

- TypeScript;
- Vite;
- Three.js;
- static production build to `dist`;
- GitHub Pages deployment over HTTPS;
- current Vite `base` controlled by `VITE_BASE_PATH`;
- automated CI and Pages workflows.

The current Pages workflow hard-codes `VITE_BASE_PATH: /snekrenaissance/`. That is valid for the canonical repository but is not fork-first because a fork with another repository name requires another Pages base path.

The current README is historical and materially stale relative to the accepted game: it still presents older SNEK CORE semantics and old completion/control details. The README must therefore be replaced, not incrementally patched.

## 4. Architecture decision

Use a **Progressive Web App** as the only installable distribution layer.

Adopt `vite-plugin-pwa` with the default `generateSW` strategy so manifest generation, service-worker generation and precache integration remain declarative rather than creating a bespoke service-worker subsystem.

The PWA layer must remain presentation/distribution infrastructure. It must not become gameplay authority.

Conceptual topology:

```text
GitHub repository
├── current game source
├── PWA metadata + icons
├── tests
├── CI
└── GitHub Pages
    ├── browser play
    └── installable PWA
```

A fork follows the same topology with its own repository name and Pages URL.

## 5. Manifest contract

The generated web app manifest must define at minimum:

- `name`: `SNEK RENAISSANCE`;
- `short_name`: `SNEK`;
- `start_url`: relative to the deployed base path;
- `scope`: relative to the deployed base path;
- `display`: `standalone`;
- `background_color` matching the current white application surface;
- `theme_color` compatible with the current UI;
- application icons at 192×192 and 512×512;
- a maskable-compatible icon at 512×512 or equivalent explicit maskable entry.

The manifest and all generated asset URLs must work under both `/snekrenaissance/` and arbitrary fork repository paths.

No hard-coded canonical repository URL may be required for runtime installation.

## 6. Service worker and offline behavior

Use `generateSW` rather than a handwritten service worker.

The service worker must precache the static frontend required to launch and play the local-first game, including the built HTML, JavaScript, CSS and current static assets such as the completion image and PWA icons.

The design intentionally favors **update safety over forced freshness**:

- do not configure forced `autoUpdate` behavior that can reload an active game;
- retain prompt/waiting semantics at the service-worker lifecycle level;
- no new in-game update modal is required in this phase;
- a newly installed worker may take control after existing clients are closed/reopened according to the normal service-worker lifecycle.

The installed application must remain playable after a successful first online load when network access is unavailable, subject to any features that genuinely require remote services.

The current SNEK CORE V5 gameplay is local-first, so offline mode must not create a separate ruleset or alternate game path.

## 7. Fork-first Pages deployment

The GitHub Pages workflow must stop hard-coding `/snekrenaissance/`.

The deployed Vite base path must be derived from the repository name available in GitHub Actions so that:

```text
Liquifinity/snekrenaissance -> /snekrenaissance/
user/snek-experiment       -> /snek-experiment/
```

A fork should not need to edit `vite.config.ts` merely because the repository name changed.

Local development remains rooted at `/` and must continue to work with the existing `npm run dev` command.

The canonical developer path is:

```bash
npm install
npm run dev
```

The production verification path remains based on `npm run build` and the existing CI suite.

## 8. Repository presentation

The repository should communicate only the current product at first contact.

The root README must be replaced with a concise current-state document organized around:

1. SNEK RENAISSANCE title and short description;
2. Play;
3. Install;
4. Fork / develop;
5. minimal local-development commands;
6. build/test commands;
7. license.

It must not make V1/V2/V3/V4/V5 progression the primary public narrative.

The repository should remain technically transparent, but historical architecture documents should not compete with the current product presentation.

## 9. Historical cleanup policy

Do **not** rewrite or squash repository history to hide previous versions.

Instead:

- `main` represents the present product;
- old commits remain the historical archive;
- obsolete version-specific documentation may be removed from the current tree once verified to be non-runtime and non-test dependencies;
- implementation must audit references before deleting any file or directory;
- files required by current CI, tests, release tooling or runtime must not be removed merely for visual cleanliness.

The intended cleanup target includes stale development narratives such as superseded SNEK version specs/plans and historical progress ledgers, but exact deletion candidates are determined by dependency/reference audit during implementation planning.

The new canonical PWA design and its implementation plan may remain under `docs/superpowers/` until the migration is complete. Whether those two documents remain afterward is an implementation/maintenance decision, not a gameplay decision.

## 10. Backend and ranking seam

The PWA conversion must not create a dependency on the historical Cloudflare ranking stack.

Current frontend build/install/play must succeed without configuring a ranking backend.

Worker, D1, migration and production-release resources may only be removed if implementation-time dependency analysis proves they are no longer required by the accepted current product or retained maintenance workflow.

The PWA must not cache or fake remote ranking responses as authoritative data.

## 11. Open-source / fork license

The target repository should include an explicit open-source license rather than rely on implicit GitHub fork mechanics.

Preferred license: **MIT**, because the project goal is simple reuse, modification, redistribution and derivative forks with low legal friction.

License publication is conditional on confirming that all repository-owned distributable assets can legally be released under that license or are otherwise clearly licensed. The implementation plan must include an asset-rights checkpoint before adding `LICENSE` to `main`.

## 12. Icons and visual identity

PWA installation requires durable application icons.

The icon set should be deliberately minimal and derived from project-owned visual identity. It must not introduce unrelated branding or imply OpenAI/ChatGPT affiliation.

Required outputs:

- 192×192 PNG;
- 512×512 PNG;
- 512×512 maskable-compatible PNG or equivalent maskable asset.

No change to the game's in-game visual language is required.

## 13. Current-game invariants

The PWA/repository migration must preserve all accepted current behavior, including but not limited to:

- SNEK CORE V5 ruleset identity and current local-first behavior;
- 33 foods = 100% completion;
- current view-relative controls;
- current orbit camera behavior, including the accepted vertical drag direction;
- current progression/HUD semantics;
- current completion view and `completed-water.jpg` behavior;
- current replay flow;
- current test-protected gameplay semantics.

Any gameplay diff is out of scope and must fail review unless separately approved.

## 14. Verification design

Implementation verification must cover four dimensions.

### 14.1 Existing regression suite

The existing unit, worker, typecheck, build and Playwright suites must remain green.

### 14.2 PWA build correctness

Automated checks must prove that the production build emits:

- a valid web manifest;
- expected install icons;
- a generated service worker;
- precache references for the built application assets;
- base-path-correct URLs for the canonical repository.

### 14.3 Fork-path correctness

CI or a deterministic build test must build using at least one non-canonical base path, for example `/snek-experiment/`, and verify that manifest/start/scope/assets remain inside that path.

This is a first-class requirement, not optional documentation.

### 14.4 Human acceptance

Before merge, manually validate:

- browser play still behaves like the current accepted game;
- installation is offered/possible on at least one supported Chromium desktop browser;
- installed launch opens standalone rather than as a normal browser tab where the platform supports it;
- first online load followed by offline relaunch can start the local game;
- no update mechanism interrupts an active run;
- canonical GitHub Pages URL still works after the deployment workflow change.

## 15. README acceptance criteria

A new visitor should be able to determine within roughly one screen:

- what SNEK RENAISSANCE is;
- where to play it;
- that it is installable;
- that it is intended to be forked;
- how to run it locally.

The README should prefer executable information over development history.

A representative information hierarchy is:

```text
SNEK RENAISSANCE
conquer the space

PLAY · INSTALL · FORK

A three-dimensional snake game built with TypeScript, Three.js and Vite.
Playable in the browser. Installable as a PWA. Forkable by design.

Development
npm install
npm run dev

Build / test
...

License
MIT
```

Exact copy may be refined during implementation, but the hierarchy is normative.

## 16. Success criteria

The migration is complete only when all of the following are true:

1. the current game remains behaviorally unchanged;
2. the canonical GitHub Pages version remains playable;
3. the same deployed build is installable as a PWA on supported browsers;
4. the installed game has a coherent app icon and standalone launch surface;
5. core static gameplay works offline after first successful load;
6. an arbitrary fork can derive its Pages base path automatically;
7. `npm install && npm run dev` remains sufficient for local frontend development;
8. the README describes only the current product and fork/install paths;
9. obsolete visible version narratives are removed from the current tree only after dependency audit;
10. Git history remains intact;
11. an explicit permissive license is added only after asset-rights verification;
12. the complete existing regression suite and new PWA/fork-path checks pass;
13. human installation/offline/gameplay acceptance passes before merge.

## 17. External technical references

This design aligns with current browser/PWA guidance and the selected Vite integration:

- MDN — Making PWAs installable: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- MDN — Web application manifest: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest
- Vite PWA — Getting Started: https://vite-pwa-org.netlify.app/guide/
- Vite PWA — Service Worker Strategies and Behaviors: https://vite-pwa-org.netlify.app/guide/service-worker-strategies-and-behaviors
- Vite PWA — Prompt for new content refreshing: https://vite-pwa-org.netlify.app/guide/prompt-for-update.html

## 18. Next gate

This document defines architecture only.

The written specification is approved. The next step is a separate implementation plan defining exact files, dependency changes, tests, cleanup audit, sequencing and merge gates. Implementation begins only after that plan is reviewed and explicitly approved.
