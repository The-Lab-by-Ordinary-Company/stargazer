import { writable, derived } from 'svelte/store';
import { selection, SOLAR_SYSTEM_VIEW } from './selection';

/**
 * UI visibility state. Controls which panels are open, collapsed, or
 * hidden. The default state is "minimal": scene fills the viewport,
 * no panels visible. The user pulls things open on demand.
 *
 * The info panel auto-opens when a body is selected and auto-closes
 * when the user returns to solar system view. The navigation drawer
 * and time control expansion are manual toggles.
 */

/** Whether the time control is expanded (full rate buttons + slider). */
export const timeExpanded = writable(false);

/**
 * Info panel (right side) visibility. Derived from selection: open
 * when a specific body is selected, closed in solar system view.
 * Can also be manually closed via `closeInfoPanel()`.
 */
const manualClose = writable(false);

/**
 * Info panel is open for any selection (including solar system view,
 * which shows the WelcomePanel). Only closed when manually dismissed.
 */
export const infoPanelOpen = derived(
  [manualClose, selection],
  ([$closed, $sel]) => {
    if ($sel === null) return false;
    return !$closed;
  }
);

/** Close the info panel manually (e.g., via the X button). */
export function closeInfoPanel(): void {
  manualClose.set(true);
}

// Reset manual close when selection changes (so picking a new body
// always opens the panel even if the user previously closed it).
let lastSelection: string | null = SOLAR_SYSTEM_VIEW;
selection.subscribe((sel) => {
  if (sel !== lastSelection) {
    if (sel !== null) manualClose.set(false);
    lastSelection = sel;
  }
});
