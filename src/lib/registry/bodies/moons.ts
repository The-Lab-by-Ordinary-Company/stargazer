import { EARTH_RADIUS_KM, MOON_COMPRESSION } from '$lib/scene-config';
import { computeMoonOffset, type MoonOrbitalElements } from '$utils/moons';
import type { TrackedObject } from '../types';

/**
 * Notable moons with real Keplerian elements from JPL HORIZONS (epoch 2026-04-08).
 * Phobos and Deimos use exaggerated display radii for visibility; honest radiusKm is preserved.
 * Orbits are accurate in shape, period, plane, and phase; may drift over year-scale due to
 * nodal precession (constant-element approximation).
 */

const EPOCH_JD = 2461200; // JD TDB at 2026-06-08 00:00 UTC

// ── Helpers ────────────────────────────────────────────────────────────

function moon(opts: {
  id: string;
  name: string;
  parentId: string;
  /** Body radius in km (true). */
  radiusKm: number;
  /** Override radius in scene units when true scale is invisible. */
  displayRadius?: number;
  color: string;
  cameraDistance: number;
  subtitle?: string;
  /** Label visibility tier — defaults to 4 for ordinary moons. */
  labelTier?: number;
  /** Full Keplerian elements (parent's ecliptic J2000 frame, km, deg). */
  elements: Omit<MoonOrbitalElements, 'parentId' | 'epoch_jd'>;
  /** 1-2 sentence prose description for the info panel. */
  description?: string;
  /** Key-value fact pairs displayed in the info panel grid. */
  facts?: { label: string; value: string }[];
  /** Cited data sources for the info panel. */
  sources?: { name: string; url: string }[];
  /** Position tracking metadata. */
  tracking?: { mode: string; source: string; epoch?: string };
  /** Render a fresnel atmosphere shell (Titan). */
  hasAtmosphere?: boolean;
  atmosphereColor?: readonly [number, number, number];
}): TrackedObject {
  const fullElements: MoonOrbitalElements = {
    ...opts.elements,
    parentId: opts.parentId,
    epoch_jd: EPOCH_JD
  };
  const periodDays = opts.elements.period_days;
  const periodStr =
    periodDays < 1
      ? `${(periodDays * 24).toFixed(2)} hours`
      : `${periodDays.toFixed(periodDays < 10 ? 3 : 2)} Earth days`;
  return {
    id: opts.id,
    name: opts.name,
    type: 'moon',
    parent: opts.parentId,
    offsetFn: (date, target) => {
      const result = computeMoonOffset(fullElements, date, target);
      // Apply per-parent distance compression so all moon systems
      // have visually consistent proportions (see scene-config.ts
      // MOON_COMPRESSION for the rationale and per-system values).
      const scale = MOON_COMPRESSION[opts.parentId];
      if (result && scale !== undefined) result.multiplyScalar(scale);
      return result;
    },
    rendererKind: 'planet-body',
    cameraDistance: opts.cameraDistance,
    labelTier: opts.labelTier ?? 4,
    metadata: {
      subtitle: opts.subtitle,
      description: opts.description,
      facts: opts.facts,
      sources: opts.sources,
      tracking: opts.tracking,
      radius: opts.displayRadius ?? opts.radiusKm / EARTH_RADIUS_KM,
      radiusKm: opts.radiusKm,
      geometryDetail: 4,
      solidColor: opts.color,
      hasAtmosphere: opts.hasAtmosphere,
      atmosphereColor: opts.atmosphereColor,
      rotationModel: 'tidal-lock',
      shaderAmbient: 0.02,
      shaderBrightness: 1.85,
      dayLength: `${periodStr} (tidal lock)`,
      yearLength: periodStr,
      orbitalPeriodDays: periodDays
    }
  };
}

// ── Mars ───────────────────────────────────────────────────────────────

