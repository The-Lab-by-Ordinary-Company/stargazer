<script lang="ts">
  import { T } from '@threlte/core';
  import { BackSide, ShaderMaterial } from 'three';

  /**
   * Full-viewport background sphere with a subtle radial gradient.
   * Replaces the flat scene.background color with a gradient that
   * goes from near-black at the center (where the Sun is) to a
   * slightly warmer dark at the edges. Kills the "inside a box"
   * feeling instantly.
   *
   * Rendered as a large sphere with BackSide material at radius 90000
   * (inside the 100000 far plane, outside the 70000 starfield sphere).
   * The gradient is view-direction-based so it always centers on the
   * camera's forward direction.
   */

  const vertexShader = /* glsl */ `
    varying vec3 vWorldDir;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldDir = normalize(worldPos.xyz - cameraPosition);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = /* glsl */ `
    varying vec3 vWorldDir;
    void main() {
      // Radial gradient based on how far the view direction is from
      // the camera's forward. Uses the Y component to add a subtle
      // vertical gradient (slightly lighter below, like scattered
      // galactic plane light).
      float vignette = length(vWorldDir.xz) * 0.5;
      float vertical = vWorldDir.y * 0.15 + 0.5;

      // Base: very dark blue-black
      vec3 center = vec3(0.028, 0.030, 0.045);
      // Edge: slightly warmer, fractionally lighter
      vec3 edge = vec3(0.055, 0.048, 0.065);

      vec3 color = mix(center, edge, vignette * vertical);
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: BackSide,
    depthWrite: false
  });
</script>

<T.Mesh renderOrder={-1000}>
  <T.SphereGeometry args={[90000, 16, 16]} />
  <T is={material} />
</T.Mesh>
