import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { SatelliteState, SatelliteStore } from './satelliteFactory';

/**
 * Live ISS tracker. Polls /api/iss every 1s, which proxies wheretheiss.at
 * (the only public source that exposes both live position AND visibility
 * for the ISS specifically).
 *
 * The store conforms to the canonical SatelliteStore interface so the
 * generic SatelliteMarker / SatelliteOrbitPath / SatelliteFootprint
 * components can drive both the ISS and Tiangong from the same code.
 */

const POLL_INTERVAL_MS = 1000;

/** @deprecated use SatelliteState directly. Kept as an alias for back-compat. */
export type IssState = SatelliteState;

function createIssStore(): SatelliteStore {
  const data = writable<SatelliteState | null>(null);
  const status = writable<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const error = writable<string | null>(null);

  let pollHandle: ReturnType<typeof setInterval> | null = null;
  let aborter: AbortController | null = null;

  async function fetchOnce() {
    if (!browser) return;
    aborter?.abort();
    aborter = new AbortController();
    try {
      const res = await fetch('/api/iss', { signal: aborter.signal });
      if (!res.ok) throw new Error(`ISS endpoint responded ${res.status}`);
      const json = (await res.json()) as SatelliteState;
      data.set(json);
      status.set('ready');
      error.set(null);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      status.set('error');
      error.set((err as Error).message);
    }
  }

  function start() {
    if (!browser || pollHandle) return;
    status.set('loading');
    fetchOnce();
    pollHandle = setInterval(fetchOnce, POLL_INTERVAL_MS);
  }

  function stop() {
    if (pollHandle) {
      clearInterval(pollHandle);
      pollHandle = null;
    }
    aborter?.abort();
    aborter = null;
  }

  return { data, status, error, start, stop };
}

export const iss: SatelliteStore = createIssStore();
