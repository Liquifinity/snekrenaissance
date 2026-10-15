# SNEK RENAISSANCE — V1 Design

Status: DRAFT FOR USER REVIEW  
Date: 2026-10-15  
Repository: `Liquifinity/snekrenaissance`  
Target: public, browser-playable V1

## 1. Product intent

SNEK RENAISSANCE is a public browser game built around a flying snake moving continuously through a bounded 3D cube with toroidal wrap on all six faces. The V1 is intentionally small: single-player, immediate play, no account creation, public leaderboard, desktop and mobile support.

The project is a meme-first experience, but the game itself must be mechanically coherent. The opening joke is part of the product contract, not decorative copy.

Canonical opening message:

> just because ChatGPT  
> didn't complete my image.

The user clicks the message, chooses a username, then plays.

The project is independent and experimental. It must not present itself as an official OpenAI or ChatGPT product.

## 2. V1 scope

V1 includes:

- public website;
- single-player gameplay;
- continuous 3D movement inside a cube;
- no logical movement grid;
- toroidal wrap on X, Y and Z;
- snake growth by collecting one floating food item at a time;
- self-collision as the only game-over condition;
- username entry without signup, password or email;
- anonymous persistent player identifier in the browser;
- public leaderboard;
- ranking by greatest snake length achieved in a valid run;
- desktop keyboard controls;
- mobile touch controls;
- portrait and landscape support;
- server-side score validation at a basic anti-cheat level;
- automated build/test/deploy from the public GitHub repository.

Explicitly out of V1:

- multiplayer;
- enemies or bots;
- power-ups;
- boost;
- variable speed;
- authentication/accounts;
- social login;
- cosmetics;
- monetization;
- authoritative server simulation;
- manual camera control;
- user-generated rooms;
- audio as a required dependency for play.

## 3. Public development contract

`Liquifinity/snekrenaissance` is the source of truth.

Development rules:

- `main` represents the stable/publicly deployable line;
- changes are developed on branches and reviewed through pull requests;
- architecture, source, tests, migrations and deployment configuration live in the repository;
- production must not depend on undocumented manual edits;
- CI must run tests and build before merge/deploy;
- implementation should remain understandable from repository history.

## 4. Experience flow

Canonical V1 flow:

```text
OPEN SITE
   ↓
just because ChatGPT
didn't complete my image.
   ↓ click
USERNAME
[____________]
   ↓
PLAY
   ↓
GAME
   ↓
GAME OVER
   ↓
LENGTH / BEST / WORLD RANK
   ↓
PLAY AGAIN or RANK
```

### 4.1 Intro

The first screen contains the canonical meme message with no explanatory hero copy, feature list or tutorial.

The message is the interaction target that advances to username entry.

### 4.2 Username

V1 username contract:

- no account creation;
- no email/password;
- usernames do not need to be globally unique;
- browser receives or creates an anonymous persistent `player_id`;
- leaderboard displays the chosen username;
- two different players may display the same username;
- server stores `player_id` separately from username.

### 4.3 Game over

Game-over screen shows, at minimum:

```text
GAME OVER

LENGTH     <run length>
BEST       <personal best>
WORLD      #<rank>

PLAY AGAIN
RANK
```

If ranking service is temporarily unavailable, the user must still be able to replay immediately.

## 5. Visual direction

The game should visually echo the light, minimal interface context that originated the meme without cloning product chrome or implying official affiliation.

Visual principles:

- white or near-white primary background;
- restrained light-gray grid/structure;
- blue as the functional game accent for snake and food;
- minimal typography;
- generous empty space outside the game volume;
- no generic neon arcade aesthetic;
- no oversized mascot treatment;
- no giant cartoon head;
- snake head, body segments and food remain visually small and close in scale;
- the humor emerges from the snake eventually occupying absurd amounts of the cube.

The cube should be legible but visually light: edge lines and subtle spatial guides rather than opaque walls.

## 6. World model

The logical world is a cubic 3D torus.

For cube side length `L`, canonical wrapped coordinates are represented in:

```text
x ∈ [-L/2, L/2)
y ∈ [-L/2, L/2)
z ∈ [-L/2, L/2)
```

Crossing any face wraps to the opposite face while preserving direction and speed:

```text
+X → -X
-X → +X
+Y → -Y
-Y → +Y
+Z → -Z
-Z → +Z
```

Walls never kill the player.

The implementation should treat wrap as part of the world topology, not as a special death/teleport event bolted onto otherwise Euclidean collision logic.

Toroidal distance must be used where spatial proximity matters, including food pickup and self-collision near opposite cube faces.

