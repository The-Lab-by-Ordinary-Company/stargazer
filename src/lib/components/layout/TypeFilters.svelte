<script lang="ts">
  import { hiddenTypes, toggleType, clearTypeFilter } from '$stores/typeFilter';
  import { TRACKED_OBJECTS } from '$lib/registry/registry';
  import type { ObjectType } from '$lib/registry/types';
  import { cn } from '$utils/cn';

  /**
   * Filter chip row. One pill per `ObjectType` in the registry, showing
   * the body count and letting the user toggle that type's visibility
   * across the LeftPanel tree, the search results, and (in a future
   * pass) the 3D scene labels.
   *
   * Visual states:
   *   - Active (visible)  → filled dark pill, white text, blue count
   *   - Inactive (hidden) → outlined translucent pill, slate text,
   *                         strikethrough on the label
   *
   * The "Reset" link only appears when something is hidden, so the
   * default state is a tidy single row of dark pills.
   */

  // Live counts per type — recomputed if the registry ever changes (it
  // doesn't at runtime today, but $derived future-proofs us).
  let typeCounts = $derived.by(() => {
    const counts: Partial<Record<ObjectType, number>> = {};
    for (const obj of TRACKED_OBJECTS) {
      counts[obj.type] = (counts[obj.type] ?? 0) + 1;
    }
    return counts;
  });

  // Pretty short labels (we have ~17 chars of width per pill).
  const TYPE_LABELS: Record<ObjectType, string> = {
    star: 'Star',
    planet: 'Planets',
    'dwarf-planet': 'Dwarfs',
    moon: 'Moons',
    asteroid: 'Asteroids',
    comet: 'Comets',
    'earth-satellite': 'Satellites',
    spacecraft: 'Craft',
    lander: 'Landers',
    neo: 'NEOs'
  };

  // Order in which the chips render. Matches the tree's TYPE_ORDER so
  // the user sees a consistent left-to-right "natural body → human craft"
  // progression. Star is omitted (always exactly 1 — the Sun) and NEO
  // is reserved for future passes.
  const FILTER_TYPES: ObjectType[] = [
    'planet',
    'dwarf-planet',
    'moon',
    'asteroid',
    'comet',
    'earth-satellite',
    'spacecraft',
    'lander'
  ];

  let hasAnyHidden = $derived($hiddenTypes.size > 0);
</script>

<div class="flex flex-wrap items-center gap-1.5">
  {#each FILTER_TYPES as type (type)}
    {@const count = typeCounts[type] ?? 0}
    {@const isHidden = $hiddenTypes.has(type)}
    {#if count > 0}
      <button
        type="button"
        onclick={() => toggleType(type)}
        class={cn(
          'inline-flex items-center gap-1.5 rounded-none px-2.5 py-1 mono text-[9px] uppercase tracking-[0.14em] transition-[background-color,color,opacity,scale] duration-150 ease-out active:scale-[0.94]',
          isHidden
            ? 'border border-slate-200/85 bg-[#F0ECE4] text-slate-400 line-through opacity-65 hover:opacity-100'
            : 'border border-transparent bg-[#141414] text-white shadow-[0_2px_8px_rgba(15,23,42,0.18)]'
        )}
        aria-pressed={!isHidden}
        title={isHidden ? `Show ${TYPE_LABELS[type]}` : `Hide ${TYPE_LABELS[type]}`}
      >
        <span>{TYPE_LABELS[type]}</span>
        <span
          class={cn(
            'tabular-nums',
            isHidden ? 'text-slate-400' : 'text-[#8A8A85]'
          )}
        >
          {count}
        </span>
      </button>
    {/if}
  {/each}

  {#if hasAnyHidden}
    <button
      type="button"
      onclick={clearTypeFilter}
      class="ml-1 inline-flex items-center rounded-none px-2 py-1 mono text-[9px] uppercase tracking-[0.14em] text-blue-700 transition-[color,scale] duration-150 ease-out hover:text-blue-900 active:scale-[0.94]"
    >
      Reset
    </button>
  {/if}
</div>
