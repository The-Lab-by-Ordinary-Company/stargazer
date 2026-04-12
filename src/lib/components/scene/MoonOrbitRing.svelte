<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { Line2 } from 'three/examples/jsm/lines/Line2.js';
  import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
  import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
  import { Vector3, type Group } from 'three';
  import { get } from 'svelte/store';
  import { simTime } from '$stores/simTime';
  import { selection } from '$lib/stores/selection';
  import { getWorldPosition } from '$lib/registry/registry';
  import { isPlanetBody, type TrackedObject } from '$lib/registry/types';

  /**
   * Generic moon orbit ring — replaces the per-body MoonOrbit.svelte
   * with a registry-driven component that works for any tracked
   * moon (Earth's Moon, Phobos, the Galileans, Triton, etc.).
   *
   * Builds the line by sampling the moon's `offsetFn` at evenly-spaced
   * phases over one sidereal period. Because the samples come from the
   * SAME function the moon body uses, the ring is guaranteed to thread
   * the moon at every position.
   *
   * The ring lives in inertial space relative to its parent's CENTER:
   * each frame the group's position is updated to the parent's world
   * position (via the registry walk), but the ring itself doesn't
   * inherit any of the parent's rotation. The orbit stays inertially
   * fixed while the parent body spins underneath it — exactly what we
   * want for visualization (lunar orbits are not Earth-fixed; satellite
   * orbits are).
   */

  let { object: objectProp }: { object: TrackedObject } = $props();

  // svelte-ignore state_referenced_locally
  const object = objectProp;

  if (!isPlanetBody(object) || !object.parent || !object.metadata.orbitalPeriodDays) {
    throw new Error(
      `[Stargazer] MoonOrbitRing requires a planet-body with parent and orbitalPeriodDays: got ${object.id}`
    );
  }

  const parentId: string = object.parent;
  const periodDays = object.metadata.orbitalPeriodDays;
  const SAMPLES = 192;

  // Build the ring geometry once at mount: sample 192 evenly-spaced phases over
  // one sidereal period via the body's own offsetFn.
  const positions = new Float32Array((SAMPLES + 1) * 3);
  const sampleVec = new Vector3();
  const baseTime = Date.now();
  for (let s = 0; s <= SAMPLES; s++) {
    const t = (s / SAMPLES) * periodDays * 86_400_000;
    const sampleDate = new Date(baseTime + t);
    const result = object.offsetFn(sampleDate, sampleVec);
    if (result) {
      positions[s * 3] = sampleVec.x;
      positions[s * 3 + 1] = sampleVec.y;
      positions[s * 3 + 2] = sampleVec.z;
    }
  }

  const geometry = new LineGeometry();
  geometry.setPositions(positions);

  const material = new LineMaterial({
    color: 0xb6c7d6,
    linewidth: 1.0,
    transparent: true,
    opacity: 0.25,
    depthWrite: false
  });
  if (typeof window !== 'undefined') {
    material.resolution.set(window.innerWidth, window.innerHeight);
  }

  const line = new Line2(geometry, material);
  line.frustumCulled = false;
  line.computeLineDistances();

  // ── Per-frame: track the parent's world position ───────────────────────
  let groupRef: Group | undefined = $state();
  const parentWorldPos = new Vector3();
  const scratch = new Vector3();
  let lastResW = 0;
  let lastResH = 0;

  // Selection-aware opacity. The moon's own orbit highlights when EITHER
  // the moon itself OR its parent planet is selected (so flying to
  // Jupiter brightens all four Galilean rings, and clicking Europa
  // brightens just Europa's). Same smoothing as the heliocentric
  // OrbitEllipse for visual consistency.
  const BASE_OPACITY = 0.25;
  const HIGHLIGHT_BOOST = 1.9;
  const DIM_FACTOR = 0.35;
  const SMOOTH_LAMBDA = 0.18;
  let currentOpacity = BASE_OPACITY;
  // svelte-ignore state_referenced_locally
  const moonId = object.id;

  useTask(() => {
    if (!groupRef) return;

    // Track the parent's world position so the ring follows the parent
    // around its own orbit. No rotation inheritance — the ring is in
    // inertial space.
    const pos = getWorldPosition(parentId, get(simTime), parentWorldPos, scratch);
    if (pos) groupRef.position.copy(pos);

    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w !== lastResW || h !== lastResH) {
        material.resolution.set(w, h);
        lastResW = w;
        lastResH = h;
      }
    }

    // Selection-aware emphasis.
    const sel = get(selection);
    let target = BASE_OPACITY;
    if (sel === moonId || sel === parentId) {
      target = Math.min(1, BASE_OPACITY * HIGHLIGHT_BOOST);
    } else if (sel && sel !== 'solarSystem') {
      target = BASE_OPACITY * DIM_FACTOR;
    }
    currentOpacity += (target - currentOpacity) * SMOOTH_LAMBDA;
    material.opacity = currentOpacity;
  });
</script>

<T.Group bind:ref={groupRef}>
  <T is={line} />
</T.Group>