const PHOBOS = moon({
  id: 'phobos',
  name: 'Phobos',
  parentId: 'mars',
  radiusKm: 11.2,
  displayRadius: 0.04,
  color: '#7a6e63',
  cameraDistance: 0.3,
  labelTier: 5,
  subtitle: 'Mars I · Captured asteroid',
  description:
    'Phobos is the larger and closer of Mars\'s two moons, orbiting so near the surface that it completes three orbits per Martian day. It is slowly spiraling inward and will either crash into Mars or break apart into a ring in roughly 50 million years.',
  facts: [
    { label: 'Diameter', value: '22.4 km (mean)' },
    { label: 'Orbital period', value: '0.319 days (7 h 39 m)' },
    { label: 'Discovery', value: '1877, Asaph Hall' },
    { label: 'Notable feature', value: 'Stickney crater (9 km wide, nearly shattered the moon)' }
  ],
  sources: [
    { name: 'NASA Solar System', url: 'https://science.nasa.gov/solar-system/moons/' },
    { name: 'JPL Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/' }
  ],
  tracking: { mode: 'Live', source: 'Keplerian propagation from JPL HORIZONS elements' },
  elements: {
    a_km: 9378.393,
    e: 0.015287,
    i_deg: 26.2017,
    Omega_deg: 80.7171,
    omega_deg: 227.3106,
    M_deg: 305.9800,
    period_days: 0.319149
  }
});

const DEIMOS = moon({
  id: 'deimos',
  name: 'Deimos',
  parentId: 'mars',
  radiusKm: 6.2,
  displayRadius: 0.03,
  color: '#827368',
  cameraDistance: 0.3,
  labelTier: 5,
  subtitle: 'Mars II · Smaller of Mars\u2019s two moons',
  description:
    'Deimos is the smaller and more distant of Mars\'s two moons, with an almost circular orbit. Its smooth, dust-blanketed surface and small size suggest it may be a captured D-type asteroid.',
  facts: [
    { label: 'Diameter', value: '12.4 km (mean)' },
    { label: 'Orbital period', value: '1.263 days (30 h 18 m)' },
    { label: 'Discovery', value: '1877, Asaph Hall' },
    { label: 'Notable feature', value: 'Unusually smooth surface covered by a thick regolith blanket' }
  ],
  sources: [
    { name: 'NASA Solar System', url: 'https://science.nasa.gov/solar-system/moons/' },
    { name: 'JPL Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/' }
  ],
  tracking: { mode: 'Live', source: 'Keplerian propagation from JPL HORIZONS elements' },
  elements: {
    a_km: 23459.35,
    e: 0.000240,
    i_deg: 24.1207,
    Omega_deg: 81.3446,
    omega_deg: 40.6533,
    M_deg: 136.5696,
    period_days: 1.262625
  }
});

// ── Jupiter (Galilean four) ────────────────────────────────────────────

const IO = moon({
  id: 'io',
  name: 'Io',
  parentId: 'jupiter',
  radiusKm: 1821.6,
  color: '#e6c878',
  cameraDistance: 1.5,
  labelTier: 3,
  subtitle: 'Jupiter I · The most volcanically active world',
  description:
    'Io is the most volcanically active body in the solar system, driven by intense tidal heating from Jupiter and the Laplace resonance with Europa and Ganymede. Its surface is continuously reshaped by hundreds of active volcanoes erupting sulfur and silicate lava.',
  facts: [
    { label: 'Diameter', value: '3,643.2 km' },
    { label: 'Orbital period', value: '1.769 days' },
    { label: 'Discovery', value: '1610, Galileo Galilei' },
    { label: 'Notable feature', value: 'Over 400 active volcanoes, most volcanically active world known' }
  ],
  sources: [
    { name: 'NASA Solar System', url: 'https://science.nasa.gov/solar-system/moons/' },
    { name: 'JPL Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/' }
  ],
  tracking: { mode: 'Live', source: 'Keplerian propagation from JPL HORIZONS elements' },
  elements: {
    a_km: 422028.92,
    e: 0.004290,
    i_deg: 2.21963,
    Omega_deg: 338.4905,
    omega_deg: 136.1259,
    M_deg: 69.4506,
    period_days: 1.771348
  }
});

