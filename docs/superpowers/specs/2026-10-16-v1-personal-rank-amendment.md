# SNEK RENAISSANCE — V1 Personal Rank Amendment

Status: APPROVED / CANONICAL  
Date: 2026-10-16  
Repository: `Liquifinity/snekrenaissance`

This amendment supersedes the online-ranking requirements of `2026-10-15-snek-renaissance-v1-design.md` for the active V1 product. Gameplay, 3D world, toroidal wrap, controls, rendering, collision, and future online-ranking seams remain unchanged unless explicitly stated below.

## Active V1 product contract

The active V1 is single-player and local-first. It does not require a backend, database, Cloudflare account, network ranking service, or communication with other players.

Canonical flow:

```text
OPEN SITE
   ↓
just because ChatGPT
didnt complete my image.
   ↓ click
USERNAME
   ↓
GAME
   ↓
GAME OVER
   ↓
SCORE / PERSONAL BEST
   ↓
PLAY AGAIN or RANK
```

The canonical meme copy uses `didnt` exactly, without an apostrophe.

## Local identity and persistence

The player chooses a username before play. The browser stores the username locally so it is restored on later visits in the same browser profile.

The browser also stores the player's personal best locally. A completed run replaces the stored personal best only when its score is greater than the existing record.

Active storage keys remain implementation details already established in the codebase:

- `snek.username`;
- `snek.localBest`;
- `snek.playerId` may remain reserved for future connected ranking.

Clearing browser/site storage may remove this local identity and record. V1 does not synchronize the record between browsers or devices.

## Rank semantics

For active V1, `RANK` means the player's own local record. The local experience must not show:

- `WORLD`;
- `UNRANKED`;
- public-leaderboard status;
- server/network ranking errors.

Game over shows the current run score and the persisted `PERSONAL BEST`.

## Future online ranking

The existing `SessionGateway`, HTTP gateway, Worker, D1 schema, leaderboard UI, tests, migrations, and release tooling are retained as a future extension path. They are not deleted and may continue to be tested so that online ranking can be re-enabled deliberately later.

Online ranking is not part of the active V1 acceptance gate and must not be required for the default frontend build to start or complete a game.

A future global leaderboard is an explicit product change. It may reuse the preserved backend seam, but activation must be intentional and reviewed rather than silently changing the local V1 contract.

## Active V1 acceptance criteria amendment

The ranking-related acceptance criteria are replaced by the following:

1. The first screen shows the exact canonical meme copy with `didnt`.
2. Clicking it advances to username entry.
3. Username requires no account, email, password, or server request.
4. Username persists in local browser storage and is restored after reload/revisit.
5. Gameplay starts without a ranking API or internet-backed session.
6. Game over shows current `SCORE` and `PERSONAL BEST`.
7. A higher score replaces the personal best.
8. A lower later score does not replace the personal best.
9. Personal best persists across reloads in the same browser storage.
10. `RANK` in local mode displays the personal best only, without global-ranking language.
11. Replay is immediate and reuses the saved username.
12. Future online-ranking code remains isolated from the default local experience.

All non-ranking acceptance criteria from the 2026-10-15 V1 design remain in force.
