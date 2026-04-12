<script lang="ts">
  import { cn } from '$utils/cn';

  let { onComplete }: { onComplete: () => void } = $props();

  let step = $state(0);

  const steps = [
    {
      title: 'Welcome to Stargazer',
      body: 'A live, interactive 3D map of the solar system. Planets, moons, spacecraft, asteroids, and satellites — all from public NASA and JPL data. Let us show you around.',
      position: 'center' as const,
      spotlight: null as string | null,
    },
    {
      title: 'Search & explore',
      body: 'This is your command palette. Press / or tap this icon anytime to search every tracked body, browse by category, or discover something random.',
      position: 'top-left-offset' as const,
      spotlight: 'search',
    },
    {
      title: 'Control time',
      body: 'Hover this pill to expand the time controls. Pause, fast-forward up to 1 year per second, reverse, or jump to any date in a 100-year range.',
      position: 'bottom-offset' as const,
      spotlight: 'time',
    },
    {
      title: 'Learn about each body',
      body: 'This info panel shows live telemetry, facts, cited sources, and tracking status for whatever you have selected. Every number links back to its data source.',
      position: 'right-offset' as const,
      spotlight: 'info',
    },
    {
      title: 'Click anything in space',
      body: 'Click any planet, moon, dot, or label in the 3D scene to fly to it. You can also use the arrow keys to cycle between bodies.',
      position: 'center' as const,
      spotlight: null,
    },
    {
      title: 'Ready to explore',
      body: 'Arrow keys cycle bodies. Space pauses. + and - change speed. / opens search. Escape deselects. You have the whole solar system at your fingertips.',
      position: 'center' as const,
      spotlight: null,
    },
  ];

  let current = $derived(steps[step]);
  let isLast = $derived(step === steps.length - 1);

  // The info panel step highlights the Solar System overview card
  // that's already visible by default. No need to change selection.

  function next(): void {
    if (isLast) { onComplete(); return; }
    step++;
  }

  function skip(): void {
    onComplete();
  }
</script>

<div
  class="fixed inset-0 z-[70]"
  onpointerdown={(e) => e.stopPropagation()}
  onpointerup={(e) => e.stopPropagation()}
>
  <!-- Backdrop: darkens everything except spotlighted areas -->
  <div class="absolute inset-0 bg-[#141414]/55 backdrop-blur-[2px]"></div>

  <!-- Spotlight highlights (orange pulsing borders around real UI) -->
  {#if current.spotlight === 'search'}
    <div class="absolute left-3 top-3 sm:left-5 sm:top-5 z-[71] w-12 h-12 border-2 border-[#E8441E] pointer-events-none">
      <div class="absolute inset-0 border-2 border-[#E8441E] animate-ping opacity-40"></div>
    </div>
  {/if}
  {#if current.spotlight === 'time'}
    <div class="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-[71] w-56 h-14 border-2 border-[#E8441E] pointer-events-none">
      <div class="absolute inset-0 border-2 border-[#E8441E] animate-ping opacity-40"></div>
    </div>
  {/if}
  {#if current.spotlight === 'info'}
    <div class="absolute right-0 top-4 sm:top-4 z-[71] w-full sm:w-[320px] h-[calc(100%-2rem)] border-2 border-[#E8441E] pointer-events-none">
      <div class="absolute inset-0 border-2 border-[#E8441E] animate-ping opacity-40"></div>
    </div>
  {/if}

  <!-- Tutorial card -->
  <div
    class={cn(
      'absolute z-[72] w-[min(88vw,380px)]',
      current.position === 'center' && 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
      current.position === 'top-left-offset' && 'top-20 left-4 sm:top-24 sm:left-20',
      current.position === 'right-offset' && 'top-1/3 right-[340px] hidden sm:block',
      current.position === 'bottom-offset' && 'bottom-24 left-1/2 -translate-x-1/2 sm:bottom-28'
    )}
  >
    <!-- Mobile fallback for right-offset -->
    {#if current.position === 'right-offset'}
      <div class="sm:hidden fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(88vw,380px)]">
        {@render card()}
      </div>
    {/if}
    <div class={current.position === 'right-offset' ? 'hidden sm:block' : ''}>
      {@render card()}
    </div>
  </div>
</div>

{#snippet card()}
  <div class="bg-[#F5F0E8] border border-[#141414]/15 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
    <!-- Step counter + skip -->
    <div class="flex items-center justify-between mb-4">
      <span class="mono text-[9px] uppercase tracking-[0.22em] text-[#E8441E]">
        {String(step + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
      </span>
      <button
        type="button"
        onclick={(e) => { e.stopPropagation(); skip(); }}
        class="mono text-[9px] uppercase tracking-[0.16em] text-[#8A8A85] hover:text-[#141414] transition-colors duration-150"
      >
        Skip tour
      </button>
    </div>

    <!-- Content -->
    <h3 class="font-display text-[1.15rem] leading-[1.1] tracking-[-0.02em] uppercase text-[#141414] mb-3">
      {current.title}
    </h3>
    <p class="mono text-[11px] leading-[1.65] text-[#5A5A55] mb-6">
      {current.body}
    </p>

    <!-- Progress bar -->
    <div class="flex gap-1.5 mb-5">
      {#each steps as _, i}
        <div class="h-[2px] flex-1 transition-colors duration-200 {i <= step ? 'bg-[#E8441E]' : 'bg-[#141414]/10'}"></div>
      {/each}
    </div>

    <!-- Actions -->
    <div class="flex items-center justify-between">
      {#if step > 0}
        <button
          type="button"
          onclick={() => step--}
          class="mono text-[11px] uppercase tracking-[0.14em] text-[#8A8A85] hover:text-[#141414] transition-colors duration-150"
        >
          Back
        </button>
      {:else}
        <div></div>
      {/if}
      <button
        type="button"
        onclick={(e) => { e.stopPropagation(); next(); }}
        class="inline-flex h-10 items-center px-6 bg-[#E8441E] text-white mono text-[11px] uppercase tracking-[0.14em] transition-[background-color,transform] duration-150 hover:bg-[#d03a15] active:scale-[0.96]"
      >
        {isLast ? 'Start exploring' : 'Next'}
      </button>
    </div>
  </div>
{/snippet}
