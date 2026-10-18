import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../../src/main.ts', import.meta.url), 'utf8');

describe('browser main loop V2.2 authority boundary', () => {
  it('samples continuous steering and advances RunState directly at fixed-step cadence', () => {
    expect(source).toContain('readSteeringInput()');
    expect(source).toContain('stepRun(run, steering, dt)');
    expect(source).toContain('fixedClock.alpha');
    expect(source).not.toContain('keyboard.takeIntent()');
    expect(source).not.toContain('joystick.takeIntent()');
    expect(source).not.toContain('queueTurnIntent(');
  });

  it('renders snake from exact strategic cells while keeping continuous presentation camera-only', () => {
    expect(source).toContain('interpolateFlightPresentation(');
    expect(source).toContain('buildPixelSnakeRenderSnapshot(run)');
    expect(source).toContain('snakeRenderer.render(buildPixelSnakeRenderSnapshot(run))');
    expect(source).not.toContain('new FlightTrail()');
    expect(source).not.toContain('flightTrail.sampleBehind(');
    expect(source).not.toContain('initialTrailPoints(');
    expect(source).not.toContain('retainedTrailDistance(');
    expect(source).not.toContain('buildBodySamples(');
    expect(source).not.toContain('headPosition: presentation.displayedHeadWorld');
    expect(source).not.toContain('buildStationaryRenderTransition(');
    expect(source).not.toContain('buildRenderTransition(');
    expect(source).not.toContain('interpolateTransition(');
  });

  it('exposes continuous navigation plus discrete visible-direction/world telemetry', () => {
    expect(source).toContain('app.dataset.headYaw');
    expect(source).toContain('app.dataset.headPitch');
    expect(source).toContain('app.dataset.headPoint');
    expect(source).toContain('app.dataset.headDirection');
    expect(source).toContain('app.dataset.headRenderWorld');
  });
});
