import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../../src/main.ts', import.meta.url), 'utf8');

describe('browser main loop V2 authority boundary', () => {
  it('drains discrete intents and renders from interpolated logical transitions', () => {
    expect(source).toContain('keyboard.takeIntent()');
    expect(source).toContain('joystick.takeIntent()');
    expect(source).toContain('queueTurnIntent(');
    expect(source).toContain('buildStationaryRenderTransition(');
    expect(source).toContain('buildRenderTransition(');
    expect(source).toContain('interpolateTransition(');
  });

  it('does not feed continuous V1 presentation state back into gameplay/rendering', () => {
    expect(source).not.toContain('stepRun(run, input, dt)');
    expect(source).not.toContain('headWrapped: run.headWrapped');
    expect(source).not.toContain('bodyPositions: run.bodyPositions');
    expect(source).not.toContain('forward: run.forward');
  });
});
