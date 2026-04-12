<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getSubsolarPoint } from '$utils/solar';
  import { formatLatLon } from '$utils/format';

  let now = $state(new Date());
  let interval: ReturnType<typeof setInterval>;
  onMount(() => { interval = setInterval(() => (now = new Date()), 1000); });
  onDestroy(() => clearInterval(interval));

  let subsolar = $derived(getSubsolarPoint(now));
  let utcTime = $derived(now.toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' }) + ' UTC');
</script>

<div class="p-5">
  <div class="pb-4 border-b border-[#141414]/10">
    <div class="mono text-[9px] uppercase tracking-[0.22em] text-[#8A8A85] mb-2">Sol III</div>
    <h2 class="font-display text-[1.5rem] leading-[1] tracking-[-0.02em] uppercase text-[#141414]">Earth</h2>
    <div class="flex items-center gap-2 mt-2">
      <span class="inline-block h-1.5 w-1.5 bg-[#E8441E] animate-pulse"></span>
      <span class="mono text-[9px] uppercase tracking-[0.16em] text-[#8A8A85]">Live · Standish/Meeus ephemeris</span>
    </div>
  </div>

  <div class="mt-3">
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Eq. radius</span>
      <span class="mono text-[11px] text-[#141414]">6,371 km</span>
    </div>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Day length</span>
      <span class="mono text-[11px] text-[#141414]">23h 56m 04s</span>
    </div>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Subsolar point</span>
      <span class="mono text-[11px] text-[#E8441E] tabular-nums">{formatLatLon(subsolar.lat, subsolar.lon)}</span>
    </div>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">UTC time</span>
      <span class="mono text-[11px] text-[#141414] tabular-nums">{utcTime}</span>
    </div>
  </div>

  <p class="mt-4 text-[11px] leading-[1.7] text-[#5A5A55]">
    The subsolar point is where the sun is directly overhead right now. The day/night terminator on the 3D Earth is computed from this value.
  </p>
</div>
