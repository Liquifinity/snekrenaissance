import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readme = readFileSync('README.md', 'utf8');
const indexHtml = readFileSync('index.html', 'utf8');

function readIfPresent(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

describe('public repository surface contract', () => {
  it('uses the canonical One last tweak artwork and removes the retired hero', () => {
    const artworkPath = 'docs/readme/one-last-tweak.webp';

    expect(existsSync(artworkPath)).toBe(true);
    if (existsSync(artworkPath)) {
      expect(statSync(artworkPath).size).toBeGreaterThan(10_000);
    }

    expect(readme).toContain('<img src="docs/readme/one-last-tweak.webp"');
    expect(readme).not.toContain('docs/readme/snek-renaissance-hero.jpg');
    expect(readme).not.toContain('Hey, CHAT — where is my image?');
    expect(readme).not.toContain('I guess you can load your image there.');
    expect(existsSync('docs/readme/snek-renaissance-hero.jpg')).toBe(false);
  });

  it('exposes only functional PLAY, INSTALL and FORK actions', () => {
    expect(readme).not.toContain('<strong>PLAY · INSTALL · FORK</strong>');
    expect(readme).toContain('<a href="https://liquifinity.github.io/snekrenaissance/"><strong>PLAY</strong></a>');
    expect(readme).toContain('<a href="https://liquifinity.github.io/snekrenaissance/?install=1"><strong>INSTALL</strong></a>');
    expect(readme).toContain('<a href="https://github.com/Liquifinity/snekrenaissance/fork"><strong>FORK</strong></a>');
    expect(readme).not.toContain('href="#"');
  });

  it('ships an install lifecycle instead of a decorative INSTALL label', () => {
    const installSourcePath = 'src/pwa/install-experience.ts';
    const bootstrapPath = 'src/pwa/install-bootstrap.ts';
    expect(existsSync(installSourcePath)).toBe(true);
    expect(existsSync(bootstrapPath)).toBe(true);

    const source = readIfPresent(installSourcePath);
    expect(source).toContain('beforeinstallprompt');
    expect(source).toContain('appinstalled');
    expect(source).toContain('display-mode: standalone');
    expect(source).toContain('userChoice');
    expect(indexHtml).toContain('/src/pwa/install-bootstrap.ts');
  });
});
