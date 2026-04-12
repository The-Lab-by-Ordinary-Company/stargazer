import { Vector3 } from 'three';
import { get } from 'svelte/store';
import { iss } from '$lib/stores/iss';
import { latLonAltToVec3 } from './coords';
import { EARTH_RADIUS, EARTH_RADIUS_KM } from '../scene-config';

/**
 * Synchronously read the ISS's current scene-space position from the iss
 * store and write it into `target`. If we don't have data yet, falls back
 * to a sane default just above the equator at lon 0.
 */
export function getIssScenePosition(target: Vector3): Vector3 {
  const data = get(iss.data);
  if (!data) {
    // Default: just above lat=0 lon=0 at typical ISS altitude
    const [x, y, z] = latLonAltToVec3(0, 0, 420, EARTH_RADIUS, EARTH_RADIUS_KM);
    return target.set(x, y, z);
  }
  const [x, y, z] = latLonAltToVec3(
    data.latitude,
    data.longitude,
    data.altitudeKm,
    EARTH_RADIUS,
    EARTH_RADIUS_KM
  );
  return target.set(x, y, z);
}
