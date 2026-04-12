<script lang="ts">
  import { T } from '@threlte/core';

  /**
   * Parametric ISS model — central truss with eight solar array wings,
   * a cluster of pressurized modules, and radiator panels. Built from
   * primitive geometries so we don't have to ship a multi-megabyte GLB.
   *
   * Scale: the real ISS is ~108 m on its longest axis, which is 1.7×10⁻⁵
   * scene units at our true scale. The geometry below is at the visible
   * scale (~0.06 scene units long), so the model is exaggerated by ~3500×.
   * That exaggeration is necessary to make it readable; the orbital
   * altitude and ground-track positions remain physically true.
   *
   * Local frame:
   *   +X = direction of travel (truss long axis)
   *   +Y = "up" relative to Earth (perpendicular to orbital plane → solar array hinge)
   *   +Z = side
   *
   * The parent component is responsible for orienting this frame so the
   * truss aligns with the velocity vector.
   */

  // Monochrome palette to match the rest of the app's design language.
  // White modules and radiators read as the brightest elements; dark
  // solar arrays provide contrast; mid-gray truss ties them together.
  const trussColor = '#d4d4d4';
  const moduleColor = '#ffffff';
  const arrayColor = '#0a0a0a';
  const radiatorColor = '#f5f5f5';

  // Solar array wing positions along the truss (X axis)
  const wingPositions = [-0.026, -0.014, 0.014, 0.026];
</script>

<T.Group>
  <!-- Central truss -->
  <T.Mesh>
    <T.BoxGeometry args={[0.062, 0.0035, 0.0035]} />
    <T.MeshStandardMaterial color={trussColor} metalness={0.7} roughness={0.35} />
  </T.Mesh>

  <!-- Solar array wings: 4 pairs (8 total) -->
  {#each wingPositions as posX (posX)}
    <!-- Top wing -->
    <T.Mesh position={[posX, 0.014, 0]}>
      <T.BoxGeometry args={[0.0025, 0.022, 0.014]} />
      <T.MeshStandardMaterial color={arrayColor} metalness={0.5} roughness={0.6} />
    </T.Mesh>
    <!-- Bottom wing -->
    <T.Mesh position={[posX, -0.014, 0]}>
      <T.BoxGeometry args={[0.0025, 0.022, 0.014]} />
      <T.MeshStandardMaterial color={arrayColor} metalness={0.5} roughness={0.6} />
    </T.Mesh>
  {/each}

  <!-- Radiator panels (perpendicular to truss, mid-span) -->
  <T.Mesh position={[0, 0, 0.012]}>
    <T.BoxGeometry args={[0.012, 0.001, 0.011]} />
    <T.MeshStandardMaterial color={radiatorColor} metalness={0.4} roughness={0.6} />
  </T.Mesh>
  <T.Mesh position={[0, 0, -0.012]}>
    <T.BoxGeometry args={[0.012, 0.001, 0.011]} />
    <T.MeshStandardMaterial color={radiatorColor} metalness={0.4} roughness={0.6} />
  </T.Mesh>

  <!-- Pressurized module cluster (cylinders along the perpendicular Z axis) -->
  <T.Mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
    <T.CylinderGeometry args={[0.0042, 0.0042, 0.022, 12]} />
    <T.MeshStandardMaterial color={moduleColor} metalness={0.6} roughness={0.4} />
  </T.Mesh>
  <T.Mesh position={[-0.006, -0.0006, 0.004]} rotation={[Math.PI / 2, 0, 0]}>
    <T.CylinderGeometry args={[0.0034, 0.0034, 0.014, 10]} />
    <T.MeshStandardMaterial color={moduleColor} metalness={0.55} roughness={0.45} />
  </T.Mesh>
  <T.Mesh position={[0.006, -0.0006, 0.004]} rotation={[Math.PI / 2, 0, 0]}>
    <T.CylinderGeometry args={[0.0034, 0.0034, 0.014, 10]} />
    <T.MeshStandardMaterial color={moduleColor} metalness={0.55} roughness={0.45} />
  </T.Mesh>
  <T.Mesh position={[-0.006, -0.0006, -0.004]} rotation={[Math.PI / 2, 0, 0]}>
    <T.CylinderGeometry args={[0.0034, 0.0034, 0.014, 10]} />
    <T.MeshStandardMaterial color={moduleColor} metalness={0.55} roughness={0.45} />
  </T.Mesh>
  <T.Mesh position={[0.006, -0.0006, -0.004]} rotation={[Math.PI / 2, 0, 0]}>
    <T.CylinderGeometry args={[0.0034, 0.0034, 0.014, 10]} />
    <T.MeshStandardMaterial color={moduleColor} metalness={0.55} roughness={0.45} />
  </T.Mesh>
</T.Group>
