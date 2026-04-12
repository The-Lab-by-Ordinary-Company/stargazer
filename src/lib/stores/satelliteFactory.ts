import { writable, type Writable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import * as satellite from '$lib/satellite-shim';
import { EARTH_RADIUS_KM } from '$lib/scene-config';
import { getSunElevationAt } from '$utils/solar';

/** Canonical state shape for any tracked satellite. Source-agnostic. */
export interface SatelliteState {
  catalogId: number;
  name: string;
  latitude: number;
  longitude: number;
  altitudeKm: number;
  velocityKmh: number;
  visibility: 'daylight' | 'eclipsed' | 'unknown';
  /** Surface arc DIAMETER of the visibility circle, in km. Matches the
   *  wheretheiss.at convention so the drawing code is uniform. */
  footprintKm: number;
  timestamp: number;
}

export interface TleData {
  name: string;
  line1: string;
  line2: string;
  fetchedAt: number;
}

export interface SatelliteStore {
  data: Writable<SatelliteState | null>;
  status: Writable<'idle' | 'loading' | 'ready' | 'error'>;
  error: Writable<string | null>;
  start: () => void;
  stop: () => void;
}

const POLL_INTERVAL_MS = 1000;
const DEG = Math.PI / 180;

/** TLE store for a NORAD catalog id. Fetches once on mount, refreshes hourly. */
export function createTleStore(catalogId: number): Writable<TleData | null> {
  const store = writable<TleData | null>(null);
  if (!browser) return store;

  async function fetchTle() {
    try {
      const res = await fetch(`/api/satellite/${catalogId}/tle`);
      if (!res.ok) return;
      store.set((await res.json()) as TleData);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`[Stargazer] Failed to fetch TLE for catalog ${catalogId}:`, e);
    }
  }

  fetchTle();
  setInterval(fetchTle, 60 * 60 * 1000);
  return store;
}

/** Satellite tracking store backed by client-side SGP4 TLE propagation. */
export function createTleBackedStore(opts: {
  catalogId: number;
  name: string;
  tleStore: Readable<TleData | null>;
}): SatelliteStore {
  const { catalogId, name, tleStore } = opts;

  const data = writable<SatelliteState | null>(null);
  const status = writable<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const error = writable<string | null>(null);

  let pollHandle: ReturnType<typeof setInterval> | null = null;
  let satrec: satellite.SatRec | null = null;
  let lastTleRef: TleData | null = null;

  // Re-parse satrec whenever the TLE refreshes
  tleStore.subscribe((tle) => {
    if (tle && tle !== lastTleRef) {
      try {
        satrec = satellite.twoline2satrec(tle.line1, tle.line2);
        lastTleRef = tle;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`[Stargazer] Failed to parse TLE for ${name}:`, e);
        satrec = null;
        status.set('error');
        error.set('TLE parse failed');
      }
    }
  });

  function tick() {
    if (!browser) return;
    if (!satrec) {
      status.set('loading');
      return;
    }
    try {
      const date = new Date();
      const result = satellite.propagate(satrec, date);
      if (!result.position || typeof result.position === 'boolean') {
        status.set('error');
        error.set('SGP4 propagation returned no position');
        return;
      }

      const gmst = satellite.gstime(date);
      const geo = satellite.eciToGeodetic(
        result.position as satellite.EciVec3<satellite.Kilometer>,
        gmst
      );
      const lat = satellite.degreesLat(geo.latitude);
      const lon = satellite.degreesLong(geo.longitude);
      const altKm = geo.height;

      // Velocity magnitude in km/s → km/h
      const v = result.velocity as { x: number; y: number; z: number } | undefined;
      const speedKmS = v ? Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) : 0;
      const velocityKmh = speedKmS * 3600;

      // Geometric horizon at this altitude (radians and degrees)
      const horizonRad = Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + altKm));
      const horizonDepressionDeg = horizonRad / DEG;

      // Visibility: the satellite still sees the sun until the sun is below
      // the local horizon at the sub-point by the horizon-depression angle.
      const sunEl = getSunElevationAt(lat, lon, date);
      const visibility: SatelliteState['visibility'] =
        sunEl > -horizonDepressionDeg ? 'daylight' : 'eclipsed';

      // Footprint surface arc DIAMETER (matches wheretheiss convention)
      const footprintKm = 2 * EARTH_RADIUS_KM * horizonRad;

      data.set({
        catalogId,
        name,
        latitude: lat,
        longitude: lon,
        altitudeKm: altKm,
        velocityKmh,
        visibility,
        footprintKm,
        timestamp: Math.floor(date.getTime() / 1000)
      });
      status.set('ready');
      error.set(null);
    } catch (err) {
      status.set('error');
      error.set((err as Error).message);
    }
  }

  function start() {
    if (!browser || pollHandle) return;
    status.set('loading');
    tick();
    pollHandle = setInterval(tick, POLL_INTERVAL_MS);
  }

  function stop() {
    if (pollHandle) {
      clearInterval(pollHandle);
      pollHandle = null;
    }
  }

  return { data, status, error, start, stop };
}