const EUROPA = moon({
  id: 'europa',
  name: 'Europa',
  parentId: 'jupiter',
  radiusKm: 1560.8,
  color: '#d8c8a8',
  cameraDistance: 1.5,
  labelTier: 3,
  subtitle: 'Jupiter II · Subsurface ocean candidate',
  description:
    'Europa harbors a global saltwater ocean beneath its icy crust, making it one of the most promising places to search for extraterrestrial life. Its young, fractured surface shows almost no impact craters, indicating constant resurfacing from below.',
  facts: [
    { label: 'Diameter', value: '3,121.6 km' },
    { label: 'Orbital period', value: '3.551 days' },
    { label: 'Discovery', value: '1610, Galileo Galilei' },
    { label: 'Notable feature', value: 'Subsurface ocean with more water than all of Earth\'s oceans combined' }
  ],
  sources: [
    { name: 'NASA Solar System', url: 'https://science.nasa.gov/solar-system/moons/' },
    { name: 'JPL Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/' }
  ],
  tracking: { mode: 'Live', source: 'Keplerian propagation from JPL HORIZONS elements' },
  elements: {
    a_km: 671336.27,
    e: 0.009204,
    i_deg: 2.10694,
    Omega_deg: 326.0034,
    omega_deg: 319.2645,
    M_deg: 220.3498,
    period_days: 3.553903
  }
});

const GANYMEDE = moon({
  id: 'ganymede',
  name: 'Ganymede',
  parentId: 'jupiter',
  radiusKm: 2634.1,
  color: '#9c8c78',
  cameraDistance: 2.5,
  labelTier: 3,
  subtitle: 'Jupiter III · Largest moon in the solar system',
  description:
    'Ganymede is the largest moon in the solar system, bigger than the planet Mercury. It is the only moon known to generate its own magnetic field, and it likely has a subsurface saltwater ocean sandwiched between layers of ice.',
  facts: [
    { label: 'Diameter', value: '5,268.2 km' },
    { label: 'Orbital period', value: '7.155 days' },
    { label: 'Discovery', value: '1610, Galileo Galilei' },
    { label: 'Notable feature', value: 'Only moon with its own intrinsic magnetic field' }
  ],
  sources: [
    { name: 'NASA Solar System', url: 'https://science.nasa.gov/solar-system/moons/' },
    { name: 'JPL Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/' }
  ],
  tracking: { mode: 'Live', source: 'Keplerian propagation from JPL HORIZONS elements' },
  elements: {
    a_km: 1070416.40,
    e: 0.001580,
    i_deg: 2.34197,
    Omega_deg: 339.1413,
    omega_deg: 22.6857,
    M_deg: 34.7005,
    period_days: 7.155057
  }
});

const CALLISTO = moon({
  id: 'callisto',
  name: 'Callisto',
  parentId: 'jupiter',
  radiusKm: 2410.3,
  color: '#5c4f44',
  cameraDistance: 2.5,
  labelTier: 3,
  subtitle: 'Jupiter IV · Most heavily cratered body in the solar system',
  description:
    'Callisto is the most heavily cratered object in the solar system, with a surface that has changed little in four billion years. Despite its ancient exterior, magnetic field measurements suggest it too may harbor a subsurface ocean.',
  facts: [
    { label: 'Diameter', value: '4,820.6 km' },
    { label: 'Orbital period', value: '16.689 days' },
    { label: 'Discovery', value: '1610, Galileo Galilei' },
    { label: 'Notable feature', value: 'Most heavily cratered surface in the solar system' }
  ],
  sources: [
    { name: 'NASA Solar System', url: 'https://science.nasa.gov/solar-system/moons/' },
    { name: 'JPL Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/' }
  ],
  tracking: { mode: 'Live', source: 'Keplerian propagation from JPL HORIZONS elements' },
  elements: {
    a_km: 1882750.49,
    e: 0.007164,
    i_deg: 1.95232,
    Omega_deg: 336.7188,
    omega_deg: 32.9569,
    M_deg: 258.1959,
    period_days: 16.690823
  }
});

