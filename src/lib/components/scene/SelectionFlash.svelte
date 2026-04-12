<script lang="ts">
  import { T, useTask, useThrelte } from '@threlte/core';
  import { Billboard } from '@threlte/extras';
  import {
    AdditiveBlending,
    ShaderMaterial,
    Vector3,
    type Group,
    type Mesh
  } from 'three';
  import { get } from 'svelte/store';
  import { simTime } from '$stores/simTime';
  import { selection, SOLAR_SYSTEM_VIEW } from '$lib/stores/selection';
  import { getById, getWorldPosition } from '$lib/registry/registry';

  /**
   * Brief additive white flash at the destination when the camera
   * arrives at a new selection. SpaceEngine does this on approach.
   * A screen-space quad that fades from 3% opacity to 0 over 400ms.
   * Tiny detail that reads as "the app knew where you were going."
   */

  const FLASH_DURATION_MS = 400;
  const FLASH_SIZE = 4; // scene units

  let groupRef: Group | undefined = $state();
  let meshRef: Mesh | undefined = $state();
  let flashStartTime = 0;
  let flashing = $state(false);
  let lastSelectionId = SOLAR_SYSTEM_VIEW;

  const worldPos = new Vector3();
  const scratch = new Vector3();

  const vertexShader = /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = /* glsl */ `
    uniform float uOpacity;
    varying vec2 vUv;
    void main() {
      vec2 c = vUv * 2.0 - 1.0;
      float r = length(c);
      float glow = exp(-r * 4.0) * uOpacity;
      if (glow < 0.001) discard;
      gl_FragColor = vec4(1.0, 1.0, 1.0, glow);
    }
  `;

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { uOpacity: { value: 0 } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending
  });

  useTask(() => {
    const sel = get(selection);

    // Trigger flash on selection change (not on solar system view)
    if (sel !== lastSelectionId) {
      lastSelectionId = sel;
      if (sel !== SOLAR_SYSTEM_VIEW) {
        flashing = true;
        flashStartTime = performance.now();
      }
    }

    if (flashing && groupRef) {
      const obj = getById(sel);
      if (obj) {
        const pos = getWorldPosition(obj.id, get(simTime), worldPos, scratch);
        if (pos) groupRef.position.copy(pos);
      }

      const elapsed = performance.now() - flashStartTime;
      const t = Math.min(1, elapsed / FLASH_DURATION_MS);
      // Quick rise, slow fade
      const opacity = t < 0.15 ? t / 0.15 * 0.035 : 0.035 * (1 - (t - 0.15) / 0.85);
      material.uniforms.uOpacity.value = Math.max(0, opacity);

      if (t >= 1) {
        flashing = false;
        material.uniforms.uOpacity.value = 0;
      }
    }
  });
</script>

{#if flashing}
  <T.Group bind:ref={groupRef}>
    <Billboard>
      <T.Mesh bind:ref={meshRef}>
        <T.PlaneGeometry args={[FLASH_SIZE, FLASH_SIZE]} />
        <T is={material} />
      </T.Mesh>
    </Billboard>
  </T.Group>
{/if}
