import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const ASTROS_URL = 'http://api.open-notify.org/astros.json';

interface Person {
  name: string;
  craft: string;
}

interface AstrosResponse {
  message: string;
  number: number;
  people: Person[];
}

/**
 * Returns *every* human currently in space, grouped by craft. Consumers
 * filter to whichever vehicle they care about (ISS, Tiangong, etc.).
 *
 * Sourced from open-notify.org and cached for an hour because crew
 * rotations are infrequent.
 */
export const GET: RequestHandler = async ({ fetch, setHeaders }) => {
  try {
    const res = await fetch(ASTROS_URL);
    if (!res.ok) throw error(502, `open-notify returned ${res.status}`);
    const data = (await res.json()) as AstrosResponse;

    // Group by craft for easy per-vehicle filtering on the client
    const byCraft: Record<string, string[]> = {};
    for (const person of data.people) {
      if (!byCraft[person.craft]) byCraft[person.craft] = [];
      byCraft[person.craft].push(person.name);
    }

    setHeaders({
      // Short max-age + revalidation so a schema change can't be cached
      // for long. Crew rotates rarely, so we still don't hammer upstream.
      'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=900'
    });

    return json({
      byCraft,
      total: data.number,
      fetchedAt: Date.now()
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    throw error(500, (err as Error).message);
  }
};
