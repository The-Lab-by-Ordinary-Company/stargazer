<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Scene from '$components/scene/Scene.svelte';
  import RightPanel from '$components/layout/RightPanel.svelte';
  import TimeControl from '$components/layout/TimeControl.svelte';
  import HoverTooltip from '$components/layout/HoverTooltip.svelte';
  import KeyboardNav from '$components/layout/KeyboardNav.svelte';
  import CommandPalette from '$components/layout/CommandPalette.svelte';
  import WelcomeTutorial from '$components/layout/WelcomeTutorial.svelte';
  import { iss } from '$stores/iss';
  import { tiangong } from '$stores/tiangong';
  import {
    startAllCuratedSatellites,
    stopAllCuratedSatellites
  } from '$lib/registry/bodies/satellites';
  import { startIdleDetection, stopIdleDetection } from '$stores/idleTour';
  import { infoPanelOpen, closeInfoPanel } from '$stores/ui';
  import { introComplete } from '$stores/intro';
  import { selection, SOLAR_SYSTEM_VIEW } from '$stores/selection';
  import { cameraOriginDistance } from '$stores/cameraDistance';
  import { cn } from '$utils/cn';

  const LOST_THRESHOLD = 8000;

  let paletteOpen = $state(false);
  // UI is always visible so tutorial can point at real elements
  let showUI = $state(true);
  let showTutorial = $state(!$introComplete);

  function completeTutorial(): void {
    showTutorial = false;
    showUI = true;
    introComplete.set(true);
    // Write sessionStorage flag
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('stargazer_intro_seen', '1');
  }

  onMount(() => {
    iss.start();
    tiangong.start();
    startAllCuratedSatellites();
    startIdleDetection();
  });

  onDestroy(() => {
    iss.stop();
    tiangong.stop();
    stopAllCuratedSatellites();
    stopIdleDetection();
  });
</script>

<svelte:head>
  <title>Stargazer · Live observatory</title>
</svelte:head>

<main class="relative h-dvh w-screen overflow-hidden bg-background">
  <Scene />

  <!-- Search button (top-left): opens command palette -->
  <button
    type="button"
    onclick={() => (paletteOpen = true)}
    class={cn(
      'pointer-events-auto absolute left-4 top-4 z-50 flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center panel-glass transition-[opacity,scale] duration-200 ease-out active:scale-[0.92] sm:left-6 sm:top-6',
      showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'
    )}
    aria-label="Search bodies"
    title="Search (press /)"
  >
    <svg viewBox="0 0 16 16" fill="none" class="h-4 w-4" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.4" />
      <path d="M10.5 10.5l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
    </svg>
  </button>

  <!-- Command palette -->
  <CommandPalette bind:open={paletteOpen} />

  <!-- Info panel (right): slides in on body selection -->
  <aside
    class={cn(
      'pointer-events-auto absolute right-0 top-0 z-50 flex h-full w-full sm:w-[320px] flex-col',
      'info-panel',
      $infoPanelOpen ? 'info-open' : 'info-closed'
    )}
    aria-hidden={!$infoPanelOpen}
  >
    <div class="relative flex h-full max-h-dvh flex-col overflow-y-auto overflow-x-hidden scrollbar-thin panel rounded-none sm:my-4 sm:mr-0 sm:max-h-[calc(100dvh-2rem)]">
      <button
        type="button"
        onclick={() => closeInfoPanel()}
        class="absolute right-3 top-3 z-10 flex h-10 w-10 sm:h-7 sm:w-7 items-center justify-center bg-[#F0ECE4] text-[#8A8A85] transition-[background-color,color,scale] duration-150 ease-out hover:bg-[#141414] hover:text-white active:scale-[0.92]"
        aria-label="Close info panel"
      >
        <svg viewBox="0 0 14 14" fill="none" class="h-3 w-3" aria-hidden="true">
          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
        </svg>
      </button>
      <RightPanel />
    </div>
  </aside>

  <!-- Lost in space: return to solar system (above time scrubber) -->
  {#if $cameraOriginDistance > LOST_THRESHOLD && $selection === null}
    <button
      type="button"
      onclick={() => selection.set(SOLAR_SYSTEM_VIEW)}
      class="lost-pulse absolute bottom-24 sm:bottom-20 left-1/2 z-40 -translate-x-1/2 inline-flex items-center gap-2 bg-[#E8441E] px-5 py-2.5 mono text-[10px] uppercase tracking-[0.18em] text-white transition-[transform,box-shadow] duration-200 ease-out hover:shadow-[0_0_20px_rgba(232,68,30,0.5)] active:scale-[0.96]"
    >
      <svg viewBox="0 0 16 16" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
        <path d="M8 1l2.5 4.5H14L10 9l1.5 5L8 11.5 4.5 14 6 9 2 5.5h3.5z" fill="currentColor" />
      </svg>
      Return to Solar System
    </button>
  {/if}

  <!-- Time control -->
  <div class={cn('transition-opacity duration-500 ease-out', showUI ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
    <TimeControl />
  </div>

  <!-- Footer -->
  <div
    class={cn(
      'pointer-events-none absolute bottom-2 left-2 z-30 mono text-[9px] sm:text-[8px] uppercase tracking-[0.16em] text-white/30 transition-opacity duration-500 ease-out sm:left-6',
      showUI ? 'opacity-100' : 'opacity-0'
    )}
  >
    <span class="inline-flex items-center gap-1.5">
      <img src="/favicon.svg" alt="" width="16" height="16" class="h-4 w-4 opacity-70" />
      Stargazer
    </span> · <span class="text-white/20">Powered by <a href="https://lab.ordinarycompany.design/" target="_blank" rel="noreferrer" class="pointer-events-auto hover:text-white/40 transition-colors duration-150">The Lab</a></span>
  </div>

  <HoverTooltip />
  <KeyboardNav />

  <!-- Welcome tutorial (first visit only) -->
  {#if showTutorial}
    <WelcomeTutorial onComplete={completeTutorial} />
  {/if}
</main>

<style>
  .info-panel {
    transition-property: transform, opacity;
    will-change: transform;
  }
  .info-closed {
    transform: translateX(100%);
    opacity: 0;
    pointer-events: none;
    transition-duration: 180ms;
    transition-timing-function: cubic-bezier(0.4, 0, 1, 1);
  }
  .info-open {
    transform: translateX(0);
    opacity: 1;
    transition-duration: 320ms;
    transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }
  .lost-pulse {
    animation: lost-glow 2s ease-in-out infinite;
  }
  @keyframes lost-glow {
    0%, 100% { box-shadow: 0 0 8px rgba(232, 68, 30, 0.4); }
    50% { box-shadow: 0 0 22px rgba(232, 68, 30, 0.7); }
  }
</style>
