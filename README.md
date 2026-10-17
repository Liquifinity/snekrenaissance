# SNEK RENAISSANCE

conquer the space

`just because ChatGPT`  
`didnt complete my image.`

SNEK RENAISSANCE is an independent experimental browser game. It is not affiliated with, endorsed by, or presented as an official OpenAI or ChatGPT product.

## Active Pixel Flight Grid V2

The active game is a single-player 3D Snake running on a deterministic toroidal voxel grid. Gameplay authority is integer cell occupancy; rendering interpolates those cell transitions smoothly so the snake still reads as flight rather than stop-motion.

Baseline ruleset:

- `RULESET_ID = pixel-flight-grid-v2`;
- `9 × 9 × 9` toroidal logical cells;
- six-cell initial snake;
- exact occupied-cell self-collision with tail-vacate semantics;
- food occupies one free cell and adds two cells of pending growth;
- canonical score is `foodsCollected`; occupied length is a separate metric;
- `300 foods = 100%` remains the provisional completion contract;
- visual grid divisions exactly match logical grid resolution.

Desktop controls: `A/←`, `D/→`, `W/↑`, `S/↓`. Inputs are local left/right/up/down intents resolved to deterministic 90-degree `GridFrame` turns at cell boundaries. `X` changes between the elevated chase camera and the front overview camera.

Mobile uses the same discrete turn semantics through a threshold/rearm virtual joystick. Portrait and landscape are covered by browser tests.

The presentation uses voxel snake/food geometry, antialiasing disabled, a reduced internal framebuffer (`RENDER_SCALE = 0.50` baseline), CSS pixelated upscale, and wrap-aware interpolation. Presentation-space floats never feed gameplay collision, food, scoring, growth or topology.

## Local-first identity and score

V2 requires no account or ranking server. The browser stores:

- the chosen username;
- the anonymous player ID reserved for future connected ranking;
- the historical V1 local best under its existing key;
- the V2 personal best separately under `snek.localBest.pixelGridV2`.

V2 personal best is the highest `foodsCollected` score. A later lower score never replaces it. Historical V1 length records are not compared to V2 food scores.

The repository retains the existing HTTP/Cloudflare ranking seam, but that validator was designed for V1 arithmetic and explicitly does **not** advertise support for `pixel-flight-grid-v2`. Even when an HTTP API base is configured, the active V2 remains local-first until a future server validator explicitly supports this ruleset.

## Local development

Install and run:

```bash
npm ci
npm run dev
```

Core verification:

```bash
npm audit --omit=dev --audit-level=moderate
npm test
npm run test:worker
npm run typecheck
npm run worker:build
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
npm run test:tuning
```

The tuning harness compares 8³, 9³ and 10³ with 32 fixed seeds, one deterministic policy, and a hard semantic horizon of 10,000 logical steps. It is comparative evidence, not a substitute for human playtesting and cannot change the provisional 300-food completion contract without a separate approved spec amendment.

## Architecture documents

Canonical V2 design:

`docs/superpowers/specs/2026-10-16-snek-renaissance-pixel-flight-grid-v2-design.md`

Canonical implementation plan:

`docs/superpowers/plans/2026-10-16-snek-renaissance-pixel-flight-grid-v2.md`

The earlier V1 specifications remain historical documentation. They are not rewritten to imply that V1 always used grid gameplay.

## Preserved online-ranking seam

The repository intentionally retains:

- `SessionGateway` and HTTP gateway abstractions;
- Cloudflare Worker API;
- D1 schema and migrations;
- leaderboard UI and validation tests;
- production release tooling.

These components are preserved for a future ruleset-aware global ranking system. The active V2 does not submit scores to the current V1 validator.

For backend development:

```bash
npm run worker:migrate
npm run worker:dev
```

## Preserved Cloudflare release tooling

Cloudflare deployment tooling remains manual-only. The preserved resources are:

- Worker: `snekrenaissance-api`;
- D1 database: `snekrenaissance-leaderboard`;
- Pages project: `snekrenaissance`.

The manual workflow is `.github/workflows/deploy-production.yml`. The committed `wrangler.jsonc` intentionally contains an all-zero D1 placeholder. Account IDs, database UUIDs, API tokens and other credentials must never be committed.
