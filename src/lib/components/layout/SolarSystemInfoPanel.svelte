<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Vector3 } from 'three';
  import { getPlanetScenePosition } from '$utils/helio';
  import { getMarsState } from '$utils/mars';
  import {
    AU_TO_SCENE,
    AU_KM,
    EARTH_RADIUS,
    EARTH_RADIUS_KM,
    SUN_RADIUS_KM,
    HELIO_SUN_RADIUS,
    MOON_DISTANCE_SCALE,
    MOON_TRUE_DISTANCE_EARTH_RADII,
    MOON_RENDER_DISTANCE
  } from '$lib/scene-config';
  import InfoTooltip from '$components/ui/InfoTooltip.svelte';
  import { formatNumber } from '$utils/format';

  // Scene scale derivations — computed live from the constants so this
  // panel stays honest if the constants are ever rebalanced.
  const renderedBodyToOrbit = EARTH_RADIUS / AU_TO_SCENE; // 0.01
  const trueBodyToOrbit = EARTH_RADIUS_KM / AU_KM; // ~0.0000425
  const planetExaggeration = renderedBodyToOrbit / trueBodyToOrbit; // ~235×

  const trueSunToEarth = SUN_RADIUS_KM / EARTH_RADIUS_KM; // ~109
  const renderedSunToEarth = HELIO_SUN_RADIUS / EARTH_RADIUS; // 1.2
  const sunUnderScale = trueSunToEarth / renderedSunToEarth; // ~91×

  const moonOrbitCompression = 1 / MOON_DISTANCE_SCALE; // ~12×

  /**
   * Live readout of the heliocentric scene's geometry: where Earth and
   * Mars are right now in their orbits, and the angle between them as
   * seen from the Sun (their relative orbital phase).
   */

  let now = $state(new Date());
  let interval: ReturnType<typeof setInterval>;
  onMount(() => {
    interval = setInterval(() => (now = new Date()), 1000);
  });
  onDestroy(() => clearInterval(interval));

  const earthPos = new Vector3();
  const marsPos = new Vector3();

  let earthMarsState = $derived.by(() => {
    getPlanetScenePosition(earthPos, 'earth', now);
    getPlanetScenePosition(marsPos, 'mars', now);
    // Heliocentric distances (in scene units → AU)
    const earthAu = earthPos.length() / AU_TO_SCENE;
    const marsAu = marsPos.length() / AU_TO_SCENE;
    // Angle between Earth and Mars from Sun (the planets' synodic position)
    const cosAngle = earthPos.dot(marsPos) / (earthPos.length() * marsPos.length());
    const phaseAngleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    const phaseAngleDeg = (phaseAngleRad * 180) / Math.PI;

    // Earth-Mars distance comes from the live ephemeris (Mars panel uses it too)
    const marsState = getMarsState(now);

    return {
      earthAu,
      marsAu,
      phaseAngleDeg,
      earthMarsKm: marsState.distanceKm,
      earthMarsAu: marsState.distanceKm / 149597870.7
    };
  });
</script>

