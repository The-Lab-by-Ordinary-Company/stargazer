<script lang="ts">
  import { iss } from '$stores/iss';
  import { formatRelativeTime } from '$utils/format';

  const status = iss.status;
  const data = iss.data;

  let now = $state(Date.now());
  $effect(() => {
    const id = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(id);
  });

  let lastPing = $derived($data ? formatRelativeTime($data.timestamp) : '—');
  // Consume `now` so the derived recomputes
  $effect(() => {
    void now;
  });
</script>

<header
  class="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-start justify-between p-4 sm:p-6"
>
  <div class="pointer-events-auto flex items-center gap-3">
    <div class="flex h-9 w-9 items-center justify-center border border-foreground bg-background">
      <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.4" />
        <ellipse cx="12" cy="12" rx="9" ry="3.2" stroke="currentColor" stroke-width="1.4" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      </svg>
    </div>
    <div class="leading-tight">
      <div class="mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        The Lab / Ordinary Co.
      </div>
      <div class="font-mono text-base font-semibold tracking-tight">Stargazer</div>
    </div>
  </div>

  <div class="pointer-events-auto flex items-center gap-2 panel-glass rounded-none px-3 py-2">
    <span
      class="inline-block h-1.5 w-1.5 rounded-none"
      class:bg-green-500={$status === 'ready'}
      class:bg-amber-500={$status === 'loading' || $status === 'idle'}
      class:bg-red-500={$status === 'error'}
    ></span>
    <span class="mono text-[11px] uppercase tracking-wider text-muted-foreground">
      {#if $status === 'ready'}
        ISS · live · {lastPing}
      {:else if $status === 'error'}
        ISS · offline
      {:else}
        ISS · connecting
      {/if}
    </span>
  </div>
</header>