// ── Saturn (seven major moons) ─────────────────────────────────────────

const MIMAS = moon({
  id: 'mimas',
  name: 'Mimas',
  parentId: 'saturn',
  radiusKm: 198.2,
  color: '#cfc8c0',
  cameraDistance: 0.5,
  subtitle: 'Saturn I · The "Death Star" moon',
  description:
    'Mimas is dominated by the giant Herschel crater, which spans nearly a third of the moon\'s diameter and gives it a resemblance to the Death Star. Recent Cassini data suggest Mimas may hide a young internal ocean beneath its icy crust.',
  facts: [
    { label: 'Diameter', value: '396.4 km' },
    { label: 'Orbital period', value: '0.942 days (22 h 37 m)' },
    { label: 'Discovery', value: '1789, William Herschel' },
    { label: 'Notable feature', value: 'Herschel crater (130 km wide, nearly one-third the moon\'s diameter)' }
  ],
  sources: [
    { name: 'NASA Solar System', url: 'https://science.nasa.gov/solar-system/moons/' },
    { name: 'JPL Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/' }
  ],
  tracking: { mode: 'Live', source: 'Keplerian propagation from JPL HORIZONS elements' },
  elements: {
    a_km: 186039.57,
    e: 0.022005,
    i_deg: 26.60703,
    Omega_deg: 168.1390,
    omega_deg: 48.9859,
    M_deg: 346.8127,
    period_days: 0.947492
  }
});

const ENCELADUS = moon({
  id: 'enceladus',
  name: 'Enceladus',
  parentId: 'saturn',
  radiusKm: 252.1,
  color: '#f4f4f0',
  cameraDistance: 0.6,
  subtitle: 'Saturn II · Cryovolcanic ocean world',
  description:
    'Enceladus shoots towering geysers of water vapor and ice particles from fractures near its south pole, fed by a global subsurface ocean. Cassini detected molecular hydrogen and organic molecules in the plumes, making it a top astrobiology target.',
  facts: [
    { label: 'Diameter', value: '504.2 km' },
    { label: 'Orbital period', value: '1.370 days (32 h 53 m)' },
    { label: 'Discovery', value: '1789, William Herschel' },
    { label: 'Notable feature', value: 'Active cryovolcanic plumes from a subsurface ocean' }
  ],
  sources: [
    { name: 'NASA Solar System', url: 'https://science.nasa.gov/solar-system/moons/' },
    { name: 'JPL Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/' }
  ],
  tracking: { mode: 'Live', source: 'Keplerian propagation from JPL HORIZONS elements' },
  elements: {
    a_km: 238409.65,
    e: 0.004522,
    i_deg: 28.04583,
    Omega_deg: 169.5174,
    omega_deg: 173.6480,
    M_deg: 84.8128,
    period_days: 1.374528
  }
});

const TETHYS = moon({
  id: 'tethys',
  name: 'Tethys',
  parentId: 'saturn',
  radiusKm: 531.1,
  color: '#dcd6c8',
  cameraDistance: 1.2,
  subtitle: 'Saturn III · Heavily cratered icy moon',
  description:
    'Tethys is composed almost entirely of water ice and features Odysseus, one of the largest impact craters in the solar system relative to its host body. A massive canyon called Ithaca Chasma stretches nearly three-quarters of the way around the moon.',
  facts: [
    { label: 'Diameter', value: '1,062.2 km' },
    { label: 'Orbital period', value: '1.888 days' },
    { label: 'Discovery', value: '1684, Giovanni Cassini' },
    { label: 'Notable feature', value: 'Ithaca Chasma, a 2,000 km long rift valley' }
  ],
  sources: [
    { name: 'NASA Solar System', url: 'https://science.nasa.gov/solar-system/moons/' },
    { name: 'JPL Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/' }
  ],
  tracking: { mode: 'Live', source: 'Keplerian propagation from JPL HORIZONS elements' },
  elements: {
    a_km: 294975.18,
    e: 0.001124,
    i_deg: 27.70085,
    Omega_deg: 171.7371,
    omega_deg: 305.5852,
    M_deg: 351.2807,
    period_days: 1.891672
  }
});

