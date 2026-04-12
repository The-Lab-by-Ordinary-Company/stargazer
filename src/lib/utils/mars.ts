import { Vector3 } from 'three';
import { getPlanetScenePosition } from './helio';

/**
 * Geocentric position of Mars from a simplified Standish/Meeus ephemeris.
 * Accurate to a few arc-minutes — same precision class as the solar and lunar helpers.
 */

const DEG = Math.PI / 180;
const AU_KM = 149_597_870.7;
const J2000_MS = Date.UTC(2000, 0, 1, 12);

interface OrbitalElements {
  /** Semi-major axis (AU) */
  a: number;
  /** Eccentricity */
  e: number;
  /** Inclination (deg) */
  i: number;
  /** Mean longitude (deg) */
  L: number;
  /** Longitude of perihelion (deg) */
  longPeri: number;
  /** Longitude of ascending node (deg) */
  longNode: number;
}

/**
 * Earth's mean elements at epoch J2000.0 with linear rates per Julian century.
 * Source: NASA JPL Solar System Dynamics, "Approximate Positions of the Planets".
 */
function earthElements(T: number): OrbitalElements {
  return {
    a: 1.00000018 + -0.00000003 * T,
    e: 0.01673163 + -0.00003661 * T,
    i: -0.00054346 + -0.01337178 * T,
    L: 100.46691572 + 35999.37306329 * T,
    longPeri: 102.93005885 + 0.3179526 * T,
    longNode: -5.11260389 + -0.24123856 * T
  };
}

/**
 * Mars's mean elements at epoch J2000.0 with linear rates per Julian century.
 */
function marsElements(T: number): OrbitalElements {
  return {
    a: 1.52371243 + 0.00000097 * T,
    e: 0.09336511 + 0.00009149 * T,
    i: 1.85181869 + -0.00724757 * T,
    L: -4.56813164 + 19140.29934243 * T,
    longPeri: -23.91744784 + 0.45223625 * T,
    longNode: 49.71320984 + -0.26852431 * T
  };
}

function mod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

/** Newton-Raphson iteration to solve Kepler's equation for the eccentric anomaly. */
function solveKepler(meanAnomalyRad: number, eccentricity: number): number {
  let E = meanAnomalyRad;
  for (let iter = 0; iter < 12; iter++) {
    const dE =
      (E - eccentricity * Math.sin(E) - meanAnomalyRad) /
      (1 - eccentricity * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

/** Heliocentric ecliptic position of a planet given its mean elements (AU, ecliptic frame). */
function heliocentricPosition(el: OrbitalElements): { x: number; y: number; z: number } {
  // Mean anomaly in radians
  const M = mod(el.L - el.longPeri, 360) * DEG;
  const omega = (el.longPeri - el.longNode) * DEG; // argument of perihelion
  const i = el.i * DEG;
  const Omega = el.longNode * DEG;

  const E = solveKepler(M, el.e);

  // Position in the orbital plane (perifocal frame)
  const xOrb = el.a * (Math.cos(E) - el.e);
  const yOrb = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);

  // Rotate orbital plane → heliocentric ecliptic
  const cosO = Math.cos(Omega);
  const sinO = Math.sin(Omega);
  const cosw = Math.cos(omega);
  const sinw = Math.sin(omega);
  const cosi = Math.cos(i);
  const sini = Math.sin(i);

  const x = (cosO * cosw - sinO * sinw * cosi) * xOrb + (-cosO * sinw - sinO * cosw * cosi) * yOrb;
  const y = (sinO * cosw + cosO * sinw * cosi) * xOrb + (-sinO * sinw + cosO * cosw * cosi) * yOrb;
  const z = sinw * sini * xOrb + cosw * sini * yOrb;

  return { x, y, z };
}

export interface MarsState {
  /** Geographic latitude where Mars is currently directly overhead */
  lat: number;
  /** Geographic longitude where Mars is currently directly overhead */
  lon: number;
  /** Earth–Mars center-to-center distance in km */
  distanceKm: number;
  /** Light-travel time from Mars to Earth at this instant (seconds) */
  lightTravelSec: number;
}

/**
 * Compute Mars's geocentric state at a given UTC instant. Returns the
 * geographic point on Earth where Mars is currently directly overhead,
 * Earth–Mars center distance in km, and one-way light-travel time.
 */
export function getMarsState(date: Date = new Date()): MarsState {
  // Centuries since J2000.0
  const T = (date.getTime() - J2000_MS) / (86400000 * 36525);

  const earth = heliocentricPosition(earthElements(T));
  const mars = heliocentricPosition(marsElements(T));

  // Geocentric ecliptic vector (Mars relative to Earth) in AU
  const dx = mars.x - earth.x;
  const dy = mars.y - earth.y;
  const dz = mars.z - earth.z;

  const distanceAU = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const distanceKm = distanceAU * AU_KM;

  // Convert ecliptic Cartesian → ecliptic spherical
  const lambdaEcl = Math.atan2(dy, dx);
  const betaEcl = Math.asin(dz / distanceAU);

  // Ecliptic → equatorial (RA, Dec)
  const epsilon = 23.4393 * DEG;
  const sinEps = Math.sin(epsilon);
  const cosEps = Math.cos(epsilon);
  const dec = Math.asin(
    Math.sin(betaEcl) * cosEps + Math.cos(betaEcl) * sinEps * Math.sin(lambdaEcl)
  );
  const ra = Math.atan2(
    Math.sin(lambdaEcl) * cosEps - Math.tan(betaEcl) * sinEps,
    Math.cos(lambdaEcl)
  );

  // RA → Earth-fixed geographic longitude via Greenwich Mean Sidereal Time
  const dayJ2000 = (date.getTime() - J2000_MS) / 86400000;
  const gmstHours = mod(18.697374558 + 24.06570982441908 * dayJ2000, 24);
  const gmstRad = gmstHours * 15 * DEG;
  const lonRad = Math.atan2(Math.sin(ra - gmstRad), Math.cos(ra - gmstRad));

  return {
    lat: dec / DEG,
    lon: lonRad / DEG,
    distanceKm,
    lightTravelSec: distanceKm / 299_792.458
  };
}

/** Mars's scene-space position via the heliocentric ephemeris in helio.ts. */
export function getMarsScenePosition(target: Vector3, date: Date = new Date()): Vector3 {
  return getPlanetScenePosition(target, 'mars', date);
}
