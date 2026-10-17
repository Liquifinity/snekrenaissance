import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../../src/main.ts', import.meta.url), 'utf8');

describe('browser main loop V2.1 authority boundary', () => {
  it('uses one continuous steering path at the fixed simulation cadence', () => {
    expect(source).toContain('keyboard.state');
    expect(source).toContain('joystick.state');
    expect(source).toContain('stepRun(run, input, dt');
    expect(source).not.toContain('keyboard.takeIntent()');
    expect(source).not.toContain('joystick.takeIntent()');
    expect(source).not.toContain('queueTurnIntent(');
    expect(source).not.toContain('GridMovementClock');
  });

  it('renders from continuous fixed-state presentation and a render-only trail', () => {
    expect(source).toContain('fixedClock.alpha');
    expect(source).toContain('interpolateFlightPresentation(');
    expect(source).toContain('FlightTrail');
    expect(source).toContain('flightTrail.sampleBehind(');
    expect(source).not.toContain('buildStationaryRenderTransition(');
    expect(source).not.toContain('buildRenderTransition(');
    expect(source).not.toContain('interpolateTransition(');
  });

  it('exposes read-only V2.1 steering telemetry without reading it back into gameplay', () => {
    expect(source).toContain('data-head-yaw');
    expect(source).toContain('data-head-pitch');
    expect(source).toContain('data-head-point');
    expect(source).toContain('data-head-cell');
    expect(source).not.toMatch(/dataset\.headYaw[^\n]*stepRun/);
  });
});
