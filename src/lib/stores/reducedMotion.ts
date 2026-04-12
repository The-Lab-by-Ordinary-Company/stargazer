import { readable } from 'svelte/store';

/**
 * Reactive store that tracks the user's `prefers-reduced-motion`
 * media query. When true, animations should be suppressed:
 *
 *   - FlyTo: instant jump, no arc or FOV breathing
 *   - Particle dust: hidden
 *   - Label fades: instant opacity
 *   - Selection flash: hidden
 *   - Orbit draw animation: instant full draw
 *   - Idle auto-tour: disabled
 *
 * Components read `$reducedMotion` and branch accordingly.
 * SSR-safe: defaults to false when `window` is unavailable.
 */
export const reducedMotion = readable(false, (set) => {
  if (typeof window === 'undefined') return;
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  set(mql.matches);
  const onChange = (e: MediaQueryListEvent) => set(e.matches);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
});
