<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { BackSide, Mesh } from 'three';
  import { HELIO_SUN_RADIUS } from '$lib/scene-config';
  import { enterBody, leaveBody } from '$utils/sceneCursor';
  import { markPendingClick } from '$utils/sceneClick';

  function handlePointerDown(event: { stopPropagation: () => void }): void {
    event.stopPropagation();
    markPendingClick('sun');
  }

  /**
   * The Sun rendered at the heliocentric origin. A glowing yellow-white
   * sphere with a soft outer corona shell. Visually exaggerated from true
   * scale: at AU = 100 scene units, a true-scale Sun would be ~0.47 units,
   * but we render at 1.2 for visual presence (the trade-off is disclosed
   * in the Scene Scale card on the Solar System panel).
   *
   * Note: every planet body in stargazer (Earth, Moon, Mars) uses a custom
   * shader that does its own dot(normal, uSunDir) lighting from the
   * heliocentric direction, so this component does NOT add a Three.js
   * PointLight — it would be ignored by every shader in the scene.
   */

  let coreRef: Mesh | undefined = $state();

  // Subtle pulsing glow on the corona
  let phase = $state(0);
  useTask((dt) => {
    phase += dt * 0.5;
  });
</script>

<T.Group>
  <!-- Bright core -->
  <T.Mesh
    bind:ref={coreRef}
    onpointerdown={handlePointerDown}
    onpointerover={() => enterBody('Sun')}
    onpointerout={() => leaveBody()}
  >
    <T.SphereGeometry args={[HELIO_SUN_RADIUS, 64, 64]} />
    <T.MeshBasicMaterial color="#ffefa8" toneMapped={false} />
  </T.Mesh>

  <!-- Inner glow shell -->
  <T.Mesh>
    <T.SphereGeometry args={[HELIO_SUN_RADIUS * 1.18, 32, 32]} />
    <T.MeshBasicMaterial color="#ffd968" transparent opacity={0.32} side={BackSide} toneMapped={false} />
  </T.Mesh>

  <!-- Outer corona -->
  <T.Mesh>
    <T.SphereGeometry args={[HELIO_SUN_RADIUS * 1.55, 32, 32]} />
    <T.MeshBasicMaterial
      color="#ffae3e"
      transparent
      opacity={0.16}
      side={BackSide}
      toneMapped={false}
    />
  </T.Mesh>
</T.Group>
