import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { getMarsState, type MarsState } from '$utils/mars';

/**
 * Live Mars state store. Mars's position changes very slowly compared
 * to satellites, so we update once a second — overkill for the data
 * itself but cheap and matches the cadence of the other live stores.
 */
export const mars = writable<MarsState>(getMarsState());

if (browser) {
  setInterval(() => {
    mars.set(getMarsState());
  }, 1000);
}
