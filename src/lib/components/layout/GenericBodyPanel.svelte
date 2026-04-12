<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Vector3 } from 'three';
  import { getById, getWorldPosition } from '$lib/registry/registry';
  import {
    isPlanetBody,
    isPointMarker,
    type BaseObjectMetadata,
    type TrackedObject
  } from '$lib/registry/types';
  import { simTime } from '$stores/simTime';
  import { AU_TO_SCENE } from '$lib/scene-config';
  import { formatNumber } from '$utils/format';

  let { bodyId }: { bodyId: string } = $props();
  let obj: TrackedObject | undefined = $derived(getById(bodyId));

  let now = $state(new Date());
  let interval: ReturnType<typeof setInterval>;
  onMount(() => { interval = setInterval(() => (now = new Date()), 1000); });
  onDestroy(() => clearInterval(interval));

  const worldPos = new Vector3();
  const scratch = new Vector3();

  let liveState = $derived.by(() => {
    void now;
    if (!obj) return null;
    const pos = getWorldPosition(obj.id, $simTime, worldPos, scratch);
    if (!pos) return null;
    return { distanceAU: pos.length() / AU_TO_SCENE };
  });
</script>

{#snippet enrichedData(meta: BaseObjectMetadata)}
  <!-- Tracking status: inline, not a card -->
  {#if meta.tracking}
    <div class="stagger-in flex items-center gap-2 py-3 border-b border-[#141414]/10" style="animation-delay: 0ms">
      <span
        class="inline-block h-1.5 w-1.5 flex-shrink-0"
        class:bg-[#E8441E]={meta.tracking.mode === 'Live'}
        class:animate-pulse={meta.tracking.mode === 'Live'}
        class:bg-[#8A8A85]={meta.tracking.mode !== 'Live'}
      ></span>
      <span class="mono text-[9px] uppercase tracking-[0.16em] text-[#8A8A85]">
        {meta.tracking.mode}{#if meta.tracking.epoch} · {meta.tracking.epoch}{/if}
      </span>
      <span class="mono text-[8px] tracking-[0.12em] text-[#8A8A85]/60 ml-auto">
        {meta.tracking.source}
      </span>
    </div>
  {/if}

  <!-- Facts: spec-table rows with thin dividers -->
  {#if meta.facts && meta.facts.length > 0}
    <div class="stagger-in" style="animation-delay: 60ms">
      {#each meta.facts as fact (fact.label)}
        <div class="flex items-baseline justify-between gap-4 py-2.5 border-b border-[#141414]/8">
          <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85] flex-shrink-0">{fact.label}</span>
          <span class="mono text-[11px] text-[#141414] text-right">{fact.value}</span>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Description -->
  {#if meta.description}
    <p class="stagger-in mt-4 text-[11px] leading-[1.7] text-[#5A5A55]" style="animation-delay: 120ms">
      {meta.description}
    </p>
  {/if}

  <!-- Sources: footnote style -->
  {#if meta.sources && meta.sources.length > 0}
    <div class="stagger-in mt-4 pt-3 border-t border-[#141414]/8" style="animation-delay: 180ms">
      <span class="mono text-[8px] uppercase tracking-[0.18em] text-[#8A8A85] block mb-1.5">Sources</span>
      <div class="flex flex-wrap gap-x-3 gap-y-1">
        {#each meta.sources as source (source.url)}
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            class="mono text-[9px] text-[#E8441E] underline-offset-2 hover:underline"
          >
            {source.name}
          </a>
        {/each}
      </div>
    </div>
  {/if}
{/snippet}

{#if obj && isPlanetBody(obj)}
  <div class="p-5">
    <!-- Header: large name + subtitle + ID -->
    <div class="pb-4 border-b border-[#141414]/10">
      {#if obj.metadata.externalId}
        <div class="mono text-[9px] uppercase tracking-[0.22em] text-[#8A8A85] mb-2">{obj.metadata.externalId}</div>
      {/if}
      <h2 class="font-display text-[1.5rem] leading-[1] tracking-[-0.02em] uppercase text-[#141414]">
        {obj.name}
      </h2>
      {#if obj.metadata.subtitle}
        <div class="mono mt-1.5 text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">
          {obj.metadata.subtitle}
        </div>
      {/if}
    </div>

    <!-- Key specs: radius + day + year + distance as spec rows -->
    <div class="mt-3">
      <div class="flex items-baseline justify-between gap-4 py-2.5 border-b border-[#141414]/8">
        <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Eq. radius</span>
        <span class="mono text-[11px] text-[#141414]">{formatNumber(obj.metadata.radiusKm, 0)} km</span>
      </div>
      {#if obj.metadata.dayLength}
        <div class="flex items-baseline justify-between gap-4 py-2.5 border-b border-[#141414]/8">
          <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Day length</span>
          <span class="mono text-[11px] text-[#141414]">{obj.metadata.dayLength}</span>
        </div>
      {/if}
      {#if obj.metadata.yearLength}
        <div class="flex items-baseline justify-between gap-4 py-2.5 border-b border-[#141414]/8">
          <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Year length</span>
          <span class="mono text-[11px] text-[#141414]">{obj.metadata.yearLength}</span>
        </div>
      {/if}
      {#if liveState}
        <div class="flex items-baseline justify-between gap-4 py-2.5 border-b border-[#141414]/8">
          <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Sun distance</span>
          <span class="mono text-[11px] text-[#E8441E] tabular-nums">{liveState.distanceAU.toFixed(3)} AU</span>
        </div>
      {/if}
    </div>

    {@render enrichedData(obj.metadata)}
  </div>
{:else if obj && isPointMarker(obj)}
  <div class="p-5">
    <div class="pb-4 border-b border-[#141414]/10">
      {#if obj.metadata.externalId}
        <div class="mono text-[9px] uppercase tracking-[0.22em] text-[#8A8A85] mb-2">{obj.metadata.externalId}</div>
      {/if}
      <h2 class="font-display text-[1.5rem] leading-[1] tracking-[-0.02em] uppercase text-[#141414]">
        {obj.name}
      </h2>
      {#if obj.metadata.subtitle}
        <div class="mono mt-1.5 text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">
          {obj.metadata.subtitle}
        </div>
      {/if}
    </div>

    {#if liveState}
      <div class="mt-3">
        <div class="flex items-baseline justify-between gap-4 py-2.5 border-b border-[#141414]/8">
          <span class="mono text-[9px] uppercase tracking-[0.18em] text-[#8A8A85]">Sun distance</span>
          <span class="mono text-[11px] text-[#E8441E] tabular-nums">{liveState.distanceAU.toFixed(3)} AU</span>
        </div>
      </div>
    {/if}

    {@render enrichedData(obj.metadata)}
  </div>
{:else if obj}
  <div class="p-5">
    <div class="pb-4 border-b border-[#141414]/10">
      <h2 class="font-display text-[1.5rem] leading-[1] tracking-[-0.02em] uppercase text-[#141414]">
        {obj.name}
      </h2>
    </div>
    {@render enrichedData(obj.metadata)}
  </div>
{:else}
  <div class="p-5">
    <div class="mono text-[9px] uppercase tracking-[0.22em] text-[#8A8A85]">Unknown body: {bodyId}</div>
  </div>
{/if}

<style>
  @keyframes stagger-fade-up {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .stagger-in {
    animation: stagger-fade-up 200ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
</style>
