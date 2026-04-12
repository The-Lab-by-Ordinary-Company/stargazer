<script lang="ts">
  import {
    simTime,
    simRate,
    setSimTime,
    resyncSimTimeToNow,
    simIsOffsetFromWallClock
  } from '$stores/simTime';
  import DatePicker from '$components/ui/DatePicker.svelte';
  import { cn } from '$utils/cn';
  import { timeExpanded } from '$stores/ui';

  // Dynamic Island: click to expand, hover-off to collapse.
  // When collapsed, hovering triggers a subtle wiggle to hint
  // interactivity. When expanded, moving the mouse away collapses
  // after a 600ms grace period (so the user can move between
  // buttons without flicker).
  let collapseTimer: ReturnType<typeof setTimeout> | null = null;
  let wiggle = $state(false);

  function expandOnClick(): void {
    if (collapseTimer) { clearTimeout(collapseTimer); collapseTimer = null; }
    timeExpanded.update((v) => !v);
  }

  function onIslandEnter(): void {
    // Cancel any pending collapse
    if (collapseTimer) { clearTimeout(collapseTimer); collapseTimer = null; }
    // Wiggle hint when collapsed
    if (!$timeExpanded) {
      wiggle = true;
      setTimeout(() => (wiggle = false), 400);
    }
  }

  function onIslandLeave(): void {
    if (!$timeExpanded) return;
    // Collapse immediately on hover-off
    if (collapseTimer) { clearTimeout(collapseTimer); collapseTimer = null; }
    timeExpanded.set(false);
  }

  function pad2(n: number): string {
    return n.toString().padStart(2, '0');
  }

  let compactTime = $derived(
    `${$simTime.getUTCFullYear()}-${pad2($simTime.getUTCMonth() + 1)}-${pad2($simTime.getUTCDate())} ${pad2($simTime.getUTCHours())}:${pad2($simTime.getUTCMinutes())}:${pad2($simTime.getUTCSeconds())}`
  );

  // Pulse animation on rate change: briefly scale the time display
  // to 1.04 then back to 1.0 over 200ms for tactile feedback.
  let ratePulse = $state(false);
  let lastRate = $state(1);
  $effect(() => {
    if ($simRate !== lastRate) {
      lastRate = $simRate;
      ratePulse = true;
      setTimeout(() => (ratePulse = false), 200);
    }
  });

  /**
   * Floating media-player-style time control. Drives the existing
   * `simTime` / `simRate` stores so every position function in the
   * registry inherits the user's chosen time + rate without further
   * wiring.
   *
   * Layout (bottom-center, hovers over the 3D scene):
   *
   *   ┌──────────────────────────────────────────────────────────┐
   *   │       ●  [DatePicker, custom popover]       UTC          │
   *   │  ⏸  1× 1m/s 1h/s 1d/s 1mo/s 1y/s   ←   Now              │
   *   │  ◀──────────────●─────────────────────────▶              │
   *   │   1976                ↑                          2076   │
   *   └──────────────────────────────────────────────────────────┘
   *
   *  - The DatePicker is a fully custom component that renders the
   *    same on every browser (Chrome / Safari / Firefox all paint
   *    `<input type="datetime-local">` differently, so we don't use it)
   *  - Pause / play toggles between rate=0 and the previous rate
   *  - Each rate button sets simRate to seconds-of-sim per real-second
   *  - Reverse (←) negates the current rate (forward ↔ backward)
   *  - Now snaps simTime to the wall clock and clears the offset flag
   *  - The timeline slider scrubs through ±50 years of the page-load
   *    epoch with continuous (sub-day) granularity
   */

  // ── Rate presets ─────────────────────────────────────────────────────

  interface RatePreset {
    value: number;
    label: string;
    title: string;
  }

  const RATE_PRESETS: RatePreset[] = [
    { value: 1, label: '1×', title: 'Real time (1 second per second)' },
    { value: 60, label: '1m/s', title: '1 minute of sim time per second' },
    { value: 3600, label: '1h/s', title: '1 hour per second' },
    { value: 86_400, label: '1d/s', title: '1 day per second' },
    { value: 2_592_000, label: '1mo/s', title: '1 month per second (~30 days)' },
    { value: 31_536_000, label: '1y/s', title: '1 year per second (~365 days)' }
  ];

  // ── Timeline slider epoch ────────────────────────────────────────────
  // Fixed at component mount so the slider range stays stable across
  // the viewing session. Range: ±50 years from page-load wall time.
  // 100 years across the slider gives ~36500 days; with a typical 320px
  // slider that's ~114 days per pixel: coarse for short scrubbing,
  // fine for jumping decades. Pair with the date picker for precision.
  const ONE_DAY_MS = 86_400_000;
  const SLIDER_HALF_RANGE_DAYS = 50 * 365;
  const SLIDER_TOTAL_DAYS = SLIDER_HALF_RANGE_DAYS * 2;
  const SLIDER_EPOCH_MS = Date.now() - SLIDER_HALF_RANGE_DAYS * ONE_DAY_MS;
  const SLIDER_END_MS = SLIDER_EPOCH_MS + SLIDER_TOTAL_DAYS * ONE_DAY_MS;

  // Pretty year labels for the slider extents.
  const sliderStartYear = new Date(SLIDER_EPOCH_MS).getUTCFullYear();
  const sliderEndYear = new Date(SLIDER_END_MS).getUTCFullYear();
  const nowAnchorYear = new Date().getUTCFullYear();

  // ── Live derivations ─────────────────────────────────────────────────

  let absRate = $derived(Math.abs($simRate));
  let isPaused = $derived($simRate === 0);
  let isReversed = $derived($simRate < 0);

  // The most-recently chosen rate magnitude (so pause/play can restore it).
  let lastNonZeroRate = $state(1);
  $effect(() => {
    if ($simRate !== 0) {
      lastNonZeroRate = Math.abs($simRate);
    }
  });

  // Slider value (days since SLIDER_EPOCH_MS). Clamped so the visible
  // handle never falls outside the rendered track even if the user has
  // scrubbed elsewhere via the date picker.
  let sliderValue = $derived(
    Math.min(
      SLIDER_TOTAL_DAYS,
      Math.max(0, ($simTime.getTime() - SLIDER_EPOCH_MS) / ONE_DAY_MS)
    )
  );

  // The "Now" button is only meaningful when we're not already in live
  // real-time mode.
  let isLive = $derived(!$simIsOffsetFromWallClock && $simRate === 1);

  // ── Actions ──────────────────────────────────────────────────────────

  function selectRate(rate: number): void {
    simIsOffsetFromWallClock.set(true);
    simRate.set(isReversed ? -rate : rate);
  }

  function togglePause(): void {
    if (isPaused) {
      simIsOffsetFromWallClock.set(true);
      simRate.set(isReversed ? -lastNonZeroRate : lastNonZeroRate);
    } else {
      simRate.set(0);
      simIsOffsetFromWallClock.set(true);
    }
  }

  function toggleReverse(): void {
    simIsOffsetFromWallClock.set(true);
    simRate.set(-$simRate);
    if (isPaused) lastNonZeroRate = -lastNonZeroRate;
  }

  function snapToNow(): void {
    resyncSimTimeToNow();
    simRate.set(1);
  }

  function onSliderInput(e: Event): void {
    const days = Number((e.currentTarget as HTMLInputElement).value);
    if (Number.isNaN(days)) return;
    setSimTime(new Date(SLIDER_EPOCH_MS + days * ONE_DAY_MS));
  }

  // Slider color/position math: percentage of the playhead along the
  // track, used to color the "filled" portion to the left of the handle.
  let sliderPct = $derived((sliderValue / SLIDER_TOTAL_DAYS) * 100);

  // Where "now" sits on the slider: fixed for the session, used to
  // draw a vertical tick mark so the user can see where live time is.
  const nowSliderPct =
    ((Date.now() - SLIDER_EPOCH_MS) / ONE_DAY_MS / SLIDER_TOTAL_DAYS) * 100;
