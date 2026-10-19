# Architecture

SNEK RENAISSANCE is a local-only browser game distributed as an installable Progressive Web App. The runtime has no backend, remote session, leaderboard, ranking service or server-side persistence.

## Runtime

`src/main.ts` is the composition boundary. It connects application state, deterministic game state, input, Three.js rendering and DOM UI, and owns the browser loop that presents the current run.

`src/game` is the gameplay authority. Movement, grid topology, collision, food, growth, score, completion and fixed-step simulation live there. Rendering and camera code consume game state; they do not define strategic game rules.

## Directory ownership

- `src/app` owns application screens, lifecycle and local persistence.
- `src/game` owns deterministic gameplay state and rules.
- `src/input` owns keyboard and on-screen direction input.
- `src/render` owns Three.js scene, camera and visual presentation.
- `src/ui` owns DOM views and HUD presentation.
- `public` owns static runtime assets and PWA icons.
- `scripts/verify-pwa-build.mjs` verifies generated PWA artifacts and base-path correctness.
- `tests` owns unit, integration and browser-level regression coverage.

## State and persistence

Player state is browser-local. The username is stored under `snek.username`; the current personal best is stored under `snek.localBest.coreV5`. A run itself remains in memory and is not synchronized to a remote service.

The public product therefore has no account identity, remote score submission or cross-device ranking contract.

## PWA and build

Vite builds the application and `vite-plugin-pwa` generates the service worker and web app manifest. Updates use prompt/waiting semantics rather than forcing a running game to reload. After the required assets have been cached, the installed PWA can relaunch offline.

The build base is supplied through `VITE_BASE_PATH`, which allows both the canonical repository path and arbitrary fork repository paths to produce valid static assets.

## Deployment

GitHub Pages is the sole deployment path. `.github/workflows/deploy-pages.yml` builds `main` with a base path derived from the repository name, uploads `dist`, and publishes that static artifact.

No application server is required to play or install SNEK RENAISSANCE.

## Quality gates

The canonical CI job is `test`. It installs from the lockfile, audits production dependencies, runs the full Vitest suite and TypeScript typecheck, verifies canonical and synthetic-fork PWA builds, installs Chromium, and runs Playwright E2E tests.

The same core gates can be run locally:

```bash
npm ci
npm audit --omit=dev --audit-level=moderate
npm test
npm run typecheck
npm run build
npm run test:e2e
```