## 7. Movement contract

The snake always moves forward at constant speed in V1.

The user controls orientation only.

Desktop:

```text
← / A = turn left
→ / D = turn right
↑ / W = pitch up
↓ / S = pitch down
```

Mobile:

- one virtual joystick;
- joystick X controls yaw;
- joystick Y controls pitch;
- snake continues moving forward automatically;
- no separate throttle in V1.

Movement is continuous, not cell-by-cell.

The orientation authority should use a quaternion or equivalent robust 3D orientation representation rather than relying on unrestricted Euler composition. V1 should avoid free roll as a player mechanic.

Canonical update shape:

```text
input
  ↓
steering rate
  ↓
orientation
  ↓
forward vector
  ↓
position += forward × speed × dt
```

Speed is constant to keep gameplay readable and leaderboard runs comparable.

## 8. Snake body model

The body must follow the actual path of the head rather than using naive segment-to-segment chasing as the authority.

The head records a continuous trajectory in an unwrapped logical space. Body segment `n` samples that path at a fixed distance behind the head.

This gives:

- stable spacing;
- smooth curves;
- deterministic growth behavior;
- reduced accumulated follower error;
- coherent wrap behavior.

Wrapping is applied for visible/world-relative placement and toroidal collision semantics. The path authority may remain unwrapped to avoid discontinuities when crossing cube faces.

## 9. Camera

V1 camera is chase-only.

Properties:

- positioned behind the head;
- slightly elevated relative to forward direction;
- damped/smoothed following;
- no manual orbit control;
- no required roll behavior;
- wrap must not cause the camera to interpolate through the entire cube.

On wrap, camera state should relocate coherently with the snake before smoothing resumes.

Mobile portrait is supported. Landscape is preferable visually but not mandatory.

## 10. Gameplay rules

Initial configuration:

- initial length: `12` body segments;
- food active at one time: `1`;
- growth per food: `+4` body segments;
- movement speed: fixed constant selected during implementation tuning;
- no acceleration or boost in V1.

Food rules:

- spawns at a valid random position inside the wrapped volume;
- must not spawn overlapping the snake body;
- must not spawn unreasonably close to the head;
- failed candidate positions are retried;
- food pickup uses toroidal proximity.

Game-over rule:

- self-collision only;
- wall crossing never kills;
- collision checks ignore an initial near-head exclusion zone because neighboring body segments are naturally close to the head;
- beyond that exclusion zone, head/body overlap under toroidal distance ends the run.

## 11. Ranking contract

Canonical ranking metric:

> greatest snake length achieved in a valid completed run.

Run values include at minimum:

- `player_id`;
- `username`;
- `game_session_id`;
- `max_length`;
- `food_eaten`;
- `duration_ms`;
- `finished_at`.

Leaderboard ordering:

1. greater `max_length` first;
2. if tied, lower `duration_ms` first;
3. if still tied, older accepted record first.

`food_eaten` may be displayed as secondary information but does not rank above `max_length`.

Personal best should be visible at game over.

## 12. Frontend architecture

Recommended frontend stack:

- TypeScript;
- Vite;
- Three.js;
- browser-native input/event APIs;
- minimal UI layer without requiring a large application framework for V1.

Recommended logical separation:

```text
src/
├─ game/
│  ├─ movement
│  ├─ snake
│  ├─ torus
│  ├─ collision
│  └─ scoring
├─ render/
│  ├─ scene
│  ├─ camera
│  └─ snake-renderer
├─ input/
│  ├─ keyboard
│  └─ joystick
└─ ui/
   ├─ intro
   ├─ username
   ├─ hud
   ├─ game-over
   └─ leaderboard
```

Simulation and rendering must be separated. Rendering may change without redefining movement/collision semantics.

## 13. Backend architecture

Recommended V1 deployment stack:

- Cloudflare Pages for frontend;
- Cloudflare Worker for API;
- Cloudflare D1 for persisted leaderboard data.

All deployment configuration belongs in the same repository.

Server responsibilities are intentionally narrow:

1. create a game session;
2. validate and record a completed result;
3. return leaderboard/player rank data.

Proposed API surface:

```text
POST /api/games
POST /api/games/:id/result
GET  /api/leaderboard
GET  /api/player/:id/rank
```

Exact route names may change during implementation only if semantics remain equivalent and the spec is updated before merge.

## 14. Basic anti-cheat

V1 does not attempt authoritative server simulation.

It must still reject trivially fabricated results.

At game start, server creates a session with a server-side start timestamp.

At game over, client submits at minimum:

- session identifier;
- food count;
- achieved length;
- duration;
- player identifier;
- username or corresponding player state.

