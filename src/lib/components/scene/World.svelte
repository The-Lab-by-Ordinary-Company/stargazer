<script lang="ts">
  import { T, useTask, useThrelte } from '@threlte/core';
  import { OrbitControls, interactivity } from '@threlte/extras';
  import { Color, MOUSE, Vector3 } from 'three';
  import type { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import { get } from 'svelte/store';
  import PlanetBody from './PlanetBody.svelte';
  import PointMarker from './PointMarker.svelte';
  import MoonOrbitRing from './MoonOrbitRing.svelte';
  import LabelLayer from './LabelLayer.svelte';
  import Starfield from './Starfield.svelte';
  import StarLabels from './StarLabels.svelte';
  import EclipticGrid from './EclipticGrid.svelte';
  import SunBloom from './SunBloom.svelte';
  import CometTail from './CometTail.svelte';
  import BackgroundGradient from './BackgroundGradient.svelte';
  import ParticleDust from './ParticleDust.svelte';
  import SatelliteMarker from './SatelliteMarker.svelte';
  import SatelliteOrbitPath from './SatelliteOrbitPath.svelte';
  import SatelliteTrail from './SatelliteTrail.svelte';
  import SatelliteFootprint from './SatelliteFootprint.svelte';
  import HelioSun from './HelioSun.svelte';
  import OrbitEllipse from './OrbitEllipse.svelte';
  import SelectionReticle from './SelectionReticle.svelte';
  import SelectionFlash from './SelectionFlash.svelte';
  import BodyTrail from './BodyTrail.svelte';
  import {
    selection,
    SOLAR_SYSTEM_VIEW,
    SOLAR_SYSTEM_CAMERA_DISTANCE
  } from '$lib/stores/selection';
  import { iss } from '$stores/iss';
  import { issTle } from '$stores/issTle';
  import { tiangong, tiangongTle } from '$stores/tiangong';
  import { simTime, advanceSimTime } from '$stores/simTime';
  import { cameraTargetDistance, cameraOriginDistance } from '$stores/cameraDistance';
  import { TRACKED_OBJECTS, getById, getWorldPosition } from '$lib/registry/registry';
  import { isPlanetBody } from '$lib/registry/types';
  import { onSceneClick, onSceneMiss } from '$utils/sceneClick';
  import { reducedMotion } from '$stores/reducedMotion';
  import { introPlaying, finishIntro } from '$stores/intro';
  import { touring } from '$stores/idleTour';
  import { CatmullRomCurve3 } from 'three';


  const { camera, scene } = useThrelte();

  // Enable pointer events on `<T>` meshes so the user can click any
  // body in the 3D scene to select it. Each clickable body adds an
  // `onpointerdown` handler that calls `markPendingClick(id)`. The
  // global pointerup listener in `sceneClick.ts` then commits the
  // selection regardless of where the cursor ends up — critical
  // because the lock-on tracking moves the camera each frame, so
  // the raycast on pointerup may not hit the same body as pointerdown.
  interactivity();

  // Wire the committed click subscription. When sceneClick decides
  // a press → release sequence was a click on body X, write that to
  // the selection store, which kicks off the existing flyTo logic.
  $effect(() => {
    const unsub1 = onSceneClick((bodyId) => {
      selection.set(bodyId);
    });
    const unsub2 = onSceneMiss(() => {
      selection.set(null);
    });
    return () => { unsub1(); unsub2(); };
  });

  // Background is now handled by BackgroundGradient.svelte (a radial
  // gradient sphere) instead of a flat scene.background color.
  scene.background = null;

  let controls = $state<ThreeOrbitControls>();

  $effect(() => {
    if (!controls) return;
    controls.mouseButtons = {
      LEFT: MOUSE.ROTATE,
      MIDDLE: MOUSE.DOLLY,
      RIGHT: MOUSE.PAN
    };
    controls.screenSpacePanning = false;
    controls.panSpeed = 0.5;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.8;
  });

  // ── Tracking state ─────────────────────────────────────────────────────
  let activeId: string = $state(SOLAR_SYSTEM_VIEW);

  /**
   * FlyTo animation tuning.
   *
   *   - Duration adapts to the travel distance: short hop between
   *     Earth and Moon stays snappy at ~1.5 s, long haul to Pluto
   *     stretches to ~3.5 s so the user can register the journey.
   *   - The camera follows a "pull back, sweep, settle" arc:
   *     temporarily increases its distance from the target by
   *     `pullBackBump` (proportional to the travel) so it gets a
   *     wide-context view mid-flight before diving in.
   *   - Quartic easing on the target lerp gives a slow start,
   *     decisive middle, and gentle landing — feels heavier and more
   *     considered than the old cubic.
   */
  const FLY_MIN_MS = 1500;
  const FLY_MAX_MS = 3500;
  const FLY_BUMP_FACTOR = 0.5;
  const FLY_BUMP_CAP = 300;

  // FOV breathing during flyTo: narrow to 38 mid-flight for telephoto
  // compression, widen back to the base on arrival. Creates a "pulling
  // through space" sensation from 100,000 Stars.
  const BASE_FOV = 45;
  const NARROW_FOV = 38;

  let flyDurationMs = FLY_MIN_MS;
  let pullBackBump = 0;
  let isAnimating = false;
  let animStartTime = 0;
  const animStartTarget = new Vector3();
  const animStartCameraPos = new Vector3();
  let animStartDistance = 0;

  const targetWorld = new Vector3();
  const lastTargetWorld = new Vector3();
  const offsetDir = new Vector3();
  const tmp = new Vector3();
  const scratch = new Vector3();

  /**
   * Compute the WORLD-space position of any tracked target. Reads from
   * the registry's `getWorldPosition`, which walks the body's parent
   * chain (Sun → Planet → Moon/Satellite) and accumulates each level's
   * offset. The special view-mode id `'solarSystem'` bypasses the
   * registry and targets the origin.
   */
  function getPositionForId(id: string, out: Vector3): Vector3 {
    if (id === SOLAR_SYSTEM_VIEW) return out.set(0, 0, 0);
    const result = getWorldPosition(id, get(simTime), out, scratch);
    return result ?? out.set(0, 0, 0);
  }

  /** Resolve the camera distance for a selection — registry or special view. */
  function getCameraDistanceForId(id: string): number {
    if (id === SOLAR_SYSTEM_VIEW) return SOLAR_SYSTEM_CAMERA_DISTANCE;
    return getById(id)?.cameraDistance ?? SOLAR_SYSTEM_CAMERA_DISTANCE;
  }

  function easeInOutQuart(t: number): number {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  // Reused scratch for the pre-fly distance probe.
  const animDestinationProbe = new Vector3();

  function startFlyTo(newId: string) {
    if (!controls) return;
    animStartTarget.copy(controls.target);
    animStartCameraPos.copy(camera.current.position);
    animStartDistance = animStartCameraPos.distanceTo(controls.target);
    animStartTime = performance.now();
    isAnimating = true;
    activeId = newId;

    // Probe the new target's world position to scale the flight.
    getPositionForId(newId, animDestinationProbe);
    const travel = animStartTarget.distanceTo(animDestinationProbe);

    // Adaptive duration: 1.5 s for tiny hops, up to 3.5 s for huge ones.
    // Logarithmic-ish so a 10× longer travel doesn't feel 10× slower.
    flyDurationMs = Math.min(
      FLY_MAX_MS,
      Math.max(FLY_MIN_MS, FLY_MIN_MS + Math.log10(1 + travel) * 700)
    );

    // Pull-back arc magnitude. Roughly half the travel distance, capped
    // so even an Earth → Pluto journey doesn't pull the camera so far
    // back that the destination disappears past the far plane.
    pullBackBump = Math.min(travel * FLY_BUMP_FACTOR, FLY_BUMP_CAP);
  }

  $effect(() => {
    const next = $selection;
    if (next !== activeId) {
      if (next === null) {
        activeId = null;
        isAnimating = false;
      } else {
        startFlyTo(next);
      }
    }
  });

  // ── Intro: start close on Earth, pull back to solar system ──────
  // Runs once on first mount if the user hasn't seen it this session.
  // The camera starts at Earth's position at distance 4 (close-up)
  // and flies to the solar system overview over 2.5 seconds.
  $effect(() => {
    if (!get(introPlaying) || !controls) return;
    // Position camera near Earth immediately on first frame
    const earthPos = getPositionForId('earth', tmp);
    controls.target.copy(earthPos);
    camera.current.position.set(
      earthPos.x + 3,
      earthPos.y + 2,
      earthPos.z + 3
    );
    lastTargetWorld.copy(earthPos);
    activeId = 'earth';
    // After a brief pause, fly out to solar system view
    setTimeout(() => {
      startFlyTo(SOLAR_SYSTEM_VIEW);
      // Mark intro complete after the flight finishes
      setTimeout(() => finishIntro(), flyDurationMs + 200);
    }, 800);
  });

  // ── Earth body lookup, used to mount the EARTH PlanetBody with its
  // children slot. Children of Earth (satellite markers, footprints,
  // orbit lines) need to inherit Earth's tilt + GMST through the scene
  // graph, so they can't be siblings.
  const EARTH = getById('earth')!;

  // All other planet/moon bodies render as siblings — no special wrapping
  // needed because they don't host any Earth-fixed children of their own.
  const otherPlanetBodies = TRACKED_OBJECTS.filter(
    (obj) => obj.rendererKind === 'planet-body' && obj.id !== 'earth'
  );

  // Bodies that get a heliocentric orbit ellipse: planets and dwarf planets
  // whose parent is the Sun and that have an orbitColor in their metadata.
  // The orbit ellipse is computed in helio.ts from the same orbital
  // elements that drive the body's position, so the ring always passes
  // through the body.
  const orbitBodies = TRACKED_OBJECTS.filter(
    (obj) =>
      (obj.type === 'planet' || obj.type === 'dwarf-planet') &&
      obj.parent === 'sun' &&
      isPlanetBody(obj) &&
      obj.metadata.orbitColor !== undefined
  );

  // Bodies that get a parent-relative orbit ring (moons + Earth's Moon).
  // Filter: any planet-body with a non-Sun parent and an orbitalPeriodDays
  // value. This automatically picks up every moon registered without
  // needing to maintain a hand-curated list.
  const moonRingBodies = TRACKED_OBJECTS.filter(
    (obj) =>
      isPlanetBody(obj) &&
      obj.parent !== null &&
      obj.parent !== 'sun' &&
      obj.metadata.orbitalPeriodDays !== undefined
  );

  // All point-marker bodies — spacecraft, landers, future NEOs.
  // Rendered via the constant-pixel-size PointMarker component.
  const pointMarkerBodies = TRACKED_OBJECTS.filter(
    (obj) => obj.rendererKind === 'point-marker'
  );

  // Comets get an anti-solar tail indicator so they're visually
  // distinguishable from asteroids at a glance.
  const cometBodies = TRACKED_OBJECTS.filter(
    (obj) => obj.type === 'comet'
  );

  let lastFrameTime = performance.now();

  // ── Idle auto-tour ──────────────────────────────────────────────────
  // CatmullRomCurve3 through 6 scenic waypoints. The camera follows
  // the curve over 60 seconds; lookAt tracks slightly ahead (t + 0.03)
  // for a natural forward gaze. Any user input cancels via the
  // `touring` store.
  const tourWaypoints = [
    new Vector3(5, 3, 8),       // Close to Earth
    new Vector3(-15, 8, 30),    // Pull back, see inner system
    new Vector3(60, 20, -40),   // Sweep past Mars
    new Vector3(-30, 40, -80),  // Rise above ecliptic
    new Vector3(120, 10, 60),   // Out toward Jupiter
    new Vector3(40, 60, 120),   // Wide cinematic angle
  ];
  const tourCurve = new CatmullRomCurve3(tourWaypoints, true, 'catmullrom', 0.3);
  const TOUR_DURATION_SEC = 60;
  let tourStartTime = 0;
  let tourWasActive = false;
  const tourLookAt = new Vector3();

  useTask(() => {
    if (!controls) return;

    // Advance the simulation clock first so every per-frame read of
    // simTime sees the same value.
    const nowReal = performance.now();
    const dtMs = nowReal - lastFrameTime;
    lastFrameTime = nowReal;
    advanceSimTime(dtMs);

    if (activeId === null) {
      controls.update();
      cameraTargetDistance.set(camera.current.position.distanceTo(controls.target));
      return;
    }

    getPositionForId(activeId, targetWorld);

    // ── Idle auto-tour camera ─────────────────────────────────────────
    const isTouringNow = get(touring);
    if (isTouringNow && !tourWasActive) {
      // Tour just started: record the start time
      tourStartTime = performance.now();
    }
    tourWasActive = isTouringNow;

    if (isTouringNow) {
      const elapsed = (performance.now() - tourStartTime) / 1000;
      const t = (elapsed % TOUR_DURATION_SEC) / TOUR_DURATION_SEC;
      const lookT = (t + 0.03) % 1;
      tourCurve.getPointAt(t, camera.current.position);
      tourCurve.getPointAt(lookT, tourLookAt);
      camera.current.lookAt(tourLookAt);
      controls.target.copy(tourLookAt);
      controls.update();
      // Publish distance for label visibility
      cameraTargetDistance.set(camera.current.position.distanceTo(controls.target));
      return; // skip normal flyTo/lock-on logic
    }

    if (isAnimating) {
      const t = Math.min(1, (performance.now() - animStartTime) / flyDurationMs);
      const eased = easeInOutQuart(t);

      controls.target.lerpVectors(animStartTarget, targetWorld, eased);

      const desiredDistance = getCameraDistanceForId(activeId);
      const baseDistance = animStartDistance + (desiredDistance - animStartDistance) * eased;
      // Pull-back arc: temporarily increase camera distance during the
      // middle of the flight. Skipped for reduced-motion users.
      const arcDistance = get(reducedMotion) ? 0 : Math.sin(Math.PI * t) * pullBackBump;
      const currentDistance = baseDistance + arcDistance;

      tmp.copy(animStartCameraPos).sub(animStartTarget);
      offsetDir.copy(tmp).normalize();
      camera.current.position.copy(controls.target).addScaledVector(offsetDir, currentDistance);

      // FOV breathing: narrow during mid-flight for telephoto compression.
      // Skipped for reduced-motion users.
      const cam = camera.current as unknown as { fov: number; updateProjectionMatrix: () => void };
      if (!get(reducedMotion)) {
        const fovBreath = Math.sin(Math.PI * t);
        cam.fov = BASE_FOV + (NARROW_FOV - BASE_FOV) * fovBreath;
        cam.updateProjectionMatrix();
      }

      if (t >= 1) {
        isAnimating = false;
        lastTargetWorld.copy(targetWorld);
        cam.fov = BASE_FOV;
        cam.updateProjectionMatrix();
      }
    } else {
      // Lock-on: as the target drifts (Earth orbiting the Sun, Moon
      // orbiting Earth, ISS sweeping around) carry the camera with it.
      const dx = targetWorld.x - lastTargetWorld.x;
      const dy = targetWorld.y - lastTargetWorld.y;
      const dz = targetWorld.z - lastTargetWorld.z;
      controls.target.x += dx;
      controls.target.y += dy;
      controls.target.z += dz;
      camera.current.position.x += dx;
      camera.current.position.y += dy;
      camera.current.position.z += dz;
      lastTargetWorld.copy(targetWorld);
    }

    controls.update();

    // Publish distances for the label layer and lost-in-space detection.
    cameraTargetDistance.set(camera.current.position.distanceTo(controls.target));
    cameraOriginDistance.set(camera.current.position.length());
  });
</script>

<!--
  Camera bounds for the unified heliocentric scene. With 1 AU = 100 units:
   - Pluto's aphelion: ~4931 units
   - Voyager 2: ~13800 units (~138 AU)
   - Voyager 1: ~16500 units (~165 AU)
  Camera can pull back to 60000 to see the interstellar craft. Far plane
  bumped to 100000 so the starfield (radius 70000) is still inside. Log
  depth buffer means no precision cost across the extreme range.
   - minDistance = 0.05 (close-up of Earth/Moon surface)
-->
<T.PerspectiveCamera makeDefault position={[160, 100, 160]} fov={45} near={0.05} far={100000}>
  <OrbitControls
    bind:ref={controls}
    enableZoom
    enablePan
    enableDamping
    dampingFactor={0.03}
    minDistance={0.05}
    maxDistance={60000}
  />
</T.PerspectiveCamera>

<T.AmbientLight intensity={0.06} />

<!-- Depth gradient background sphere (replaces flat scene.background) -->
<BackgroundGradient />

<!-- Starfield always visible -->
<Starfield />

<!-- Famous reference stars labelled at their J2000 directions -->
<StarLabels />

<!-- Sparse particle dust for atmospheric depth -->
<ParticleDust />

<!-- Faint ecliptic plane reference disc for orbital inclination context -->
<EclipticGrid />

<!-- Sun at the world origin (visible body + corona shells, no light source) -->
<HelioSun />

<!-- Additive glow billboard so the Sun reads as the bright center from
     solar system zoom, where the core sphere is only a few pixels -->
<SunBloom />

<!--
  Faint orbit ellipses for every planet + dwarf planet in the registry.
  Color comes from each body's metadata.orbitColor; opacity is uniform
  across all rings.
-->
{#each orbitBodies as body (body.id)}
  {#if isPlanetBody(body) && body.metadata.orbitColor !== undefined}
    <OrbitEllipse planetKey={body.id} color={body.metadata.orbitColor} opacity={0.35} />
  {/if}
{/each}

<!--
  Earth — rendered via the generic PlanetBody, with the satellite
  markers / footprints / orbit lines mounted inside its rotating frame
  via the children slot. They use Earth-fixed lat/lon coordinates and
  inherit Earth's combined obliquity tilt + GMST rotation through the
  Three.js scene graph, so they automatically end up in the right
  inertial position.
-->
{#if isPlanetBody(EARTH)}
  <PlanetBody object={EARTH}>
    <SatelliteMarker bodyId="iss" store={iss} />
    <SatelliteMarker bodyId="tiangong" store={tiangong} />

    {#if $selection === 'iss'}
      <SatelliteOrbitPath tleStore={issTle} />
      <SatelliteTrail tleStore={issTle} />
      <SatelliteFootprint store={iss} />
    {:else if $selection === 'tiangong'}
      <SatelliteOrbitPath tleStore={tiangongTle} />
      <SatelliteTrail tleStore={tiangongTle} />
      <SatelliteFootprint store={tiangong} />
    {/if}
  </PlanetBody>
{/if}

<!--
  Moon orbit rings — every body in the registry that orbits a planet
  (rather than the Sun) and has an orbital period gets a generic
  MoonOrbitRing rendered as a sibling. This automatically covers
  Earth's Moon, Phobos/Deimos, the Galilean four, all Saturnian and
  Uranian named moons, Triton, and Charon. Each ring samples the
  body's offsetFn at 192 phases over one sidereal period to build
  its closed loop, then tracks the parent's world position so it
  follows the parent around the Sun.
-->
{#each moonRingBodies as body (body.id)}
  <MoonOrbitRing object={body} />
{/each}

<!--
  Every other planet-body in the registry: planets, dwarf planets, moons.
  Each is a registry entry rendered through the same metadata-driven
  shader. Adding a new body is a registry change — no edits here.
-->
{#each otherPlanetBodies as body (body.id)}
  <PlanetBody object={body} />
{/each}

<!--
  Active spacecraft, surface landers, and (future) NEOs — every
  point-marker body in the registry. Each renders as a constant-pixel
  dot. Labels are now centralized in <LabelLayer /> below.
-->
{#each pointMarkerBodies as body (body.id)}
  <PointMarker object={body} />
{/each}

<!--
  Anti-solar tail indicators for comets. A short fading line points
  away from the Sun so comets are visually distinguishable from
  asteroids at a glance.
-->
{#each cometBodies as comet (comet.id)}
  <CometTail object={comet} />
{/each}

<!--
  Centralized label layer. Iterates the registry once and mounts a
  BodyLabel per body. Each label decides its own visibility based on
  the current zoom level (camera-to-target distance) and the body's
  labelTier metadata. Selecting a body always shows its label and
  promotes its children + siblings for context.
-->
<LabelLayer />

<!--
  Four-corner selection bracket overlay. Tracks the currently selected
  body's screen position and pixel-projected radius each frame.
-->
<SelectionReticle />

<!-- Brief additive flash at the destination on selection change -->
<SelectionFlash />

<!--
  NASA-Eyes-style trajectory trail for the currently selected body. The
  BodyTrail component samples the body's offsetFn backwards from the
  current simTime and draws a fading line that reads as "where this
  body has just been". Skipped in solar-system overview mode and for
  bodies whose offsetFn is a static snapshot (Voyager, Parker, etc).
-->
{#if $selection !== SOLAR_SYSTEM_VIEW}
  {@const selectedObject = getById($selection)}
  {#if selectedObject && selectedObject.type !== 'planet' && selectedObject.type !== 'dwarf-planet' && selectedObject.type !== 'star'}
    {#key $selection}
      <BodyTrail object={selectedObject} />
    {/key}
  {/if}
{/if}
