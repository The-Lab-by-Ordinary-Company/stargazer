import { writable } from 'svelte/store';

/**
 * Live distance from the camera to the OrbitControls target, in scene
 * units. Updated each frame from `World.svelte`'s main task loop.
 *
 * Used by the label visibility logic in `BodyLabel.svelte` to decide
 * which body labels are visible based on the current zoom level. The
 * label tier system maps this distance to a visibility threshold per
 * body — see `TrackedObject.labelTier` in `registry/types.ts`.
 *
 * Default starting value matches the camera's initial position
 * (~250 units from origin) so the first frame's labels render
 * correctly before the task loop has updated the store.
 */
export const cameraTargetDistance = writable<number>(250);

export const cameraOriginDistance = writable<number>(250);

export const mobileDrawerHeight = writable<number>(0);
