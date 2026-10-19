import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = [
  'src/app/app-controller.ts',
  'src/app/app-state.ts',
  'src/main.ts'
].map((path) => readFileSync(path, 'utf8')).join('\n');

describe('local-only application architecture', () => {
  it('canonical runtime has no remote ranking/session boundary', () => {
    for (const retiredConcept of [
      'SessionGateway',
      'HttpSessionGateway',
      'LocalSessionGateway',
      'createSessionGateway',
      'worldRank',
      'activeSessionId',
      'submissionStatus',
      'VITE_RANKING_API_BASE',
      'e2e-ranked'
    ]) {
      expect(source).not.toContain(retiredConcept);
    }
  });
});
