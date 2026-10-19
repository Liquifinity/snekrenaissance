# SNEK RENAISSANCE — Public Repository Purification / 7D

Status: CANONICAL DESIGN SPEC
Date: 2026-10-18
Scope: repository architecture, public surface, local/PWA runtime, quality gates and governance
Implementation status: NOT STARTED

## 1. Purpose

Transform `Liquifinity/snekrenaissance` into a public, purist, single-product repository in which every current-tree artifact has a direct and defensible purpose.

The canonical product is:

> A TypeScript browser game rendered with Three.js, built with Vite, installable as a PWA, playable without a backend, forkable without external infrastructure, and published through GitHub Pages.

The repository must optimize for clarity, correctness, low contributor friction, deterministic quality gates and a minimal public surface. Historical development remains available through Git history rather than through obsolete code, compatibility layers, internal planning documents or retired infrastructure in the current tree.

## 2. Canonical language policy

### 2.1 Implementation language

TypeScript is the canonical implementation language.

Rationale:
- the current product is already TypeScript-first;
- Three.js and Vite integrate directly with the TypeScript ecosystem;
- static typing is valuable for spatial state, grid topology, direction contracts and UI/runtime boundaries;
- browser/PWA contributors can run the project with a conventional Node toolchain;
- changing language would introduce rewrite cost and contributor friction without solving a current product problem.

JavaScript remains present only where tooling convention materially justifies it, such as small Node `.mjs` scripts. No alternate application runtime language is introduced.

### 2.2 Human language

English is the canonical public language for:
- README and public documentation;
- source identifiers and filenames;
- necessary code comments;
- developer-facing errors;
- contribution guidance;
- workflow names and public repository metadata where practical.

This is a reach and consistency decision, not a requirement to translate Git history.

## 3. Product boundary

### Included
- local browser gameplay;
- Three.js rendering;
- keyboard/mobile input;
- camera/orbit interaction;
- local username persistence if still required by the current UX;
- current local best persistence;
- completion image and current game-over/completion flow;
- PWA installation and offline relaunch after cache;
- GitHub Pages deployment;
- current unit, integration and E2E protections that defend the canonical product;
- fork-safe base-path behavior;
- public documentation required to understand, run, test, fork and contribute.

### Excluded
- global ranking;
- remote sessions;
- leaderboard backend;
- Cloudflare Worker runtime;
- Cloudflare D1;
- Cloudflare Pages production path;
- Wrangler deployment/configuration;
- backend compatibility aliases retained only for retired HTTP payloads;
- historical ruleset persistence implementations not used by the current product;
- internal implementation plans/specs in the final public tree.

## 4. Purism rule

An artifact stays in the current tree only when at least one of the following is true:

1. it executes in the current product;
2. it is required to build, test, package or deploy the current product;
3. it protects an active behavioral or architectural invariant;
4. it is required for a contributor to understand or safely change the current product;
5. it is an intentional product asset or legal file.

"It may be useful later", "it documents how we got here", and "professional repositories often have it" are not sufficient reasons to keep an artifact.

History belongs in Git history.

## 5. Classification vocabulary

- `KEEP`: current, necessary and correctly placed.
- `SIMPLIFY`: necessary concept, but current implementation contains obsolete states, aliases, dependencies or indirection.
- `MOVE`: necessary artifact whose current location obscures ownership or public structure.
- `DELETE`: no longer belongs to the canonical product.
- `VERIFY`: likely obsolete, but deletion requires dependency proof or behavioral equivalence first.

## 6. Seven-dimensional target state

### D1 — Architecture

Target: one deployable product and one runtime architecture.

Canonical dependency flow:

```text
browser/PWA
    |
    v
src/main.ts
    |
    +--> app     orchestration + local product state
    +--> game    deterministic gameplay authority
    +--> input   user commands
    +--> render  Three.js presentation/camera
    +--> ui      DOM views
```

There is no server-side application boundary in the canonical product.

Rules:
- `src/game` must not depend on UI, network or deployment infrastructure;
- `src/render` presents game state and camera state; it does not own gameplay authority;
- `src/app` coordinates screens and local persistence; it must not pretend a remote gateway exists when the product has no remote gateway;
- `src/main.ts` remains composition/runtime wiring, not a second gameplay authority.

### D2 — Hierarchy

Target authority order:

```text
human direction
  -> protected GitHub main
  -> source + tests as executable authority
  -> build artifact
  -> GitHub Pages deployment
```

