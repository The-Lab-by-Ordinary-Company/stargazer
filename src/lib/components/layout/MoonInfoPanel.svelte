<script lang="ts">
  import { moon } from '$lib/stores/moon';
  import { formatLatLon, formatNumber } from '$utils/format';

  function phaseSvg(synodicAngle: number, waxing: boolean): string {
    const phaseRad = ((synodicAngle - 180) * Math.PI) / 180;
    const cosPhi = Math.cos(phaseRad);
    const r = 18, cx = 20, cy = 20;
    const sweep = waxing ? 1 : 0;
    const rx = Math.abs(cosPhi) * r;
    return `<svg width="44" height="44" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="${cx}" cy="${cy}" r="${r}" fill="#1a1a1a" stroke="rgba(15,23,42,0.25)" stroke-width="1" /><path d="M ${cx} ${cy - r} A ${rx} ${r} 0 0 ${cosPhi >= 0 ? sweep : 1 - sweep} ${cx} ${cy + r} A ${r} ${r} 0 0 ${waxing ? 1 : 0} ${cx} ${cy - r} Z" fill="#f5f5f5" /></svg>`;
  }
</script>

<div class="p-5">
  <div class="pb-4 border-b border-[#141414]/10">
    <div class="flex items-center gap-3">
      <div class="flex-shrink-0">{@html phaseSvg($moon.synodicAngle, $moon.waxing)}</div>
      <div>
        <h2 class="font-display text-[1.5rem] leading-[1] tracking-[-0.02em] uppercase text-[#141414]">The Moon</h2>
        <div class="mono mt-1 text-[10px] uppercase tracking-[0.18em] text-[#E8441E]">
          {$moon.phaseName} · {Math.round($moon.illumination * 100)}%
        </div>
        <div class="flex items-center gap-2 mt-1.5">
          <span class="inline-block h-1.5 w-1.5 bg-[#E8441E] animate-pulse"></span>
          <span class="mono text-[9px] uppercase tracking-[0.16em] text-[#8A8A85]">Live · Meeus ephemeris</span>
        </div>
      </div>
    </div>
  </div>

  <div class="mt-3">
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Sub-lunar point</span>
      <span class="mono text-[11px] text-[#E8441E] tabular-nums">{formatLatLon($moon.lat, $moon.lon)}</span>
    </div>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Distance</span>
      <span class="mono text-[11px] text-[#141414] tabular-nums">{formatNumber($moon.distanceKm, 0)} km</span>
    </div>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Age</span>
      <span class="mono text-[11px] text-[#141414] tabular-nums">{$moon.ageDays.toFixed(1)} days</span>
    </div>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Phase angle</span>
      <span class="mono text-[11px] text-[#141414] tabular-nums">{$moon.synodicAngle.toFixed(1)}°</span>
    </div>
  </div>

  <div class="mt-4 pt-3 border-t border-[#141414]/8">
    <p class="text-[11px] leading-[1.7] text-[#5A5A55]">
      Tidally locked, lit by the same sun as Earth. Verify against
      <a class="text-[#E8441E] hover:underline" href="https://www.timeanddate.com/moon/phases/" target="_blank" rel="noreferrer">timeanddate.com</a>
      or <a class="text-[#E8441E] hover:underline" href="https://moon.nasa.gov/" target="_blank" rel="noreferrer">moon.nasa.gov</a>.
    </p>
  </div>
</div>
