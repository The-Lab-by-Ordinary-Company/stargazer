import { Vector3 } from 'three';
import { EARTH_RADIUS_KM } from '../scene-config';

/**
 * Keplerian orbit helper for moons and planet orbiters.
 *
 * Propagates mean Keplerian elements (J2000 ecliptic frame, parent body at origin)
 * forward in time via mean motion, solves Kepler's equation, and outputs the body's
 * offset from its parent CENTER in scene units. Supports arbitrary eccentricity.
 *
 * Elements sourced from JPL HORIZONS (EPHEM_TYPE=ELEMENTS, REF_PLANE=ECLIPTIC,
 * OUT_UNITS=KM-D) at epoch 2026-04-08.
 */

export interface MoonOrbitalElements {
  /** Parent body id (informational; the helper doesn't read it). */
  parentId: string;
  /** Semi-major axis in km (J2000 ecliptic). */
  a_km: number;
  /** Eccentricity. Highly elliptical orbits OK (Juno e ≈ 0.97). */
  e: number;
  /** Inclination to the J2000 ecliptic plane (degrees). */
  i_deg: number;
  /** Longitude of ascending node, ecliptic frame (degrees). */
  Omega_deg: number;
  /** Argument of periapsis, ecliptic frame (degrees). */
  omega_deg: number;
  /** Mean anomaly at the reference epoch (degrees). */
  M_deg: number;
  /** Sidereal orbital period (Earth days). */
  period_days: number;
  /** Reference epoch as a Julian Day number (JD TDB). */
  epoch_jd: number;
}

const DEG_TO_RAD = Math.PI / 180;
// Unix epoch (1970-01-01 00:00 UTC) in Julian Day. Used to convert
// JavaScript Date timestamps to JD without an external library.
const UNIX_EPOCH_JD = 2440587.5;

/**
 * Compute the body's offset from its parent in scene-frame Cartesian
 * for the given simulation date. Writes into `target` and returns it.
 */
export function computeMoonOffset(
  elements: MoonOrbitalElements,
  date: Date,
  target: Vector3
): Vector3 {
  // Days since the element epoch.
  const t_jd = date.getTime() / 86_400_000 + UNIX_EPOCH_JD;
  const days = t_jd - elements.epoch_jd;

  // Mean motion (deg/day) — derived from period to avoid having to
  // store it separately. (HORIZONS publishes both; period is rounder.)
  const n = 360 / elements.period_days;

  // Mean anomaly at this instant, normalized to [0, 360°).
  const M_deg = (((elements.M_deg + n * days) % 360) + 360) % 360;
  const M_rad = M_deg * DEG_TO_RAD;

  // Solve Kepler's equation M = E - e·sin(E) by Newton-Raphson.
  // Converges in 5-10 iterations for any reasonable eccentricity.
  const e = elements.e;
  let E = M_rad;
  for (let iter = 0; iter < 12; iter++) {
    const dE = (E - e * Math.sin(E) - M_rad) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }

  // Position in the perifocal (orbit) frame, x toward periapsis.
  const a = elements.a_km;
  const x_orb = a * (Math.cos(E) - e);
  const y_orb = a * Math.sqrt(1 - e * e) * Math.sin(E);

  // Rotate perifocal → ecliptic via the standard 3-1-3 Euler sequence
  // (ω around z, i around x, Ω around z).
  const i_rad = elements.i_deg * DEG_TO_RAD;
  const Omega_rad = elements.Omega_deg * DEG_TO_RAD;
  const omega_rad = elements.omega_deg * DEG_TO_RAD;
  const cosO = Math.cos(Omega_rad);
  const sinO = Math.sin(Omega_rad);
  const cosw = Math.cos(omega_rad);
  const sinw = Math.sin(omega_rad);
  const cosi = Math.cos(i_rad);
  const sini = Math.sin(i_rad);

  const x_ecl_km =
    (cosO * cosw - sinO * sinw * cosi) * x_orb +
    (-cosO * sinw - sinO * cosw * cosi) * y_orb;
  const y_ecl_km =
    (sinO * cosw + cosO * sinw * cosi) * x_orb +
    (-sinO * sinw + cosO * cosw * cosi) * y_orb;
  const z_ecl_km = sinw * sini * x_orb + cosw * sini * y_orb;

  // km → scene units, then map ecliptic axes to the unified scene frame:
  //   scene.x = ecl.x
  //   scene.y = ecl.z   (scene Y = ecliptic north)
  //   scene.z = -ecl.y
  return target.set(
    x_ecl_km / EARTH_RADIUS_KM,
    z_ecl_km / EARTH_RADIUS_KM,
    -y_ecl_km / EARTH_RADIUS_KM
  );
}
