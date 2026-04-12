<script lang="ts">
  import { hoveredBody, cursorPosition } from '$lib/stores/sceneHover';

  /**
   * Floating tooltip that follows the cursor whenever the user is
   * hovering a clickable body in the 3D scene. Reads from the
   * `hoveredBody` and `cursorPosition` stores so we don't need
   * per-component DOM nodes.
   *
   * Visual: dark glass capsule that fades in / out with `opacity`
   * + a subtle `translateY`. Specific transitions only — no
   * `transition: all`. The cursor offset (translate-x-3 -translate-y-1/2)
   * keeps the tooltip out from under the pointer so it doesn't catch
   * its own hover events.
   */

  let visible = $derived($hoveredBody !== null);
</script>

<div
  class="hover-tooltip pointer-events-none fixed z-[55] mono text-[10px] uppercase tracking-[0.16em] text-white/95"
  class:visible
  style="left: {$cursorPosition.x}px; top: {$cursorPosition.y}px"
  aria-hidden="true"
>
  <div
    class="ml-3 -translate-y-1/2 rounded-none border border-white/15 bg-slate-950/85 px-3 py-1 shadow-[0_8px_24px_rgba(15,23,42,0.32)] backdrop-blur-md"
  >
    {$hoveredBody ?? ''}
  </div>
</div>

<style>
  .hover-tooltip {
    opacity: 0;
    transform: translateY(2px);
    transition-property: opacity, transform;
    transition-duration: 140ms;
    transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
  }
  .hover-tooltip.visible {
    opacity: 1;
    transform: translateY(0);
  }
</style>
