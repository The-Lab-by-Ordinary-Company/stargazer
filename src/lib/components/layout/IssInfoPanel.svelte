<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { iss } from '$stores/iss';
  import { issTle } from '$stores/issTle';
  import { crew } from '$lib/stores/issCrew';
  import { issLocation } from '$lib/stores/issLocation';
  import { formatLatLon, formatNumber } from '$utils/format';
  import SatellitePasses from './SatellitePasses.svelte';

  const data = iss.data;
  let issCrewNames = $derived($crew?.byCraft?.['ISS'] ?? []);

  let utcNow = $state(new Date());
  let interval: ReturnType<typeof setInterval>;
  onMount(() => { interval = setInterval(() => (utcNow = new Date()), 1000); });
  onDestroy(() => clearInterval(interval));
  let utcTime = $derived(
    utcNow.toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' }) + ' UTC'
  );
</script>

<div class="p-5">
  <!-- Header -->
  <div class="pb-4 border-b border-[#141414]/10">
    <div class="mono text-[9px] uppercase tracking-[0.22em] text-[#8A8A85] mb-2">NORAD 25544</div>
    <h2 class="font-display text-[1.5rem] leading-[1] tracking-[-0.02em] uppercase text-[#141414]">
      International Space Station
    </h2>
    <div class="flex items-center gap-2 mt-2">
      <span class="inline-block h-1.5 w-1.5 bg-[#E8441E] animate-pulse"></span>
      <span class="mono text-[9px] uppercase tracking-[0.16em] text-[#8A8A85]">Live · wheretheiss.at · 1 Hz</span>
    </div>
  </div>

  <!-- Telemetry spec rows -->
  <div class="mt-3">
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Position</span>
      <span class="mono text-[11px] text-[#141414] tabular-nums">
        {#if $data}{formatLatLon($data.latitude, $data.longitude)}{:else}--{/if}
      </span>
    </div>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Altitude</span>
      <span class="mono text-[11px] text-[#141414] tabular-nums">
        {#if $data}{formatNumber($data.altitudeKm, 1)} km{:else}--{/if}
      </span>
    </div>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Velocity</span>
      <span class="mono text-[11px] text-[#E8441E] tabular-nums">
        {#if $data}{formatNumber($data.velocityKmh, 0)} km/h{:else}--{/if}
      </span>
    </div>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Visibility</span>
      <span class="mono text-[11px] text-[#141414] capitalize">
        {#if $data}{$data.visibility}{:else}--{/if}
      </span>
    </div>
    {#if $issLocation}
      <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
        <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Above</span>
        <span class="mono text-[11px] text-[#141414] text-right max-w-[55%]">{$issLocation.description}</span>
      </div>
    {/if}
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Station clock</span>
      <span class="mono text-[11px] text-[#141414] tabular-nums">{utcTime}</span>
    </div>
  </div>
</div>

<!-- Crew -->
<div class="border-t border-[#141414]/10 p-5">
  <div class="flex items-baseline justify-between mb-3">
    <span class="mono text-[9px] uppercase tracking-[0.22em] text-[#E8441E]">Crew aboard</span>
    {#if $crew}
      <span class="mono text-[10px] text-[#8A8A85]">{issCrewNames.length}</span>
    {/if}
  </div>
  {#if $crew}
    {#if issCrewNames.length === 0}
      <div class="mono text-[10px] text-[#8A8A85]">Roster unavailable</div>
    {:else}
      <div class="space-y-0">
        {#each issCrewNames as name (name)}
          <div class="py-2 border-b border-[#141414]/8 mono text-[11px] text-[#141414]">{name}</div>
        {/each}
      </div>
    {/if}
  {:else}
    <div class="mono text-[10px] text-[#8A8A85]">Loading...</div>
  {/if}
</div>

<SatellitePasses tleStore={issTle} />

<!-- Live video -->
<div class="border-t border-[#141414]/10 p-5">
  <span class="mono text-[9px] uppercase tracking-[0.22em] text-[#E8441E] block mb-3">NASA TV</span>
  <div class="aspect-video w-full overflow-hidden border border-[#141414]/12 bg-[#141414]">
    <iframe
      src="https://www.youtube.com/embed/live_stream?channel=UCLA_DiR1FfKNvjuUpBHmylQ&autoplay=0&playsinline=1"
      title="NASA Live Stream"
      class="h-full w-full"
      allow="encrypted-media; picture-in-picture"
      allowfullscreen
      loading="lazy"
    ></iframe>
  </div>
  <a
    href="https://www.nasa.gov/live"
    target="_blank"
    rel="noreferrer"
    class="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 border border-[#141414] text-[11px] uppercase tracking-[0.16em] text-[#141414] transition-[background-color,color] duration-150 hover:bg-[#141414] hover:text-white active:scale-[0.96]"
  >
    Watch on NASA TV
    <svg viewBox="0 0 16 16" fill="none" class="h-3 w-3"><path d="M6 3h7v7M13 3 4 12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
  </a>
</div>

<div class="border-t border-[#141414]/8 px-5 py-4">
  <p class="mono text-[9px] leading-[1.6] text-[#8A8A85]">
    Position via <a href="https://wheretheiss.at/w/developer" target="_blank" rel="noreferrer" class="text-[#E8441E] hover:underline">wheretheiss.at</a>. Orbit via NORAD TLE + SGP4.
  </p>
</div>
