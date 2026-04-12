import { env } from '$env/dynamic/private';

const NASA_BASE = 'https://api.nasa.gov';

/**
 * Server-side helper that proxies requests to api.nasa.gov, injecting
 * the API key from the server environment so it never reaches the client.
 *
 * The `path` argument is the path *after* the api.nasa.gov host, e.g.
 * "planetary/apod" or "neo/rest/v1/feed".
 */
export async function fetchNasa(path: string, search: URLSearchParams): Promise<Response> {
  const apiKey = env.NASA_API_KEY ?? 'DEMO_KEY';

  // Strip any caller-provided api_key and replace with ours
  search.delete('api_key');
  search.set('api_key', apiKey);

  const cleanPath = path.replace(/^\/+/, '');
  const url = `${NASA_BASE}/${cleanPath}?${search.toString()}`;

  return fetch(url, {
    headers: { Accept: 'application/json' }
  });
}
