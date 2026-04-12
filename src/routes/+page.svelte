<script lang="ts">
  import { onMount } from 'svelte';

  let canvas: HTMLCanvasElement;
  let ctaCanvas: HTMLCanvasElement;

  onMount(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const DOT = 3;
    const GAP = 8;
    let w = 0, h = 0, cols = 0, rows = 0, frame = 0;
    let rid: number;

    function resize() {
      const rect = canvas.parentElement!.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx!.scale(dpr, dpr);
      cols = Math.ceil(w / GAP); rows = Math.ceil(h / GAP);
    }

    function draw() {
      frame++;
      ctx!.clearRect(0, 0, w, h);
      const cx = w * 0.72, cy = h * 0.45;
      const t = frame * 0.008;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * GAP + GAP / 2;
          const y = r * GAP + GAP / 2;
          const dx = x - cx, dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);

          // Concentric orbit rings
          const ring1 = Math.abs(dist - 60 - Math.sin(t * 2) * 3) < 4;
          const ring2 = Math.abs(dist - 110 - Math.sin(t * 1.5) * 4) < 4;
          const ring3 = Math.abs(dist - 170 - Math.sin(t) * 5) < 5;

          // Orbiting dots (bodies on rings)
          const body1 = Math.abs(dist - 60) < 6 && Math.abs(((angle - t * 1.2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI) < 0.3;
          const body2 = Math.abs(dist - 110) < 6 && Math.abs(((angle + t * 0.7) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI) < 0.25;
          const body3 = Math.abs(dist - 170) < 8 && Math.abs(((angle - t * 0.4) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI) < 0.2;

          // Center sun
          const sun = dist < 14;

          let alpha = 0;
          let color = '#141414';

          if (sun) {
            alpha = 0.9; color = '#E8441E';
          } else if (body1 || body2 || body3) {
            alpha = 0.85; color = '#E8441E';
          } else if (ring1 || ring2 || ring3) {
            alpha = 0.12;
          } else {
            // Sparse background dots
            const noise = Math.sin(c * 7.3 + r * 13.7) * 0.5 + 0.5;
            if (noise > 0.92) alpha = 0.04;
          }

          if (alpha > 0) {
            ctx!.globalAlpha = alpha;
            ctx!.fillStyle = color;
            ctx!.fillRect(x - DOT / 2, y - DOT / 2, DOT, DOT);
          }
        }
      }
      ctx!.globalAlpha = 1;
      rid = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', resize);

    // ── CTA click-burst star field ─────────────────────────────────
    const ctx2 = ctaCanvas?.getContext('2d');
    let w2 = 0, h2 = 0, rid2: number;

    // Star positions (fixed) + click bursts (animated)
    const stars: {x:number, y:number, s:number}[] = [];
    const bursts: {x:number, y:number, birth:number, dur:number}[] = [];
    let starsSeed = false;

    function resize2() {
      if (!ctaCanvas || !ctx2) return;
      const rect = ctaCanvas.parentElement!.getBoundingClientRect();
      w2 = rect.width; h2 = rect.height;
      ctaCanvas.width = w2 * dpr; ctaCanvas.height = h2 * dpr;
      ctaCanvas.style.width = w2 + 'px'; ctaCanvas.style.height = h2 + 'px';
      ctx2.scale(dpr, dpr);
      if (!starsSeed) {
        for (let i = 0; i < 120; i++) {
          stars.push({ x: Math.random() * 2000, y: Math.random() * 800, s: 2 + Math.random() * 2 });
        }
        starsSeed = true;
      }
    }

    function draw2() {
      if (!ctx2) { rid2 = requestAnimationFrame(draw2); return; }
      ctx2.clearRect(0, 0, w2, h2);
      const now = performance.now();

      // Spawn a new burst every ~1.5s
      if (bursts.length === 0 || now - bursts[bursts.length - 1].birth > 800 + Math.random() * 1400) {
        bursts.push({ x: Math.random() * w2, y: Math.random() * h2, birth: now, dur: 600 + Math.random() * 400 });
        if (bursts.length > 8) bursts.shift();
      }

      // Draw static stars as small squares
      for (const star of stars) {
        const sx = star.x % w2, sy = star.y % h2;
        ctx2.globalAlpha = 0.12;
        ctx2.fillStyle = '#FFFFFF';
        ctx2.fillRect(sx - star.s / 2, sy - star.s / 2, star.s, star.s);
      }

      // Draw bursts: expanding cross/reticle pattern
      for (const b of bursts) {
        const age = (now - b.birth) / b.dur;
        if (age > 1) continue;
        const ease = 1 - (1 - age) * (1 - age); // ease-out
        const size = 8 + ease * 28;
        const alpha = (1 - age) * 0.7;
        ctx2.globalAlpha = alpha;
        ctx2.fillStyle = '#FFFFFF';
        // Center dot
        ctx2.fillRect(b.x - 2, b.y - 2, 4, 4);
        // Cross arms
        ctx2.fillRect(b.x - size, b.y - 1, size * 2, 2);
        ctx2.fillRect(b.x - 1, b.y - size, 2, size * 2);
        // Corner brackets
        const bk = size * 0.7;
        ctx2.fillRect(b.x - bk - 3, b.y - bk - 3, 6, 2);
        ctx2.fillRect(b.x - bk - 3, b.y - bk - 3, 2, 6);
        ctx2.fillRect(b.x + bk - 3, b.y - bk - 3, 6, 2);
        ctx2.fillRect(b.x + bk + 1, b.y - bk - 3, 2, 6);
        ctx2.fillRect(b.x - bk - 3, b.y + bk + 1, 6, 2);
        ctx2.fillRect(b.x - bk - 3, b.y + bk - 3, 2, 6);
        ctx2.fillRect(b.x + bk - 3, b.y + bk + 1, 6, 2);
        ctx2.fillRect(b.x + bk + 1, b.y + bk - 3, 2, 6);
      }

      ctx2.globalAlpha = 1;
      rid2 = requestAnimationFrame(draw2);
    }

    resize2();
    draw2();
    window.addEventListener('resize', resize2);

    return () => {
      cancelAnimationFrame(rid);
      cancelAnimationFrame(rid2);
      window.removeEventListener('resize', resize);
      window.removeEventListener('resize', resize2);
    };
  });
</script>

<svelte:head>
  <title>Stargazer · Live 3D Solar System Explorer</title>
  <meta name="description" content="Stargazer is a free, real-time 3D map of the solar system. Explore planets, moons, the ISS, spacecraft, and satellites with live data from NASA, JPL, and ESA — right in your browser. No sign-up." />
  <meta name="keywords" content="solar system, 3D solar system, live ISS tracker, NASA, JPL, ESA, planets, moons, spacecraft, satellites, real-time space data, interactive space map" />
  <meta property="og:title" content="Stargazer · Live 3D Solar System Explorer" />
  <meta property="og:description" content="An interactive 3D map of the solar system, powered by live data from NASA, JPL, and ESA. Free, in your browser, no sign-up." />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="/og-image.png" />
  <meta name="twitter:title" content="Stargazer · Live 3D Solar System Explorer" />
  <meta name="twitter:description" content="An interactive 3D map of the solar system, powered by live data from NASA, JPL, and ESA. Free, in your browser, no sign-up." />
</svelte:head>

<div class="relative min-h-screen bg-[#F5F0E8] text-[#141414] antialiased">

  <!-- NAV -->
  <nav class="px-6 md:px-10 lg:px-16 py-6 flex items-center justify-between max-w-[1200px] mx-auto">
    <a href="/" class="flex items-center gap-2.5 group">
      <img src="/stargazer-mark.svg" alt="" width="32" height="32" class="h-8 w-8" />
      <span class="mono text-[12px] uppercase tracking-[0.22em]">Stargazer</span>
    </a>
    <div class="flex items-center gap-6 mono text-[11px] uppercase tracking-[0.18em] text-[#8A8A85]">
      <a href="/app" class="hover:text-[#141414] transition-colors duration-150">App</a>
      <a href="https://github.com/The-Lab-by-Ordinary-Company/stargazer" target="_blank" rel="noreferrer" class="hover:text-[#141414] transition-colors duration-150">GitHub</a>
    </div>
  </nav>

  <main>
    <!-- HERO -->
    <section class="relative px-6 md:px-10 lg:px-16 pt-20 pb-20 lg:pt-28 lg:pb-28 overflow-hidden">
      <!-- Bitmap dot matrix orbital animation -->
      <canvas bind:this={canvas} class="absolute inset-0 pointer-events-none" aria-hidden="true"></canvas>
      <div class="relative z-10 max-w-[1200px] mx-auto">
        <div class="flex items-center gap-3 mb-8">
          <span class="inline-block h-2 w-2 bg-[#E8441E]"></span>
          <span class="mono text-[11px] uppercase tracking-[0.22em] text-[#8A8A85]">Live solar system · Real-time data</span>
        </div>
        <h1 class="font-display text-[2.8rem] sm:text-[4rem] lg:text-[5.5rem] leading-[0.95] tracking-[-0.03em] uppercase max-w-[18ch] mb-8">A clearer view of space</h1>
        <p class="max-w-[52ch] text-[1rem] lg:text-[1.1rem] leading-[1.7] text-[#5A5A55] mb-12">An interactive 3D map of the solar system, powered by live data from NASA, JPL, ESA, and more. Click any planet, moon, or spacecraft to fly to it and see where it is right now. Free, in your browser, no sign-up.</p>
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-16 sm:mb-20">
          <a href="/app" class="inline-flex h-12 items-center px-8 bg-[#E8441E] text-white text-[13px] uppercase tracking-[0.18em] transition-[background-color,transform] duration-150 ease-out hover:bg-[#d03a15] active:scale-[0.96]">Open Stargazer</a>
          <a href="#tracked" class="inline-flex h-12 items-center px-8 border border-[#141414] text-[13px] uppercase tracking-[0.18em] transition-[background-color,transform] duration-150 ease-out hover:bg-[#141414] hover:text-white active:scale-[0.96]">Learn more</a>
        </div>
        <!-- DATA SOURCES MARQUEE -->
        <div class="border-t border-b border-[#141414]/15">
          <div class="flex items-center gap-5 py-6 sm:py-7">
            <span class="mono text-[10px] uppercase tracking-[0.22em] text-[#8A8A85] flex-shrink-0 hidden sm:inline">Powered by</span>
            <div class="marquee relative flex-1 overflow-hidden">
              <div class="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 sm:w-28 bg-gradient-to-r from-[#F5F0E8] to-transparent"></div>
              <div class="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 sm:w-28 bg-gradient-to-l from-[#F5F0E8] to-transparent"></div>
              <div class="marquee-track">
                {#each Array(2) as _, copyIdx}
                  <ul class="marquee-list" aria-hidden={copyIdx === 1 ? 'true' : undefined}>
                    {#each [
                      { src: '/nasa-worm-logo.svg', name: 'NASA', heightClass: 'h-[26px]' },
                      { src: '/jpl-logo.svg', name: 'JPL', heightClass: 'h-[44px]' },
                      { src: '/esa-logo.svg', name: 'ESA', heightClass: 'h-[44px]' },
                      { src: '/jaxa-logo.svg', name: 'JAXA', heightClass: 'h-[44px]' },
                      { src: '/spacex-logo.svg', name: 'SpaceX', heightClass: 'h-[14px]' }
                    ] as logo}
                      <li>
                        <img src={logo.src} alt={copyIdx === 0 ? logo.name : ''} class="marquee-logo {logo.heightClass}" loading="lazy" />
                      </li>
                    {/each}
                  </ul>
                {/each}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- REGISTRY -->
    <section id="tracked" class="relative px-6 md:px-10 lg:px-16 py-20 lg:py-28 border-t border-[#141414]/15 overflow-hidden">
      <!-- Background wireframe illustration (faded orange) -->
      <div class="absolute right-[-20%] md:right-[-5%] top-1/2 -translate-y-1/2 w-[95%] md:w-[55%] max-w-[600px] pointer-events-none select-none" aria-hidden="true" style="filter: sepia(1) saturate(5) hue-rotate(-15deg) brightness(1.5); opacity: 0.08;">
        <img src="/mir-wireframe.svg" alt="" class="w-full h-auto" />
      </div>
      <div class="relative z-10 max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-12 lg:gap-20">
        <div>
          <span class="mono text-[10px] uppercase tracking-[0.22em] text-[#E8441E] mb-4 block">Registry</span>
          <h2 class="font-display text-[1.8rem] sm:text-[2.4rem] lg:text-[3rem] leading-[1.02] tracking-[-0.02em] uppercase mb-5">From Mercury to Voyager&nbsp;1</h2>
          <p class="text-[0.95rem] leading-[1.75] text-[#5A5A55] max-w-[38ch]">Every body is positioned using data from JPL HORIZONS, NORAD TLEs, or published landing coordinates.</p>
        </div>
        <div class="border-t border-[#141414]/15">
          {#each [['01','Planets'],['02','Dwarf planets'],['03','Moons'],['04','Spacecraft + rovers'],['05','Earth satellites'],['06','Asteroids + comets']] as [num, name]}
            <div class="flex items-baseline gap-3 sm:gap-6 py-4 sm:py-5 border-b border-[#141414]/15">
              <span class="mono text-[11px] text-[#8A8A85] w-6 sm:w-8">{num}</span>
              <span class="flex-1 text-[13px] sm:text-[15px] uppercase tracking-[0.04em]">{name}</span>
              <span class="inline-block h-1.5 w-1.5 bg-[#E8441E]"></span>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <!-- PIPELINE -->
    <section class="px-6 md:px-10 lg:px-16 py-20 lg:py-28 border-t border-[#141414]/15 bg-white">
      <div class="max-w-[1200px] mx-auto">
        <span class="mono text-[10px] uppercase tracking-[0.22em] text-[#E8441E] mb-4 block">Pipeline</span>
        <h2 class="font-display text-[1.8rem] sm:text-[2.4rem] lg:text-[3rem] leading-[1.02] tracking-[-0.02em] uppercase mb-12">How Stargazer Works</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border-t border-[#141414]/15">
          {#each [['01','Source','JPL HORIZONS for orbits. Celestrak for TLEs. wheretheiss.at for ISS. All public, all free.'],['02','Compute','Standish/Meeus for planets. Keplerian solver for moons. SGP4 for satellites. All client-side.'],['03','Render','Real axial tilts, real rotation, Saturn rings at correct radii. Compromises disclosed.'],['04','Verify','Every panel shows the real numbers. Cross-check against JPL, timeanddate.com, or Stellarium.']] as [num, title, desc]}
            <div class="border-b lg:border-b-0 lg:border-r border-[#141414]/15 last:border-r-0 py-8 lg:pr-8 [&:not(:first-child)]:lg:pl-8">
              <span class="mono text-[11px] text-[#E8441E] mb-4 block">{num}</span>
              <h3 class="text-[15px] uppercase tracking-[0.04em] mb-3">{title}</h3>
              <p class="text-[13px] leading-[1.7] text-[#5A5A55]">{desc}</p>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <!-- ORANGE BLOCK CTA -->
    <section class="relative px-6 md:px-10 lg:px-16 py-20 lg:py-28 bg-[#E8441E] text-white overflow-hidden">
      <canvas bind:this={ctaCanvas} class="absolute inset-0 pointer-events-none" aria-hidden="true"></canvas>
      <div class="relative z-10 max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 items-end">
        <div>
          <p class="mono text-[11px] uppercase tracking-[0.22em] text-white/60 mb-6">Free · Open source · No account required</p>
          <h2 class="font-display text-[2rem] sm:text-[2.8rem] lg:text-[3.5rem] leading-[1] tracking-[-0.02em] uppercase max-w-[16ch]">Click anything in space</h2>
        </div>
        <div>
          <p class="text-[0.95rem] leading-[1.75] text-white/75 mb-8 max-w-[44ch]">Fly to Voyager 1 in interstellar space, watch the Galilean moons orbit Jupiter, see Curiosity sitting in Gale crater. Free, open source, and runs in any modern browser.</p>
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <a href="/app" class="inline-flex h-12 items-center px-8 bg-white text-[#E8441E] text-[13px] uppercase tracking-[0.18em] transition-transform duration-150 ease-out active:scale-[0.96]">Open Stargazer</a>
            <a href="https://github.com/The-Lab-by-Ordinary-Company/stargazer" target="_blank" rel="noreferrer" class="inline-flex h-12 items-center px-8 border border-white/40 text-[13px] uppercase tracking-[0.18em] text-white transition-[background-color,transform] duration-150 ease-out hover:bg-white/10 active:scale-[0.96]">GitHub</a>
          </div>
        </div>
      </div>
    </section>

    <!-- SOURCES -->
    <section class="relative px-6 md:px-10 lg:px-16 py-20 lg:py-28 bg-white border-t border-[#141414]/15 overflow-hidden">
      <!-- Background technical drawing in faded orange -->
      <div class="absolute right-[-20%] md:right-[-10%] top-1/2 -translate-y-1/2 w-[90%] md:w-[50%] max-w-[550px] pointer-events-none select-none" aria-hidden="true" style="filter: sepia(1) saturate(5) hue-rotate(-15deg) brightness(1.5); opacity: 0.06;">
        <img src="/technical-drawing-2.svg" alt="" class="w-full h-auto" />
      </div>
      <div class="relative z-10 max-w-[1200px] mx-auto">
        <span class="mono text-[10px] uppercase tracking-[0.22em] text-[#E8441E] mb-4 block">Sources</span>
        <h2 class="font-display text-[1.8rem] sm:text-[2.4rem] leading-[1.02] tracking-[-0.02em] uppercase mb-12">Where we get the data</h2>
        <div class="border-t border-[#141414]/15">
          {#each [['Positions','JPL HORIZONS, Standish/Meeus ephemeris, NORAD TLE + SGP4'],['Live feeds','wheretheiss.at (ISS), Celestrak (TLEs), open-notify (crew)'],['Textures','NASA Visible Earth, Solar System Scope (CC BY 4.0)'],['Reference','NASA Planetary Fact Sheets, JPL Small-Body Database'],['Propagation','satellite.js (SGP4, MIT license)']] as [label, value]}
            <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 py-4 border-b border-[#141414]/15">
              <span class="mono text-[10px] sm:text-[11px] text-[#8A8A85] sm:w-32 flex-shrink-0 uppercase">{label}</span>
              <span class="text-[13px] sm:text-[14px]">{value}</span>
            </div>
          {/each}
        </div>
        <p class="mt-6 mono text-[11px] text-[#8A8A85] uppercase tracking-[0.16em]">Not affiliated with NASA, ESA, JAXA, or SpaceX. We are fans building on public data.</p>
      </div>
    </section>
  </main>

  <!-- FOOTER -->
  <footer class="px-6 md:px-10 lg:px-16 py-16 lg:py-24 border-t border-[#141414]/15 bg-[#F5F0E8]">
    <div class="max-w-[1200px] mx-auto flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
      <div>
        <div class="flex items-center gap-4 sm:gap-5 lg:gap-7">
          <img src="/stargazer-mark.svg" alt="" width="96" height="96" class="h-12 w-12 sm:h-16 sm:w-16 lg:h-24 lg:w-24 flex-shrink-0" />
          <div class="font-display text-[3rem] sm:text-[4rem] lg:text-[6rem] leading-[0.85] uppercase tracking-[-0.03em]">STARGAZER</div>
        </div>
        <p class="mt-6 mono text-[11px] uppercase tracking-[0.18em] text-[#8A8A85]">Powered by <a href="https://lab.ordinarycompany.design/" target="_blank" rel="noreferrer" class="hover:text-[#141414] transition-colors duration-150">The Lab</a></p>
      </div>
      <div class="flex items-center gap-6 mono text-[11px] uppercase tracking-[0.18em] text-[#8A8A85]">
        <a href="/app" class="hover:text-[#141414] transition-colors duration-150">App</a>
        <a href="https://github.com/The-Lab-by-Ordinary-Company/stargazer" target="_blank" rel="noreferrer" class="hover:text-[#141414] transition-colors duration-150">GitHub</a>
        <span>2026</span>
      </div>
    </div>
  </footer>
</div>

<style>
  .marquee-track {
    display: flex;
    width: max-content;
    animation: marquee 32s linear infinite;
  }
  .marquee-list {
    display: flex;
    align-items: center;
    gap: 5.5rem;
    padding: 0 2.75rem;
    margin: 0;
    list-style: none;
    flex-shrink: 0;
  }
  .marquee-logo {
    width: auto;
    flex-shrink: 0;
    filter: brightness(0) saturate(100%);
    opacity: 0.55;
    transition: opacity 0.2s ease-out;
  }
  .marquee-logo:hover {
    opacity: 0.9;
  }
  @keyframes marquee {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }
  @media (prefers-reduced-motion: reduce) {
    .marquee-track {
      animation: none;
    }
  }
</style>