</script>

<!--
  Dynamic Island time control. Hover-to-expand, leave-to-collapse.
  A single container morphs between a compact pill and the full
  control panel using CSS grid + max-height transitions. The morph
  feels physical because border-radius and padding also transition.
-->
<aside
  class="pointer-events-auto absolute bottom-4 left-1/2 z-40 -translate-x-1/2 sm:bottom-6"
  onmouseenter={onIslandEnter}
  onmouseleave={onIslandLeave}
  ontouchstart={onIslandEnter}
>
  <div
    class={cn(
      'time-island panel',
      $timeExpanded ? 'time-expanded' : 'time-collapsed',
      wiggle && !$timeExpanded && 'time-wiggle'
    )}
    onclick={!$timeExpanded ? expandOnClick : undefined}
    onkeydown={!$timeExpanded ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); expandOnClick(); } } : undefined}
    role={!$timeExpanded ? 'button' : undefined}
    tabindex={!$timeExpanded ? 0 : -1}
  >
    <!-- ── Always visible: status + time ──────────────────────────── -->
    <div class="flex items-center justify-center gap-2">
      <span
        class={cn(
          'inline-block h-1.5 w-1.5 flex-shrink-0 rounded-none',
          isLive ? 'animate-pulse bg-[#E8441E]' : isPaused ? 'bg-[#E8441E]' : 'bg-[#E8441E]'
        )}
        aria-hidden="true"
      ></span>
      {#if $timeExpanded}
        <DatePicker
          value={$simTime}
          onChange={setSimTime}
          ariaLabel="Jump to a specific date and time (UTC)"
        />
      {:else}
        {#if isPaused}
          <svg viewBox="0 0 12 12" fill="currentColor" class="h-2.5 w-2.5 text-slate-600" aria-hidden="true"><path d="M3 1.5 L10 6 L3 10.5 Z" /></svg>
        {:else}
          <svg viewBox="0 0 12 12" fill="currentColor" class="h-2.5 w-2.5 text-slate-600" aria-hidden="true"><rect x="3" y="2" width="2.2" height="8" rx="0.4" /><rect x="6.8" y="2" width="2.2" height="8" rx="0.4" /></svg>
        {/if}
        <span
          class={cn(
            'mono tabular-nums text-[11px] font-medium tracking-tight text-slate-800 transition-transform duration-200 ease-out',
            ratePulse && 'scale-[1.04]'
          )}
        >
          {compactTime}
        </span>
      {/if}
      <span class="mono text-[9px] uppercase tracking-[0.14em] text-slate-400">UTC</span>
    </div>

    <!-- ── Expandable section: rate controls + slider ────────────── -->
    {#if $timeExpanded}
      <div class="island-expandable mt-2.5">
        <!-- Rate controls -->
        <div class="flex flex-wrap items-center justify-center gap-1.5">
          <button
            type="button"
            onclick={togglePause}
            class={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-none transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.92]',
              isPaused
                ? 'bg-[#E8441E] text-white shadow-[0_2px_8px_rgba(232,68,30,0.32)]'
                : 'bg-[#141414] text-white hover:bg-slate-900'
            )}
            aria-label={isPaused ? 'Resume time' : 'Pause time'}
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {#if isPaused}
              <svg viewBox="0 0 12 12" fill="currentColor" class="h-3 w-3 -mr-px" aria-hidden="true"><path d="M3 1.5 L10 6 L3 10.5 Z" /></svg>
            {:else}
              <svg viewBox="0 0 12 12" fill="currentColor" class="h-3 w-3" aria-hidden="true"><rect x="3" y="2" width="2.2" height="8" rx="0.4" /><rect x="6.8" y="2" width="2.2" height="8" rx="0.4" /></svg>
            {/if}
          </button>
          <span class="mx-0.5 h-5 w-px bg-slate-300/55" aria-hidden="true"></span>
          {#each RATE_PRESETS as preset (preset.value)}
            {@const isActive = !isPaused && absRate === preset.value}
            <button
              type="button"
              onclick={() => selectRate(preset.value)}
              class={cn(
                'inline-flex h-8 items-center justify-center rounded-none px-2.5 mono text-[10px] font-medium uppercase tracking-[0.12em] transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.94]',
                isActive
                  ? 'bg-[#141414] text-white shadow-[0_2px_8px_rgba(15,23,42,0.18)]'
                  : 'border border-white/55 bg-white/55 text-slate-700 hover:bg-white/85'
              )}
              aria-pressed={isActive}
              title={preset.title}
            >{preset.label}</button>
          {/each}
          <span class="mx-0.5 h-5 w-px bg-slate-300/55" aria-hidden="true"></span>
          <button
            type="button"
            onclick={toggleReverse}
            class={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-none transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.92]',
              isReversed
                ? 'bg-[#E8441E] text-white shadow-[0_2px_8px_rgba(232,68,30,0.32)]'
                : 'border border-white/55 bg-white/55 text-slate-700 hover:bg-white/85'
            )}
            aria-label={isReversed ? 'Run time forward' : 'Run time backward'}
          >
            <svg viewBox="0 0 12 12" fill="none" class="h-3 w-3" aria-hidden="true"><path d="M9 3 L4 6 L9 9 M4 3 L4 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
          <button
            type="button"
            onclick={snapToNow}
            disabled={isLive}
            class={cn(
              'inline-flex h-8 items-center justify-center rounded-none px-3 mono text-[10px] font-medium uppercase tracking-[0.12em] transition-[background-color,color,opacity,scale] duration-150 ease-out active:scale-[0.94]',
              isLive
                ? 'cursor-default border border-white/55 bg-white/30 text-slate-400 opacity-70'
                : 'border border-[#E8441E]/30 bg-[#E8441E]/15 text-[#E8441E] shadow-[0_2px_8px_rgba(232,68,30,0.18)] hover:bg-[#E8441E]/20'
            )}
          >Now</button>
        </div>

        <!-- Timeline slider -->
        <div class="mt-2.5 flex flex-col gap-1 px-1">
          <div class="relative h-4">
            <div class="pointer-events-none absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-none bg-slate-200/65"></div>
            <div class="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-none bg-[#E8441E]/75 transition-[width] duration-100 ease-out" style={`left: 0; width: ${sliderPct}%`}></div>
            <div class="pointer-events-none absolute top-1/2 h-3.5 w-px -translate-y-1/2 bg-[#E8441E]/75" style={`left: ${nowSliderPct}%`}></div>
            <input type="range" min="0" max={SLIDER_TOTAL_DAYS} step="any" value={sliderValue} oninput={onSliderInput} class="timeline-slider relative h-4 w-full cursor-pointer appearance-none bg-transparent" aria-label="Scrub through time" />
          </div>
          <div class="flex items-center justify-between mono text-[8px] uppercase tracking-[0.16em] text-slate-400">
            <span>{sliderStartYear}</span>
            <span class="text-[#E8441E]">{nowAnchorYear} · live</span>
            <span>{sliderEndYear}</span>
          </div>
        </div>
      </div>
    {/if}
  </div>
</aside>

<style>
  /*
   * Dynamic Island morphing. The container transitions its padding,
   * border-radius, and width between collapsed (tight pill) and
   * expanded (full control panel). The spring-like cubic-bezier
   * matches Apple's Dynamic Island timing.
   */
  .time-island {
    transition-property: padding, border-radius, width, box-shadow, transform;
    /* No overflow:hidden -- the DatePicker popover needs to escape
       the container bounds. The morph animation still works because
       the content inside uses its own {#if} gating. */
    overflow: visible;
  }
  .time-collapsed {
    padding: 10px 16px;
    border-radius: 0;
    width: auto;
    cursor: pointer;
    /* Collapse: fast and decisive */
    transition-duration: 200ms;
    transition-timing-function: cubic-bezier(0.4, 0, 1, 1);
  }
  .time-collapsed:hover {
    box-shadow:
      0 12px 40px rgba(15, 23, 42, 0.18),
      0 4px 12px rgba(15, 23, 42, 0.08);
  }
  .time-expanded {
    padding: 14px 20px;
    border-radius: 0;
    width: min(92vw, 560px);
    box-shadow:
      0 24px 70px rgba(15, 23, 42, 0.18),
      0 8px 24px rgba(15, 23, 42, 0.08);
    /* Expand: spring-like overshoot */
    transition-duration: 320ms;
    transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Subtle wiggle on hover when collapsed: a quick scale pulse that
     hints "this is interactive, click me." Uses a single bounce
     keyframe that settles back to 1.0. */
  .time-wiggle {
    animation: island-wiggle 400ms cubic-bezier(0.32, 0.72, 0, 1);
  }
  @keyframes island-wiggle {
    0% { transform: scale(1); }
    30% { transform: scale(1.04); }
    60% { transform: scale(0.98); }
    100% { transform: scale(1); }
  }

  /* Expandable section fades + slides in from below */
  .island-expandable {
    animation: island-expand 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes island-expand {
    from {
      opacity: 0;
      transform: translateY(4px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /*
   * Style the native range input.
   */
  .timeline-slider::-webkit-slider-runnable-track {
    height: 16px;
    background: transparent;
  }
  .timeline-slider::-moz-range-track {
    height: 16px;
    background: transparent;
  }
  .timeline-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 0;
    background: #3b82f6;
    border: 2px solid #ffffff;
    box-shadow:
      0 0 0 1px rgba(59, 130, 246, 0.45),
      0 2px 6px rgba(15, 23, 42, 0.18);
    cursor: grab;
    transition-property: scale, box-shadow;
    transition-duration: 150ms;
    transition-timing-function: ease-out;
  }
  .timeline-slider::-webkit-slider-thumb:hover {
    box-shadow:
      0 0 0 4px rgba(96, 165, 250, 0.22),
      0 2px 8px rgba(15, 23, 42, 0.22);
  }
  .timeline-slider::-webkit-slider-thumb:active {
    cursor: grabbing;
    scale: 1.12;
  }
  .timeline-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 0;
    background: #3b82f6;
    border: 2px solid #ffffff;
    box-shadow:
      0 0 0 1px rgba(59, 130, 246, 0.45),
      0 2px 6px rgba(15, 23, 42, 0.18);
    cursor: grab;
    transition-property: scale, box-shadow;
    transition-duration: 150ms;
    transition-timing-function: ease-out;
  }
  .timeline-slider::-moz-range-thumb:hover {
    box-shadow:
      0 0 0 4px rgba(96, 165, 250, 0.22),
      0 2px 8px rgba(15, 23, 42, 0.22);
  }
  .timeline-slider::-moz-range-thumb:active {
    cursor: grabbing;
    scale: 1.12;
  }
  .timeline-slider:focus {
    outline: none;
  }
  .timeline-slider:focus-visible::-webkit-slider-thumb {
    box-shadow:
      0 0 0 4px rgba(96, 165, 250, 0.32),
      0 2px 8px rgba(15, 23, 42, 0.22);
  }
  .timeline-slider:focus-visible::-moz-range-thumb {
    box-shadow:
      0 0 0 4px rgba(96, 165, 250, 0.32),
      0 2px 8px rgba(15, 23, 42, 0.22);
  }
</style>
