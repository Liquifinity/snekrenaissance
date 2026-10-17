import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../../src/main.ts', import.meta.url), 'utf8');

describe('browser main loop V2.1 authority boundary', () => {
  it('samples continuous steering and advances RunState directly at fixed-step cadence', () => {
    expect(source).toContain('readSteeringInput()');
    expect(source).toContain('stepRun(run, steering, dt)');
    expect(source).toContain('fixedClock.alpha');
    expect(source).not.toContain('keyboard.takeIntent()');
    expect(source).not.toContain('joystick.takeIntent()');
    expect(source).not.toContain('queueTurnIntent(');
  });

  it('renders from continuous FlightPresentation and render-only FlightTrail', () => {
    expect(source).toContain('interpolateFlightPresentation(');
    expect(source).toContain('new FlightTrail()');
    expect(source).toContain('flightTrail.sampleBehind(');
    expect(source).toContain('displayWorldForGridPoint(');
    expect(source).not.toContain('buildStationaryRenderTransition(');
    expect(source).not.toContain('buildRenderTransition(');
    expect(source).not.toContain('interpolateTransition(');
  });

  it('exposes continuous yaw/pitch telemetry instead of cardinal head-forward state', () => {
    expect(source).toContain('app.dataset.headYaw');
    expect(source).toContain('app.dataset.headPitch');
    expect(source).not.toContain('app.dataset.headForward');
  });
});
