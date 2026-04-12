import { writable } from 'svelte/store';

/**
 * Scene-wide hover state. Each clickable body publishes its name when
 * the cursor enters its click target and clears it when the cursor
 * leaves. The HoverTooltip component subscribes and renders a small
 * floating label near the cursor.
 *
 * Tracking the cursor position separately means the tooltip can
 * follow the mouse smoothly without each body needing its own DOM
 * element. One tooltip, many sources.
 */

export const hoveredBody = writable<string | null>(null);
export const cursorPosition = writable<{ x: number; y: number }>({ x: 0, y: 0 });

if (typeof document !== 'undefined') {
  document.addEventListener(
    'pointermove',
    (e) => {
      cursorPosition.set({ x: e.clientX, y: e.clientY });
    },
    { passive: true }
  );
}
