<script lang="ts">
  import BodyTree from './BodyTree.svelte';
  import TypeFilters from './TypeFilters.svelte';
  import QuickJumpStrip from './QuickJumpStrip.svelte';

  /**
   * The LeftPanel hosts navigation between every tracked body in
   * Stargazer. Built around the central registry, so adding new
   * planets / moons / spacecraft / NEOs / satellites in future waves
   * shows up here automatically without touching this file.
   *
   * Layout:
   *  - Logo / brand header
   *  - Search box (text filters the body tree)
   *  - Type filter chips (toggle visibility per object type — the
   *    user's main lever for narrowing the view to "just satellites"
   *    or "no asteroids" as the registry grows past 80 bodies)
   *  - Body tree (hierarchical, collapsible)
   */

  let searchQuery = $state('');
</script>

<div
  class="flex h-full w-[300px] flex-col"
>
  <!-- Logo / brand. Padding p-4 keeps the header concentric with the
       outer .panel radius (28 = 12 + 16) when sub-cards are 12px. -->
  <header class="flex flex-shrink-0 items-center gap-3 border-b border-slate-200/80 p-4">
    <div
      class="relative flex h-10 w-10 items-center justify-center rounded-none border border-blue-200/70 bg-gradient-to-br from-white to-blue-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
    >
      <svg viewBox="0 0 48 48" fill="none" class="h-5 w-5 text-blue-600" aria-hidden="true">
        <circle cx="24" cy="24" r="15" stroke="currentColor" stroke-width="1.6" opacity="0.9" />
        <circle cx="24" cy="24" r="3.5" fill="currentColor" />
        <ellipse cx="24" cy="24" rx="15" ry="5" stroke="currentColor" stroke-width="1.4" opacity="0.7" />
        <path d="M9 24H39" stroke="currentColor" stroke-width="1.2" opacity="0.35" />
      </svg>
    </div>
    <a
      href="/"
      class="font-display text-[15px] font-medium leading-none tracking-tight text-slate-900 transition-colors duration-150 ease-out hover:text-blue-700"
    >
      Stargazer
    </a>
  </header>

  <!-- Search + filter chips -->
  <div class="flex-shrink-0 border-b border-slate-200/80 p-4">
    <div class="relative">
      <svg
        viewBox="0 0 16 16"
        fill="none"
        class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 transition-colors duration-150 ease-out"
        aria-hidden="true"
      >
        <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.4" />
        <path d="M11 11l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
      </svg>
      <input
        type="search"
        bind:value={searchQuery}
        placeholder="Search bodies, satellites, missions…"
        class="w-full rounded-none border border-slate-200/85 bg-[#F0ECE4] py-2 pl-9 pr-3 font-display text-[12px] text-slate-800 outline-none placeholder:text-slate-400 transition-[background-color,border-color,box-shadow] duration-150 ease-out focus:border-[#8A8A85]/70 focus:bg-[#F5F0E8] focus:shadow-[0_0_0_3px_rgba(232,68,30,0.18)]"
      />
    </div>
    <div class="mt-3">
      <TypeFilters />
    </div>
    <div class="mt-3">
      <QuickJumpStrip />
    </div>
  </div>

  <!-- Tree -->
  <nav class="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-3">
    <BodyTree query={searchQuery} />
  </nav>
</div>
