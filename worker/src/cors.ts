const PUBLIC_CORS_HEADERS: Readonly<Record<string, string>> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export function corsHeaders(): HeadersInit {
  return { ...PUBLIC_CORS_HEADERS };
}

export function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(PUBLIC_CORS_HEADERS)) {
    headers.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function preflightResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}
