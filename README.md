# SNEK RENAISSANCE

conquer the space

`just because ChatGPT`  
`didnt complete my image.`

SNEK RENAISSANCE is an independent experimental browser game. It is not affiliated with, endorsed by, or presented as an official OpenAI or ChatGPT product.

## SNEK CORE V3 candidate

The current implementation candidate replaces Pixel Flight Grid V2.2 locomotion authority with a deterministic 3D Snake core. Gameplay movement is now governed only by:

```text
GridCell + GridFrame + pendingTurn
```

There is no active `FlightPose`, continuous yaw/pitch, DDA traversal, or hidden subcell position in the V3 movement path. One strategic clock advances the snake at `6 steps/s`; every accepted step commits exactly one face-adjacent logical cell, including one-axis toroidal wrap.

Baseline V3 rules:

- `RULESET_ID = snek-core-v3`;
- `9 × 9 × 9` toroidal logical cells;
- initial frame `F=+Z, R=-X, U=+Y` with `right = cross(forward, up)`;
- six-cell initial strategic snake;
- exactly one `pendingTurn`; newest valid input before the next step wins;
- one pending turn can affect at most one strategic step, including clock catch-up;
- exact cell self-collision with existing tail-vacate semantics;
- snake and food render only through `GridCell → cellToWorld()`;
- head orientation derives from cardinal `GridFrame.forward + GridFrame.up`;
- food pickup requires exact head/food cell equality and therefore exact visible world-center coincidence;
- food adds two cells of pending growth;
- canonical score is `foodsCollected`;
- `300 foods = 100%` remains the completion contract;
- snake and food voxel footprints remain `0.8 × cellSize`;
- camera smoothing is presentation-only and cannot influence movement.

Desktop turn controls are edge-triggered: `A/←` = left, `D/→` = right, `W/↑` = up, `S/↓` = down. Holding a key does not repeatedly rotate the snake. `X` remains an edge-triggered chase/overview camera toggle.

Mobile uses a four-sector joystick state machine rather than continuous yaw/pitch. The deadzone is `0.15`; sector hysteresis is `10°`; exact diagonal ties entering from neutral prefer the horizontal sector. Remaining in the same sector emits no repeated turn, while crossing into a new sector emits one new turn intent.

The chase camera remains smooth even though strategic snake motion is voxel-stepped. Its target is derived from the snapped head cell and cardinal `GridFrame`; damping affects only camera presentation.

Historical V2.1/V2.2 flight/DDA modules and their dedicated evidence may remain in the repository, but architecture tests require them to be unreachable from active V3 runtime paths.

## Local-first identity and score

V3 requires no account or V3 ranking server. The browser stores:

- the chosen username;
- the anonymous player ID reserved for future connected ranking;
- historical V1 best under `snek.localBest`;
- historical V2 best under `snek.localBest.pixelGridV2`;
- historical V2.1 best under `snek.localBest.pixelGridV2_1`;
- historical V2.2 best under `snek.localBest.pixelGridV2_2`;
- V3 best separately under `snek.localBest.coreV3`.

V3 personal best is the highest `foodsCollected` score. Historical keys are retained byte-for-byte and are not compared with or overwritten by V3.

The existing HTTP/Cloudflare ranking seam is historical and explicitly does not advertise support for `snek-core-v3`. Even when an HTTP API base is configured, V3 remains local-first until a future ruleset-aware server validator is designed and enabled.

## Verification

Local verification commands:

```bash
npm ci
npm audit --omit=dev --audit-level=moderate
npm test
npm run test:worker
npm run typecheck
npm run worker:build
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

The V3 test suite includes:

- complete `GridFrame` algebra and one-axis movement/wrap checks;
- latest-wins pending-turn semantics and single-use catch-up behavior;
- edge-triggered keyboard and deterministic joystick sector/hysteresis tests;
- exact collision/food/growth regression coverage;
- a deterministic 1,000-step replay harness with face-adjacent assertions;
- strategic framerate-independence checks across equivalent frame partitions;
- architectural scanners that reject active Flight/DDA authority;
- Playwright desktop/mobile tests for one-turn input, catch-up, lattice/wrap, exact pickup, joystick hysteresis, camera independence, smooth chase presentation, pixel framebuffer, and responsive/orientation behavior.

Automated verification does not replace the required human game-feel playtest. V3 must not merge to `main` until the exact candidate SHA is green and the human playtest explicitly accepts the behavior.

## Architecture documents

Canonical V3 design:

`docs/superpowers/specs/2026-10-18-snek-core-v3-deterministic-grid-design.md`

Canonical V3 implementation plan:

`docs/superpowers/plans/2026-10-18-snek-core-v3-deterministic-grid-r1.md`

Earlier V1/V2/V2.1/V2.2 specifications remain historical documentation and are not rewritten to imply V3 semantics.

## Preserved online-ranking seam

The repository intentionally retains:

- `SessionGateway` and HTTP gateway abstractions;
- Cloudflare Worker API;
- D1 schema and migrations;
- leaderboard UI and validation tests;
- production release tooling.

These components are preserved for a future ruleset-aware global ranking system. The V3 candidate does not submit scores to the current legacy validator.

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
