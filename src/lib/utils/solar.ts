/**
 * Subsolar point (lat/lon where the sun is directly overhead) using
 * NOAA's low-precision solar position algorithm. Accurate to ~0.01°.
 * Positioning a scene light at this point gives the correct day/night
 * terminator without needing to tilt the Earth mesh.
 */
export function getSubsolarPoint(date: Date = new Date()): { lat: number; lon: number } {
  // Days since J2000.0 (2000-01-01 12:00 UTC)
  const d = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86400000;

  // Mean longitude of the sun (degrees)
  const L = mod(280.46 + 0.9856474 * d, 360);

  // Mean anomaly (radians)
  const g = mod(357.528 + 0.9856003 * d, 360) * DEG;

  // Ecliptic longitude (radians)
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG;

  // Obliquity of the ecliptic (radians)
  const epsilon = (23.439 - 0.0000004 * d) * DEG;

  // Sun's right ascension (radians)
  const ra = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));

  // Sun's declination (radians) = subsolar latitude
  const dec = Math.asin(Math.sin(epsilon) * Math.sin(lambda));

  // Greenwich Mean Sidereal Time (hours, then radians)
  const gmstHours = mod(18.697374558 + 24.06570982441908 * d, 24);
  const gmstRad = gmstHours * 15 * DEG;

  // Subsolar longitude = right ascension - GMST, normalized to [-π, π]
  const lonRad = Math.atan2(Math.sin(ra - gmstRad), Math.cos(ra - gmstRad));

  return {
    lat: dec / DEG,
    lon: lonRad / DEG
  };
}

/**
 * Sun elevation angle (in degrees) above the local horizon for an observer
 * at the given geographic location at the given UTC instant.
 *
 *  +90° = sun directly overhead
 *    0° = sun on the horizon
 *   -6° = end of civil twilight
 *  -18° = end of astronomical twilight (true night)
 *
 * Used by the pass predictor to decide whether the observer is in darkness
 * (so an overhead ISS pass would actually be visible).
 */
export function getSunElevationAt(
  observerLatDeg: number,
  observerLonDeg: number,
  date: Date = new Date()
): number {
  const sub = getSubsolarPoint(date);
  const lat1 = sub.lat * DEG;
  const lat2 = observerLatDeg * DEG;
  const dLon = (sub.lon - observerLonDeg) * DEG;
  // cos of the angular distance between observer and subsolar point
  const cosAngle =
    Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLon);
  // Elevation = 90° - angular distance
  return 90 - Math.acos(Math.max(-1, Math.min(1, cosAngle))) / DEG;
}

const DEG = Math.PI / 180;

function mod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}
