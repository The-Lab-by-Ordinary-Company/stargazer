import { Matrix4, Vector3 } from 'three';
import { getPlanetScenePosition } from './helio';
import { EARTH_OBLIQUITY_RAD } from '../scene-config';

/**
 * Earth-specific helpers for the unified heliocentric scene.
 *
 * Earth sits at its true heliocentric position. Its orientation is the
 * combined transform R_x(-obliquity) · R_y(GMST): the GMST rotation spins
 * Earth around its own geographic axis, and the obliquity tilt orients
 * that axis 23.44° from ecliptic north. This module exposes the math used
 * by both Earth.svelte and the camera-tracking code in World.svelte so
 * the two stay aligned.
 */

const J2000_MS = Date.UTC(2000, 0, 1, 12);
const DEG_PER_HOUR = 15;
const DEG_TO_RAD = Math.PI / 180;

/**
 * Greenwich Mean Sidereal Time at the given instant, expressed as a
 * rotation angle in radians around the Y axis. This is the angle that
 * Earth has rotated from the vernal-equinox-aligned starting position.
 */
export function getGmstRadians(date: Date = new Date()): number {
  const d = (date.getTime() - J2000_MS) / 86400000;
  let hours = (18.697374558 + 24.06570982441908 * d) % 24;
  if (hours < 0) hours += 24;
  return hours * DEG_PER_HOUR * DEG_TO_RAD;
}

/** Earth's heliocentric scene position (1 AU = 100 units). */
export function getEarthScenePosition(target: Vector3, date: Date = new Date()): Vector3 {
  return getPlanetScenePosition(target, 'earth', date);
}

/**
 * Take an Earth-fixed (local) offset and apply ONLY Earth's combined
 * orientation transform — GMST rotation around the geographic axis,
 * then obliquity tilt around scene +X — without the heliocentric
 * translation. The result is the body's inertial offset from Earth's
 * CENTER in scene coordinates.
 *
 * Used by the registry's `offsetFn` for Earth-orbiting bodies (ISS,
 * Tiangong, future Hubble, etc.), since the registry's position model
 * is "offset from parent". The world position is then composed by
 * adding Earth's heliocentric position via the parent walk in
 * `registry.ts`.
 *
 * This MUST exactly match Earth.svelte's transform — its useTask sets
 * `rotation.x = -EARTH_OBLIQUITY_RAD; rotation.y = GMST` which produces
 * the matrix R_x(-obliquity) · R_y(GMST).
 */
export function earthLocalToInertialOffset(
  local: { x: number; y: number; z: number },
  target: Vector3,
  date: Date = new Date()
): Vector3 {
  const gmst = getGmstRadians(date);

  // Build R_x(-obliquity) · R_y(GMST) — same composition order as the
  // Three.js Euler XYZ on Earth's group.
  _earthRot.makeRotationX(-EARTH_OBLIQUITY_RAD);
  _gmstRot.makeRotationY(gmst);
  _earthRot.multiply(_gmstRot);

  return target.set(local.x, local.y, local.z).applyMatrix4(_earthRot);
}

/**
 * Take an Earth-fixed (local) offset and return its inertial WORLD
 * position by applying Earth's orientation transform AND its
 * heliocentric translation. Convenience wrapper around
 * `earthLocalToInertialOffset` for the camera-tracking code in
 * World.svelte, which works in world coordinates rather than
 * parent-relative offsets.
 */
export function earthLocalToWorld(
  local: { x: number; y: number; z: number },
  target: Vector3,
  date: Date = new Date()
): Vector3 {
  earthLocalToInertialOffset(local, target, date);
  const earth = getEarthScenePosition(_helioTmp, date);
  return target.set(target.x + earth.x, target.y + earth.y, target.z + earth.z);
}

const _helioTmp = new Vector3();
const _earthRot = new Matrix4();
const _gmstRot = new Matrix4();