`main` is the only canonical product branch.

Development uses short-lived branches and PR/CI gates. The repository-level `Protect Main` ruleset must ultimately enforce the intended flow rather than only prevent deletion/force-push.

Target governance:
- deletion restricted on `main`;
- non-fast-forward/force-push blocked on `main`;
- changes to `main` require pull request flow;
- required CI status must pass before merge;
- bypass list remains empty for normal development;
- direct administrative changes to ruleset configuration are governance actions, not ordinary code-path bypasses.

### D3 — Dependency

Target runtime dependencies:
- `three`.

Target build/test toolchain, only where justified:
- TypeScript;
- Vite;
- `vite-plugin-pwa`;
- Vitest;
- Playwright;
- type packages required by the above;
- jsdom only if current unit tests require DOM emulation.

Explicitly retired dependency:
- `wrangler`.

No Cloudflare-specific tool remains after local/PWA purification.

Dependency rule:
> Every direct dependency must have at least one current runtime, build, test or verification consumer.

### D4 — Ownership

Target ownership by directory:

| Area | Owns | Must not own |
| --- | --- | --- |
| `src/game` | grid, snake, food, collision, progression, run state | DOM, network, deployment |
| `src/input` | keyboard/touch command capture | gameplay mutation beyond command submission |
| `src/render` | Three.js scene, camera, visual snapshots | score/persistence/session authority |
| `src/ui` | screen DOM and user-facing controls | network/backend policy |
| `src/app` | screen orchestration, local identity/preferences/best | remote session lifecycle |
| `src/main.ts` | wiring + browser loop | duplicate domain rules |
| `tests` | current product contracts | retired-version preservation for its own sake |
| `.github/workflows` | CI + GitHub Pages | alternate production platforms |

### D5 — Lifecycle

Canonical lifecycle:

```text
clone/fork
  -> npm ci
  -> npm run dev
  -> npm test
  -> npm run typecheck
  -> npm run build
  -> PWA verification
  -> E2E
  -> PR
  -> main
  -> GitHub Pages
```

There is no Worker migration, remote database migration, Cloudflare credential gate or dual production release path.

PWA update behavior remains prompt/waiting semantics. Active gameplay must not be force-reloaded by a service-worker update.

### D6 — Execution / Deploy

Canonical workflows:
- `ci.yml` — validate the current product only;
- `deploy-pages.yml` — build and deploy the current `main` to GitHub Pages.

Delete:
- `deploy-production.yml`.

`ci.yml` must stop executing Worker tests, Wrangler rendering, Worker dry-runs and Cloudflare production configuration checks.

CI must continue to validate:
- dependency install;
- production dependency audit;
- unit/integration tests;
- TypeScript typecheck;
- canonical PWA build;
- synthetic fork-path PWA build;
- browser/E2E behavior.

GitHub Pages must remain fork-safe by deriving base path from repository context rather than hardcoding the canonical repository name into application logic.

### D7 — Data / State

Canonical persistent user data is local-only.

Target retained state:
- username only if required by the current product UX;
- current local best.

The existing key `snek.localBest.coreV5` should remain the current-best storage key during this purification unless a migration provides equal or better continuity. Purism must not erase useful player data merely to remove a version suffix.

Delete from current runtime/state model:
- remote `playerId` identity if it exists only for ranking;
- `worldRank`;
- `ranked` state;
- `activeSessionId`;
- session startup/submission status;
- submission errors tied to remote ranking;
- remote leaderboard payloads.

Historical best keys and helper functions for V1/V2/V2.1/V2.2/V3/V4 are not current product data APIs. They are candidates for deletion after tests and imports prove no current migration requirement.

## 7. Repository classification matrix

### 7.1 Repository root