const DIONE = moon({
  id: 'dione',
  name: 'Dione',
  parentId: 'saturn',
  radiusKm: 561.4,
  color: '#d4cec0',
  cameraDistance: 1.2,
  subtitle: 'Saturn IV · Wispy ice cliffs of the trailing hemisphere',
  description:
    'Dione is an icy Saturnian moon known for bright wispy features on its trailing hemisphere, which Cassini revealed to be networks of ice cliffs created by tectonic fractures. Evidence from Cassini gravity data hints at a thin subsurface ocean.',
  facts: [
    { label: 'Diameter', value: '1,122.8 km' },
    { label: 'Orbital period', value: '2.737 days' },
    { label: 'Discovery', value: '1684, Giovanni Cassini' },
    { label: 'Notable feature', value: 'Bright ice-cliff networks on the trailing hemisphere' }
  ],
  sources: [
    { name: 'NASA Solar System', url: 'https://science.nasa.gov/solar-system/moons/' },
    { name: 'JPL Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/' }
  ],
  tracking: { mode: 'Live', source: 'Keplerian propagation from JPL HORIZONS elements' },
  elements: {
    a_km: 377646.06,
    e: 0.001981,
    i_deg: 28.02476,
    Omega_deg: 169.5406,
    omega_deg: 279.5851,
    M_deg: 107.1345,
    period_days: 2.740279
  }
});

const RHEA = moon({
  id: 'rhea',
  name: 'Rhea',
  parentId: 'saturn',
  radiusKm: 763.8,
  color: '#c8c2b4',
  cameraDistance: 1.6,
  subtitle: 'Saturn V · Second-largest Saturnian moon',
  description:
    'Rhea is Saturn\'s second-largest moon and is composed mostly of water ice with a small rocky core. It was briefly hypothesized to have a tenuous ring system of its own, which would have made it the only moon known to possess rings.',
  facts: [
    { label: 'Diameter', value: '1,527.6 km' },
    { label: 'Orbital period', value: '4.518 days' },
    { label: 'Discovery', value: '1672, Giovanni Cassini' },
    { label: 'Notable feature', value: 'Heavily cratered ice surface with bright wispy streaks' }
  ],
  sources: [
    { name: 'NASA Solar System', url: 'https://science.nasa.gov/solar-system/moons/' },
    { name: 'JPL Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/' }
  ],
  tracking: { mode: 'Live', source: 'Keplerian propagation from JPL HORIZONS elements' },
  elements: {
    a_km: 527224.59,
    e: 0.001231,
    i_deg: 28.26076,
    Omega_deg: 169.9985,
    omega_deg: 159.4339,
    M_deg: 299.7638,
    period_days: 4.520229
  }
});

const TITAN = moon({
  id: 'titan',
  name: 'Titan',
  parentId: 'saturn',
  radiusKm: 2574.7,
  color: '#d99c4a',
  cameraDistance: 2.5,
  labelTier: 3,
  hasAtmosphere: true,
  atmosphereColor: [0.85, 0.55, 0.25],
  subtitle: 'Saturn VI · Thick nitrogen atmosphere, methane lakes',
  description:
    'Titan is the only moon in the solar system with a dense atmosphere, primarily nitrogen with methane and ethane clouds. Its surface hosts lakes and seas of liquid methane, making it the only world besides Earth known to have stable surface liquids.',
  facts: [
    { label: 'Diameter', value: '5,149.4 km' },
    { label: 'Orbital period', value: '15.945 days' },
    { label: 'Discovery', value: '1655, Christiaan Huygens' },
    { label: 'Notable feature', value: 'Thick nitrogen atmosphere with methane rain and hydrocarbon lakes' }
  ],
  sources: [
    { name: 'NASA Solar System', url: 'https://science.nasa.gov/solar-system/moons/' },
    { name: 'JPL Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/' }
  ],
  tracking: { mode: 'Live', source: 'Keplerian propagation from JPL HORIZONS elements' },
  elements: {
    a_km: 1221953.03,
    e: 0.028801,
    i_deg: 27.70725,
    Omega_deg: 169.0795,
    omega_deg: 178.1408,
    M_deg: 330.5597,
    period_days: 15.947704
  }
});

