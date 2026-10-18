import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function readPngDimensions(path: string): { width: number; height: number } {
  const bytes = readFileSync(resolve(path));
  expect(bytes.subarray(0, 8)).toEqual(PNG_SIGNATURE);
  expect(bytes.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20)
  };
}

describe('PWA install assets', () => {
  it.each([
    ['public/icons/snek-192.png', 192, 192],
    ['public/icons/snek-512.png', 512, 512],
    ['public/icons/snek-maskable-512.png', 512, 512]
  ])('%s is a valid PNG with the required dimensions', (path, width, height) => {
    expect(readPngDimensions(path)).toEqual({ width, height });
  });
});
