import { Vector3 } from 'three';
import { get } from 'svelte/store';
import type { SatelliteStore } from '$stores/satelliteFactory';
import { latLonAltToVec3 } from './coords';
import { EARTH_RADIUS, EARTH_RADIUS_KM } from '../scene-config';

/**
 * Synchronously read any satellite store's current scene-space position
 * into a target Vector3. Used by the camera fly-over logic so it can lock
 * onto either the ISS or Tiangong (or future satellites) using the same
 * code path.
 */
export function getSatelliteScenePosition(store: SatelliteStore, target: Vector3): Vector3 {
  const data = get(store.data);
  if (!data) {
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
