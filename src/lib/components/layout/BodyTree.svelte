<script lang="ts">
  import { selection, SOLAR_SYSTEM_VIEW } from '$lib/stores/selection';
  import { hiddenTypes } from '$stores/typeFilter';
  import { TRACKED_OBJECTS, getChildren } from '$lib/registry/registry';
  import {
    isPointMarker,
    isSatelliteMarker,
    type ObjectType,
    type SatelliteCategory,
    type TrackedObject
  } from '$lib/registry/types';
  import { cn } from '$utils/cn';

  /**
   * Hierarchical body tree built from the registry's parent
   * relationships. Each node is one TrackedObject and its children
   * (recursively) are the registry entries whose `parent` field
   * matches.
   *
   * The tree always shows a special "Solar System" view at the top
   * (the wide overview camera, NOT a registry body). Below it, the
   * Sun is the natural root of the parent chain — clicking the Sun
   * zooms in on its surface, clicking Solar System backs out to the
   * overview.
   *
   * Search filtering: when `query` is non-empty, the tree flattens to
   * a list of bodies whose name matches (case-insensitive substring),
   * along with their ancestor chain so context is preserved.
   */

  let {
    query = ''
  }: {
    query?: string;
  } = $props();

  // Track which non-leaf nodes are expanded. Default: every node with
  // at least one child gets expanded so the user sees the entire tree
  // at first glance. They can collapse by clicking the ▾ chevron.
  const initiallyExpanded: Set<string> = (() => {
    const set = new Set<string>();
    for (const obj of TRACKED_OBJECTS) {
      if (getChildren(obj.id).length > 0) {
        set.add(obj.id);
      }
    }
    return set;
  })();
  let expanded = $state<Set<string>>(new Set(initiallyExpanded));

  function toggleExpand(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expanded = next;
  }

  function selectBody(id: string) {
    selection.set(id);
  }

  // ── Search ─────────────────────────────────────────────────────────────
  let normalizedQuery = $derived(query.trim().toLowerCase());
  let isSearching = $derived(normalizedQuery.length > 0);

  let searchMatches = $derived.by(() => {
    if (!isSearching) return [] as TrackedObject[];
    const hidden = $hiddenTypes;
    return TRACKED_OBJECTS.filter(
      (obj) => !hidden.has(obj.type) && obj.name.toLowerCase().includes(normalizedQuery)
    );
  });

  // ── Tree rendering ─────────────────────────────────────────────────────
  // Root-level bodies are those with parent === null. Currently just the
  // Sun, but the Sun's children (planets, dwarf planets, heliocentric
  // spacecraft) are rendered recursively below. We never hide the Sun
  // itself even if 'star' is filtered out — it's the structural root.
  let rootBodies = $derived(
    TRACKED_OBJECTS.filter((obj) => obj.parent === null)
  );

  // Type priority for sorting children within a parent. Lower = appears
  // first. Order is biggest natural body → smallest natural body →
  // human craft, with comets last because they're the most exotic.
  const TYPE_ORDER: Record<ObjectType, number> = {
    star: 0,
    planet: 1,
    'dwarf-planet': 2,
    moon: 3,
    asteroid: 4,
    comet: 5,
    'earth-satellite': 6,
    spacecraft: 7,
    lander: 8,
    neo: 9
  };

  // Order in which satellite categories render within the earth-satellite
  // group. Lower = earlier. Matches the SatelliteCategory enum semantics:
  // crewed first, then scientific, then operational utility.
  const SATELLITE_CATEGORY_ORDER: Record<SatelliteCategory, number> = {
    'space-station': 0,
    science: 1,
    weather: 2,
    'earth-observation': 3,
    navigation: 4,
    communication: 5,
    internet: 6
  };

  /** Friendly label for each satellite category, used as the tree divider. */
  const SATELLITE_CATEGORY_LABEL: Record<SatelliteCategory, string> = {
    'space-station': 'Space stations',
    science: 'Science telescopes',
    weather: 'Weather',
    'earth-observation': 'Earth observation',
    navigation: 'Navigation',
    communication: 'Communication',
    internet: 'Internet'
  };

  /**
   * Pull the satellite category off any TrackedObject. Earth-orbit
   * satellites can be either rendererKind 'satellite-marker' (ISS,
   * Tiangong with the IssModel mesh) or 'point-marker' (the curated
   * fleet rendered as constant-pixel dots), so we check both shapes.
   */
  function getSatelliteCategory(obj: TrackedObject): SatelliteCategory | undefined {
    if (isSatelliteMarker(obj)) return obj.metadata.satelliteCategory;
    if (isPointMarker(obj)) return obj.metadata.satelliteCategory;
    return undefined;
  }

  function sortedChildren(parentId: string, hidden: Set<ObjectType>): TrackedObject[] {
    return getChildren(parentId)
      .filter((c) => !hidden.has(c.type))
      .slice()
      .sort((a, b) => {
        // Primary sort: by type (planets → moons → satellites → spacecraft)
        const ta = TYPE_ORDER[a.type] ?? 99;
        const tb = TYPE_ORDER[b.type] ?? 99;
        if (ta !== tb) return ta - tb;

        // Secondary sort: within earth-satellite, by category
        if (a.type === 'earth-satellite' && b.type === 'earth-satellite') {
          const ca = getSatelliteCategory(a);
          const cb = getSatelliteCategory(b);
          const ka = ca ? SATELLITE_CATEGORY_ORDER[ca] ?? 99 : 99;
          const kb = cb ? SATELLITE_CATEGORY_ORDER[cb] ?? 99 : 99;
          if (ka !== kb) return ka - kb;
        }

        // Tertiary sort: by name
        return a.name.localeCompare(b.name);
      });
  }

  /**
   * Interleave category divider markers into a sorted list of children.
   * For each consecutive run of `earth-satellite` bodies that share a
   * category, emit a divider marker right before the first body in that
   * run. Non-satellite items pass through unchanged.
   *
   * The result is a flat list the snippet iterates once, rendering
   * either a body row or a divider depending on the marker kind.
   */
  type TreeRow =
    | { kind: 'body'; body: TrackedObject }
    | { kind: 'divider'; label: string; key: string };

  function withCategoryDividers(children: TrackedObject[]): TreeRow[] {
    const rows: TreeRow[] = [];
    let lastCategory: SatelliteCategory | undefined = undefined;
    for (const child of children) {
      if (child.type === 'earth-satellite') {
        const category = getSatelliteCategory(child);
        if (category && category !== lastCategory) {
          rows.push({
            kind: 'divider',
            label: SATELLITE_CATEGORY_LABEL[category],
            key: `__cat:${category}`
          });
        }
        lastCategory = category;
      } else {
        // Non-satellite item resets the category tracking so a new
        // satellite group later (if any) gets its first divider.
        lastCategory = undefined;
      }
      rows.push({ kind: 'body', body: child });
    }
    return rows;
  }

  // Convenience for the Solar System overview row.
  let solarSystemActive = $derived($selection === SOLAR_SYSTEM_VIEW);

  /** Pretty type label used in the search results list. */
  function typeLabel(type: ObjectType): string {
    switch (type) {
      case 'star':
        return 'Star';
      case 'planet':
        return 'Planet';
      case 'dwarf-planet':
        return 'Dwarf planet';
      case 'moon':
        return 'Moon';
      case 'asteroid':
        return 'Asteroid';
      case 'comet':
        return 'Comet';
      case 'earth-satellite':
        return 'Satellite';
      case 'spacecraft':
        return 'Spacecraft';
      case 'lander':
        return 'Lander';
      case 'neo':
        return 'NEO';
      default:
        return type;
    }
  }

  /** Tiny SVG icon glyph for each object type — keeps the tree scannable. */
  function typeGlyph(type: ObjectType): string {
    switch (type) {
      case 'star':
        return '☉';
      case 'planet':
        return '○';
      case 'dwarf-planet':
        return '◌';
      case 'moon':
        return '◐';
      case 'asteroid':
        return '⬢';
      case 'comet':
        return '☄';
      case 'earth-satellite':
        return '◇';
      case 'spacecraft':
        return '◈';
      case 'lander':
        return '▽';
      case 'neo':
        return '·';
      default:
        return '•';
    }
  }
