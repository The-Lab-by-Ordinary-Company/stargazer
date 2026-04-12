import { writable } from 'svelte/store';
import type { ObjectType } from '$lib/registry/types';

/**
 * Set of `ObjectType` values that the user has chosen to HIDE from the
 * LeftPanel tree, the search results, and (eventually) the 3D scene.
 *
 * Default: empty set (everything visible). The user toggles types via
 * the filter chips in `LeftPanel.svelte` → `TypeFilters.svelte`. As the
 * registry grows toward hundreds of bodies (esp. once curated Earth-
 * orbit satellite catalogs land), this is the user's main way to
 * narrow the view to "just the things I care about right now."
 *
 * Reading the store inside a `$derived(.by(...))` makes the consumer
 * reactive — `BodyTree`'s `sortedChildren` and `searchMatches` both
 * pass `$hiddenTypes` through their derived blocks for that reason.
 */
export const hiddenTypes = writable<Set<ObjectType>>(new Set());

/**
 * Toggle the visibility of one type. If it's currently hidden, show
 * it; if it's currently visible, hide it.
 */
export function toggleType(type: ObjectType): void {
  hiddenTypes.update((set) => {
    const next = new Set(set);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    return next;
  });
}

/** Reset the filter — show all types. */
export function clearTypeFilter(): void {
  hiddenTypes.set(new Set());
}
