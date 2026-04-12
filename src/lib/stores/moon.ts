import { writable } from 'svelte/store';
import { getLunarState, type LunarState } from '$utils/moon';
import { browser } from '$app/environment';

export const moon = writable<LunarState>(getLunarState());

if (browser) {
  // Refresh once a second — the moon moves about 0.5 arc-minute per second,
  // far too slow to need frame-rate updates for the panel UI.
  setInterval(() => {
    moon.set(getLunarState());
  }, 1000);
}
