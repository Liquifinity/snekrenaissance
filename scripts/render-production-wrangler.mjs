import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const PLACEHOLDER = '00000000-0000-0000-0000-000000000000';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function renderProductionWrangler({
  databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID,
  inputPath = resolve('wrangler.jsonc'),
  outputPath = resolve('.wrangler.production.jsonc')
} = {}) {
  if (!databaseId || databaseId === PLACEHOLDER || !UUID.test(databaseId)) {
    throw new Error('CLOUDFLARE_D1_DATABASE_ID must be a non-placeholder UUID.');
  }

  const source = await readFile(inputPath, 'utf8');
  const marker = `"database_id": "${PLACEHOLDER}"`;
  const occurrences = source.split(marker).length - 1;
  if (occurrences !== 1) {
    throw new Error(`Expected exactly one production D1 placeholder, found ${occurrences}.`);
  }

  const rendered = source.replace(marker, `"database_id": "${databaseId}"`);
  await writeFile(outputPath, rendered, 'utf8');
  return outputPath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  renderProductionWrangler()
    .then((outputPath) => {
      console.log(`Rendered ${outputPath}`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
