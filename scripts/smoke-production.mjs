import { pathToFileURL } from 'node:url';

const CANONICAL_COPY = [
  'just because ChatGPT',
  'didnt complete my image.'
];

function normalizeOrigin(value, label) {
  if (!value) throw new Error(`${label} is required.`);
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error(`${label} must use HTTPS.`);
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`${label} must be an origin without path, query, or hash.`);
  }
  return url.origin;
}

function requireStatus(response, expected, label) {
  if (response.status !== expected) {
    throw new Error(`${label} returned HTTP ${response.status}; expected ${expected}.`);
  }
}

function requireCors(response, label) {
  if (response.headers.get('access-control-allow-origin') !== '*') {
    throw new Error(`${label} failed the public CORS contract.`);
  }
}

async function readJson(response, label) {
  try {
    return await response.json();
  } catch {
    throw new Error(`${label} did not return valid JSON.`);
  }
}

function extractModuleScripts(html, pagesUrl) {
  const sources = [];
  const scriptPattern = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(scriptPattern)) {
    sources.push(new URL(match[1], `${pagesUrl}/`).href);
  }
  if (sources.length === 0) throw new Error('Pages HTML did not expose a JavaScript application bundle.');
  return [...new Set(sources)];
}

export async function smokeProduction({
  workerUrl = process.env.WORKER_URL,
  pagesUrl = process.env.PAGES_URL,
  fetchImpl = fetch
} = {}) {
  const workerOrigin = normalizeOrigin(workerUrl, 'WORKER_URL');
  const pagesOrigin = normalizeOrigin(pagesUrl, 'PAGES_URL');

  const healthResponse = await fetchImpl(`${workerOrigin}/api/health`);
  requireStatus(healthResponse, 200, 'Worker health');
  requireCors(healthResponse, 'Worker health');
  const health = await readJson(healthResponse, 'Worker health');
  if (health?.ok !== true) throw new Error('Worker health response was not ok=true.');

  const leaderboardResponse = await fetchImpl(`${workerOrigin}/api/leaderboard`);
  requireStatus(leaderboardResponse, 200, 'Leaderboard');
  requireCors(leaderboardResponse, 'Leaderboard');
  const leaderboard = await readJson(leaderboardResponse, 'Leaderboard');
  if (!Array.isArray(leaderboard?.entries)) {
    throw new Error('Leaderboard response did not contain an entries array.');
  }

  const preflightResponse = await fetchImpl(`${workerOrigin}/api/games`, {
    method: 'OPTIONS',
    headers: {
      Origin: pagesOrigin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type'
    }
  });
  requireStatus(preflightResponse, 204, 'Ranking preflight');
  requireCors(preflightResponse, 'Ranking preflight');
  const allowedMethods = preflightResponse.headers.get('access-control-allow-methods') ?? '';
  const allowedHeaders = preflightResponse.headers.get('access-control-allow-headers') ?? '';
  if (!allowedMethods.split(',').map((value) => value.trim().toUpperCase()).includes('POST')) {
    throw new Error('Ranking preflight does not allow POST.');
  }
  if (!allowedHeaders.split(',').map((value) => value.trim().toLowerCase()).includes('content-type')) {
    throw new Error('Ranking preflight does not allow Content-Type.');
  }

  const pagesResponse = await fetchImpl(`${pagesOrigin}/`);
  requireStatus(pagesResponse, 200, 'Pages root');
  const html = await pagesResponse.text();
  if (!/<(?:main|div)\b[^>]*\bid=["']app["']/i.test(html)) {
    throw new Error('Pages HTML is missing the application shell.');
  }

  const scripts = extractModuleScripts(html, pagesOrigin);
  const bundleParts = [];
  for (const scriptUrl of scripts) {
    const scriptResponse = await fetchImpl(scriptUrl);
    requireStatus(scriptResponse, 200, `Frontend bundle ${scriptUrl}`);
    bundleParts.push(await scriptResponse.text());
  }
  const bundle = bundleParts.join('\n');

  if (!CANONICAL_COPY.every((line) => bundle.includes(line))) {
    throw new Error('Frontend bundle is missing the canonical meme copy.');
  }
  if (!bundle.includes(workerOrigin)) {
    throw new Error('Frontend bundle is missing the ranked Worker origin.');
  }

  return { workerUrl: workerOrigin, pagesUrl: pagesOrigin, ranked: true };
}

async function main() {
  const result = await smokeProduction();
  console.log(`Production smoke passed: ${result.pagesUrl} -> ${result.workerUrl} (RANKED)`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
