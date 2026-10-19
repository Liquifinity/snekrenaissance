import { existsSync, readFileSync } from 'node:fs';
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

  it('publishes the approved brand story without retired platform language', () => {
    expect(readme).toContain('A NEW EXPERIMENT WITH AN ANCIENT SPIRIT');
    expect(readme).not.toMatch(/Cloudflare|Wrangler|D1|leaderboard|ranked/i);
  });

  it('publishes MIT and keeps internal process documentation out of the public tree', () => {
    expect(existsSync('LICENSE')).toBe(true);
    const license = readFileSync('LICENSE', 'utf8');
    expect(license).toContain('MIT License');
    expect(license).toContain('Copyright (c) 2026 SNEK RENAISSANCE contributors');
    expect(readme).toMatch(/## License/i);
    expect(readme).toMatch(/MIT/i);
    expect(existsSync('.superpowers')).toBe(false);
    expect(existsSync('docs/superpowers')).toBe(false);
    expect(existsSync('docs/security/2026-10-15-dependency-audit.md')).toBe(false);
  });
});
