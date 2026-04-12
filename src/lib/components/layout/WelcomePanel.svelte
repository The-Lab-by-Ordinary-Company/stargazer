<script lang="ts">
  import { TRACKED_OBJECTS } from '$lib/registry/registry';
  import { crew } from '$lib/stores/issCrew';

  let bodyCount = TRACKED_OBJECTS.length;
  let planetCount = TRACKED_OBJECTS.filter((o) => o.type === 'planet').length;
  let moonCount = TRACKED_OBJECTS.filter((o) => o.type === 'moon').length;
  let spacecraftCount = TRACKED_OBJECTS.filter((o) => o.type === 'spacecraft' || o.type === 'lander').length;
  let satelliteCount = TRACKED_OBJECTS.filter((o) => o.type === 'earth-satellite').length;
  let issCrewCount = $derived($crew?.byCraft?.['ISS']?.length ?? 0);
</script>

<div class="p-5">
  <!-- Header -->
  <div class="pb-4 border-b border-[#141414]/10">
    <div class="mono text-[9px] uppercase tracking-[0.22em] text-[#8A8A85] mb-2">Overview</div>
    <h2 class="font-display text-[1.5rem] leading-[1] tracking-[-0.02em] uppercase text-[#141414]">
      Solar System
    </h2>
    <p class="mono mt-2 text-[10px] leading-[1.6] text-[#8A8A85]">
      Click any body in the scene, use the search drawer, or press arrow keys to explore.
    </p>
  </div>

  <!-- Registry stats as spec rows -->
  <div class="mt-3">
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Total tracked</span>
      <span class="font-display text-[1.1rem] text-[#E8441E] tabular-nums">{bodyCount}</span>
    </div>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Planets</span>
      <span class="mono text-[11px] text-[#141414] tabular-nums">{planetCount}</span>
    </div>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Moons</span>
      <span class="mono text-[11px] text-[#141414] tabular-nums">{moonCount}</span>
    </div>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Spacecraft</span>
      <span class="mono text-[11px] text-[#141414] tabular-nums">{spacecraftCount}</span>
    </div>
    <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
      <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Satellites</span>
      <span class="mono text-[11px] text-[#141414] tabular-nums">{satelliteCount}</span>
    </div>
    {#if issCrewCount > 0}
      <div class="flex items-baseline justify-between py-2.5 border-b border-[#141414]/8">
        <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Humans in space</span>
        <span class="mono text-[11px] text-[#E8441E] tabular-nums">{issCrewCount} aboard ISS</span>
      </div>
    {/if}
  </div>

  <!-- Keyboard shortcuts -->
  <div class="mt-5 pt-3 border-t border-[#141414]/8">
    <div class="mono text-[8px] uppercase tracking-[0.2em] text-[#8A8A85] mb-3">Keyboard</div>
    <div class="space-y-2 mono text-[10px] text-[#5A5A55]">
      <div class="flex justify-between"><span>Cycle bodies</span><span class="text-[#8A8A85]">← →</span></div>
      <div class="flex justify-between"><span>Pause / play</span><span class="text-[#8A8A85]">Space</span></div>
      <div class="flex justify-between"><span>Speed up / down</span><span class="text-[#8A8A85]">+ -</span></div>
      <div class="flex justify-between"><span>Search</span><span class="text-[#8A8A85]">/</span></div>
      <div class="flex justify-between"><span>Deselect</span><span class="text-[#8A8A85]">Esc</span></div>
    </div>
  </div>
</div>
