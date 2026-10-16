# SNEK RENAISSANCE

conquer the space

`just because ChatGPT`
`didn't complete my image.`

SNEK RENAISSANCE is an independent experimental browser game. It is not affiliated with, endorsed by, or presented as an official OpenAI or ChatGPT product.

## V1 scope

Single-player continuous 3D snake flight inside a cubic toroidal world. Crossing any face wraps to the opposite face; walls do not end the run. Food grows the body by exactly four segments. Self-collision is the gameplay game-over condition.

Desktop controls: `A/←`, `D/→`, `W/↑`, `S/↓`.

Mobile: one virtual joystick controls yaw and pitch. Portrait and landscape layouts are supported.

The browser stores an anonymous player ID, username, and local best. When a ranking API base is configured, ranked runs use a Cloudflare Worker + D1 backend for game sessions, basic result validation, public leaderboard persistence, and player rank. Without that configuration the frontend deliberately remains local and `UNRANKED`.

## Local development

Install and run the frontend:

```bash
npm ci
npm run dev
```

Run the ranking backend locally:

```bash
npm run worker:migrate
npm run worker:dev
```

To make the frontend use that Worker, set `VITE_RANKING_API_BASE` to the Worker origin or a same-origin proxy path before starting/building Vite. Production Cloudflare resource IDs, routing, secrets, and rollout are intentionally not provisioned by the backend feature branch; they belong to the separate production deployment plan.

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

The canonical CI gate installs from the lockfile, audits deployable production dependencies, runs frontend and Worker tests, validates TypeScript, performs a Worker deployment dry-run, builds the production frontend, and executes Playwright desktop/mobile/ranked browser tests.

The full dependency-audit triage, including known development-only Vitest advisories, is recorded under `docs/security/`.
