<script lang="ts">
  /**
   * Small "?" affordance that reveals an explanation on hover or focus.
   * Use `align="right"` for cells in the right column of a grid so the
   * popover opens leftward and stays inside the panel.
   */
  let {
    text,
    align = 'left'
  }: { text: string; align?: 'left' | 'right' } = $props();
</script>

<span class="info-tooltip relative inline-flex">
  <button
    type="button"
    aria-label={text}
    class="relative inline-flex h-3.5 w-3.5 items-center justify-center rounded-none border border-slate-300 bg-white/60 text-[8px] font-semibold leading-none text-slate-400 transition-[border-color,background-color,color,scale] duration-150 ease-out hover:border-blue-300 hover:bg-white hover:text-blue-600 focus:border-blue-300 focus:text-blue-600 focus:outline-none active:scale-[0.92] after:absolute after:inset-0 after:-m-2 after:rounded-none after:content-['']"
  >
    ?
  </button>
  <span class="tooltip-content" class:right={align === 'right'}>{text}</span>
</span>

<style>
  .info-tooltip:hover .tooltip-content,
  .info-tooltip:focus-within .tooltip-content {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  .tooltip-content {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: auto;
    width: max-content;
    max-width: 220px;
    padding: 10px 12px;
    background: rgba(15, 23, 42, 0.95);
    color: rgba(241, 245, 249, 0.95);
    font-family:
      'Geist Variable',
      ui-sans-serif,
      system-ui,
      sans-serif;
    font-size: 10.5px;
    font-weight: 400;
    line-height: 1.55;
    letter-spacing: 0;
    text-transform: none;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow:
      0 12px 32px rgba(15, 23, 42, 0.32),
      0 4px 12px rgba(15, 23, 42, 0.18);
    z-index: 100;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-4px);
    /*
     * Specific properties only (the skill: never `transition: all`).
     * ease-out reads as "settling into place" which is what tooltips
     * should feel like when they appear.
     */
    transition-property: opacity, transform, visibility;
    transition-duration: 150ms;
    transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
    pointer-events: none;
    text-wrap: pretty;
  }

  .tooltip-content.right {
    left: auto;
    right: 0;
  }
</style>
