import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createRun, queueTurn, startRun, stepRun } from '../../src/game/run-state';
import { snakeHead } from '../../src/game/snake';

const source = readFileSync(new URL('../../src/main.ts', import.meta.url), 'utf8');
const stableRng = () => 0.75;

describe('browser main loop V3 keyboard authority', () => {
  it('wires keyboard turn events directly into the active run pendingTurn', () => {
    expect(source).toContain('queueTurn');
    expect(source).toContain('onTurnIntent:');
    expect(source).toMatch(/run\.phase === ['"]playing['"]/);
    expect(source).toMatch(/queueTurn\(run, intent\)/);
    expect(source).not.toContain('keyboard.state');
  });

  it('keeps camera toggle separate from strategic turn events', () => {
    expect(source).toContain('onCameraToggle: toggleCamera');
  });

  it('applies only the latest keyboard-equivalent intent before a step', () => {
    const run = startRun(createRun(stableRng));
    run.food = { x: 0, y: 0, z: 0 };
    queueTurn(run, 'right');
    queueTurn(run, 'up');
    stepRun(run, stableRng);

    expect(run.frame.forward).toBe('+Y');
    expect(snakeHead(run.snake).cell).toEqual({ x: 4, y: 5, z: 4 });
    expect(run.pendingTurn).toBe('none');
  });
});
