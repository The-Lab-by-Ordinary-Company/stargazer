import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface CrewState {
  /** Crew grouped by spacecraft, e.g. { ISS: ['…'], Tiangong: ['…'] } */
  byCraft: Record<string, string[]>;
  /** Total humans in space across all craft */
  total: number;
  fetchedAt: number;
}

export const crew = writable<CrewState | null>(null);

const REFRESH_MS = 60 * 60 * 1000; // hourly

async function fetchCrew() {
  try {
    // Cache-busting query param so any stale-cached old-shape response
    // from a previous build can't poison the page after a deploy.
    const res = await fetch(`/api/iss/crew?v=2`);
    if (!res.ok) return;
    const raw = (await res.json()) as Partial<CrewState> & {
      crew?: string[]; // legacy shape
    };

    // Normalise both the new (byCraft) and the legacy (crew[]) shapes so
    // we never end up with a half-loaded panel showing "Roster unavailable"
    // because of a stale response in the browser cache.
    let normalised: CrewState;
    if (raw.byCraft) {
      normalised = raw as CrewState;
    } else if (Array.isArray(raw.crew)) {
      normalised = {
        byCraft: { ISS: raw.crew },
        total: raw.total ?? raw.crew.length,
        fetchedAt: raw.fetchedAt ?? Date.now()
      };
    } else {
      return;
    }

    crew.set(normalised);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[Stargazer] Failed to fetch crew:', e);
  }
}

if (browser) {
  fetchCrew();
  setInterval(fetchCrew, REFRESH_MS);
}
