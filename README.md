# SNEK RENAISSANCE

conquer the space

`just because ChatGPT`
`didn't complete my image.`

SNEK RENAISSANCE is an independent experimental browser game. It is not affiliated with, endorsed by, or presented as an official OpenAI or ChatGPT product.

## V1 scope

Single-player continuous 3D snake flight inside a cubic toroidal world. Crossing any face wraps to the opposite face; walls do not end the run. Food grows the body by exactly four segments. Self-collision is the gameplay game-over condition.

Desktop controls: `A/←`, `D/→`, `W/↑`, `S/↓`.

Mobile: one virtual joystick controls yaw and pitch. Portrait and landscape layouts are supported.

The current frontend stores an anonymous player ID, username, and local best in browser storage. World ranking remains `UNRANKED`; persistent leaderboard/backend integration is intentionally deferred.

## Local development

```bash
npm ci
npm run dev
```

Verification:

```bash
npm test
npm run typecheck
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

The canonical CI gate runs install, unit/integration tests, TypeScript validation, production build, and Playwright browser smoke tests.
