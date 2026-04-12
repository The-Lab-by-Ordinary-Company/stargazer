<script lang="ts">
  import { selection } from '$lib/stores/selection';
  import { iss } from '$lib/stores/iss';
  import { tiangong } from '$lib/stores/tiangong';
  // Importing these for their auto-init side effects (browser-only stores)
  import '$lib/stores/issCrew';
  import '$lib/stores/issLocation';
  import { formatRelativeTime } from '$utils/format';
  import EarthInfoPanel from './EarthInfoPanel.svelte';
  import MoonInfoPanel from './MoonInfoPanel.svelte';
  import MarsInfoPanel from './MarsInfoPanel.svelte';
  import SolarSystemInfoPanel from './SolarSystemInfoPanel.svelte';
  import IssInfoPanel from './IssInfoPanel.svelte';
  import TiangongInfoPanel from './TiangongInfoPanel.svelte';
  import GenericBodyPanel from './GenericBodyPanel.svelte';
  import WelcomePanel from './WelcomePanel.svelte';

  // Live freshness indicator pulled from whichever satellite store is active
  const issStatus = iss.status;
  const issData = iss.data;
  const tiangongStatus = tiangong.status;
  const tiangongData = tiangong.data;

  let now = $state(Date.now());
  $effect(() => {
    const id = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(id);
  });

  let activeStatus = $derived($selection === 'tiangong' ? $tiangongStatus : $issStatus);
  let activeTimestamp = $derived(
    $selection === 'tiangong' ? $tiangongData?.timestamp : $issData?.timestamp
  );
  let lastPing = $derived(activeTimestamp ? formatRelativeTime(activeTimestamp) : '—');
  $effect(() => {
    void now;
  });
</script>

<div
  class="flex flex-col"
>
  {#if $selection === 'iss'}
    <IssInfoPanel />
  {:else if $selection === 'tiangong'}
    <TiangongInfoPanel />
  {:else if $selection === 'moon'}
    <MoonInfoPanel />
  {:else if $selection === 'mars'}
    <MarsInfoPanel />
  {:else if $selection === 'earth'}
    <EarthInfoPanel />
  {:else if $selection === 'solarSystem'}
    <WelcomePanel />
  {:else}
    <!-- Fallback for any registry body without a dedicated info panel. -->
    <GenericBodyPanel bodyId={$selection} />
  {/if}
</div>
