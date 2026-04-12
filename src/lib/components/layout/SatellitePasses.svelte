<script lang="ts">
  import type { Readable } from 'svelte/store';
  import { computePasses, type PassEvent } from '$utils/passes';
  import type { TleData } from '$stores/satelliteFactory';

  /**
   * Generic pass predictor section. Takes any TLE store and renders the
   * "Find next visible passes" button + a list of upcoming overhead passes
   * for the user's geolocation. Same SGP4 + observer-darkness math as the
   * original IssPasses, just parameterized.
   */
  let {
    tleStore,
    label = 'Find next visible passes'
  }: { tleStore: Readable<TleData | null>; label?: string } = $props();

  let status = $state<'idle' | 'requesting' | 'computing' | 'ready' | 'error' | 'denied'>(
    'idle'
  );
  let passes = $state<PassEvent[]>([]);
  let observerLabel = $state('');
  let errorMsg = $state('');

  async function requestAndCompute() {
    const tle = $tleStore;
    if (!tle) {
      errorMsg = 'TLE not loaded yet';
      status = 'error';
      return;
    }
    if (!('geolocation' in navigator)) {
      errorMsg = 'Geolocation is not available in this browser';
      status = 'error';
      return;
    }

    status = 'requesting';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        status = 'computing';
        try {
          const result = computePasses(
            { line1: tle.line1, line2: tle.line2 },
            {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              height: (pos.coords.altitude ?? 0) / 1000
            },
            { daysAhead: 5, minElevationDeg: 10 }
          );
          passes = result.slice(0, 6);
          observerLabel = `${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°`;
          status = 'ready';
        } catch (e) {
          errorMsg = (e as Error).message;
          status = 'error';
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          status = 'denied';
        } else {
          errorMsg = err.message;
          status = 'error';
        }
      },
      { enableHighAccuracy: false, timeout: 10_000 }
    );
  }

  function formatPassTime(d: Date): string {
    return d.toLocaleString(undefined, {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  }
</script>

<section class="border-t border-slate-200/80 p-5">
  <div class="mb-3 flex items-center justify-between gap-2">
    <div class="label">Passes near you</div>
    {#if status === 'ready'}
      <div class="mono text-[9px] uppercase tracking-[0.18em] text-slate-600">
        {observerLabel}
      </div>
    {/if}
  </div>

  {#if status === 'idle'}
    <button
      type="button"
      onclick={requestAndCompute}
      class="group relative inline-flex h-10 w-full items-center justify-center gap-2 overflow-hidden rounded-none border border-blue-200/70 bg-gradient-to-r from-slate-950 to-slate-900 pl-4 pr-3.5 text-[12px] font-medium text-white shadow-[0_8px_24px_rgba(15,23,42,0.18)] transition-[box-shadow,scale] duration-200 ease-out hover:shadow-[0_12px_30px_rgba(15,23,42,0.24)] active:scale-[0.96]"
    >
      <span
        class="pointer-events-none absolute inset-0 rounded-none bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.18),transparent_30%)]"
      ></span>
      <span class="relative z-10 flex items-center gap-2">
        {label}
        <svg viewBox="0 0 16 16" fill="none" class="h-3 w-3" aria-hidden="true">
          <path
            d="M3 8h10M9 4l4 4-4 4"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    </button>
    <p class="mt-2 text-[10px] leading-relaxed text-slate-600">
      Uses your browser location to predict the next 5 days of overhead passes via SGP4. Nothing
      is sent to a server.
    </p>
  {:else if status === 'requesting'}
    <div class="mono text-[10px] uppercase tracking-[0.18em] text-slate-600">
      Requesting location…
    </div>
  {:else if status === 'computing'}
    <div class="mono text-[10px] uppercase tracking-[0.18em] text-slate-600">
      Propagating orbit…
    </div>
  {:else if status === 'denied'}
    <div class="mono text-[10px] uppercase tracking-[0.18em] text-slate-600">
      Location permission denied
    </div>
  {:else if status === 'error'}
    <div class="mono text-[10px] uppercase tracking-[0.18em] text-slate-600">
      Error: {errorMsg}
    </div>
  {:else if status === 'ready'}
    {#if passes.length === 0}
      <div class="mono text-[10px] uppercase tracking-[0.18em] text-slate-600">
        No passes ≥10° in the next 5 days
      </div>
    {:else}
      <ul class="space-y-2">
        {#each passes as p (p.startUtc.toISOString())}
          <li class="flex items-start gap-2 surface-card p-3">
            <span
              class="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-none {p.visible
                ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]'
                : 'bg-slate-400'}"
              title={p.visible ? 'Visible to the naked eye' : 'Daytime, not visible'}
            ></span>
            <div class="min-w-0 flex-1">
              <div class="font-mono text-xs text-slate-900">{formatPassTime(p.startUtc)}</div>
              <div class="mono mt-0.5 text-[9px] uppercase tracking-[0.18em] text-slate-600">
                {Math.round(p.maxElevationDeg)}° max · {formatDuration(p.durationSec)} ·
                {p.visible ? 'visible' : 'daytime'}
              </div>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>
