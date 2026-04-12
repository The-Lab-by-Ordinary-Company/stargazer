<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { Line2 } from 'three/examples/jsm/lines/Line2.js';
  import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
  import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
  import type { Readable } from 'svelte/store';
  import type { TleData } from '$stores/satelliteFactory';
  import { computeIssOrbit } from '$utils/issOrbit';

  /**
   * Generic past-trail line. Propagates the satellite backwards from now
   * by `trailMinutes` and draws the result as a fading line so the head
   * (most recent position) is opaque and the tail (oldest position) is
   * transparent.
   */

  let {
    tleStore,
    trailMinutes = 10
  }: { tleStore: Readable<TleData | null>; trailMinutes?: number } = $props();

  const SAMPLES = 80;
  const RECOMPUTE_MS = 5_000;

  const geometry = new LineGeometry();
  geometry.setPositions(new Float32Array(SAMPLES * 3));

  const colors = new Float32Array(SAMPLES * 6);
  for (let i = 0; i < SAMPLES; i++) {
    const t = i / (SAMPLES - 1);
    colors[i * 6] = 1;
    colors[i * 6 + 1] = 1;
    colors[i * 6 + 2] = 1;
    colors[i * 6 + 3] = t;
    colors[i * 6 + 4] = t;
    colors[i * 6 + 5] = t;
  }
  geometry.setColors(colors);

  const material = new LineMaterial({
    color: 0xffffff,
    linewidth: 2,
    transparent: true,
    opacity: 0.85,
    vertexColors: true,
    depthWrite: false
  });
  if (typeof window !== 'undefined') {
    material.resolution.set(window.innerWidth, window.innerHeight);
  }

  const line = new Line2(geometry, material);
  line.frustumCulled = false;
  line.computeLineDistances();

  let lastBuiltAt = 0;
  let lastResW = 0;
  let lastResH = 0;

  function rebuild() {
    const tle = $tleStore;
    if (!tle) return;
    const start = new Date(Date.now() - trailMinutes * 60 * 1000);
    const positions = computeIssOrbit(tle, {
      start,
      durationMinutes: trailMinutes,
      samples: SAMPLES
    });
    geometry.setPositions(positions);
    line.computeLineDistances();
    geometry.computeBoundingSphere();
    lastBuiltAt = performance.now();
  }

  $effect(() => {
    void $tleStore;
    rebuild();
  });

  useTask(() => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w !== lastResW || h !== lastResH) {
        material.resolution.set(w, h);
        lastResW = w;
        lastResH = h;
      }
    }
    if (performance.now() - lastBuiltAt > RECOMPUTE_MS) {
      rebuild();
    }
  });
</script>

{#if $tleStore}
  <T is={line} />
{/if}