| Artifact | Classification | Decision |
| --- | --- | --- |
| `README.md` | KEEP | Brand-first, short public entry point with PLAY / INSTALL / FORK |
| `LICENSE` | KEEP | MIT license |
| `index.html` | KEEP | Vite browser entry shell |
| `.gitignore` | KEEP/SIMPLIFY | Retain only current generated/local artifacts |
| `package.json` | SIMPLIFY | Remove Worker/Cloudflare scripts and Wrangler dependency |
| `package-lock.json` | SIMPLIFY | Regenerate from simplified package manifest |
| `tsconfig.json` | KEEP/SIMPLIFY | Current TypeScript contract; remove retired include assumptions if any |
| `vite.config.ts` | KEEP | Current browser/PWA build |
| `vitest.config.ts` | KEEP | Current frontend/unit/integration tests |
| `vitest.worker.config.ts` | DELETE | Worker-only |
| `playwright.config.ts` | KEEP/SIMPLIFY | Remove ranked-only project/mode assumptions if present |
| `pwa.config.ts` | KEEP | Canonical PWA manifest/service-worker configuration |
| `wrangler.jsonc` | DELETE | Retired Cloudflare backend |
| `.env.e2e-ranked` | DELETE | Ranked-only E2E mode |

### 7.2 GitHub workflows

| Artifact | Classification | Decision |
| --- | --- | --- |
| `.github/workflows/ci.yml` | SIMPLIFY | Keep browser/PWA gates; remove Worker/Cloudflare gates |
| `.github/workflows/deploy-pages.yml` | KEEP | Canonical deployment |
| `.github/workflows/deploy-production.yml` | DELETE | Retired Cloudflare/D1/Worker deployment path |

### 7.3 Documentation

| Artifact | Classification | Decision |
| --- | --- | --- |
| `docs/readme/snek-renaissance-hero.jpg` | KEEP | README brand asset |
| `docs/superpowers/**` | DELETE from final tree | Internal process belongs in history, not public current tree |
| `docs/security/2026-10-15-dependency-audit.md` | DELETE from final tree | Dated internal audit; not a living public security policy |
| `ARCHITECTURE.md` | ADD only if concise/useful | Public current architecture and ownership boundaries |
| `CONTRIBUTING.md` | ADD only if concise/useful | Reproducible contribution/test flow |
| `SECURITY.md` | DO NOT ADD by default | Add only when a real reporting/security policy exists |

The present spec and implementation plan are working artifacts. They must not remain in the final public tree after purification is integrated; Git history preserves them.

### 7.4 Backend/ranking infrastructure

| Artifact | Classification | Decision |
| --- | --- | --- |
| `worker/**` | DELETE | Backend excluded from canonical product |
| `migrations/**` | DELETE | D1 excluded |
| `scripts/render-production-wrangler.mjs` | DELETE | Wrangler-only |
| `scripts/smoke-production.mjs` | DELETE | Cloudflare production-only |
| `scripts/smoke-production.d.mts` | DELETE | Cloudflare production-only typing |
| `scripts/verify-pwa-build.mjs` | KEEP | Current PWA build contract |

### 7.5 Application layer

| Artifact/symbol | Classification | Decision |
| --- | --- | --- |
| `src/app/app-controller.ts` | SIMPLIFY | Remove remote session/rank orchestration while preserving current local UX |
| `src/app/app-state.ts` | SIMPLIFY | Collapse state to local screens/data only |
| `src/app/gateway-selection.ts` | DELETE | No remote/local gateway selection remains |
| `src/app/http-session-gateway.ts` | DELETE | No HTTP ranking backend remains |
| `src/app/session-gateway.ts` | DELETE unless dependency proof shows non-ranking value | Gateway abstraction is unnecessary for a local-only product |
| `src/app/identity.ts` | SIMPLIFY | Keep username/current local best; remove remote player identity + obsolete historical APIs after proof |
| `src/app/runtime-lifecycle.ts` | KEEP | Current browser/game loop lifecycle if still consumed |

### 7.6 UI layer

| Artifact | Classification | Decision |
| --- | --- | --- |
| `intro-view.ts` | KEEP | Current product flow |
| `username-view.ts` | KEEP/SIMPLIFY | Keep if username remains in local UX; remove ranking availability language/states |
| `hud-view.ts` | KEEP | Current gameplay UI |
| `game-over-view.ts` | SIMPLIFY | Remove world-rank/submission presentation; keep score/local best/retry flow |
| `completion-view.ts` | KEEP | Current completion product behavior |
| `local-rank-view.ts` | KEEP or MOVE/RENAME | Keep only if it represents current local-best UX; name may be simplified if “rank” is misleading |
| `leaderboard-view.ts` | DELETE | Remote leaderboard excluded |

### 7.7 Game/domain layer

Current gameplay authority centered on grid/run-state remains.

`KEEP` candidates:
- `collision.ts`;
- `food.ts`;
- `grid-config.ts`;
- `grid-direction.ts`;
- `grid-topology.ts`;
- `grid-types.ts`;
- `progress.ts`;
- `run-state.ts`;
- `simulation.ts`;
- `snake.ts`.

