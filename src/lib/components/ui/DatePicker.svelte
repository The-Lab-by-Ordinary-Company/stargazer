<script lang="ts">
  import { cn } from '$utils/cn';

  /**
   * Custom in-app date + time picker. Renders identically across
   * Chrome, Safari, and Firefox, since the native
   * `<input type="datetime-local">` does not (Chrome opens a popup,
   * Safari needs a click into the calendar, Firefox shows seconds
   * inline). All times are UTC, matching the rest of Stargazer's clock
   * display.
   *
   * Trigger:
   *   A compact pill showing "YYYY-MM-DD · HH:MM:SS" with a calendar
   *   glyph. Clicking opens a popover above (or below) the trigger.
   *
   * Popover:
   *   Header: «  ‹  Month YYYY  ›  »   (year jump, month step)
   *   Grid:   Mon-first, 7 columns × 6 rows. Today is emerald,
   *           selection is dark slate, spillover days are dimmed.
   *   Time:   three independent text fields (HH MM SS) committed on
   *           change/blur/Enter. Each field uses a draft buffer so
   *           external sim-time changes never blow away mid-edit text.
   *
   * The component is controlled: it never mutates internal state for
   * `value`. The parent receives a fresh Date via `onChange` and is
   * responsible for pushing it back as the next `value`.
   */

  let {
    value,
    onChange,
    ariaLabel = 'Pick date and time',
    placement = 'top'
  }: {
    value: Date;
    onChange: (next: Date) => void;
    ariaLabel?: string;
    /** Whether the popover opens above or below the trigger button. */
    placement?: 'top' | 'bottom';
  } = $props();

  // ── Popover open state ────────────────────────────────────────────────

  let open = $state(false);
  let popoverEl = $state<HTMLDivElement | null>(null);
  let triggerEl = $state<HTMLButtonElement | null>(null);

  // The view month is decoupled from `value` so the user can flip
  // through months without changing the time. It seeds from `value` on
  // every popover open so the first thing they see is the current month.
  // svelte-ignore state_referenced_locally
  let viewYear = $state(value.getUTCFullYear());
  // svelte-ignore state_referenced_locally
  let viewMonth = $state(value.getUTCMonth());

  function openPopover(): void {
    viewYear = value.getUTCFullYear();
    viewMonth = value.getUTCMonth();
    open = true;
  }

  function closePopover(): void {
    open = false;
  }

  function togglePopover(): void {
    if (open) closePopover();
    else openPopover();
  }

  // Click-away + Escape. Only registered while open so we don't pay
  // for global listeners when the picker isn't on screen.
  $effect(() => {
    if (!open) return;
    function onDocPointerDown(e: PointerEvent): void {
      const target = e.target as Node | null;
      if (!target) return;
      if (popoverEl?.contains(target)) return;
      if (triggerEl?.contains(target)) return;
      closePopover();
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closePopover();
      }
    }
    document.addEventListener('pointerdown', onDocPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  });

  // ── Month navigation ──────────────────────────────────────────────────

  function shiftMonth(delta: number): void {
    let m = viewMonth + delta;
    let y = viewYear;
    while (m < 0) {
      m += 12;
      y -= 1;
    }
    while (m > 11) {
      m -= 12;
      y += 1;
    }
    viewMonth = m;
    viewYear = y;
  }

  function shiftYear(delta: number): void {
    viewYear += delta;
  }

  // ── Calendar grid math (Monday-first, 6 weeks fixed) ─────────────────

  const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];
  const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const MS_PER_DAY = 86_400_000;

  type DayCell = {
    date: Date;
    inMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
  };

  let calendarCells = $derived.by((): DayCell[] => {
    const cells: DayCell[] = [];
    const firstOfMonth = new Date(Date.UTC(viewYear, viewMonth, 1));
    // getUTCDay returns 0=Sun..6=Sat, convert to 0=Mon..6=Sun.
    const leadingDays = (firstOfMonth.getUTCDay() + 6) % 7;
    const startMs = firstOfMonth.getTime() - leadingDays * MS_PER_DAY;

    const now = new Date();
    const todayMs = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    );
    const selectedMs = Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate()
    );

    for (let i = 0; i < 42; i++) {
      const ms = startMs + i * MS_PER_DAY;
      const d = new Date(ms);
      cells.push({
        date: d,
        inMonth: d.getUTCMonth() === viewMonth,
        isToday: ms === todayMs,
        isSelected: ms === selectedMs
      });
    }
    return cells;
  });

  /**
   * Replace year/month/day on the live value while preserving the
   * existing hours/minutes/seconds, then push it through onChange.
   * Spillover-day clicks also slide the visible month so the user's
   * mental model stays correct.
   */
  function pickDay(cell: DayCell): void {
    const next = new Date(
      Date.UTC(
        cell.date.getUTCFullYear(),
        cell.date.getUTCMonth(),
        cell.date.getUTCDate(),
        value.getUTCHours(),
        value.getUTCMinutes(),
        value.getUTCSeconds()
      )
    );
    onChange(next);
    if (!cell.inMonth) {
      viewYear = cell.date.getUTCFullYear();
      viewMonth = cell.date.getUTCMonth();
    }
  }

  // ── Time field draft buffers ─────────────────────────────────────────
  // Each input owns a local string draft. When unfocused, the draft
  // mirrors `value`; when focused, the draft floats free so external
  // sim-time updates can't yank the cursor or wipe typed text.
  function pad2(n: number): string {
    return n.toString().padStart(2, '0');
  }

  // svelte-ignore state_referenced_locally
  let hoursDraft = $state(pad2(value.getUTCHours()));
  // svelte-ignore state_referenced_locally
  let minutesDraft = $state(pad2(value.getUTCMinutes()));
  // svelte-ignore state_referenced_locally
  let secondsDraft = $state(pad2(value.getUTCSeconds()));
  let timeFocused = $state<'h' | 'm' | 's' | null>(null);

  $effect(() => {
    // Subscribe to value changes (read all three fields).
    const h = pad2(value.getUTCHours());
    const m = pad2(value.getUTCMinutes());
    const s = pad2(value.getUTCSeconds());
    if (timeFocused !== 'h') hoursDraft = h;
    if (timeFocused !== 'm') minutesDraft = m;
    if (timeFocused !== 's') secondsDraft = s;
  });

  function commitTimeField(field: 'h' | 'm' | 's'): void {
    const draft =
      field === 'h' ? hoursDraft : field === 'm' ? minutesDraft : secondsDraft;
    const parsed = parseInt(draft, 10);
    if (Number.isNaN(parsed)) return; // bad input, effect will reset on blur
    const max = field === 'h' ? 23 : 59;
    const clamped = Math.max(0, Math.min(max, parsed));
    const next = new Date(value.getTime());
    if (field === 'h') next.setUTCHours(clamped);
    else if (field === 'm') next.setUTCMinutes(clamped);
    else next.setUTCSeconds(clamped);
    onChange(next);
  }

  // ── Display strings for the trigger pill ─────────────────────────────

  let displayDate = $derived(
    `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`
  );
  let displayTime = $derived(
    `${pad2(value.getUTCHours())}:${pad2(value.getUTCMinutes())}:${pad2(value.getUTCSeconds())}`
  );

  let monthLabel = $derived(`${MONTH_NAMES[viewMonth]} ${viewYear}`);