</script>

{#if isSearching}
  <!-- Search results: flat list, no hierarchy. -->
  <ul class="space-y-1">
    {#if searchMatches.length === 0}
      <li class="mono px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-slate-600">
        No matches
      </li>
    {:else}
      {#each searchMatches as obj (obj.id)}
        {@const isActive = $selection === obj.id}
        <li>
          <button
            type="button"
            onclick={() => selectBody(obj.id)}
            class={cn(
              'group flex w-full items-center gap-2 rounded-none px-3 py-2 text-left transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.98]',
              isActive
                ? 'bg-gradient-to-r from-[#141414] to-[#141414] text-white'
                : 'text-slate-700 hover:bg-slate-100/85'
            )}
            aria-pressed={isActive}
          >
            <span
              class={cn(
                'mono w-4 text-center text-[12px]',
                isActive ? 'text-[#8A8A85]' : 'text-slate-400'
              )}
            >
              {typeGlyph(obj.type)}
            </span>
            <span class="flex-1 truncate font-display text-[12px] font-medium tracking-tight">
              {obj.name}
            </span>
            <span
              class={cn(
                'mono text-[9px] uppercase tracking-[0.16em]',
                isActive ? 'text-[#8A8A85]' : 'text-slate-400'
              )}
            >
              {typeLabel(obj.type)}
            </span>
          </button>
        </li>
      {/each}
    {/if}
  </ul>
{:else}
  <!-- Hierarchical tree -->
  <ul class="space-y-0.5">
    <!-- Solar System (special view at the top) -->
    <li>
      <button
        type="button"
        onclick={() => selectBody(SOLAR_SYSTEM_VIEW)}
        class={cn(
          'group flex w-full items-center gap-2 rounded-none px-3 py-2 text-left transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.98]',
          solarSystemActive
            ? 'bg-gradient-to-r from-[#141414] to-[#141414] text-white'
            : 'text-slate-700 hover:bg-slate-100/85'
        )}
        aria-pressed={solarSystemActive}
      >
        <span
          class={cn(
            'mono w-4 text-center text-[12px]',
            solarSystemActive ? 'text-[#8A8A85]' : 'text-slate-400'
          )}
        >
          ✦
        </span>
        <span class="flex-1 font-display text-[12px] font-medium tracking-tight">
          Solar System
        </span>
        <span
          class={cn(
            'mono text-[9px] uppercase tracking-[0.16em]',
            solarSystemActive ? 'text-[#8A8A85]' : 'text-slate-400'
          )}
        >
          Overview
        </span>
      </button>
    </li>

    <!-- Divider -->
    <li class="px-3 py-2">
      <div class="border-t border-slate-200/80"></div>
    </li>

    <!-- Body hierarchy -->
    {#each rootBodies as root (root.id)}
      {@render treeNode(root, 0)}
    {/each}
  </ul>
{/if}

{#snippet treeNode(node: TrackedObject, depth: number)}
  {@const children = sortedChildren(node.id, $hiddenTypes)}
  {@const hasChildren = children.length > 0}
  {@const isExpanded = expanded.has(node.id)}
  {@const isActive = $selection === node.id}
  <li>
    <div
      class={cn(
        'group flex items-center gap-1 rounded-none pr-2 transition-colors duration-150 ease-out',
        isActive ? 'bg-gradient-to-r from-[#141414] to-[#141414] text-white' : 'text-slate-700 hover:bg-slate-100/85'
      )}
      style={`padding-left: ${depth * 14 + 4}px`}
    >
      {#if hasChildren}
        <button
          type="button"
          onclick={() => toggleExpand(node.id)}
          class={cn(
            'flex h-6 w-5 flex-shrink-0 items-center justify-center text-[10px] transition-[color,scale] duration-150 ease-out active:scale-[0.92]',
            isActive ? 'text-[#8A8A85]' : 'text-slate-400 hover:text-slate-700'
          )}
          aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
          aria-expanded={isExpanded}
        >
          {isExpanded ? '▾' : '▸'}
        </button>
      {:else}
        <span class="h-6 w-5 flex-shrink-0"></span>
      {/if}
      <button
        type="button"
        onclick={() => selectBody(node.id)}
        class="flex flex-1 items-center gap-2 py-1.5 text-left transition-[scale] duration-150 ease-out active:scale-[0.98]"
        aria-pressed={isActive}
      >
        <span
          class={cn(
            'mono w-4 text-center text-[12px]',
            isActive ? 'text-[#8A8A85]' : 'text-slate-400'
          )}
        >
          {typeGlyph(node.type)}
        </span>
        <span class="flex-1 truncate font-display text-[12px] font-medium tracking-tight">
          {node.name}
        </span>
      </button>
    </div>

    {#if hasChildren && isExpanded}
      <ul class="space-y-0.5">
        {#each withCategoryDividers(children) as row (row.kind === 'body' ? row.body.id : row.key)}
          {#if row.kind === 'body'}
            {@render treeNode(row.body, depth + 1)}
          {:else}
            <li
              class="mono pt-1.5 pb-0.5 text-[8px] uppercase tracking-[0.16em] text-slate-400"
              style={`padding-left: ${(depth + 1) * 14 + 12}px`}
            >
              {row.label}
            </li>
          {/if}
        {/each}
      </ul>
    {/if}
  </li>
{/snippet}
