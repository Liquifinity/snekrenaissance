# V2.2 execution ledger

Plan: `docs/superpowers/plans/2026-10-17-snek-renaissance-pixel-flight-grid-v2-2-pixel-motion-r1.md`

Execution mode: NATIVE inline execution through isolated GitHub feature branch because the local sandbox cannot resolve `github.com` for a physical worktree.

Baseline production SHA: `fd852aa54081a1026d146ead06c4778738c2f6ef`.
Canonical documentation SHA before execution: `5ecd28c755b3c4470f133c5e643ab2db8dd1b92f`.
Feature branch: `feat/pixel-flight-grid-v2-2-pixel-motion`.

Ruling: repository CI on `feat/**` is the executable test ledger. RED commits contain tests before implementation; GREEN commits follow only after the expected RED failure is observed.

## Baseline

CI #672 / run `39091621134`: PASS on isolated branch before source edits, including production-only audit, unit/integration tests, Worker tests, typecheck, builds, and Playwright.

## TDD evidence

### Task 1 — cardinal visible direction
- RED `8a05855a234f6225cbaa1cb1b35aa83b407a2a43`: missing `grid-direction.ts` failed as expected; existing tests remained green.
- GREEN `236329735e983dd9cb1cc28caa1ce8f5b4104b30`: deterministic dominant-axis quantizer with `X > Y > Z` exact ties.
- RED RunState latch contract: `d5acffa9b5fc029a7eed98e6a1a03f80ec92c1ae`.
- GREEN `0c2a410b2b1ccc27e1a6786b587752ecfb95b198`: `visibleDirection` initial `+Z`, updated only after accepted cell entry, unchanged on pre-commit collision.

### Task 2 — pixel snake presentation
- RED `a7a2e23f5b6b68d848b234fce5949b50dd6a6a96`: missing pixel presentation module.
- GREEN `6e68b0ba32d766500d590071c3b6a9f4a93ed8ec`: head/body positions exclusively from strategic `GridCell → cellToWorld`, stable IDs, cardinal head quaternion.

### Task 3 — browser snapped render path
- RED `539712c62b9727c89b26b9f753e3060520ef454b`: browser still used V2.1 `FlightTrail` and continuous head placement.
- GREEN `cd4408296a02e329030d43b9d575af8f6cd8a7fa`: browser snake render switched to `buildPixelSnakeRenderSnapshot(run)`; active FlightTrail consumption removed.

### Task 4 — snapped chase-camera target
- RED `62cfb3334e40c3e5437d66fa39f5bf8df1817c8d`: missing snapped camera presentation.
- GREEN `ddbe88c6201ad51c9b11393669f576a23e2ad6ed`: strategic head center snapped while forward/up guidance remains continuous and wrap-aware.
- RED main wiring `024d19217d31217b5fd1407351b99e8252fadf00`.
- GREEN `2e1f5e20f3a5f645908af039de816c9bc91d6fd4`: chase controller receives snapped target snapshot.

### Task 5 — exact food/head contact
- RED `3f4918731474974ff633945672cbade91ec12e1b`: missing pre-respawn pickup telemetry.
- GREEN `35343d1a1ef1d7cfb30b4bc194fb06170215ef0c`: consumed food and committed head centers captured from the same `cellToWorld` lattice without delaying respawn.
- `tests/unit/v22-lattice.test.ts` proves equal head/food cell → equal world center, cell-centered growth, equal voxel footprint, and grid-resolution registration.

### Task 6 — V2.2 ruleset/persistence
- RED `b78cce8ed956911106dab11f05acb868545b6e70`.
- GREEN active ruleset: `pixel-flight-grid-v2-2`.
- Active local-best key: `snek.localBest.pixelGridV2_2`.
- V1, V2, and V2.1 keys remain intact.
- Legacy HTTP gateway remains unsupported for V2.2.

### Task 7 — retire continuous body presentation authority
- RED `11e1a34b7aace7b3c8d7aa5a70b2e50db449b799`: architectural scanner failed only because `render/flight-trail.ts` still existed.
- GREEN: `src/render/flight-trail.ts` and its unit test removed after active consumers reached zero.
- Authority scanner now rejects FlightTrail/continuous snake placement sources in active V2.2 runtime.

### Task 8 — browser proof
- RED CI #704 / run `39092896786`: all non-E2E gates green; Playwright reported exactly one expected failure, `harness.setFoodCell is not a function`.
- GREEN `37e2adc99eccddc2910e4a8d9405474ba05d86f1`: deterministic food placement added only under `MODE === 'e2e-ranked'`, with bounds and occupied-cell validation.
- CI #705 / run `39093064393`: PASS, including Playwright.
- Browser coverage proves visible head stays on lattice centers between cell entries, continuous `FlightPose` still changes inside a cell, held desktop steering remains continuous, mobile same-pointer steering remains responsive, and pickup food/head world centers are identical.

## Closeout state

Implementation tasks 0–8: complete.
Task 9: documentation/audit/full exact-SHA verification/PR/human playtest in progress.
Human playtest: **PENDING**.
Merge to `main`: **NOT AUTHORIZED until human playtest acceptance**.
