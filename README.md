# SNEK RENAISSANCE

conquer the space

`just because ChatGPT`  
`didnt complete my image.`

SNEK RENAISSANCE is an independent experimental browser game. It is not affiliated with, endorsed by, or presented as an official OpenAI or ChatGPT product.

## Active V1

Single-player continuous 3D snake flight inside a cubic toroidal world. Crossing any face wraps to the opposite face; walls do not end the run. Food grows the body by exactly four segments. Self-collision is the gameplay game-over condition.

Desktop controls: `A/←`, `D/→`, `W/↑`, `S/↓`.

Mobile: one virtual joystick controls yaw and pitch. Portrait and landscape layouts are supported.

The active V1 is local-first. It requires no ranking server or database. The browser stores:

- the chosen username;
- an anonymous player ID reserved for future connected ranking;
- the player's personal best.

Game over shows the current `SCORE` and `PERSONAL BEST`. A lower later score never replaces a higher stored record. The `RANK` screen in local mode is the player's own personal record, not a public leaderboard.

Username and personal best are stored in `localStorage`, so they survive reloads and later visits in the same browser profile. Clearing site/browser storage can remove them, and V1 does not synchronize them between devices.

The approved local-first amendment is recorded in `docs/superpowers/specs/2026-10-16-v1-personal-rank-amendment.md`.

## Local development

Install and run the game:

```bash
npm ci
npm run dev
```

The normal frontend build has no ranking API configured and therefore uses the local session path automatically.

Verification:

```bash
npm audit --omit=dev --audit-level=moderate
npm test
npm run test:worker
npm run typecheck
npm run worker:build
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

CI continues testing the preserved online-ranking implementation as well as the active local experience. Keeping those tests green ensures that a future global leaderboard can be re-enabled deliberately without coupling the current V1 to a server.

The full dependency-audit triage, including known development-only Vitest advisories, is recorded under `docs/security/`.

## Future online ranking

The repository intentionally retains the already-built online-ranking seam:

- `SessionGateway` / HTTP gateway;
- Cloudflare Worker API;
- D1 schema and migrations;
- public leaderboard UI;
- ranked browser tests;
- production release tooling.

These components are not required by the active V1. They are preserved for a future version in which scores are shared between players.

For local development of that future backend path:

```bash
npm run worker:migrate
npm run worker:dev
```

To explicitly opt a frontend build into the preserved online-ranking path, set `VITE_RANKING_API_BASE` to the API origin or same-origin proxy path before starting/building Vite. If it is absent, the frontend remains local-only.

## Preserved Cloudflare release tooling

Cloudflare deployment tooling remains in the repository as an optional future global-ranking deployment path. It is manual-only and is not necessary to publish or play the active local V1.

The preserved resource names are:

- Worker: `snekrenaissance-api`;
- D1 database: `snekrenaissance-leaderboard`;
- Pages project: `snekrenaissance`.

The manual workflow is `.github/workflows/deploy-production.yml`. It must not be dispatched for the active local-only release unless the product decision is made to enable the online ranking path.

The committed `wrangler.jsonc` intentionally contains an all-zero D1 placeholder. Account IDs, database UUIDs, API tokens, and other credentials must never be committed to the repository.
