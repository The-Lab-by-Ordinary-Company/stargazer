<script lang="ts">
  import { mars } from '$stores/mars';
  import { formatLatLon, formatNumber } from '$utils/format';

  function formatLightTime(seconds: number): string {
    if (seconds < 60) return seconds.toFixed(0) + 's';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  }
</script>

<div class="p-5">
  <div class="pb-4 border-b border-[#141414]/10">
    <div class="mono text-[9px] uppercase tracking-[0.22em] text-[#8A8A85] mb-2">499</div>
    <h2 class="font-display text-[1.5rem] leading-[1] tracking-[-0.02em] uppercase text-[#141414]">Mars</h2>
    <div class="mono mt-1.5 text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Sol IV · The Red Planet</div>
    <div class="flex items-center gap-2 mt-2">
      <span class="inline-block h-1.5 w-1.5 bg-[#E8441E] animate-pulse"></span>
      <span class="mono text-[9px] uppercase tracking-[0.16em] text-[#8A8A85]">Live · Standish/Meeus ephemeris</span>
    </div>
  </div>

  <div class="mt-3">
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Eq. radius</span>
      <span class="mono text-[11px] text-[#141414]">3,389.5 km</span>
    </div>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Sol length</span>
      <span class="mono text-[11px] text-[#141414]">24h 39m 35s</span>
    </div>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Year length</span>
      <span class="mono text-[11px] text-[#141414]">687 Earth days</span>
    </div>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Moons</span>
      <span class="mono text-[11px] text-[#141414]">2 (Phobos · Deimos)</span>
    </div>
  </div>

  <!-- Live data -->
  <div class="mt-4 pt-3 border-t border-[#141414]/10">
    <span class="mono text-[9px] uppercase tracking-[0.22em] text-[#E8441E] block mb-3">Live ephemeris</span>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Distance</span>
      <span class="mono text-[11px] text-[#E8441E] tabular-nums">{formatNumber($mars.distanceKm / 1_000_000, 1)} M km</span>
    </div>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Light time</span>
      <span class="mono text-[11px] text-[#141414] tabular-nums">{formatLightTime($mars.lightTravelSec)}</span>
    </div>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Sub-Mars point</span>
      <span class="mono text-[11px] text-[#141414] tabular-nums">{formatLatLon($mars.lat, $mars.lon)}</span>
    </div>
  </div>

  <p class="mt-4 text-[11px] leading-[1.7] text-[#5A5A55]">
    Position computed live from Standish planetary ephemeris. Surface texture: NASA / MOLA color-shaded relief mosaic. Pole oriented to IAU 2018 Mars rotational elements.
  </p>
</div>
