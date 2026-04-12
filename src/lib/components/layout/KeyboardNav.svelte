<script lang="ts">
  import { get } from 'svelte/store';
  import { selection, SOLAR_SYSTEM_VIEW } from '$lib/stores/selection';
  import { simRate } from '$stores/simTime';
  import { TRACKED_OBJECTS } from '$lib/registry/registry';
  import { timeExpanded } from '$stores/ui';

  /**
   * Global keyboard shortcuts. Mounted once in the app page.
   *
   *   Arrow Left / Right  — cycle to the previous / next body
   *   Space               — toggle pause / play
   *   + / =               — increase time rate
   *   - / _               — decrease time rate
   *   Escape              — deselect (return to solar system view),
   *                         or close drawer/time panel if open
   *   /                   — open the navigation drawer (search focus)
   *
   * All shortcuts are suppressed when an input/textarea/button has
   * focus so they don't interfere with typing.
   */

  // Body ids in registry order for cycling
  const bodyIds = TRACKED_OBJECTS.map((o) => o.id);

  const RATE_STEPS = [1, 60, 3600, 86_400, 2_592_000, 31_536_000];

  function handleKeydown(e: KeyboardEvent): void {
    // Don't capture when typing in an input
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        e.preventDefault();
        const sel = get(selection);
        const idx = bodyIds.indexOf(sel);
        const next = idx < 0 ? 0 : (idx + 1) % bodyIds.length;
        selection.set(bodyIds[next]);
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        e.preventDefault();
        const sel = get(selection);
        const idx = bodyIds.indexOf(sel);
        const prev = idx <= 0 ? bodyIds.length - 1 : idx - 1;
        selection.set(bodyIds[prev]);
        break;
      }
      case ' ': {
        e.preventDefault();
        const rate = get(simRate);
        if (rate === 0) {
          simRate.set(1);
        } else {
          simRate.set(0);
        }
        break;
      }
      case '+':
      case '=': {
        e.preventDefault();
        const rate = Math.abs(get(simRate)) || 1;
        const idx = RATE_STEPS.indexOf(rate);
        if (idx < RATE_STEPS.length - 1) {
          simRate.set(RATE_STEPS[idx + 1]);
        }
        break;
      }
      case '-':
      case '_': {
        e.preventDefault();
        const rate = Math.abs(get(simRate)) || 1;
        const idx = RATE_STEPS.indexOf(rate);
        if (idx > 0) {
          simRate.set(RATE_STEPS[idx - 1]);
        }
        break;
      }
      case 'Escape': {
        if (get(timeExpanded)) {
          timeExpanded.set(false);
        } else {
          selection.set(null);
        }
        break;
      }
      // '/' is now handled by CommandPalette directly
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />
