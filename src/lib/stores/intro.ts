import { writable } from 'svelte/store';

/**
 * Intro sequence state. Controls the staggered fade-in of UI elements
 * on first load. Once the intro completes, `introComplete` stays true
 * for the rest of the session. A sessionStorage flag prevents the
 * intro from replaying on soft navigations within the same tab.
 */

const STORAGE_KEY = 'stargazer_intro_seen';

function hasSeenIntro(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(STORAGE_KEY) === '1';
}

function markSeen(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEY, '1');
  }
}

/** True once the intro animation has finished (or was skipped). */
export const introComplete = writable(hasSeenIntro());

/** True while the intro is actively playing. */
export const introPlaying = writable(!hasSeenIntro());

/**
 * Call from World.svelte after the intro camera flight finishes.
 * Flips both stores and writes the sessionStorage flag.
 */
export function finishIntro(): void {
  introPlaying.set(false);
  introComplete.set(true);
  markSeen();
}

