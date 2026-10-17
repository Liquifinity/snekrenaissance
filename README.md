# SNEK RENAISSANCE

conquer the space

`just because ChatGPT`  
`didnt complete my image.`

SNEK RENAISSANCE is an independent experimental browser game. It is not affiliated with, endorsed by, or presented as an official OpenAI or ChatGPT product.

## Active Pixel Flight Grid V2.1

The active game is a single-player 3D Snake with continuous flight steering and exact strategic occupancy on a finite toroidal voxel grid. The head pose moves continuously in logical grid coordinates at a fixed 60 Hz simulation cadence. A deterministic voxel traversal bridge enumerates every logical cell entered by that continuous trajectory, so food, growth and self-collision remain exact even though steering is no longer quantized to 90-degree turns.

Baseline ruleset:

- `RULESET_ID = pixel-flight-grid-v2-1`;
- `9 × 9 × 9` toroidal logical cells;
- six-cell initial strategic snake;
- continuous yaw/pitch steering at 60 Hz;
- flight speed baseline of `6 cells/s`;
- steering rate baseline of `π × 0.9 rad/s` with pitch clamped to `±80°`;
- deterministic unwrapped voxel traversal prevents tunneling and canonicalizes toroidal cell entry;
- exact occupied-cell self-collision with tail-vacate semantics;
- food occupies exactly one free logical cell and adds two cells of pending growth;
- canonical score is `foodsCollected`; occupied length is a separate metric;
- `300 foods = 100%` remains the provisional completion contract;
- snake and food voxel footprints remain `0.8 × cellSize`;
- visual grid divisions exactly match logical grid resolution.

Desktop controls are continuous while held: `A/←` steers left, `D/→` steers right, `W/↑` steers up, and `S/↓` steers down. `X` remains an edge-triggered camera toggle between chase and overview modes. There is no movement FIFO, no one-turn-per-keypress latch, and no 6 Hz steering gate.

Mobile uses a proportional virtual joystick with radial deadzone `0.15`. Physical right/left/up/down map to the same signed yaw/pitch convention as keyboard input. The stick does not require recenter/rearm before accepting the next direction; it is sampled continuously while the pointer remains active.

The strategic body is still an ordered stable-ID chain of occupied `GridCell` values. The renderer uses a separate unwrapped `FlightTrail` only for visual continuity; that trail and all Three.js/world-space values are presentation-only and never feed collision, food, score, growth or topology. The chase camera follows the same continuous head pose and wrap offset used for presentation.

The presentation keeps voxel snake/food geometry, antialiasing disabled, a reduced internal framebuffer (`RENDER_SCALE = 0.50` baseline), CSS pixelated upscale, and toroidal wrap handling without a full-cube interpolation sweep.

## Local-first identity and score

V2.1 requires no account or ranking server. The browser stores:

- the chosen username;
- the anonymous player ID reserved for future connected ranking;
- the historical V1 local best under its existing key;
- the historical V2 personal best under `snek.localBest.pixelGridV2`;
- the active V2.1 personal best separately under `snek.localBest.pixelGridV2_1`.

V2.1 personal best is the highest `foodsCollected` score. A later lower score never replaces it. Historical V1 and V2 records remain intact and are not compared to the V2.1 score.

The repository retains the existing HTTP/Cloudflare ranking seam, but that validator was designed for the legacy ruleset contract and explicitly does **not** advertise support for `pixel-flight-grid-v2-1`. Even when an HTTP API base is configured, V2.1 remains local-first until a future server validator explicitly supports this ruleset.

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
```

The retained 8³/9³/10³ 32-seed greedy-turn harness is **historical V2 discrete evidence**. It is not a V2.1 autopilot and must not be interpreted as a V2.1 tuning verdict because continuous steering changes the reachable control policy. V2.1 records separate continuous-control metrics such as grid-cell entries, average steering magnitude and longest non-zero steering streak. Human playtesting remains mandatory for final control-feel acceptance.

## Architecture documents

Canonical V2.1 design:

`docs/superpowers/specs/2026-10-17-snek-renaissance-pixel-flight-grid-v2-1-smooth-control-design.md`

Canonical V2.1 implementation plan:

`docs/superpowers/plans/2026-10-17-snek-renaissance-pixel-flight-grid-v2-1-smooth-control-r1.md`

The earlier V1 and V2 specifications remain historical documentation. They are not rewritten to imply that those versions always used the V2.1 control architecture.

## Preserved online-ranking seam

The repository intentionally retains:

- `SessionGateway` and HTTP gateway abstractions;
- Cloudflare Worker API;
- D1 schema and migrations;
- leaderboard UI and validation tests;
- production release tooling.

These components are preserved for a future ruleset-aware global ranking system. The active V2.1 does not submit scores to the current legacy validator.

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
