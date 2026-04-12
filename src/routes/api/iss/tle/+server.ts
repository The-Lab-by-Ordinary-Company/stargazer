import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const CELESTRAK_URL =
  'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE';

/**
 * Fetch the latest ISS Two-Line Element set from Celestrak. TLEs are
 * updated several times per day, so we cache for an hour at the edge.
 *
 * The client uses these two lines as input to satellite.js's SGP4
 * propagator, which is the same algorithm NORAD itself uses.
 */
export const GET: RequestHandler = async ({ fetch, setHeaders }) => {
  try {
    const res = await fetch(CELESTRAK_URL);
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