const IAPETUS = moon({
  id: 'iapetus',
  name: 'Iapetus',
  parentId: 'saturn',
  radiusKm: 734.5,
  color: '#9c8c70',
  cameraDistance: 1.5,
  subtitle: 'Saturn VIII · Two-toned hemisphere, equatorial ridge',
  description:
    'Iapetus has a striking two-toned appearance: one hemisphere is dark as coal, the other bright as snow, caused by thermal migration of dark material swept up in its orbit. A mysterious equatorial ridge up to 20 km high runs along much of its circumference.',
  facts: [
    { label: 'Diameter', value: '1,469.0 km' },
    { label: 'Orbital period', value: '79.322 days' },
    { label: 'Discovery', value: '1671, Giovanni Cassini' },
    { label: 'Notable feature', value: 'Two-toned coloring and a 20 km high equatorial ridge' }
  ],
  sources: [
    { name: 'NASA Solar System', url: 'https://science.nasa.gov/solar-system/moons/' },
    { name: 'JPL Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/' }
  ],
  tracking: { mode: 'Live', source: 'Keplerian propagation from JPL HORIZONS elements' },
  elements: {
    a_km: 3558183.71,
    e: 0.029034,
    i_deg: 16.98456,
    Omega_deg: 138.8785,
    omega_deg: 230.7923,
    M_deg: 101.6110,
    period_days: 79.251896
  }
});

// ── Uranus (five major moons) ──────────────────────────────────────────

const MIRANDA = moon({
  id: 'miranda',
  name: 'Miranda',
  parentId: 'uranus',
  radiusKm: 235.8,
  color: '#bcb8b4',
  cameraDistance: 0.6,
  subtitle: 'Uranus V · Patchwork terrain, 20 km cliffs',
  description:
    'Miranda has one of the most bizarre and jumbled landscapes in the solar system, with giant fault canyons, terraced layers, and Verona Rupes, a cliff face roughly 20 km high. Its patchwork geology may result from tidal heating during a past orbital resonance.',
  facts: [
    { label: 'Diameter', value: '471.6 km' },
    { label: 'Orbital period', value: '1.413 days' },
    { label: 'Discovery', value: '1948, Gerard Kuiper' },
    { label: 'Notable feature', value: 'Verona Rupes, the tallest known cliff in the solar system (~20 km)' }
  ],
  sources: [
    { name: 'NASA Solar System', url: 'https://science.nasa.gov/solar-system/moons/' },
    { name: 'JPL Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/' }
  ],
  tracking: { mode: 'Live', source: 'Keplerian propagation from JPL HORIZONS elements' },
  elements: {
    a_km: 129870.41,
    e: 0.001093,
    i_deg: 98.52967,
    Omega_deg: 163.2507,
    omega_deg: 67.7870,
    M_deg: 133.4442,
    period_days: 1.413982
  }
});

const ARIEL = moon({
  id: 'ariel',
  name: 'Ariel',
  parentId: 'uranus',
  radiusKm: 578.9,
  color: '#c4c0bc',
  cameraDistance: 1.3,
  subtitle: 'Uranus I · Brightest of the Uranian moons',
  description:
    'Ariel is the brightest and possibly the most geologically active of the Uranian moons, with extensive systems of fault canyons and smooth plains that suggest relatively recent resurfacing. Its high reflectivity comes from a fresh water-ice surface.',
  facts: [
    { label: 'Diameter', value: '1,157.8 km' },
    { label: 'Orbital period', value: '2.520 days' },
    { label: 'Discovery', value: '1851, William Lassell' },
    { label: 'Notable feature', value: 'Youngest surface of any Uranian moon, with extensive rift valleys' }
  ],
  sources: [
    { name: 'NASA Solar System', url: 'https://science.nasa.gov/solar-system/moons/' },
    { name: 'JPL Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/' }
  ],
  tracking: { mode: 'Live', source: 'Keplerian propagation from JPL HORIZONS elements' },
  elements: {
    a_km: 190942.64,
    e: 0.000411,
    i_deg: 97.71677,
    Omega_deg: 167.6654,
    omega_deg: 247.5521,
    M_deg: 228.7247,
    period_days: 2.520751
  }
});

