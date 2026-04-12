<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import {
    BufferAttribute,
    BufferGeometry,
    Color,
    Points,
    PointsMaterial,
    type Group
  } from 'three';
  import { reducedMotion } from '$stores/reducedMotion';

  /**
   * Sparse particle dust field. 800 tiny points at very low opacity
   * drifting slowly through the scene. Adds atmospheric depth without
   * implying physical dust. Inspired by 100,000 Stars' Milky Way
   * particle layer.
   *
   * The particles are distributed in a sphere of radius ~500 scene
   * units (roughly the inner solar system) and drift at a glacial
   * 0.002 units/frame so they read as ambient texture rather than
   * motion.
   */

  const COUNT = 2000;
  const RADIUS = 5000;
  const DRIFT_SPEED = 0.002;

  // Distribute particles randomly in a sphere
  const positions = new Float32Array(COUNT * 3);
  const velocities = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    // Random point in sphere via rejection sampling
    let x: number, y: number, z: number;
    do {
      x = (Math.random() - 0.5) * 2;
      y = (Math.random() - 0.5) * 2;
      z = (Math.random() - 0.5) * 2;
    } while (x * x + y * y + z * z > 1);
    positions[i * 3] = x * RADIUS;
    positions[i * 3 + 1] = y * RADIUS;
    positions[i * 3 + 2] = z * RADIUS;
    // Random drift direction, very slow
    velocities[i * 3] = (Math.random() - 0.5) * DRIFT_SPEED;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * DRIFT_SPEED;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * DRIFT_SPEED;
  }

  const geometry = new BufferGeometry();
  const posAttr = new BufferAttribute(positions, 3);
  geometry.setAttribute('position', posAttr);

  const material = new PointsMaterial({
    color: new Color(0.7, 0.75, 0.9),
    size: 1.5,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.04,
    depthWrite: false
  });

  const points = new Points(geometry, material);
  points.frustumCulled = false;

  useTask(() => {
    // Glacial drift
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] += velocities[i * 3];
      positions[i * 3 + 1] += velocities[i * 3 + 1];
      positions[i * 3 + 2] += velocities[i * 3 + 2];
      // Wrap around the sphere boundary
      const r2 =
        positions[i * 3] ** 2 +
        positions[i * 3 + 1] ** 2 +
        positions[i * 3 + 2] ** 2;
      if (r2 > RADIUS * RADIUS) {
        positions[i * 3] *= -0.9;
        positions[i * 3 + 1] *= -0.9;
        positions[i * 3 + 2] *= -0.9;
      }
    }
    posAttr.needsUpdate = true;
  });
</script>

{#if !$reducedMotion}
  <T is={points} />
{/if}
