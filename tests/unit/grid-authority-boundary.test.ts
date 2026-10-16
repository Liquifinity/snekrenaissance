import { describe, expect, it } from 'vitest';

describe('grid authority boundary', () => {
  it('keeps worldToCell out of active production gameplay modules', () => {
    const modules = import.meta.glob('../../src/game/**/*.ts', {
      eager: true,
      query: '?raw',
      import: 'default'
    }) as Record<string, string>;

    const offenders = Object.entries(modules)
      .filter(([path]) => !path.endsWith('/grid-topology.ts'))
      .filter(([, source]) => /\bworldToCell\b/.test(source))
      .map(([path]) => path)
      .sort();

    expect(offenders).toEqual([]);
  });
});
