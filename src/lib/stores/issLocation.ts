import { writable, type Readable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import { iss } from './iss';
import { tiangong } from './tiangong';
import type { SatelliteState } from './satelliteFactory';

export interface LocationState {
  description: string;
  countryName: string;
  fetchedAt: number;
}

const MIN_INTERVAL_MS = 30_000; // never reverse-geocode more than every 30s per satellite

/**
 * Factory for a reverse-geocoding store keyed off any satellite store.
 * Subscribes to the satellite's data and asks BigDataCloud (via our
 * server proxy) "what is the human-readable place at this lat/lon"
 * whenever the position changes, throttled to once every 30 seconds.
 */
function createLocationStore(satStore: { data: Readable<SatelliteState | null> }): Writable<LocationState | null> {
  const store = writable<LocationState | null>(null);
  let lastFetched = 0;
  let inFlight = false;

  async function fetchLocation(lat: number, lon: number) {
    if (inFlight) return;
    if (Date.now() - lastFetched < MIN_INTERVAL_MS) return;
    inFlight = true;
    try {
      const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lon}`);
      if (res.ok) {
        store.set((await res.json()) as LocationState);
        lastFetched = Date.now();
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[Stargazer] Reverse geocode failed:', e);
    } finally {
      inFlight = false;
    }
  }

  if (browser) {
    satStore.data.subscribe((d) => {
      if (d) fetchLocation(d.latitude, d.longitude);
    });
  }

  return store;
}

export const issLocation = createLocationStore(iss);
export const tiangongLocation = createLocationStore(tiangong);
