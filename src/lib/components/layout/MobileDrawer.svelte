<script lang="ts">
  import { selection } from '$stores/selection';
  import { infoPanelOpen } from '$stores/ui';
  import RightPanel from './RightPanel.svelte';

  const PEEK = 140;
  const HALF_RATIO = 0.5;
  const FULL_RATIO = 0.9;
  const SNAP_VELOCITY_THRESHOLD = 0.4;

  let drawerRef = $state<HTMLDivElement | null>(null);
  let viewportH = $state(typeof window !== 'undefined' ? window.innerHeight : 800);
  let snapHeight = $state(PEEK);
  let dragOffset = $state(0);
  let dragging = $state(false);
  let startY = 0;
  let startHeight = 0;
  let lastY = 0;
  let lastTime = 0;

  const halfH = $derived(Math.round(viewportH * HALF_RATIO));
  const fullH = $derived(Math.round(viewportH * FULL_RATIO));
  const currentHeight = $derived(dragging ? Math.max(0, Math.min(fullH, startHeight + dragOffset)) : snapHeight);
  const isOpen = $derived($infoPanelOpen && $selection !== null);

  function onResize() {
    viewportH = window.innerHeight;
  }

  function onTouchStart(e: TouchEvent) {
    dragging = true;
    startY = e.touches[0].clientY;
    startHeight = snapHeight;
    lastY = startY;
    lastTime = performance.now();
  }

  function onTouchMove(e: TouchEvent) {
    if (!dragging) return;
    const y = e.touches[0].clientY;
    dragOffset = startY - y;
    lastY = y;
    lastTime = performance.now();
  }

  function onTouchEnd(e: TouchEvent) {
    if (!dragging) return;
    dragging = false;

    const endY = e.changedTouches[0].clientY;
    const dt = (performance.now() - lastTime) / 1000;
    const velocity = dt > 0 ? (lastY - endY) / dt / viewportH : 0;

    const h = Math.max(0, startHeight + dragOffset);
    dragOffset = 0;

    // Fast flick detection
    if (Math.abs(velocity) > SNAP_VELOCITY_THRESHOLD) {
      if (velocity > 0) {
        snapHeight = h < halfH ? halfH : fullH;
      } else {
        if (h > halfH) { snapHeight = halfH; }
        else if (h > PEEK) { snapHeight = PEEK; }
        else { snapHeight = 0; selection.set(null); }
      }
      return;
    }

    // Snap to nearest
    const snaps = [0, PEEK, halfH, fullH];
    let closest = PEEK;
    let minDist = Infinity;
    for (const s of snaps) {
      const d = Math.abs(h - s);
      if (d < minDist) { minDist = d; closest = s; }
    }
    if (closest === 0) { selection.set(null); }
    snapHeight = closest;
  }

  $effect(() => {
    if (isOpen) {
      snapHeight = halfH;
    } else {
      snapHeight = 0;
    }
  });

  $effect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });
</script>

{#if isOpen || currentHeight > 0}
  <div
    bind:this={drawerRef}
    class="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-[#F5F0E8] border-t border-[#141414]/15"
    style="height: {currentHeight}px; transition: {dragging ? 'none' : 'height 300ms cubic-bezier(0.16, 1, 0.3, 1)'};"
  >
    <!-- Drag handle -->
    <div
      class="flex-shrink-0 flex items-center justify-center py-3 cursor-grab active:cursor-grabbing touch-action-none"
      ontouchstart={onTouchStart}
      ontouchmove={onTouchMove}
      ontouchend={onTouchEnd}
    >
      <div class="w-10 h-1 rounded-full bg-[#141414]/20"></div>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
      <RightPanel />
    </div>
  </div>
{/if}
