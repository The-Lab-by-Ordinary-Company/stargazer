<script lang="ts">
  import { get } from 'svelte/store';
  import { TRACKED_OBJECTS, getById, getChildren } from '$lib/registry/registry';
  import { selection, SOLAR_SYSTEM_VIEW } from '$lib/stores/selection';
  import type { ObjectType } from '$lib/registry/types';

  let { open = $bindable(false) }: { open: boolean } = $props();

  let query = $state('');
  let activeCategory = $state<ObjectType | null>(null);
  let highlightIndex = $state(0);
  let inputEl = $state<HTMLInputElement | null>(null);

  // ── Recently visited (persists in sessionStorage) ──────────────
  const RECENTS_KEY = 'stargazer_recents';
  const MAX_RECENTS = 5;

  function getRecents(): string[] {
    if (typeof sessionStorage === 'undefined') return [];
    try { return JSON.parse(sessionStorage.getItem(RECENTS_KEY) || '[]'); }
    catch { return []; }
  }

  function pushRecent(id: string): void {
    if (typeof sessionStorage === 'undefined' || id === SOLAR_SYSTEM_VIEW) return;
    const list = getRecents().filter((r) => r !== id);
    list.unshift(id);
    sessionStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, MAX_RECENTS)));
  }

  let recents = $state<string[]>([]);

  // ── Categories ─────────────────────────────────────────────────
  const CATEGORIES: { type: ObjectType; label: string; glyph: string; count: number }[] = [
    { type: 'planet', label: 'Planets', glyph: '○', count: TRACKED_OBJECTS.filter(o => o.type === 'planet').length },
    { type: 'moon', label: 'Moons', glyph: '◐', count: TRACKED_OBJECTS.filter(o => o.type === 'moon').length },
    { type: 'earth-satellite', label: 'Satellites', glyph: '◇', count: TRACKED_OBJECTS.filter(o => o.type === 'earth-satellite').length },
    { type: 'spacecraft', label: 'Spacecraft', glyph: '◈', count: TRACKED_OBJECTS.filter(o => o.type === 'spacecraft' || o.type === 'lander').length },
    { type: 'asteroid', label: 'Rocks', glyph: '⬢', count: TRACKED_OBJECTS.filter(o => o.type === 'asteroid' || o.type === 'comet' || o.type === 'dwarf-planet').length },
  ];

  // ── Contextual "near this body" ────────────────────────────────
  let nearbyBodies = $derived.by(() => {
    const sel = get(selection);
    if (sel === SOLAR_SYSTEM_VIEW) return [];
    const obj = getById(sel);
    if (!obj) return [];

    const nearby: { id: string; name: string; relation: string }[] = [];

    // Parent
    if (obj.parent) {
      const parent = getById(obj.parent);
      if (parent) nearby.push({ id: parent.id, name: parent.name, relation: 'Parent' });
    }

    // Children (moons of this planet, orbiters, etc.)
    const children = getChildren(obj.id);
    for (const child of children.slice(0, 6)) {
      nearby.push({ id: child.id, name: child.name, relation: child.type === 'moon' ? 'Moon' : child.type === 'lander' ? 'Lander' : 'Orbiter' });
    }

    // Siblings (other children of same parent, excluding self)
    if (obj.parent) {
      const siblings = getChildren(obj.parent).filter(s => s.id !== obj.id);
      for (const sib of siblings.slice(0, 4)) {
        if (!nearby.some(n => n.id === sib.id)) {
          nearby.push({ id: sib.id, name: sib.name, relation: 'Nearby' });
        }
      }
    }

    return nearby.slice(0, 8);
  });

  // ── Preview on highlight ───────────────────────────────────────
  let previewText = $derived.by(() => {
    const items = allItems;
    if (highlightIndex < 0 || highlightIndex >= items.length) return '';
    const item = items[highlightIndex];
    const obj = getById(item.id);
    if (!obj) return '';
    return obj.metadata.subtitle ?? '';
  });

  // ── Search + results ───────────────────────────────────────────
  let normalized = $derived(query.trim().toLowerCase());
  let isSearching = $derived(normalized.length > 0);

  let searchResults = $derived.by(() => {
    if (!isSearching) return [];
    // Simple fuzzy: check if all chars appear in order
    const chars = normalized.split('');
    return TRACKED_OBJECTS
      .filter((o) => {
        const name = o.name.toLowerCase();
        // Substring match first
        if (name.includes(normalized)) return true;
        // Fuzzy: all chars in order
        let ci = 0;
        for (const ch of name) {
          if (ch === chars[ci]) ci++;
          if (ci >= chars.length) return true;
        }
        return false;
      })
      .slice(0, 14)
      .map((o) => ({ id: o.id, name: o.name }));
  });

  let categoryResults = $derived.by(() => {
    if (!activeCategory) return [];
    const types: ObjectType[] = activeCategory === 'spacecraft'
      ? ['spacecraft', 'lander']
      : activeCategory === 'asteroid'
        ? ['asteroid', 'comet', 'dwarf-planet']
        : [activeCategory];
    return TRACKED_OBJECTS
      .filter((o) => types.includes(o.type))
      .map((o) => ({ id: o.id, name: o.name }));
  });

  // Unified item list for keyboard navigation
  let allItems = $derived.by((): { id: string; name: string }[] => {
    if (isSearching) return searchResults;
    if (activeCategory) return categoryResults;
    return [];
  });

  // ── State management ───────────────────────────────────────────
  $effect(() => {
    if (open) {
      query = '';
      activeCategory = null;
      highlightIndex = 0;
      recents = getRecents();
      setTimeout(() => inputEl?.focus(), 50);
    }
  });

  $effect(() => {
    if (highlightIndex >= allItems.length) highlightIndex = Math.max(0, allItems.length - 1);
  });

  function selectItem(id: string): void {
    pushRecent(id);
    selection.set(id);
    open = false;
  }

  function feelingLucky(): void {
    const random = TRACKED_OBJECTS[Math.floor(Math.random() * TRACKED_OBJECTS.length)];
    selectItem(random.id);
  }

  function toggleCategory(type: ObjectType): void {
    activeCategory = activeCategory === type ? null : type;
    highlightIndex = 0;
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (allItems.length > 0) highlightIndex = (highlightIndex + 1) % allItems.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (allItems.length > 0) highlightIndex = (highlightIndex - 1 + allItems.length) % allItems.length;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems.length > 0 && allItems[highlightIndex]) selectItem(allItems[highlightIndex].id);
      else if (!isSearching && !activeCategory) feelingLucky();
    } else if (e.key === 'Escape') {
      if (activeCategory) activeCategory = null;
      else open = false;
    }
  }

  function onGlobalKey(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === '/' && !open) { e.preventDefault(); open = true; }
  }
