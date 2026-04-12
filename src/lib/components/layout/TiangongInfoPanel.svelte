<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { tiangong, tiangongTle } from '$stores/tiangong';
  import { crew } from '$stores/issCrew';
  import { tiangongLocation } from '$stores/issLocation';
  import { formatLatLon, formatNumber } from '$utils/format';
  import SatellitePasses from './SatellitePasses.svelte';

  const data = tiangong.data;
  let utcNow = $state(new Date());
  let interval: ReturnType<typeof setInterval>;
  onMount(() => { interval = setInterval(() => (utcNow = new Date()), 1000); });
  onDestroy(() => clearInterval(interval));
  let utcTime = $derived(utcNow.toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' }) + ' UTC');
  let tiangongCrew = $derived($crew?.byCraft?.['Tiangong'] ?? []);
</script>

<div class="p-5">
  <div class="pb-4 border-b border-[#141414]/10">
    <div class="mono text-[9px] uppercase tracking-[0.22em] text-[#8A8A85] mb-2">NORAD 48274</div>
    <h2 class="font-display text-[1.5rem] leading-[1] tracking-[-0.02em] uppercase text-[#141414]">Tiangong</h2>
    <div class="mono mt-1.5 text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Chinese Space Station</div>
    <div class="flex items-center gap-2 mt-2">
      <span class="inline-block h-1.5 w-1.5 bg-[#E8441E] animate-pulse"></span>
      <span class="mono text-[9px] uppercase tracking-[0.16em] text-[#8A8A85]">Live · Celestrak TLE + SGP4</span>
    </div>
  </div>
  <div class="mt-3">
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Position</span>
      <span class="mono text-[11px] text-[#141414] tabular-nums">{#if $data}{formatLatLon($data.latitude, $data.longitude)}{:else}--{/if}</span>
    </div>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Altitude</span>
      <span class="mono text-[11px] text-[#141414] tabular-nums">{#if $data}{formatNumber($data.altitudeKm, 1)} km{:else}--{/if}</span>
    </div>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Velocity</span>
      <span class="mono text-[11px] text-[#E8441E] tabular-nums">{#if $data}{formatNumber($data.velocityKmh, 0)} km/h{:else}--{/if}</span>
    </div>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Visibility</span>
      <span class="mono text-[11px] text-[#141414] capitalize">{#if $data}{$data.visibility}{:else}--{/if}</span>
    </div>
    {#if $tiangongLocation}
      <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
        <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Above</span>
        <span class="mono text-[11px] text-[#141414] text-right max-w-[55%]">{$tiangongLocation.description}</span>
      </div>
    {/if}
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Station clock</span>
      <span class="mono text-[11px] text-[#141414] tabular-nums">{utcTime}</span>
    </div>
  </div>
</div>

<div class="border-t border-[#141414]/10 p-5">
  <div class="flex items-baseline justify-between mb-3">
    <span class="mono text-[9px] uppercase tracking-[0.22em] text-[#E8441E]">Crew aboard</span>
    {#if $crew}<span class="mono text-[10px] text-[#8A8A85]">{tiangongCrew.length}</span>{/if}
  </div>
  {#if $crew}
    {#if tiangongCrew.length === 0}
      <div class="mono text-[10px] text-[#8A8A85]">Roster unavailable</div>
    {:else}
      {#each tiangongCrew as name (name)}
        <div class="py-2 border-b border-[#141414]/8 mono text-[11px] text-[#141414]">{name}</div>
      {/each}
    {/if}
  {:else}
    <div class="mono text-[10px] text-[#8A8A85]">Loading...</div>
  {/if}
</div>

<SatellitePasses tleStore={tiangongTle} />

<div class="border-t border-[#141414]/8 px-5 py-4">
  <p class="mono text-[9px] leading-[1.6] text-[#8A8A85]">
    Position via <a href="https://celestrak.org/NORAD/elements/gp.php?CATNR=48274&FORMAT=TLE" target="_blank" rel="noreferrer" class="text-[#E8441E] hover:underline">Celestrak TLE</a> + SGP4. Crew via <a href="http://api.open-notify.org/astros.json" target="_blank" rel="noreferrer" class="text-[#E8441E] hover:underline">open-notify</a>.
  </p>
</div>
