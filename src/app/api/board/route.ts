import { readBoard } from '../../../server/readings';
import { refreshWeather } from '../../../server/weather';
import { ConfigurationError } from '../../../server/database';

const headers = { 'Cache-Control': 'no-store' };

function failure(error: unknown) {
  return Response.json({ issue: error instanceof ConfigurationError ? 'configuration' : 'storage' }, { status: 503, headers });
}

export async function GET() {
  try { return Response.json({ state: await readBoard() }, { headers }); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  const host = request.headers.get('host') ?? url.host;
  let allowedOrigin = !origin;
  if (origin) {
    try {
      const parsed = new URL(origin);
      allowedOrigin = parsed.host === host && parsed.protocol === url.protocol;
    } catch { allowedOrigin = false; }
  }
  if (!allowedOrigin || request.headers.get('sec-fetch-site') === 'cross-site') {
    return Response.json({ issue: 'request' }, { status: 403, headers });
  }
  if (url.search || (await request.text()) !== '') {
    return Response.json({ issue: 'request' }, { status: 400, headers });
  }
  try {
    const result = await refreshWeather();
    return Response.json(result, { status: result.throttled ? 429 : 200, headers });
  } catch (error) { return failure(error); }
}
