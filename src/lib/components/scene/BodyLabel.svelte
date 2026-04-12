<script lang="ts">
  import { T, useTask, useThrelte } from '@threlte/core';
  import { HTML } from '@threlte/extras';
  import { Vector3, type Group } from 'three';
  import { get } from 'svelte/store';
  import { simTime } from '$stores/simTime';
  import { selection, SOLAR_SYSTEM_VIEW } from '$stores/selection';
  import { getById, getWorldPosition } from '$lib/registry/registry';
  import { type TrackedObject } from '$lib/registry/types';
  import { markPendingClick } from '$utils/sceneClick';
  import { cameraTargetDistance } from '$stores/cameraDistance';

  const TIER_MAX_DISTANCE: number[] = [
    Infinity, // tier 0 (unused)
    Infinity, // tier 1: always visible (Sun, planets, Pluto)
    5000,     // tier 2: Moon, Ceres, Eris, Halley, Voyagers
    500,      // tier 3: major moons, JWST, New Horizons, famous NEOs
    50,       // tier 4: other moons, en-route spacecraft
    8,        // tier 5: Phobos, Deimos, ISS, Tiangong, rovers
  ];

  /**
   * Single-body label rendered in the 3D scene as a Threlte HTML
   * billboard. Aggressively culled, NASA Eyes-style.
   *
   * Visibility rules (in priority order, first match wins):
   *
   *   1. The selected body's own label is always shown ("primary" style).
   *   2. The selected body's PARENT is shown so the user has context
   *      ("you are at Phobos, which orbits Mars").
   *   3. The selected body's CHILDREN are shown (selecting Mars shows
   *      Phobos / Deimos / Curiosity / Perseverance / orbiters).
   *   4. In Solar System overview (no selection target), only tier-1
   *      anchors (Sun + the 8 planets + Pluto) are shown. Everything
   *      else stays quiet — the user discovers more via the body tree
   *      or by hovering the dots.
   *   5. Anything else is hidden. The hover tooltip provides on-demand
   *      labels for bodies the user wants to identify.
   *
   * Beyond those rules we ALSO hide labels for bodies that are behind
   * the camera or outside the visible viewport, projecting the world
   * position to NDC each frame and gating on the result.
   *
   * Each BodyLabel manages its own per-frame visibility flag. The
   * `{#if visible}` block only re-renders when visibility flips, so
   * the DOM stays cheap even with 80+ bodies in the scene.
   */

  let { object: objectProp }: { object: TrackedObject } = $props();

  // svelte-ignore state_referenced_locally
  const object = objectProp;
  const labelTier = object.labelTier ?? 5;

  const { camera } = useThrelte();

  // ── Visibility computation ─────────────────────────────────────────────

  function isInFrustum(pos: Vector3): boolean {
    // Project the world position into NDC. If z >= 1 the body is behind
    // the camera or past the far plane. If |x| or |y| > ~1.05 (small
    // padding so labels at the edge don't pop), it's off-screen.
    ndc.copy(pos).project(camera.current);
    if (ndc.z >= 1 || ndc.z <= -1) return false;
    return Math.abs(ndc.x) <= 1.05 && Math.abs(ndc.y) <= 1.05;
  }

  function computeVisibility(pos: Vector3): boolean {
    if (!isInFrustum(pos)) return false;

    const sel = get(selection);

    // Selected body, its parent, and its children: always visible
    if (sel !== null && sel !== SOLAR_SYSTEM_VIEW) {
      if (sel === object.id) return true;
      const selected = getById(sel);
      if (selected) {
        if (selected.parent === object.id) return true;
        if (object.parent === sel) return true;
      }
    }

    // Distance-based tier check (Google Maps-style progressive disclosure)
    const dist = get(cameraTargetDistance);
    const maxDist = TIER_MAX_DISTANCE[Math.min(labelTier, TIER_MAX_DISTANCE.length - 1)] ?? 0;
    return dist <= maxDist;
  }

  // ── Per-frame state ────────────────────────────────────────────────────
  let groupRef: Group | undefined = $state();
  let visible = $state(false);
  let isSelected = $state(false);
  const worldPos = new Vector3();
  const scratch = new Vector3();
  const ndc = new Vector3();

  useTask(() => {
    if (!groupRef) return;

    const pos = getWorldPosition(object.id, get(simTime), worldPos, scratch);
    if (!pos) {
      groupRef.visible = false;
      if (visible) visible = false;
      return;
    }
    groupRef.position.copy(pos);

    const newVisible = computeVisibility(pos);
    if (newVisible !== visible) visible = newVisible;
    groupRef.visible = newVisible;

    const newSelected = get(selection) === object.id;
    if (newSelected !== isSelected) isSelected = newSelected;
  });
