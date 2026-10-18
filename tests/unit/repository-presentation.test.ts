import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readme = readFileSync('README.md', 'utf8');

describe('repository presentation', () => {
  it('presents the current SNEK as play, install and fork first', () => {
    expect(readme).toContain('# SNEK RENAISSANCE');
    expect(readme).toContain('conquer the space');
    expect(readme).toMatch(/PLAY\s*[·|/]\s*INSTALL\s*[·|/]\s*FORK/i);
    expect(readme).toContain('https://liquifinity.github.io/snekrenaissance/');
    expect(readme).toMatch(/PWA|Progressive Web App/i);
    expect(readme).toMatch(/install/i);
    expect(readme).toMatch(/fork/i);
  });

  it('keeps the fork development path minimal and explicit', () => {
    for (const command of ['npm install', 'npm run dev', 'npm run build', 'npm test']) {
      expect(readme).toContain(command);
    }
    expect(readme).toMatch(/GitHub Pages/i);
    expect(readme).toMatch(/repository name|repository-name|automatically/i);
  });

  it('does not present obsolete game generations as the current product', () => {
    expect(readme).not.toContain('SNEK CORE V3 candidate');
    expect(readme).not.toContain('300 foods = 100%');
    expect(readme).not.toMatch(/Historical V2\.1\/V2\.2 flight\/DDA modules/);
    expect(readme).not.toMatch(/Earlier V1\/V2\/V2\.1\/V2\.2 specifications/);
  });

  it('states platform-dependent installation and an accurate license status', () => {
    expect(readme).toMatch(/browser|platform/i);
    expect(readme).toMatch(/## License/i);
    expect(readme).toMatch(/asset provenance|asset rights|license review|pending/i);
  });
});