Server validates at minimum:

- session exists;
- session is unused/not already finalized;
- duration is plausible relative to server timestamps;
- submitted length matches canonical growth arithmetic;
- food count and length are within sane numeric bounds;
- impossible/obviously malformed payloads are rejected;
- reasonable rate limiting is applied.

Canonical length arithmetic for V1:

```text
expected_length = initial_length + food_eaten × growth_per_food
```

with:

```text
initial_length = 12
growth_per_food = 4
```

This is basic integrity protection, not proof against a determined attacker.

## 15. Persistence model

A minimal relational model may use tables equivalent to:

```text
players
games
scores
```

Required semantics:

### players

Stores stable anonymous player identity and latest/selected display username as needed.

### games

Stores game session identity, server start time, finalization state and validation data.

### scores

Stores accepted leaderboard records including length, food count, duration and completion timestamp.

Schema details may be normalized differently if the same contracts remain testable.

## 16. Failure behavior

Gameplay must not depend on leaderboard availability after the game has loaded.

Required degradation:

- if session creation fails before play, show a concise retry state rather than silently pretending the run is rankable;
- if result submission fails after game over, preserve the local run result and allow retry when reasonable;
- leaderboard read failure must not block replay;
- rendering/input failures should surface a concise visible error rather than leaving an inert blank canvas;
- invalid usernames or malformed server responses must not crash gameplay.

## 17. Mobile requirements

V1 must be playable on current mobile browsers without installation.

Requirements:

- touch targets sized for fingers;
- virtual joystick works with pointer/touch input;
- portrait and landscape both usable;
- layout avoids browser-level horizontal overflow;
- controls do not cover the snake head by default;
- game remains playable after resize/orientation change;
- rendering quality may scale with device capability while preserving simulation rules.

## 18. Testing strategy

Core game mathematics should be testable without WebGL.

Unit-test targets:

- toroidal scalar/vector wrap;
- shortest toroidal distance;
- orientation/steering update invariants;
- fixed-distance path sampling;
- growth arithmetic;
- food spawn validity;
- self-collision exclusion zone;
- leaderboard ordering;
- score-validation arithmetic.

Integration-test targets:

- intro → username → session start → play flow;
- game-over result submission;
- invalid result rejection;
- accepted result appears in leaderboard;
- player rank lookup;
- replay after API failure;
- mobile input mapping.

Build verification:

- TypeScript compile/typecheck;
- automated tests;
- production frontend build;
- Worker build/deploy validation.

## 19. CI/CD

Target flow:

```text
feature branch
    ↓
pull request
    ↓
tests + typecheck + build
    ↓
review
    ↓
merge to main
    ↓
automated deploy
```

`main` should remain deployable.

Database migrations are version-controlled and applied through an explicit deployment step.

## 20. V1 acceptance criteria

V1 is acceptable when all of the following are true:

1. A public URL opens without installation.
2. First screen contains the exact canonical meme message.
3. Clicking it advances to username entry.
4. Username entry requires no account/signup.
5. Starting a game creates a rankable game session when backend is available.
6. Desktop keyboard controls work.
7. Mobile touch controls work.
8. Portrait and landscape remain usable.
9. Snake flies continuously through XYZ space.
10. Movement is not grid-based.
11. Wrap works correctly on all six cube faces.
12. Camera remains coherent during wrap.
13. Snake head/body/food remain visually small and close in scale.
14. Food pickup increases length by the canonical amount.
15. Walls never cause game over.
16. Self-collision outside the near-head exclusion zone causes game over.
17. Run result displays length and personal best.
18. Accepted result can be persisted and ranked.
19. Public leaderboard sorts by max length with defined tie-breakers.
20. Basic impossible-score submissions are rejected.
21. Leaderboard/API read failure does not prevent replay.
22. Automated tests and production build run in CI.

## 21. Non-goals and future evolution

Likely later directions, not V1 commitments:

- multiplayer;
- competitive volumetric territory/control;
- opponent collision rules;
- rooms/matchmaking;
- replay/spectator mode;
- additional camera modes;
- sound/music;
- cosmetics;
- stronger server-authoritative validation.

Future features must not silently redefine the V1 movement/topology contracts. Architectural changes should be explicit and reviewed.

## 22. Product identity summary

Name: `SNEK RENAISSANCE`

Canonical opening:

> just because ChatGPT  
> didn't complete my image.

Current tagline from repository:

> conquer the space

Core mechanical identity:

> a small snake flying continuously through a toroidal 3D cube, growing until its own body becomes the primary spatial constraint.