</script>

<T.Group bind:ref={groupRef}>
  <!--
    NASA-Eyes-style label with fade transitions. Always mounted so
    opacity can transition smoothly (200ms) instead of popping.
    Pointer events disabled when hidden so invisible labels don't
    block scene clicks.
  -->
  <HTML transform={false} pointerEvents={visible ? 'auto' : 'none'} center={false} zIndexRange={[40, 0]}>
    <div
      class="nasa-label"
      class:selected={isSelected}
      class:label-visible={visible}
    >
      <span class="dot" aria-hidden="true"></span>
      <svg
        class="leader"
        viewBox="0 0 24 24"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          x1="0"
          y1="24"
          x2="22"
          y2="2"
          stroke="currentColor"
          stroke-width="1"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
        />
      </svg>
      <button
        type="button"
        class="text"
        onpointerdown={(e) => {
          e.stopPropagation();
          markPendingClick(object.id);
        }}
        aria-label={`Select ${object.name}`}
      >
        {object.name}
      </button>
    </div>
  </HTML>
</T.Group>

<style>
  /*
   * NASA-Eyes label.
   *
   * The wrapper is a 0×0 anchor at the body's projected screen
   * position. All children are absolutely positioned around that
   * origin: the dot AT it, the leader line up-and-right of it, and
   * the text at the leader's end.
   */
  .nasa-label {
    position: relative;
    width: 0;
    height: 0;
    pointer-events: none;
    color: rgba(255, 255, 255, 0.78);
    opacity: 0;
    transition-property: color, opacity;
    transition-duration: 200ms;
    transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
  }
  .nasa-label.label-visible {
    opacity: 1;
  }
  .nasa-label.selected {
    color: rgba(220, 235, 255, 1);
  }

  /* Anchor dot — sits exactly on the body's projected centre. */
  .nasa-label .dot {
    position: absolute;
    left: -2px;
    top: -2px;
    width: 4px;
    height: 4px;
    border-radius: 9999px;
    background: currentColor;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.6);
    pointer-events: none;
    transition-property: width, height, left, top, box-shadow;
    transition-duration: 200ms;
    transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
  }
  .nasa-label.selected .dot {
    width: 6px;
    height: 6px;
    left: -3px;
    top: -3px;
    box-shadow: 0 0 8px rgba(232, 68, 30, 0.6);
  }

  /*
   * Diagonal leader line. The SVG sits in a 24×24 box, top-left at
   * the anchor's (1, -24) (so the line runs from the anchor up and
   * to the right).  vector-effect="non-scaling-stroke" keeps the
   * stroke width at exactly 1px regardless of any CSS transform.
   */
  .nasa-label .leader {
    position: absolute;
    left: 1px;
    top: -24px;
    width: 24px;
    height: 24px;
    overflow: visible;
    pointer-events: none;
    opacity: 0.7;
    transition-property: opacity;
    transition-duration: 200ms;
    transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
  }
  .nasa-label.selected .leader {
    opacity: 1;
  }

  /*
   * Body name. Plain text with no background — the only legibility
   * comes from a layered text-shadow that survives both bright and
   * dark backdrops. All-caps mono with wide tracking matches NASA
   * Eyes' visual rhythm.
   */
  .nasa-label .text {
    position: absolute;
    left: 28px;
    top: -28px;
    transform: translateY(-50%);
    font-family:
      'Cygnito Mono',
      'Geist Mono Variable',
      ui-monospace,
      monospace;
    font-size: 9px;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #ffffff;
    background: rgba(232, 68, 30, 0.88);
    border: 0;
    padding: 3px 7px;
    margin: 0;
    cursor: pointer;
    pointer-events: auto;
    white-space: nowrap;
    text-shadow: none;
    transition-property: background-color, padding, font-size;
    transition-duration: 200ms;
    transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
  }
  .nasa-label.selected .text {
    font-size: 10px;
    background: rgba(232, 68, 30, 1);
    padding: 4px 9px;
  }
  .nasa-label .text:hover {
    background: rgba(232, 68, 30, 1);
  }
  .nasa-label .text:focus-visible {
    outline: none;
    background: rgba(232, 68, 30, 1);
  }
</style>
