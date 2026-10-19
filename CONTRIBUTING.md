# Contributing

SNEK RENAISSANCE is a focused TypeScript browser/PWA project. Keep changes scoped to the current product and preserve the local-only architecture unless a product decision explicitly changes that boundary.

## Local setup

```bash
npm ci
npm run dev
```

## Verification

Before opening a pull request, run:

```bash
npm test
npm run typecheck
npm run build
npm run test:e2e
```

For PWA-specific changes, also run `npm run verify:pwa` against the build path being validated.

## Change flow

Create a short-lived branch from the current canonical branch, make one coherent change, run the relevant tests, and open a pull request. Merge only after the required `test` CI check is green.

Source code, tests and public technical documentation are English-first. Keep existing module ownership boundaries: application state in `src/app`, gameplay authority in `src/game`, input in `src/input`, Three.js presentation in `src/render`, and DOM views in `src/ui`.

Do not introduce a backend, remote ranking/session layer, another frontend framework, a monorepo or a second canonical application language without an explicit product-level decision.
