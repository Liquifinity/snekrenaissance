# Dependency Audit — 2026-10-15

Scope: SNEK RENAISSANCE leaderboard/backend implementation branch.

## Evidence

A full `npm audit --json` was executed in GitHub Actions run `38833250805` after `npm ci`.

Result: 3 advisories, all in the Vitest development/test dependency tree. The audit metadata reported 2 production dependencies and no advisory attached to the production dependency graph.

### GHSA-82fw-gwwq-j7x9 — `@vitest/mocker`

- Severity: moderate.
- Title: Vitest path traversal / arbitrary file read via redirect mock.
- Affected range reported by npm: `>=2.1.0 <4.1.11`.
- Dependency role: indirect development/test dependency through `vitest`.
- Production exposure: none; `@vitest/mocker` is not shipped in the browser bundle or Worker runtime.
- Available npm remediation: upgrade `vitest` to `5.0.5`, a semver-major change from the current test stack.

### GHSA-5gmw-xhrv-c9v3 — `tinypool`

- Severity: critical.
- Title: prototype-pollution gadget in worker options leading to remote code execution.
- Affected range reported by npm: `<=2.1.0`.
- Dependency role: indirect development/test dependency through `vitest`.
- Production exposure: none; `tinypool` is test-runner infrastructure and is not included in either deployable runtime.
- Available npm remediation: upgrade `vitest` to `5.0.5`, a semver-major change.

### GHSA-85c8-ppgw-ccpr — `tinypool`

- Severity: critical.
- Title: prototype-pollution gadget to RCE in `run()` options.
- Affected range reported by npm: `<2.1.2`.
- Dependency role: indirect development/test dependency through `vitest`.
- Production exposure: none; same development-only path as above.
- Available npm remediation: upgrade `vitest` to `5.0.5`, a semver-major change.

## Decision

These advisories do not block the V1 runtime/backend integration because they are confined to development/test tooling and are absent from the production dependency graph. A Vitest 5 migration is intentionally not mixed into this backend feature because it is a major test-infrastructure change with no runtime remediation benefit.

The canonical CI security gate therefore enforces:

```bash
npm audit --omit=dev --audit-level=moderate
```

This fails the build for any moderate-or-higher advisory in deployable production dependencies. The full audit findings above remain recorded rather than hidden.

The Vitest 5 upgrade should be handled as a separate tooling-hardening change before exposing any persistent/shared test runner to untrusted external inputs. Current GitHub Actions jobs execute in ephemeral hosted runners; the public application and Cloudflare Worker do not execute Vitest or `tinypool`.

## Release implication

Before production release, rerun both the production audit gate and a full audit. Any newly introduced production advisory at moderate severity or above is release-blocking unless separately reviewed and documented.
