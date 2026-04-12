/**
 * Shared scene constants. Tweak here to rebalance the visualization.
 */
export const EARTH_RADIUS = 1; // scene units
export const EARTH_RADIUS_KM = 6371;
export const ISS_TRAIL_MAX_POINTS = 240; // ~20 minutes at 5s polling

// IAU 2006 J2000 obliquity. Applied as rotation.x = -EARTH_OBLIQUITY_RAD
// to tilt the pole toward -Z (correct orientation for seasonal lighting).
export const EARTH_OBLIQUITY_DEG = 23.4393;
export const EARTH_OBLIQUITY_RAD = (EARTH_OBLIQUITY_DEG * Math.PI) / 180;

// Mars's J2000 pole in scene coords (IAU 2018: RA=317.68°, Dec=52.89°, converted
// equatorial→ecliptic→scene). Used to align Mars's mesh +Y to its true pole.
export const MARS_POLE_VEC: readonly [number, number, number] = [
  0.4459, 0.8934, 0.0552
];

// Moon — true size relative to Earth
export const MOON_RADIUS_KM = 1737;
export const MOON_RADIUS = MOON_RADIUS_KM / EARTH_RADIUS_KM; // ≈ 0.273 scene units

// True mean Earth–Moon distance (physical, for info panel display).
export const MOON_TRUE_DISTANCE_EARTH_RADII = 384400 / EARTH_RADIUS_KM; // ≈ 60.34

// Visual compression (~12×) so the Moon orbit reads as a small ring near Earth
// rather than spanning 60% of Earth's heliocentric orbit. True distance shown in info panel.
export const MOON_DISTANCE_SCALE = 0.083;
export const MOON_RENDER_DISTANCE = MOON_TRUE_DISTANCE_EARTH_RADII * MOON_DISTANCE_SCALE; // ≈ 5

// Mars — true scale relative to Earth
export const MARS_RADIUS_KM = 3389.5;
export const MARS_RADIUS = MARS_RADIUS_KM / EARTH_RADIUS_KM; // ≈ 0.532 scene units
// Mean Earth–Mars distance in scene units (varies wildly, ~8,640 closest to ~62,800 farthest)
export const MARS_MEAN_DISTANCE_KM = 225_000_000;
export const MARS_MEAN_DISTANCE = MARS_MEAN_DISTANCE_KM / EARTH_RADIUS_KM; // ≈ 35,300

// Sun
export const SUN_RADIUS_KM = 695_700;

// 1 AU = 100 scene units. Inner solar system fits float32 precision-safe range;
// planet sizes are exaggerated relative to orbital distances (same trade-off
// as the ISS model being shown 3500× scale). Physical values shown in info panels.
export const AU_KM = 149_597_870.7;
export const AU_TO_SCENE = 100;

// Rendered Sun radius. True Sun:Earth ratio is 109×; at AU_TO_SCENE=100 that
// would consume Earth's orbit, so we compromise at ~1.2 scene units.
export const HELIO_SUN_RADIUS = 1.2;

/**
 * Per-parent distance compression for planetary moons, so all moon systems
 * read as proportionally small rings near their parent (matching Moon's 12× compression).
 * Tuned so the innermost tracked moon stays visually above the parent's surface.
 */
export const MOON_COMPRESSION: Record<string, number> = {
  mars: 0.45,
  jupiter: 0.20,
  saturn: 0.38,
  uranus: 0.22,
  neptune: 0.08,
  pluto: 0.07
};