</script>

<div class="relative inline-flex">
  <button
    bind:this={triggerEl}
    type="button"
    onclick={togglePopover}
    class={cn(
      'inline-flex items-center gap-2 rounded-none border border-white/55 bg-white/55 px-2.5 py-1 mono text-[12px] font-medium tracking-[0.04em] text-slate-900 outline-none transition-[background-color,border-color,box-shadow,scale] duration-150 ease-out hover:bg-white/80 active:scale-[0.98]',
      open && 'border-[#8A8A85]/80 bg-white/95 shadow-[0_0_0_3px_rgba(96,165,250,0.18)]'
    )}
    aria-label={ariaLabel}
    aria-expanded={open}
    aria-haspopup="dialog"
    title={ariaLabel}
  >
    <svg
      viewBox="0 0 14 14"
      fill="none"
      class={cn(
        'h-3 w-3 flex-shrink-0 transition-colors duration-150 ease-out',
        open ? 'text-[#E8441E]' : 'text-slate-400'
      )}
      aria-hidden="true"
    >
      <rect
        x="1.5"
        y="2.5"
        width="11"
        height="10"
        rx="1.5"
        stroke="currentColor"
        stroke-width="1.2"
      />
      <path d="M1.5 5.5 H12.5" stroke="currentColor" stroke-width="1.2" />
      <path
        d="M4.5 1 V3.5 M9.5 1 V3.5"
        stroke="currentColor"
        stroke-width="1.2"
        stroke-linecap="round"
      />
    </svg>
    <span class="tabular-nums">{displayDate}</span>
    <span class="text-slate-300" aria-hidden="true">·</span>
    <span class="tabular-nums">{displayTime}</span>
  </button>

  {#if open}
    <div
      bind:this={popoverEl}
      class={cn(
        'picker-popover absolute left-1/2 z-[60] -translate-x-1/2',
        placement === 'top'
          ? 'bottom-[calc(100%+10px)] picker-popover-top'
          : 'top-[calc(100%+10px)] picker-popover-bottom'
      )}
      role="dialog"
      aria-label="Select date and time"
    >
      <div class="flex w-[260px] flex-col gap-2 p-3">
        <!-- Month / year navigation -->
        <div class="flex items-center justify-between gap-1">
          <div class="flex items-center gap-0.5">
            <button
              type="button"
              class="picker-nav-btn"
              onclick={() => shiftYear(-1)}
              aria-label="Previous year"
              title="Previous year"
            >
              <svg viewBox="0 0 12 12" fill="none" class="h-2.5 w-2.5" aria-hidden="true">
                <path
                  d="M7 2 L3 6 L7 10 M11 2 L7 6 L11 10"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              class="picker-nav-btn"
              onclick={() => shiftMonth(-1)}
              aria-label="Previous month"
              title="Previous month"
            >
              <svg viewBox="0 0 12 12" fill="none" class="h-2.5 w-2.5" aria-hidden="true">
                <path
                  d="M8 2 L4 6 L8 10"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
          <span class="font-display text-[12px] font-medium tracking-tight text-slate-900">
            {monthLabel}
          </span>
          <div class="flex items-center gap-0.5">
            <button
              type="button"
              class="picker-nav-btn"
              onclick={() => shiftMonth(1)}
              aria-label="Next month"
              title="Next month"
            >
              <svg viewBox="0 0 12 12" fill="none" class="h-2.5 w-2.5" aria-hidden="true">
                <path
                  d="M4 2 L8 6 L4 10"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              class="picker-nav-btn"
              onclick={() => shiftYear(1)}
              aria-label="Next year"
              title="Next year"
            >
              <svg viewBox="0 0 12 12" fill="none" class="h-2.5 w-2.5" aria-hidden="true">
                <path
                  d="M5 2 L9 6 L5 10 M1 2 L5 6 L1 10"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- Weekday labels -->
        <div class="grid grid-cols-7 gap-0.5">
          {#each WEEKDAY_LABELS as wd, i (i)}
            <span
              class="mono py-0.5 text-center text-[8.5px] uppercase tracking-[0.16em] text-slate-400"
            >
              {wd}
            </span>
          {/each}
        </div>

        <!-- Day grid -->
        <div class="grid grid-cols-7 gap-0.5">
          {#each calendarCells as cell, i (i)}
            <button
              type="button"
              onclick={() => pickDay(cell)}
              class={cn(
                'mono inline-flex h-7 items-center justify-center rounded-none text-[11px] font-medium tabular-nums transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.92]',
                cell.isSelected
                  ? 'bg-slate-950/90 text-white shadow-[0_2px_6px_rgba(15,23,42,0.18)]'
                  : cell.isToday
                    ? 'bg-emerald-100/85 text-emerald-800 hover:bg-emerald-100'
                    : cell.inMonth
                      ? 'text-slate-700 hover:bg-white/85'
                      : 'text-slate-300 hover:bg-white/55'
              )}
              aria-pressed={cell.isSelected}
              aria-label={cell.date.toISOString().slice(0, 10)}
            >
              {cell.date.getUTCDate()}
            </button>
          {/each}
        </div>

        <!-- Time row -->
        <div
          class="mt-1 flex items-center justify-center gap-1 border-t border-white/55 pt-2"
        >
          <input
            type="text"
            inputmode="numeric"
            maxlength="2"
            bind:value={hoursDraft}
            onfocus={() => (timeFocused = 'h')}
            onblur={() => {
              commitTimeField('h');
              timeFocused = null;
            }}
            onchange={() => commitTimeField('h')}
            onkeydown={(e) => {
              if (e.key === 'Enter') {
                commitTimeField('h');
                (e.currentTarget as HTMLInputElement).blur();
              }
            }}
            class="picker-time-input"
            aria-label="Hours (UTC)"
          />
          <span class="mono text-[12px] text-slate-400" aria-hidden="true">:</span>
          <input
            type="text"
            inputmode="numeric"
            maxlength="2"
            bind:value={minutesDraft}
            onfocus={() => (timeFocused = 'm')}
            onblur={() => {
              commitTimeField('m');
              timeFocused = null;
            }}
            onchange={() => commitTimeField('m')}
            onkeydown={(e) => {
              if (e.key === 'Enter') {
                commitTimeField('m');
                (e.currentTarget as HTMLInputElement).blur();
              }
            }}
            class="picker-time-input"
            aria-label="Minutes (UTC)"
          />
          <span class="mono text-[12px] text-slate-400" aria-hidden="true">:</span>
          <input
            type="text"
            inputmode="numeric"
            maxlength="2"
            bind:value={secondsDraft}
            onfocus={() => (timeFocused = 's')}
            onblur={() => {
              commitTimeField('s');
              timeFocused = null;
            }}
            onchange={() => commitTimeField('s')}
            onkeydown={(e) => {
              if (e.key === 'Enter') {
                commitTimeField('s');
                (e.currentTarget as HTMLInputElement).blur();
              }
            }}
            class="picker-time-input"
            aria-label="Seconds (UTC)"
          />
          <span
            class="mono ml-1 text-[9px] uppercase tracking-[0.16em] text-slate-400"
            >UTC</span
          >
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /*
   * Near-opaque popover. The calendar grid has small text (11px) and
   * tiny weekday labels (8.5px), so contrast against the dark space
   * scene below has to be solid. Backdrop blur stays for the soft
   * edge fade, but the surface itself is essentially white.
   */
  .picker-popover {
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(20px) saturate(140%);
    -webkit-backdrop-filter: blur(20px) saturate(140%);
    border: 1px solid rgba(226, 232, 240, 0.85);
    border-radius: 0;
    box-shadow:
      0 24px 70px rgba(15, 23, 42, 0.18),
      0 8px 24px rgba(15, 23, 42, 0.08);
    /*
     * Subtle pop-in. cubic-bezier(0.2, 0, 0, 1) reads as "lands softly",
     * matching the rest of the app's transition feel.
     */
    animation: picker-in 160ms cubic-bezier(0.2, 0, 0, 1);
  }
  .picker-popover-top {
    transform-origin: bottom center;
  }
  .picker-popover-bottom {
    transform-origin: top center;
  }

  @keyframes picker-in {
    from {
      opacity: 0;
      transform: translate(-50%, 4px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0) scale(1);
    }
  }

  /*
   * Month / year navigation buttons. Visually 22×22 but the
   * pseudo-element extends the hit area to ~40×40 per the
   * make-interfaces-feel-better minimum.
   */
  .picker-nav-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 0;
    color: rgb(100, 116, 139);
    background: transparent;
    transition-property: background-color, color, scale;
    transition-duration: 150ms;
    transition-timing-function: ease-out;
  }
  .picker-nav-btn::after {
    content: '';
    position: absolute;
    inset: -9px;
  }
  .picker-nav-btn:hover {
    background: rgba(255, 255, 255, 0.85);
    color: rgb(15, 23, 42);
  }
  .picker-nav-btn:active {
    scale: 0.92;
  }
  .picker-nav-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(232, 68, 30, 0.45);
  }

  /*
   * Compact time-spinner-style text inputs. type=text + inputmode=numeric
   * gives us full control over the rendering, avoiding the wildly
   * different look of <input type="number"> across browsers.
   */
  .picker-time-input {
    width: 30px;
    text-align: center;
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 0;
    padding: 3px 0;
    font-family:
      'Geist Mono Variable',
      ui-monospace,
      monospace;
    font-size: 11px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: rgb(15, 23, 42);
    outline: none;
    transition-property: background-color, border-color, box-shadow;
    transition-duration: 150ms;
    transition-timing-function: ease-out;
  }
  .picker-time-input:hover {
    background: rgba(255, 255, 255, 0.75);
  }
  .picker-time-input:focus {
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(232, 68, 30, 0.65);
    box-shadow: 0 0 0 3px rgba(232, 68, 30, 0.18);
  }
</style>
