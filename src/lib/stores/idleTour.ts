import { writable, get } from 'svelte/store';
import { reducedMotion } from './reducedMotion';

/**
 * Idle auto-tour state. After IDLE_THRESHOLD_MS of no user input,
 * `touring` flips to true and World.svelte begins a slow camera
 * flight through predefined waypoints. Any pointer/key/wheel input
 * cancels the tour and restores the previous camera state.
 *
 * Disabled when prefers-reduced-motion is active.
 */

const IDLE_THRESHOLD_MS = 45_000; // 45 seconds of silence

export const touring = writable(false);

let idleTimer: ReturnType<typeof setTimeout> | null = null;
let enabled = false;

function resetTimer(): void {
  if (get(touring)) {
    // Cancel active tour
    touring.set(false);
  }
  if (idleTimer) clearTimeout(idleTimer);
  if (!enabled) return;
  idleTimer = setTimeout(() => {
    if (get(reducedMotion)) return;
    touring.set(true);
  }, IDLE_THRESHOLD_MS);
}

/** Call once from the app page's onMount. */
export function startIdleDetection(): void {
  if (typeof window === 'undefined') return;
  enabled = true;
  const events = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
  for (const event of events) {
    window.addEventListener(event, resetTimer, { passive: true });
  }
  resetTimer();
}

/** Call from onDestroy to clean up. */
export function stopIdleDetection(): void {
  enabled = false;
  if (idleTimer) clearTimeout(idleTimer);
  if (typeof window === 'undefined') return;
  const events = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
  for (const event of events) {
    window.removeEventListener(event, resetTimer);
  }
}
