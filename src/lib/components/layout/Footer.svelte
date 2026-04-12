<script lang="ts">
  import KofiButton from './KofiButton.svelte';
</script>

<footer
  class="pointer-events-none absolute inset-x-0 bottom-0 z-50 flex items-end justify-end p-4 sm:p-6"
>
  <div
    class="pointer-events-auto flex items-center gap-3 panel-glass rounded-none px-4 py-2 mono text-[10px] uppercase tracking-[0.18em] text-slate-600"
  >
    <span>v0.1.0</span>
    <span class="text-slate-300">·</span>
    <a
      href="https://github.com"
      target="_blank"
      rel="noreferrer"
      class="hover:text-slate-900"
      aria-label="Source on GitHub">Open source</a
    >
    <span class="text-slate-300">·</span>
    <KofiButton />
  </div>
</footer>
