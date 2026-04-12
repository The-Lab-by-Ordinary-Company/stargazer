<script lang="ts">
  import { Canvas } from '@threlte/core';
  import { WebGLRenderer } from 'three';
  import World from './World.svelte';

  /**
   * Custom renderer factory so we can enable `logarithmicDepthBuffer`.
   * Critical because of the huge dynamic range in this scene: ISS at
   * altitude ~0.07 next to Mars at distance ~50,000+ scene units. A
   * linear 24-bit depth buffer can't span that range — surface details
   * z-fight badly. The log buffer redistributes precision so close and
   * very-far objects both render cleanly.
   */
  function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
    return new WebGLRenderer({
      canvas,
      logarithmicDepthBuffer: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
  }
</script>

<div class="absolute inset-0 cursor-grab active:cursor-grabbing">
  <Canvas {createRenderer}>
    <World />
  </Canvas>
</div>
