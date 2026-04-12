<script lang="ts">
  import { page } from '$app/state';
</script>

<div class="min-h-screen bg-[#141414] text-[#F5F0E8] flex flex-col items-center justify-center gap-8 px-6 text-center">
  <img src="/stargazer-mark.svg" alt="" width="120" height="120" class="h-24 w-24 sm:h-28 sm:w-28 opacity-80" />

  <div>
    <div class="font-display text-[4rem] sm:text-[6rem] leading-none tracking-[-0.03em] uppercase mb-2">
      {page.status}
    </div>
    <p class="mono text-[11px] uppercase tracking-[0.22em] text-[#8A8A85]">
      {#if page.status === 404}
        Lost in space — this page doesn't exist
      {:else}
        Something went wrong
      {/if}
    </p>
  </div>

  <a
    href="/app"
    class="inline-flex h-12 items-center px-8 bg-[#E8441E] text-white text-[13px] uppercase tracking-[0.18em] transition-[background-color,transform] duration-150 ease-out hover:bg-[#d03a15] active:scale-[0.96]"
  >
    Open Stargazer
  </a>
</div>
