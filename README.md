# SNEK RENAISSANCE

conquer the space

`just because ChatGPT`  
`didnt complete my image.`

SNEK RENAISSANCE is an independent experimental browser game. It is not affiliated with, endorsed by, or presented as an official OpenAI or ChatGPT product.

## Active Pixel Flight Grid V2.2

The active game is a single-player 3D Snake with continuous flight steering and exact strategic occupancy on a finite toroidal voxel grid. Input and the internal `FlightPose` remain continuous at a fixed 60 Hz simulation cadence, but the visible snake is deliberately quantized: the head and every body voxel render only at exact strategic `GridCell` centers.

A deterministic voxel traversal bridge enumerates every logical cell entered by the continuous trajectory. Only accepted cell entries modify strategic occupancy, visible snake position, food collection, growth, self-collision, and the cardinal visible head direction.

Baseline ruleset:

- `RULESET_ID = pixel-flight-grid-v2-2`;
- `9 × 9 × 9` toroidal logical cells;
- six-cell initial strategic snake;
- continuous yaw/pitch steering at 60 Hz;
- flight speed baseline of `6 cells/s`;
- steering rate baseline of `π × 0.9 rad/s` with pitch clamped to `±80°`;
- deterministic unwrapped voxel traversal prevents tunneling and canonicalizes toroidal cell entry;
- exact occupied-cell self-collision with tail-vacate semantics;
- visible head/body positions are exclusively `GridCell → cellToWorld()`;
- visible head direction is cardinal and changes only on an accepted cell entry;
- food occupies exactly one free logical cell and uses the same `cellToWorld()` center as the snake;
- a valid pickup therefore implies exact visible head/food world-center coincidence;
- food adds two cells of pending growth;
- canonical score is `foodsCollected`; occupied length is a separate metric;
- `300 foods = 100%` remains the provisional completion contract;
- snake and food voxel footprints remain `0.8 × cellSize`;
- visual grid divisions exactly match logical grid resolution.

Desktop controls remain continuous while held: `A/←` steers left, `D/→` steers right, `W/↑` steers up, and `S/↓` steers down. `X` remains an edge-triggered camera toggle between chase and overview modes. There is no movement FIFO, no one-turn-per-keypress latch, and no secondary movement clock.

Mobile uses a proportional virtual joystick with radial deadzone `0.15`. Physical right/left/up/down map to the same signed yaw/pitch convention as keyboard input. The stick is sampled continuously while the pointer remains active and does not require recenter/rearm before accepting an opposite or diagonal direction.

The strategic body is an ordered stable-ID chain of occupied `GridCell` values. V2.2 renders that chain directly; the V2.1 `FlightTrail` presentation layer is retired from the active architecture. Continuous flight presentation remains only for navigation/camera guidance and never determines visible snake placement.

The chase camera remains smooth even though the snake moves in discrete voxel steps. Its target uses the snapped strategic head center, while continuous flight forward/up vectors guide framing. Toroidal display offsets relocate camera space before damping so wrap does not produce a full-cube sweep.

The presentation keeps voxel snake/food geometry, antialiasing disabled, a reduced internal framebuffer (`RENDER_SCALE = 0.50` baseline), CSS pixelated upscale, and toroidal wrap handling.

## Local-first identity and score

V2.2 requires no account or ranking server. The browser stores:

- the chosen username;
- the anonymous player ID reserved for future connected ranking;
- the historical V1 local best under its existing key;
- the historical V2 personal best under `snek.localBest.pixelGridV2`;
- the historical V2.1 personal best under `snek.localBest.pixelGridV2_1`;
- the active V2.2 personal best separately under `snek.localBest.pixelGridV2_2`.

V2.2 personal best is the highest `foodsCollected` score. A later lower score never replaces it. Historical V1/V2/V2.1 records remain intact and are not compared with or overwritten by V2.2.

The repository retains the existing HTTP/Cloudflare ranking seam, but that validator is the historical unversioned backend and explicitly does **not** advertise support for `pixel-flight-grid-v2-2`. Even when an HTTP API base is configured, V2.2 remains local-first until a future server validator explicitly supports this ruleset.

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

The retained 8³/9³/10³ 32-seed greedy-turn harness is **historical V2 discrete evidence**. It is not a V2.2 control autopilot and must not be interpreted as a V2.2 tuning verdict. V2.2 preserves V2.1 continuous-control metrics such as grid-cell entries, average steering magnitude, and longest non-zero steering streak. Human playtesting remains mandatory for final game-feel acceptance.

## Architecture documents

Canonical V2.2 design:

`docs/superpowers/specs/2026-10-17-snek-renaissance-pixel-flight-grid-v2-2-pixel-motion-design.md`

Canonical V2.2 orientation amendment:

`docs/superpowers/specs/2026-10-17-snek-renaissance-pixel-flight-grid-v2-2-pixel-motion-amendment-r1.md`

Canonical V2.2 implementation plan:

`docs/superpowers/plans/2026-10-17-snek-renaissance-pixel-flight-grid-v2-2-pixel-motion-r1.md`

Earlier V1, V2, and V2.1 specifications remain historical documentation and are not rewritten to imply that those versions always used the V2.2 presentation architecture.

## Preserved online-ranking seam

The repository intentionally retains:

- `SessionGateway` and HTTP gateway abstractions;
- Cloudflare Worker API;
- D1 schema and migrations;
- leaderboard UI and validation tests;
- production release tooling.

These components are preserved for a future ruleset-aware global ranking system. The active V2.2 does not submit scores to the current legacy validator.

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
