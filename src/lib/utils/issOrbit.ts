import * as satellite from '$lib/satellite-shim';
import { latLonAltToVec3 } from './coords';
import { EARTH_RADIUS, EARTH_RADIUS_KM } from '../scene-config';

export interface IssOrbitOptions {
  /** Where to start propagation. Default: now. */
  start?: Date;
  /** How many minutes of orbit to trace. Default: 92 (one full orbit). */
  durationMinutes?: number;
  /** Number of points along the polyline. Default: 240. */
  samples?: number;
}

/**
 * Propagate a TLE forward via SGP4 and return a Float32Array of XYZ scene-space
 * positions ready for a BufferGeometry position attribute.
 */
export function computeIssOrbit(
  tle: { line1: string; line2: string },
  options: IssOrbitOptions = {}
): Float32Array {
  const start = options.start ?? new Date();
  const durationMinutes = options.durationMinutes ?? 92;
  const samples = options.samples ?? 240;

  const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
  const positions = new Float32Array(samples * 3);
  const intervalMs = (durationMinutes * 60 * 1000) / (samples - 1);

  let writeIdx = 0;
  let validCount = 0;

  for (let i = 0; i < samples; i++) {
    const date = new Date(start.getTime() + i * intervalMs);
    const result = satellite.propagate(satrec, date);
    if (!result.position || typeof result.position === 'boolean') continue;

    const gmst = satellite.gstime(date);
    const geo = satellite.eciToGeodetic(
      result.position as satellite.EciVec3<satellite.Kilometer>,
      gmst
    );

    const lat = satellite.degreesLat(geo.latitude);
    const lon = satellite.degreesLong(geo.longitude);
    const altKm = geo.height;

    const [x, y, z] = latLonAltToVec3(lat, lon, altKm, EARTH_RADIUS, EARTH_RADIUS_KM);
    positions[writeIdx++] = x;
    positions[writeIdx++] = y;
    positions[writeIdx++] = z;
    validCount++;
  }

  // If propagation failed for some samples, return only the valid prefix
  return validCount === samples ? positions : positions.slice(0, validCount * 3);
}
