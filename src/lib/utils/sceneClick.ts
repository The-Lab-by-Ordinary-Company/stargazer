/**
 * Click detection for the 3D scene, with pointerdown-based target
 * commitment so live tracking can't shift the click off-target between
 * press and release.
 *
 * Why a custom layer instead of Threlte's `onclick`?
 *
 *   1. Browser native `click` is suppressed by the browser's own
 *      ~3-5px movement threshold. Retina trackpads routinely exceed
 *      it, so a lot of intended clicks never fire.
 *
 *   2. Even with `onpointerup`, the raycaster shoots a different
 *      ray on press vs release because the camera is moving every
 *      frame (lock-on tracking the currently selected body). The
 *      ray on release may miss the body entirely → handler never
 *      fires → click is silently dropped.
 *
 * The fix:
 *
 *   - A document-level capture-phase listener records pointer coords
 *     and clears any "pending click body" on every pointerdown.
 *   - Each scene body calls `markPendingClick(id)` from its own
 *     pointerdown handler. After this fires, that body is the
 *     committed target until a matching pointerup or another
 *     pointerdown.
 *   - A document-level pointerup listener checks: if the cursor
 *     moved less than CLICK_THRESHOLD_PX since pointerdown AND a
 *     pending body is set, dispatch the selection. The current
 *     ray-cast hit is irrelevant — we're using the body that was
 *     under the cursor when the user pressed, not when they released.
 *
 * Subscribers (`onSceneClick`) listen for committed clicks and run
 * their own handler (e.g., update the selection store).
 */

const CLICK_THRESHOLD_PX = 24;

let pointerDownX = 0;
let pointerDownY = 0;
let pendingBodyId: string | null = null;

const pendingListeners: Array<(bodyId: string) => void> = [];
const missListeners: Array<() => void> = [];

if (typeof document !== 'undefined') {
  document.addEventListener(
    'pointerdown',
    (e) => {
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
      // Clear any stale pending body. The scene component's own
      // pointerdown handler (via Threlte interactivity) will run
      // immediately after this listener and re-set it if the press
      // landed on a clickable body.
      pendingBodyId = null;
    },
    { capture: true, passive: true }
  );

  document.addEventListener(
    'pointerup',
    (e) => {
      const id = pendingBodyId;
      pendingBodyId = null;
      const dx = e.clientX - pointerDownX;
      const dy = e.clientY - pointerDownY;
      if (Math.hypot(dx, dy) >= CLICK_THRESHOLD_PX) return;
      if (id !== null) {
        for (const fn of pendingListeners) fn(id);
      } else {
        for (const fn of missListeners) fn();
      }
    },
    { passive: true }
  );
}

/**
 * Mark a body as the committed click target. Called by each scene
 * component's pointerdown handler. Until the next pointerdown or a
 * matching pointerup, this body is the "intended click" regardless
 * of what the cursor is currently over.
 */
export function markPendingClick(bodyId: string): void {
  pendingBodyId = bodyId;
}

/**
 * Subscribe to committed clicks. Returns an unsubscribe function.
 * Listeners are called whenever a press → release sequence finished
 * within the click threshold and a body was marked as pending.
 */
export function onSceneClick(fn: (bodyId: string) => void): () => void {
  pendingListeners.push(fn);
  return () => {
    const i = pendingListeners.indexOf(fn);
    if (i >= 0) pendingListeners.splice(i, 1);
  };
}

/**
 * Subscribe to clicks on empty space (no body hit). Returns an
 * unsubscribe function.
 */
export function onSceneMiss(fn: () => void): () => void {
  missListeners.push(fn);
  return () => {
    const i = missListeners.indexOf(fn);
    if (i >= 0) missListeners.splice(i, 1);
  };
}

/**
 * Returns true if the given pointer event represents a click rather
 * than a drag. Used by the body label `<button>` elements which fire
 * their own `onpointerup` outside the scene's pointerdown commitment
 * flow (the labels are normal DOM, not Threlte raycast targets).
 */
export function isClick(
  event: PointerEvent | MouseEvent | { nativeEvent: PointerEvent | MouseEvent }
): boolean {
  const native = 'nativeEvent' in event ? event.nativeEvent : event;
  const dx = native.clientX - pointerDownX;
  const dy = native.clientY - pointerDownY;
  return Math.hypot(dx, dy) < CLICK_THRESHOLD_PX;
}
