import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const ISS_URL = 'https://api.wheretheiss.at/v1/satellites/25544';

interface WheretheissResponse {
  name: string;
  id: number;
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  visibility: string;
  footprint: number;
  timestamp: number;
  daynum: number;
  solar_lat: number;
  solar_lon: number;
  units: string;
}

export const GET: RequestHandler = async ({ fetch, setHeaders }) => {
  try {
    const res = await fetch(ISS_URL);
    if (!res.ok) {
      throw error(502, `Upstream ISS API returned ${res.status}`);
    }
    const data = (await res.json()) as WheretheissResponse;

    setHeaders({
      // Match the 1 Hz client polling — anything longer would deliver
      // stale positions to the marker.
      'cache-control': 'public, max-age=1, s-maxage=1'
    });

    return json({
      catalogId: 25544,
      name: 'ISS',
      latitude: data.latitude,
      longitude: data.longitude,
      altitudeKm: data.altitude,
      velocityKmh: data.velocity,
      visibility: data.visibility,
      // wheretheiss returns the surface arc DIAMETER, which we keep as-is
      // because it matches the canonical SatelliteState convention
      footprintKm: data.footprint,
      timestamp: data.timestamp
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    throw error(500, (err as Error).message);
  }
};