`SIMPLIFY` current run result/state:
- remove `foodEaten` compatibility alias if no current consumer remains;
- remove `rulesetId` from runtime result if its only remaining purpose is retired server compatibility;
- preserve score, foods collected, length/max length, duration and completion semantics only where current UI/tests require them.

`VERIFY` before deletion:
- `flight.ts`;
- `grid-traversal.ts` if no current runtime path reaches it;
- `torus.ts`;
- `constants.ts` if redundant after dependency graph proof;
- `types.ts` if it is an empty/legacy barrel or obsolete alias.

Rule: no file is removed from this VERIFY group merely because its name looks historical. The implementation plan must prove absence from the current import graph or replace the active consumer first.

### 7.8 Render layer

`KEEP` candidates:
- `board-camera.ts`;
- `board-orbit.ts`;
- `food-renderer.ts`;
- `pixel-snake-presentation.ts`;
- `scene.ts`;
- `snake-renderer.ts`;
- `view-frame.ts`.

`VERIFY`:
- `flight-presentation.ts`;
- `pixel-resolution.ts` if its only consumers are retired presentation tests/code.

### 7.9 Input layer

Current keyboard/direction controls are product-critical and remain unless dependency proof shows otherwise.

Invariants:
- W/A/S/D and arrow controls continue to work as current gameplay commands;
- E remains the into-screen command;
- Q remains unbound;
- editable fields do not consume game movement shortcuts;
- mobile direction pad semantics remain current.

### 7.10 Tests

Tests are classified by contract, not age.

#### KEEP categories
- current gameplay/domain contracts;
- keyboard regression protecting editable inputs and Q unbound behavior;
- current board camera/orbit contracts;
- current grid topology/run-state contracts;
- completion target behavior;
- current PWA manifest/build/offline contracts;
- GitHub Pages/fork-safe deployment contracts;
- E2E current game flow.

#### DELETE with retired backend
- `tests/integration/app-ranking-flow.test.ts`;
- `tests/e2e/ranked.spec.ts`;
- `tests/unit/gateway-selection.test.ts`;
- `tests/unit/http-session-gateway.test.ts`;
- `tests/unit/session-gateway-capability.test.ts`;
- `tests/unit/deploy-production.test.ts`;
- `tests/unit/production-config.test.ts`;
- `tests/unit/production-smoke.test.ts`;
- Worker test suite under `worker/tests/**`.

#### DELETE historical-only persistence/contracts unless a current migration requirement is proven
- `tests/unit/historical-v3-persistence.test.ts`;
- `tests/unit/historical-v4-persistence.test.ts`;
- `tests/unit/v22-persistence.test.ts`;
- `tests/unit/task11-v2-boundary.test.ts`.

#### VERIFY before deleting together with candidate legacy source
- `tests/unit/flight.test.ts`;
- `tests/unit/flight-presentation.test.ts`;
- `tests/unit/torus.test.ts`;
- any test whose only subject is a source artifact proven outside the current runtime/product contract.

#### `.gitkeep`
All `.gitkeep` files inside non-empty current directories are DELETE.

## 8. Public target tree

Indicative final structure:

