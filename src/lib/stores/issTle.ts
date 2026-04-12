import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface IssTle {
  name: string;
  line1: string;
  line2: string;
  fetchedAt: number;
}

export const issTle = writable<IssTle | null>(null);

const REFRESH_MS = 60 * 60 * 1000; // 1 hour — TLEs update a few times a day

async function fetchTle() {
  try {
    const res = await fetch('/api/iss/tle');
    if (!res.ok) return;
    const data = (await res.json()) as IssTle;
    issTle.set(data);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[Stargazer] Failed to fetch ISS TLE:', e);
  }
}

if (browser) {
  fetchTle();
  setInterval(fetchTle, REFRESH_MS);
}