<div class="p-4">
  <div class="flex items-center justify-between gap-4">
    <div>
      <div class="label">Selected</div>
      <div class="mt-1 font-display text-base font-medium tracking-tight text-slate-900">
        Solar System
      </div>
      <div class="mono mt-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-600">
        Heliocentric · Sun-centered view
      </div>
    </div>
  </div>

  <div class="mt-4 grid grid-cols-2 gap-2">
    <div class="surface-card p-3">
      <div class="flex items-center gap-1.5">
        <div class="label">Earth → Sun</div>
        <InfoTooltip
          text="Earth's current heliocentric distance. Varies slightly over the year (Earth's orbit has eccentricity ~0.017) — closest at perihelion in early January, farthest at aphelion in early July."
        />
      </div>
      <div class="mt-1.5 font-mono text-xs text-slate-900">
        {earthMarsState.earthAu.toFixed(4)} AU
      </div>
    </div>
    <div class="surface-card p-3">
      <div class="flex items-center gap-1.5">
        <div class="label">Mars → Sun</div>
        <InfoTooltip
          align="right"
          text="Mars's current heliocentric distance. Mars has a more eccentric orbit (e=0.093) and varies between ~1.38 AU at perihelion and ~1.67 AU at aphelion."
        />
      </div>
      <div class="mt-1.5 font-mono text-xs text-slate-900">
        {earthMarsState.marsAu.toFixed(4)} AU
      </div>
    </div>
    <div class="surface-card p-3">
      <div class="flex items-center gap-1.5">
        <div class="label">Earth ↔ Mars</div>
        <InfoTooltip
          text="Live Earth–Mars distance. At opposition the planets are closest (~55-100 million km); at conjunction they're on opposite sides of the Sun (~400 million km apart)."
        />
      </div>
      <div class="mt-1.5 font-mono text-xs text-slate-900">
        {formatNumber(earthMarsState.earthMarsKm / 1_000_000, 1)} M km
      </div>
    </div>
    <div class="surface-card p-3">
      <div class="flex items-center gap-1.5">
        <div class="label">Phase angle</div>
        <InfoTooltip
          align="right"
          text="The Sun-centered angle between Earth and Mars right now. 0° = Mars and Earth are on the same side of the Sun (close to opposition geometry); 180° = opposite sides of the Sun (conjunction)."
        />
      </div>
      <div class="mt-1.5 font-mono text-xs text-slate-900">
        {earthMarsState.phaseAngleDeg.toFixed(1)}°
      </div>
    </div>
  </div>

  <div class="mt-4 surface-card p-3">
    <div class="flex items-center gap-1.5">
      <div class="label">Scene scale</div>
      <InfoTooltip
        text="No 3D solar system can be true-to-life in BOTH size and distance — at true scale, planets become invisible specks against their orbits. Stargazer keeps body ratios true and orbital ratios true, but exaggerates bodies relative to orbits so they're visible. The honest physical numbers are always shown in each body's panel."
      />
    </div>
    <div class="mono mt-1.5 text-[10px] uppercase tracking-[0.14em] text-slate-600">
      1 AU = {AU_TO_SCENE} units · Earth radius = {EARTH_RADIUS} unit
    </div>

    <div class="mt-2.5">
      <div class="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
        Physically accurate
      </div>
      <ul class="mt-1 space-y-0.5 text-[11px] leading-snug text-slate-700">
        <li>Planet orbital distances (Earth, Mars at true positions)</li>
        <li>Body size ratios (Earth, Moon, Mars all true to each other)</li>
        <li>Live Earth–Mars and Earth–Moon distances</li>
      </ul>
    </div>

    <div class="mt-2.5">
      <div class="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
        Compressed for visibility
      </div>
      <ul class="mt-1 space-y-0.5 text-[11px] leading-snug text-slate-700">
        <li>
          Planet bodies <span class="font-mono">~{Math.round(planetExaggeration)}×</span> larger
          relative to orbits
        </li>
        <li>
          Sun radius <span class="font-mono">~{Math.round(sunUnderScale)}×</span> under-scaled vs
          Earth (true ratio is <span class="font-mono">{Math.round(trueSunToEarth)}×</span>)
        </li>
        <li>
          Moon orbit <span class="font-mono">~{moonOrbitCompression.toFixed(1)}×</span> compressed
          (true <span class="font-mono">{MOON_TRUE_DISTANCE_EARTH_RADII.toFixed(1)}</span> →
          rendered <span class="font-mono">{MOON_RENDER_DISTANCE.toFixed(1)}</span> Earth radii)
        </li>
      </ul>
    </div>
  </div>

  <p class="mt-3 text-[11px] leading-relaxed text-slate-600">
    Heliocentric positions of Earth and Mars are computed live from a simplified Standish/Meeus
    ephemeris (the same source NASA's "Approximate Positions of the Planets" tables use). Both
    planets are shown at their true orbital positions.
  </p>
</div>
