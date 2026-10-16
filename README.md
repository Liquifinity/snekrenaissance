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

To make the frontend use that Worker, set `VITE_RANKING_API_BASE` to the Worker origin or a same-origin proxy path before starting/building Vite.

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

## Production release

Production uses three Cloudflare resources with fixed public names:

- Worker: `snekrenaissance-api`;
- D1 database: `snekrenaissance-leaderboard`;
- Pages project: `snekrenaissance`.

The first release uses the Cloudflare-managed origins `https://snekrenaissance.pages.dev` and the account-specific `https://snekrenaissance-api.<workers-subdomain>.workers.dev`. No custom domain is attached by the V1 release workflow.

### One-time prerequisite

Create or identify exactly one permanent D1 database named `snekrenaissance-leaderboard`. Do not create a replacement database during normal deploys. Record its UUID and keep the production data resource persistent across Worker or Pages rollbacks.

Configure the GitHub `production` environment with these secrets:

- `CLOUDFLARE_API_TOKEN`;
- `CLOUDFLARE_ACCOUNT_ID`;
- `CLOUDFLARE_D1_DATABASE_ID`.

The API token should be least-privilege for Worker deployment, D1 migration access, Workers subdomain read, and Pages project/deployment operations. Secret values must never be committed to the repository or printed in logs.

The committed `wrangler.jsonc` intentionally contains an all-zero D1 placeholder. Production deploys render an ignored `.wrangler.production.jsonc` from `CLOUDFLARE_D1_DATABASE_ID`; the committed config is never rewritten with an account-specific UUID.

### Manual deploy

Production is not deployed automatically on each `main` push. Use the GitHub Actions workflow `deploy production` (`.github/workflows/deploy-production.yml`) and dispatch it manually after `main` is green.

The workflow:

1. checks out canonical `main` and validates all required secrets;
2. runs production dependency audit, frontend tests, Worker tests, typecheck and neutral build gates;
3. renders and dry-runs the production Worker config;
4. lists and applies remote D1 migrations;
5. deploys `snekrenaissance-api`;
6. resolves the live `workers.dev` origin and rebuilds the frontend with `VITE_RANKING_API_BASE` set to it;
7. creates the `snekrenaissance` Pages project only when it does not already exist;
8. deploys `dist/` to Pages;
9. runs production smoke verification and records the public URLs in the Actions summary.

The workflow never creates or deletes D1.

### Rollback model

Worker and Pages code can be rolled back independently. The production D1 database is never deleted as part of rollback. An already-applied schema migration is treated as forward-only: correct it with a new migration rather than recreating the database. Exact Worker/Pages rollback commands and production evidence are maintained with the release workflow and production smoke gate.