</script>

<svelte:window onkeydown={onGlobalKey} />

{#if open}
  <button
    type="button"
    class="fixed inset-0 z-[60] bg-[#141414]/40 backdrop-blur-sm cursor-default border-0 p-0"
    onclick={() => (open = false)}
    tabindex="-1"
    aria-label="Close"
  ></button>

  <div
    class="fixed top-[20%] sm:top-[12%] left-1/2 -translate-x-1/2 z-[61] w-[min(95vw,460px)] max-h-[70dvh] overflow-y-auto border border-[#141414]/15 bg-[#F5F0E8] shadow-[0_24px_80px_rgba(0,0,0,0.25)]"
    role="dialog"
    aria-label="Search bodies"
  >
    <!-- Input -->
    <div class="border-b border-[#141414]/10 p-3 flex items-center gap-3">
      <svg viewBox="0 0 16 16" fill="none" class="h-4 w-4 text-[#8A8A85] flex-shrink-0" aria-hidden="true">
        <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.4" />
        <path d="M10.5 10.5l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
      </svg>
      <input
        bind:this={inputEl}
        bind:value={query}
        onkeydown={onKeydown}
        type="text"
        placeholder="Search the solar system..."
        class="flex-1 bg-transparent text-[14px] text-[#141414] outline-none placeholder:text-[#8A8A85] mono"
      />
      <kbd class="mono text-[9px] text-[#8A8A85] border border-[#141414]/10 px-1.5 py-0.5">ESC</kbd>
    </div>

    <!-- Inline preview -->
    {#if previewText && (isSearching || activeCategory)}
      <div class="px-3 py-1.5 border-b border-[#141414]/8 mono text-[9px] text-[#8A8A85] truncate">
        {previewText}
      </div>
    {/if}

    {#if !isSearching}
      <!-- Categories -->
      <div class="border-b border-[#141414]/10 p-2 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
        {#each CATEGORIES as cat (cat.type)}
          <button
            type="button"
            onclick={() => toggleCategory(cat.type)}
            class="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 mono text-[10px] uppercase tracking-[0.12em] transition-[background-color,color] duration-100 {activeCategory === cat.type ? 'bg-[#E8441E] text-white' : 'text-[#141414] hover:bg-[#141414]/5'}"
          >
            <span class="text-[13px] leading-none">{cat.glyph}</span>
            <span>{cat.label}</span>
            <span class="text-[9px] {activeCategory === cat.type ? 'text-white/50' : 'text-[#8A8A85]'}">{cat.count}</span>
          </button>
        {/each}
      </div>
    {/if}

    <!-- Results area -->
    <div class="max-h-[340px] overflow-y-auto scrollbar-thin">
      {#if isSearching || activeCategory}
        <!-- Search or category results -->
        {#each allItems as item, i (item.id)}
          <button
            type="button"
            onclick={() => selectItem(item.id)}
            onpointerenter={() => (highlightIndex = i)}
            class="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-75 {i === highlightIndex ? 'bg-[#E8441E] text-white' : 'text-[#141414] hover:bg-[#141414]/5'}"
          >
            <span class="mono text-[12px] tracking-[0.02em] truncate">{item.name}</span>
          </button>
        {/each}
        {#if isSearching && allItems.length === 0}
          <div class="px-3 py-8 text-center mono text-[11px] text-[#8A8A85]">No matches</div>
        {/if}
      {:else}
        <!-- Empty state: contextual + recents + lucky -->

        <!-- Near current body -->
        {#if nearbyBodies.length > 0}
          <div class="px-3 pt-3 pb-1">
            <span class="mono text-[8px] uppercase tracking-[0.2em] text-[#8A8A85]">Near {getById(get(selection))?.name ?? 'here'}</span>
          </div>
          {#each nearbyBodies as nb (nb.id)}
            <button
              type="button"
              onclick={() => selectItem(nb.id)}
              class="w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors duration-75 text-[#141414] hover:bg-[#141414]/5"
            >
              <span class="mono text-[12px] tracking-[0.02em] truncate">{nb.name}</span>
              <span class="mono text-[9px] uppercase tracking-[0.16em] text-[#8A8A85]">{nb.relation}</span>
            </button>
          {/each}
        {/if}

        <!-- Recently visited -->
        {#if recents.length > 0}
          <div class="px-3 pt-3 pb-1 {nearbyBodies.length > 0 ? 'border-t border-[#141414]/8' : ''}">
            <span class="mono text-[8px] uppercase tracking-[0.2em] text-[#8A8A85]">Recent</span>
          </div>
          {#each recents as recentId (recentId)}
            {@const obj = getById(recentId)}
            {#if obj}
              <button
                type="button"
                onclick={() => selectItem(obj.id)}
                class="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors duration-75 text-[#141414] hover:bg-[#141414]/5"
              >
                <span class="mono text-[12px] tracking-[0.02em] truncate">{obj.name}</span>
              </button>
            {/if}
          {/each}
        {/if}

        <!-- Feeling lucky -->
        <div class="p-4 flex flex-col items-center gap-3 {nearbyBodies.length > 0 || recents.length > 0 ? 'border-t border-[#141414]/8' : ''}">
          <button
            type="button"
            onclick={feelingLucky}
            class="inline-flex h-10 items-center gap-2 px-6 border border-[#E8441E] text-[#E8441E] mono text-[11px] uppercase tracking-[0.14em] transition-[background-color,color,transform] duration-150 hover:bg-[#E8441E] hover:text-white active:scale-[0.96]"
          >
            <span class="text-[14px]">↯</span>
            I'm feeling lucky
          </button>
        </div>
      {/if}
    </div>

    <!-- Footer -->
    <div class="border-t border-[#141414]/10 px-3 py-2 flex items-center gap-4 mono text-[9px] text-[#8A8A85]">
      <span><kbd class="border border-[#141414]/10 px-1 py-0.5 mr-1">↑↓</kbd> Navigate</span>
      <span><kbd class="border border-[#141414]/10 px-1 py-0.5 mr-1">↵</kbd> Select</span>
      <span class="ml-auto"><kbd class="border border-[#141414]/10 px-1 py-0.5 mr-1">/</kbd> Open</span>
    </div>
  </div>
{/if}
