<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

<svelte:head>
  <title>Stargazer · Live space data</title>
</svelte:head>

{@render children()}
