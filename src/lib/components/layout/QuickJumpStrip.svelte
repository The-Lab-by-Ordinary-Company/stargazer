<script lang="ts">
  import { selection, SOLAR_SYSTEM_VIEW } from '$lib/stores/selection';
  import { cn } from '$utils/cn';

  /**
   * Horizontal strip of "famous destinations" at the top of the body
   * tree. Lets the user jump to the most-clicked bodies in one tap
   * without scrolling the tree, mirroring NASA Eyes' quick-pick row.
   *
   * Each pill is a small button with a single-character glyph and the
   * body's short label. Pills overflow horizontally when the panel is
   * narrow — the parent uses overflow-x-auto so the user can scroll
   * the strip on small viewports.
   *
   * The active body's pill gets the dark "primary" treatment so the
   * user always sees what's currently in view.
   */

  type Destination = {
    id: string;
    label: string;
    glyph: string;
    title: string;
  };

  /**
   * Curated picks. Order roughly: overview → inner planets → outer
   * planets → famous moons / satellites → interstellar. The glyph is
   * a single Unicode character that hints at the body type without
   * needing per-body icons.
   */
  const DESTINATIONS: Destination[] = [
    { id: SOLAR_SYSTEM_VIEW, label: 'System', glyph: '✦', title: 'Solar System overview' },
    { id: 'sun', label: 'Sun', glyph: '☉', title: 'Sun' },
    { id: 'mercury', label: 'Mercury', glyph: '○', title: 'Mercury' },
    { id: 'venus', label: 'Venus', glyph: '○', title: 'Venus' },
    { id: 'earth', label: 'Earth', glyph: '○', title: 'Earth' },
    { id: 'moon', label: 'Moon', glyph: '◐', title: "Earth's Moon" },
    { id: 'mars', label: 'Mars', glyph: '○', title: 'Mars' },
    { id: 'jupiter', label: 'Jupiter', glyph: '○', title: 'Jupiter' },
    { id: 'saturn', label: 'Saturn', glyph: '○', title: 'Saturn' },
    { id: 'uranus', label: 'Uranus', glyph: '○', title: 'Uranus' },
    { id: 'neptune', label: 'Neptune', glyph: '○', title: 'Neptune' },
    { id: 'pluto', label: 'Pluto', glyph: '◌', title: 'Pluto' },
    { id: 'iss', label: 'ISS', glyph: '◇', title: 'International Space Station' },
    { id: 'jwst', label: 'JWST', glyph: '◈', title: 'James Webb Space Telescope' },
    { id: 'voyager-1', label: 'Voyager 1', glyph: '◈', title: 'Voyager 1' }
  ];

  function pick(id: string): void {
    selection.set(id);
  }
</script>

<div
  class="-mx-1 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin"
  role="toolbar"
  aria-label="Quick jump destinations"
>
  {#each DESTINATIONS as dest (dest.id)}
    {@const isActive = $selection === dest.id}
    <button
      type="button"
      onclick={() => pick(dest.id)}
      class={cn(
        'group inline-flex flex-shrink-0 items-center gap-1.5 rounded-none border px-2.5 py-1 mono text-[9px] font-medium uppercase tracking-[0.14em]',
        'transition-[background-color,border-color,color,scale,box-shadow] duration-150 ease-out active:scale-[0.94]',
        isActive
          ? 'border-transparent bg-[#141414] text-white shadow-[0_2px_8px_rgba(15,23,42,0.18)]'
          : 'border-slate-200/85 bg-[#F0ECE4] text-slate-700 hover:bg-[#F5F0E8] hover:border-slate-300/85'
      )}
      aria-pressed={isActive}
      title={dest.title}
    >
      <span
        class={cn(
          'mono text-[11px] leading-none',
          isActive ? 'text-[#8A8A85]' : 'text-slate-400'
        )}
        aria-hidden="true"
      >
        {dest.glyph}
      </span>
      <span>{dest.label}</span>
    </button>
  {/each}
</div>