const UMBRIEL = moon({
  id: 'umbriel',
  name: 'Umbriel',
  parentId: 'uranus',
  radiusKm: 584.7,
  color: '#5e5854',
  cameraDistance: 1.3,
  subtitle: 'Uranus II · Darkest large Uranian moon',
  description:
    'Umbriel is the darkest of the large Uranian moons, with a uniformly dark surface broken by a single bright ring-shaped feature called Wunda crater near its equator. Its ancient, heavily cratered terrain suggests little geological activity.',
  facts: [
    { label: 'Diameter', value: '1,169.4 km' },
    { label: 'Orbital period', value: '4.144 days' },
    { label: 'Discovery', value: '1851, William Lassell' },
    { label: 'Notable feature', value: 'Wunda crater with a bright annular floor deposit' }
  ],
  sources: [
    { name: 'NASA Solar System', url: 'https://science.nasa.gov/solar-system/moons/' },
    { name: 'JPL Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/' }
  ],
  tracking: { mode: 'Live', source: 'Keplerian propagation from JPL HORIZONS elements' },
  elements: {
    a_km: 266009.14,
    e: 0.004362,
    i_deg: 97.71310,
    Omega_deg: 167.7248,
    omega_deg: 63.1789,
    M_deg: 101.9925,
    period_days: 4.144960
  }
});

const TITANIA = moon({
  id: 'titania',
  name: 'Titania',
  parentId: 'uranus',
  radiusKm: 788.4,
  color: '#a89c8c',
  cameraDistance: 1.6,
  subtitle: 'Uranus III · Largest Uranian moon',
  description:
    'Titania is the largest moon of Uranus and the eighth-largest moon in the solar system. Its surface shows huge fault systems and canyons, indicating past tectonic activity, possibly driven by the freezing and expansion of an interior water layer.',
  facts: [
    { label: 'Diameter', value: '1,576.8 km' },
    { label: 'Orbital period', value: '8.706 days' },
    { label: 'Discovery', value: '1787, William Herschel' },
    { label: 'Notable feature', value: 'Messina Chasmata, a 1,500 km long fault system' }
  ],
  sources: [
    { name: 'NASA Solar System', url: 'https://science.nasa.gov/solar-system/moons/' },
    { name: 'JPL Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/' }
  ],
  tracking: { mode: 'Live', source: 'Keplerian propagation from JPL HORIZONS elements' },
  elements: {
    a_km: 436246.37,
    e: 0.002499,
    i_deg: 97.76263,
    Omega_deg: 167.6430,
    omega_deg: 262.9974,
    M_deg: 21.4219,
    period_days: 8.704987
  }
});

const OBERON = moon({
  id: 'oberon',
  name: 'Oberon',
  parentId: 'uranus',
  radiusKm: 761.4,
  color: '#9c8c80',
  cameraDistance: 1.5,
  subtitle: 'Uranus IV · Outermost large Uranian moon',
  description:
    'Oberon is the outermost of the five major Uranian moons and the second largest. Its heavily cratered surface includes several large impact basins with dark material on their floors, likely a mixture of ice and carbonaceous compounds.',
  facts: [
    { label: 'Diameter', value: '1,522.8 km' },
    { label: 'Orbital period', value: '13.463 days' },
    { label: 'Discovery', value: '1787, William Herschel' },
    { label: 'Notable feature', value: 'Dark-floored craters and a possible 6 km high mountain' }
  ],
  sources: [
    { name: 'NASA Solar System', url: 'https://science.nasa.gov/solar-system/moons/' },
    { name: 'JPL Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/' }
  ],
  tracking: { mode: 'Live', source: 'Keplerian propagation from JPL HORIZONS elements' },
  elements: {
    a_km: 583491.65,
    e: 0.001730,
    i_deg: 97.90568,
    Omega_deg: 167.7089,
    omega_deg: 154.8947,
    M_deg: 242.2956,
    period_days: 13.465506
  }
});

