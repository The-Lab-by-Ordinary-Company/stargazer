<script lang="ts">
  import { TRACKED_OBJECTS } from '$lib/registry/registry';
  import BodyLabel from './BodyLabel.svelte';

  /**
   * Single component that mounts one BodyLabel per registered tracked
   * object. Each child label manages its own per-frame visibility,
   * world position, and selection emphasis — this layer just iterates
   * the registry once at mount and lets the children handle the rest.
   *
   * Mounted in `World.svelte` after all the body geometry, so labels
   * render on top of the scene through Threlte's HTML helper.
   *
   * Adding a new body to the registry automatically gives it a label
   * (with the body's `labelTier` controlling when it shows). No edits
   * needed here.
   */
</script>

{#each TRACKED_OBJECTS as obj (obj.id)}
  <BodyLabel object={obj} />
{/each}