```text
snekrenaissance/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy-pages.yml
├── docs/
│   └── readme/
│       └── snek-renaissance-hero.jpg
├── public/
│   ├── completed-water.jpg
│   └── icons/
├── scripts/
│   └── verify-pwa-build.mjs
├── src/
│   ├── app/
│   ├── game/
│   ├── input/
│   ├── render/
│   ├── ui/
│   ├── main.ts
│   └── styles.css
├── tests/
│   ├── e2e/
│   ├── integration/
│   └── unit/
├── ARCHITECTURE.md          # only if concise and current
├── CONTRIBUTING.md          # only if concise and actionable
├── LICENSE
├── README.md
├── index.html
├── package.json
├── package-lock.json
├── playwright.config.ts
├── pwa.config.ts
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

This tree is indicative. A file must not be moved/renamed solely to match the diagram when its existing location is already semantically correct.

## 9. Non-goals

This purification does NOT:
- redesign gameplay;
- change current camera feel;
- alter controls;
- alter the 33-food completion target;
- replace Three.js;
- migrate to another language/framework;
- introduce React or another UI framework;
- introduce a monorepo/workspace;
- publish an npm package;
- add a backend;
- erase Git history;
- remove tests merely to reduce file count;
- create decorative governance/documentation files.

## 10. Behavioral invariants

The final purified repository must preserve the current product behavior unless a separate product decision explicitly changes it:

- game launches in the browser;
- username input remains usable if username remains part of the canonical flow;
- keyboard controls retain current semantics;
- Q remains unbound;
- editable controls do not trigger movement;
- camera orbit/zoom behavior remains current;
- gameplay remains deterministic under existing deterministic test hooks where those hooks still protect current behavior;
- food collection increments current score;
- the 33rd food completes the image/game;
- completion view still shows the canonical completion image and PLAY AGAIN behavior;
- local best survives reloads;
- app remains installable as a PWA;
- cached app can relaunch offline under the current PWA contract;
- canonical GitHub Pages build works under `/snekrenaissance/`;
- synthetic fork build works under an arbitrary repository path;
- no ranking/backend failure state is visible because no ranking/backend exists.

## 11. Implementation safety rules

1. Work on an isolated branch/worktree-equivalent flow; never refactor directly on `main`.
2. Establish fresh green baseline before deletion.
3. For every `VERIFY` artifact, prove current import/reference status before removal.
4. Remove backend as a coherent vertical slice: runtime, UI state, tests, scripts, workflows, package dependency and configuration must converge together.
5. Prefer deletion/simplification over replacement abstractions when only one implementation remains.
6. Do not preserve interfaces whose sole purpose was future backend substitution.
7. Update tests to express current product behavior, not implementation history.
8. Regenerate `package-lock.json` after dependency removal.
9. Run a dead-code/import audit after the backend slice is removed.
10. Final public tree must not contain this design spec or its implementation plan.

## 12. Acceptance criteria

### Architecture
- one browser/PWA product path;
- no Worker, D1, Cloudflare Pages or ranking runtime in the current tree;
- no remote gateway abstraction unless a current non-ranking consumer is proven.

### Language
- TypeScript remains canonical application language;
- public documentation/source naming is English-first;
- no unnecessary second application language/framework is introduced.

### Dependency purity
- Wrangler absent from `package.json` and lock graph as a direct dependency;
- no Worker-only scripts/configs remain;
- every remaining direct dependency has a current consumer.

### State purity
- app state has no world rank, remote session or remote submission state;
- current local best remains persistent;
- historical persistence helpers/tests are removed unless a live migration dependency is demonstrated.

### Test purity
- all surviving tests defend current product behavior or current repository contracts;
- no ranking/Cloudflare/retired-version-only test remains;
- no useful regression protection is lost without equivalent coverage.

### Deployment purity
- CI validates only the canonical local/PWA product;
- GitHub Pages is the sole deployment workflow;
- canonical and synthetic fork PWA builds remain green.

### Repository purity
- no obsolete `.gitkeep` in populated directories;
- no internal Superpowers plans/specs in final public tree;
- no dated internal dependency audit presented as living public documentation;
- README remains concise/brand-first;
- ARCHITECTURE/CONTRIBUTING exist only if their final content is concise, current and actionable.

### Governance
- `main` remains deletion/force-push protected;
- target governance adds PR + required CI enforcement with no normal bypass actor;
- all integration occurs only after green branch/PR verification.

## 13. Verification gate before completion claim

The implementation is not complete until fresh evidence confirms:

```text
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

In addition:
- repository search finds no retired Worker/D1/Wrangler/ranking paths except historical Git commits;
- diff review confirms no unrelated gameplay redesign;
- public tree review confirms only current-use artifacts;
- GitHub Pages deployment succeeds from the integrated `main`;
- post-integration `main` CI succeeds.

The exact commands may be simplified by the implementation plan if package scripts are intentionally renamed, but the coverage obligations remain.

## 14. Design decision summary

```text
STACK            TypeScript + Three.js + Vite + PWA
PUBLIC LANGUAGE  English
PRODUCT          Local/browser/PWA
BACKEND          None
REMOTE RANKING   None
PERSISTENCE      Local only
DEPLOYMENT       GitHub Pages
HISTORY          Git history
MAIN             Canonical + protected
PUBLIC TREE      Current product only
CLEANUP MODE     Purist, with proof before deletion
```

This spec supersedes prior repository-structure assumptions where they conflict with the local/PWA-only public-product decision.
