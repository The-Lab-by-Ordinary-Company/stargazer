import { get, writable } from 'svelte/store';

/**
 * Simulation time — decoupled from the wall clock so time-scrub, fast-forward,
 * and pause work without retrofitting date parameters everywhere.
 */

/** Live simulation Date. Updated each frame by advanceSimTime. */
export const simTime = writable<Date>(new Date());

/**
 * How fast simulated time advances relative to real time.
 *  1.0 = real time (default)
 *  0   = paused
 *  60  = 1 minute of sim time per real second
 *  86400 = 1 day per real second
 *  negative = backwards in time
 */
export const simRate = writable<number>(1.0);

/**
 * When false, advanceSimTime re-syncs to Date.now() each frame to prevent drift.
 * When true (user scrubbed or paused), time walks forward purely via realDt * simRate.
 */
export const simIsOffsetFromWallClock = writable<boolean>(false);

/** Advance simTime by realDtMs × simRate. At rate≈1 with no offset, snaps to Date.now(). */
export function advanceSimTime(realDtMs: number): void {
  const rate = get(simRate);
  const offset = get(simIsOffsetFromWallClock);

  if (!offset && Math.abs(rate - 1.0) < 1e-9) {
    // Real-time mode: re-sync to wall clock every frame.
    simTime.set(new Date());
    return;
  }

  // Scrub / fast-forward / pause: walk forward by scaled real dt.
  const current = get(simTime).getTime();
  simTime.set(new Date(current + realDtMs * rate));
}

/** Jump to a specific date (e.g. user scrubbed timeline). Sets offset flag. */
export function setSimTime(date: Date): void {
  simTime.set(date);
  simIsOffsetFromWallClock.set(true);
}

/** Return to real-time mode (clears the offset flag). */
export function resyncSimTimeToNow(): void {
  simTime.set(new Date());
  simIsOffsetFromWallClock.set(false);
}