// ── Neptune ────────────────────────────────────────────────────────────

const TRITON = moon({
  id: 'triton',
  name: 'Triton',
  parentId: 'neptune',
  radiusKm: 1353.4,
  color: '#d0a890',
  cameraDistance: 2.0,
  labelTier: 3,
  subtitle: 'Neptune I · Largest Neptunian moon, retrograde, captured KBO',
  description:
    'Triton orbits Neptune in the retrograde direction, strongly suggesting it was captured from the Kuiper Belt. It has active nitrogen geysers, a thin nitrogen atmosphere, and one of the coldest measured surfaces in the solar system at about 38 K.',
  facts: [
    { label: 'Diameter', value: '2,706.8 km' },
    { label: 'Orbital period', value: '5.877 days (retrograde)' },
    { label: 'Discovery', value: '1846, William Lassell' },
    { label: 'Notable feature', value: 'Active nitrogen geysers and a captured retrograde orbit' }
  ],
  sources: [
    { name: 'NASA Solar System', url: 'https://science.nasa.gov/solar-system/moons/' },
    { name: 'JPL Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/' }
  ],
  tracking: { mode: 'Live', source: 'Keplerian propagation from JPL HORIZONS elements' },
  elements: {
    a_km: 354766.51,
    e: 0.0000167,
    i_deg: 129.12950,
    Omega_deg: 222.7699,
    omega_deg: 2.8766,
    M_deg: 36.1601,
    period_days: 5.877087
  }
});

// ── Pluto ──────────────────────────────────────────────────────────────

const CHARON = moon({
  id: 'charon',
  name: 'Charon',
  parentId: 'pluto',
  radiusKm: 606,
  color: '#9c8e7e',
  cameraDistance: 1.3,
  labelTier: 3,
  subtitle: 'Pluto I · Half Pluto\u2019s diameter, mutually tidally locked',
  description:
    'Charon is so large relative to Pluto that the two orbit a common center of gravity between them, making them effectively a double dwarf planet system. New Horizons revealed a diverse surface with canyons, cliffs, and a dark reddish polar cap called Mordor Macula.',
  facts: [
    { label: 'Diameter', value: '1,212 km' },
    { label: 'Orbital period', value: '6.387 days' },
    { label: 'Discovery', value: '1978, James Christy' },
    { label: 'Notable feature', value: 'Mutually tidally locked with Pluto, forming a binary system' }
  ],
  sources: [
    { name: 'NASA Solar System', url: 'https://science.nasa.gov/solar-system/moons/' },
    { name: 'JPL Solar System Dynamics', url: 'https://ssd.jpl.nasa.gov/' }
  ],
  tracking: { mode: 'Live', source: 'Keplerian propagation from JPL HORIZONS elements' },
  elements: {
    a_km: 19595.76,
    e: 0.000160,
    i_deg: 112.88779,
    Omega_deg: 227.3930,
    omega_deg: 172.3170,
    M_deg: 9.1666,
    period_days: 6.387220
  }
});

// ── Aggregate export ───────────────────────────────────────────────────

export const NOTABLE_MOONS: TrackedObject[] = [
  PHOBOS,
  DEIMOS,
  IO,
  EUROPA,
  GANYMEDE,
  CALLISTO,
  MIMAS,
  ENCELADUS,
  TETHYS,
  DIONE,
  RHEA,
  TITAN,
  IAPETUS,
  MIRANDA,
  ARIEL,
  UMBRIEL,
  TITANIA,
  OBERON,
  TRITON,
  CHARON
];
