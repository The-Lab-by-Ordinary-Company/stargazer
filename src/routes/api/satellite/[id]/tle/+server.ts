import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Generic NORAD TLE proxy. Fetches a Two-Line Element set from Celestrak
 * for any satellite catalog id. Cached at the edge for an hour because
 * TLEs are reissued only a few times per day.
 *
 * Used by `createTleStore(catalogId)` from satelliteFactory.ts to power
 * SGP4 propagation client-side for any tracked satellite.
 */
export const GET: RequestHandler = async ({ fetch, params, setHeaders }) => {
  const id = params.id;
  if (!id || !/^\d+$/.test(id)) throw error(400, 'Invalid catalog id');

  const upstream = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${id}&FORMAT=TLE`;

  try {
    const res = await fetch(upstream);
    if (!res.ok) throw error(502, `Celestrak returned ${res.status}`);

    const text = await res.text();
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 3) throw error(502, 'Unexpected TLE format from Celestrak');

    setHeaders({
      'cache-control': 'public, max-age=3600, s-maxage=3600'
    });

    return json({
      name: lines[0].trim(),
      line1: lines[1],
      line2: lines[2],
      fetchedAt: Date.now()
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    throw error(500, (err as Error).message);
  }
};
