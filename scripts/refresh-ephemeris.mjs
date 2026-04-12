#!/usr/bin/env node

/**
 * refresh-ephemeris.mjs
 *
 * Standalone Node 20 script (ESM, no external dependencies) that fetches
 * fresh orbital data from JPL HORIZONS and updates the TypeScript registry
 * files via targeted regex replacement.
 *
 * Usage:
 *   node scripts/refresh-ephemeris.mjs            # update files
 *   node scripts/refresh-ephemeris.mjs --dry-run   # preview changes only
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const DRY_RUN = process.argv.includes('--dry-run');
const HORIZONS_API = 'https://ssd.jpl.nasa.gov/api/horizons.api';

// ── Julian Date helpers ────────────────────────────────────────────────

function todayJD() {
  const now = new Date();
  return 2440587.5 + now.getTime() / 86400000;
}

function formatEpochDate(jd) {
  const ms = (jd - 2440587.5) * 86400000;
  const d = new Date(ms);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

// ── Body manifests ─────────────────────────────────────────────────────

const SNAPSHOT_SPACECRAFT = [
  { id: 'voyager-1',          command: '-31' },
  { id: 'voyager-2',          command: '-32' },
  { id: 'new-horizons',       command: '-98' },
  { id: 'parker-solar-probe', command: '-96' },
  { id: 'solar-orbiter',      command: '-144' },
  { id: 'bepicolombo',        command: '-121' },
  { id: 'lucy',               command: '-49' },
  { id: 'psyche',             command: '-255' },
  { id: 'juice',              command: '-28' },
  { id: 'europa-clipper',     command: '-159' },
];

const ELEMENT_MOONS = [
  { id: 'phobos',    command: '401', center: '@499' },
  { id: 'deimos',    command: '402', center: '@499' },
  { id: 'io',        command: '501', center: '@599' },
  { id: 'europa',    command: '502', center: '@599' },
  { id: 'ganymede',  command: '503', center: '@599' },
  { id: 'callisto',  command: '504', center: '@599' },
  { id: 'mimas',     command: '601', center: '@699' },
  { id: 'enceladus', command: '602', center: '@699' },
  { id: 'tethys',    command: '603', center: '@699' },
  { id: 'dione',     command: '604', center: '@699' },
  { id: 'rhea',      command: '605', center: '@699' },
  { id: 'titan',     command: '606', center: '@699' },
  { id: 'iapetus',   command: '608', center: '@699' },
  { id: 'miranda',   command: '705', center: '@799' },
  { id: 'ariel',     command: '701', center: '@799' },
  { id: 'umbriel',   command: '702', center: '@799' },
  { id: 'titania',   command: '703', center: '@799' },
  { id: 'oberon',    command: '704', center: '@799' },
  { id: 'triton',    command: '801', center: '@899' },
  { id: 'charon',    command: '901', center: '@999' },
];

const MARS_ORBITERS = [
  { id: 'mro',          command: '-74',  center: '@499' },
  { id: 'maven',        command: '-202', center: '@499' },
  { id: 'mars-express', command: '-41',  center: '@499' },
  { id: 'tgo',          command: '-143', center: '@499' },
  { id: 'juno',         command: '-61',  center: '@599' },
];

const SMALL_BODIES = [
  { id: 'ceres',            command: '1;',      center: '@sun' },
  { id: 'pallas',           command: '2;',      center: '@sun' },
  { id: 'vesta',            command: '4;',      center: '@sun' },
  { id: 'hygiea',           command: '10;',     center: '@sun' },
  { id: 'asteroid-psyche',  command: '16;',     center: '@sun' },
  { id: 'eros',             command: '433;',    center: '@sun' },
  { id: 'itokawa',          command: '25143;',  center: '@sun' },
  { id: 'bennu',            command: '101955;', center: '@sun' },
  { id: 'ryugu',            command: '162173;', center: '@sun' },
  { id: 'apophis',          command: '99942;',  center: '@sun' },
  { id: 'didymos',          command: '65803;',  center: '@sun' },
  { id: 'eris',             command: '136199;', center: '@sun' },
  { id: 'haumea',           command: '136108;', center: '@sun' },
  { id: 'makemake',         command: '136472;', center: '@sun' },
  { id: 'sedna',            command: '90377;',  center: '@sun' },
  { id: 'quaoar',           command: '50000;',  center: '@sun' },
  { id: 'halley',           command: '1P;',     center: '@sun' },
  { id: 'comet-67p',        command: '67P;',    center: '@sun' },
  { id: 'comet-tempel-1',   command: '9P;',     center: '@sun' },
];

// ── File paths ─────────────────────────────────────────────────────────

const FILES = {
  spacecraft:  path.join(ROOT, 'src/lib/registry/bodies/spacecraft.ts'),
  moons:       path.join(ROOT, 'src/lib/registry/bodies/moons.ts'),
  smallBodies: path.join(ROOT, 'src/lib/registry/bodies/smallBodies.ts'),
};

// ── HORIZONS fetch helpers ─────────────────────────────────────────────

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchHorizonsVectors(command, jd) {
  const params = new URLSearchParams({
    format: 'json',
    COMMAND: `'${command}'`,
    EPHEM_TYPE: 'VECTORS',
    CENTER: "'@sun'",
    REF_PLANE: 'ECLIPTIC',
    REF_SYSTEM: 'J2000',
    OUT_UNITS: 'AU-D',
    VEC_TABLE: '1',
    VEC_CORR: 'NONE',
    MAKE_EPHEM: 'YES',
    OBJ_DATA: 'NO',
    TLIST: String(jd),
    TLIST_TYPE: 'JD',
  });
  const url = `${HORIZONS_API}?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${command}`);
  const data = await res.json();
  const text = data.result;
  if (!text) throw new Error(`No result text for ${command}`);
  const soeIdx = text.indexOf('$$SOE');
  const eoeIdx = text.indexOf('$$EOE');
  if (soeIdx === -1 || eoeIdx === -1) throw new Error(`No $$SOE/$$EOE markers for ${command}`);
  const block = text.substring(soeIdx + 5, eoeIdx).trim();
  // The vector table has the JD line, then X/Y/Z on the next line(s).
  // Format:  JDTDB\n  X = val  Y = val  Z = val\n  VX= ...
  const xMatch = block.match(/X\s*=\s*([-+\dEe.]+)/);
  const yMatch = block.match(/Y\s*=\s*([-+\dEe.]+)/);
  const zMatch = block.match(/Z\s*=\s*([-+\dEe.]+)/);
  if (!xMatch || !yMatch || !zMatch) throw new Error(`Cannot parse X/Y/Z for ${command}:\n${block}`);
  return {
    x: parseFloat(xMatch[1]),
    y: parseFloat(yMatch[1]),
    z: parseFloat(zMatch[1]),
  };
}

async function _fetchHorizonsRaw(command, center, jd) {
  const params = new URLSearchParams({
    format: 'json',
    COMMAND: `'${command}'`,
    EPHEM_TYPE: 'ELEMENTS',
    CENTER: `'${center}'`,
    REF_PLANE: 'ECLIPTIC',
    REF_SYSTEM: 'J2000',
    OUT_UNITS: 'KM-D',
    MAKE_EPHEM: 'YES',
    OBJ_DATA: 'NO',
    TLIST: String(jd),
    TLIST_TYPE: 'JD',
    TIME_TYPE: 'TDB',
  });
  const url = `${HORIZONS_API}?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${command}`);
  const data = await res.json();
  const text = data.result;
  if (!text) throw new Error(`No result text for ${command}`);
  return text;
}

async function fetchHorizonsElements(command, center, jd) {
  let text = await _fetchHorizonsRaw(command, center, jd);

  // Handle multi-match responses (common for periodic comets with multiple
  // epoch solutions). Auto-select the latest record number and retry.
  if (text.indexOf('$$SOE') === -1 && text.includes('To SELECT')) {
    const lines = text.split('\n');
    let lastRecord = null;
    for (const line of lines) {
      const m = line.match(/^\s+(\d{8,})\s+/);
      if (m) lastRecord = m[1];
    }
    if (lastRecord) {
      console.log(`    -> Multiple matches, selecting record ${lastRecord}`);
      await delay(1000);
      text = await _fetchHorizonsRaw(lastRecord, center, jd);
    }
  }

  const soeIdx = text.indexOf('$$SOE');
  const eoeIdx = text.indexOf('$$EOE');
  if (soeIdx === -1 || eoeIdx === -1) throw new Error(`No $$SOE/$$EOE markers for ${command}`);
  const block = text.substring(soeIdx + 5, eoeIdx).trim();
  const get = (label) => {
    // Use (?:^|\s) prefix so 'A' doesn't match 'MA', 'N' doesn't match 'IN', etc.
    const re = new RegExp(`(?:^|\\s)${label}\\s*=\\s*([-+\\d.Ee]+)`);
    const m = block.match(re);
    if (!m) throw new Error(`Cannot parse ${label} for ${command}`);
    return parseFloat(m[1]);
  };
  const e = get('EC');
  const i_deg = get('IN');
  const Omega_deg = get('OM');
  const omega_deg = get('W');
  const M_deg = get('MA');
  const a_km = get('A');
  const N = get('N');  // mean motion deg/day
  const period_days = 360.0 / N;
  return { a_km, e, i_deg, Omega_deg, omega_deg, M_deg, period_days };
}

// ── File update helpers ────────────────────────────────────────────────

/**
 * Update the EPOCH_JD constant in a file.
 * Returns the modified content string.
 */
function updateEpochConst(content, constName, newJD, epochDate) {
  const re = new RegExp(`(const ${constName}\\s*=\\s*)([\\d.]+)(;\\s*//.*)?`);
  const m = content.match(re);
  if (!m) {
    console.warn(`  WARN: const ${constName} not found in file`);
    return content;
  }
  const oldVal = m[2];
  if (oldVal === String(newJD)) return content;
  console.log(`  ${constName}: ${oldVal} -> ${newJD}`);
  // Build the ISO-style date for the comment (e.g. 2026-04-12)
  const ms = (newJD - 2440587.5) * 86400000;
  const d = new Date(ms);
  const isoDate = d.toISOString().slice(0, 10);
  const newComment = `; // JD TDB at ${isoDate} 00:00 UTC`;
  return content.replace(re, `$1${newJD}${newComment}`);
}

/**
 * Update helioAuToScene(x, y, z) coordinates within a specific body's block.
 */
function updateSnapshotCoords(content, bodyId, x, y, z) {
  const marker = `id: '${bodyId}'`;
  const blockStart = content.indexOf(marker);
  if (blockStart === -1) {
    console.warn(`  WARN: body '${bodyId}' not found in spacecraft.ts`);
    return content;
  }
  const regionEnd = Math.min(blockStart + 1500, content.length);
  const searchRegion = content.substring(blockStart, regionEnd);
  const match = searchRegion.match(/helioAuToScene\(([^)]+)\)/);
  if (!match) {
    console.warn(`  WARN: helioAuToScene not found near '${bodyId}'`);
    return content;
  }
  const oldCoords = match[1].trim();
  const newCoords = `${x.toFixed(8)}, ${y.toFixed(8)}, ${z.toFixed(8)}`;
  if (oldCoords === newCoords) return content;
  console.log(`  ${bodyId}: helioAuToScene(${oldCoords}) -> (${newCoords})`);
  const newRegion = searchRegion.replace(match[0], `helioAuToScene(${newCoords})`);
  return content.substring(0, blockStart) + newRegion + content.substring(regionEnd);
}

/**
 * Update the epoch string within a snapshot body's tracking block.
 */
function updateEpochString(content, bodyId, newDateStr) {
  const marker = `id: '${bodyId}'`;
  const blockStart = content.indexOf(marker);
  if (blockStart === -1) return content;
  const regionEnd = Math.min(blockStart + 1500, content.length);
  const searchRegion = content.substring(blockStart, regionEnd);
  const epochRe = /epoch:\s*'([^']+)'/;
  const epochMatch = searchRegion.match(epochRe);
  if (!epochMatch) return content;
  if (epochMatch[1] === newDateStr) return content;
  console.log(`  ${bodyId}: epoch '${epochMatch[1]}' -> '${newDateStr}'`);
  const newRegion = searchRegion.replace(epochRe, `epoch: '${newDateStr}'`);
  return content.substring(0, blockStart) + newRegion + content.substring(regionEnd);
}

/**
 * Update Keplerian element fields within a specific body's block.
 */
function updateElements(content, bodyId, elements) {
  const marker = `id: '${bodyId}'`;
  const blockStart = content.indexOf(marker);
  if (blockStart === -1) {
    console.warn(`  WARN: body '${bodyId}' not found in file`);
    return content;
  }
  const regionEnd = Math.min(blockStart + 2000, content.length);
  let searchRegion = content.substring(blockStart, regionEnd);
  let changed = false;

  for (const [field, value] of Object.entries(elements)) {
    // Require the field name to appear after whitespace (or line start) to avoid
    // matching inside other property names (e.g., 'e:' inside 'cameraDistance:').
    // Also allow numeric separators (underscores) in the old value (Juno uses 2_946_974.27).
    const fieldRe = new RegExp(`((?:^|\\n|\\s)${field}:\\s*)([-\\d_.eE+]+)`);
    const fieldMatch = searchRegion.match(fieldRe);
    if (!fieldMatch) {
      console.warn(`  WARN: field ${field} not found for '${bodyId}'`);
      continue;
    }
    const oldVal = fieldMatch[2];
    // Format the value: use enough precision to represent the data faithfully.
    let newVal;
    if (field === 'a_km') {
      // Semi-major axis: varies widely in magnitude. Use 1 decimal for moons/orbiters,
      // but the original files show varying precision. We'll match the original style.
      if (value > 1e9) newVal = value.toFixed(1);
      else if (value > 1e6) newVal = value.toFixed(2);
      else if (value > 10000) newVal = value.toFixed(2);
      else newVal = value.toFixed(3);
    } else if (field === 'e') {
      // Eccentricity: match the precision of the original value in the file
      const origDecimals = oldVal.includes('.') ? oldVal.replace(/_/g, '').split('.')[1].length : 6;
      newVal = value.toFixed(Math.max(origDecimals, 6));
    } else if (field === 'period_days') {
      // Period: 6 digits for short periods, fewer for long ones
      if (value < 1) newVal = value.toFixed(6);
      else if (value < 100) newVal = value.toFixed(6);
      else if (value > 10000) newVal = value.toFixed(4);
      else newVal = value.toFixed(6);
    } else if (field === 'i_deg' || field === 'Omega_deg' || field === 'omega_deg' || field === 'M_deg') {
      // Angles: match original precision style
      // Look at the original to decide — but generally use enough decimals
      const origDecimals = oldVal.includes('.') ? oldVal.split('.')[1].length : 0;
      newVal = value.toFixed(Math.max(origDecimals, 4));
    } else {
      newVal = String(value);
    }
    if (oldVal === newVal) continue;
    changed = true;
    console.log(`  ${bodyId}.${field}: ${oldVal} -> ${newVal}`);
    searchRegion = searchRegion.replace(fieldRe, `$1${newVal}`);
  }

  if (!changed) return content;
  return content.substring(0, blockStart) + searchRegion + content.substring(regionEnd);
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  const jd = todayJD();
  // Round to nearest 0.5 (noon or midnight TDB)
  const jdRounded = Math.round(jd * 2) / 2;
  const epochDate = formatEpochDate(jdRounded);
  console.log(`\nEphemeris Refresh Script`);
  console.log(`========================`);
  console.log(`Julian Date: ${jdRounded} (${epochDate})`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no files written)' : 'LIVE (files will be updated)'}\n`);

  // Read current file contents
  let spacecraftContent = fs.readFileSync(FILES.spacecraft, 'utf-8');
  let moonsContent = fs.readFileSync(FILES.moons, 'utf-8');
  let smallBodiesContent = fs.readFileSync(FILES.smallBodies, 'utf-8');

  let successCount = 0;
  let failCount = 0;

  // ── 1. Update epoch constants ──────────────────────────────────────
  // Note: MAVEN_EPOCH_JD is deferred until after we know whether MAVEN data
  // was successfully fetched (its HORIZONS ephemeris has limited coverage).

  console.log('--- Updating epoch constants ---');
  spacecraftContent = updateEpochConst(spacecraftContent, 'EPOCH_JD', jdRounded);
  moonsContent = updateEpochConst(moonsContent, 'EPOCH_JD', jdRounded);
  smallBodiesContent = updateEpochConst(smallBodiesContent, 'EPOCH_JD', jdRounded);
  let mavenUpdated = false;

  // ── 2. Snapshot spacecraft (Cartesian vectors) ─────────────────────

  console.log('\n--- Fetching snapshot spacecraft vectors ---');
  for (const sc of SNAPSHOT_SPACECRAFT) {
    try {
      console.log(`  Fetching ${sc.id} (${sc.command})...`);
      const { x, y, z } = await fetchHorizonsVectors(sc.command, jdRounded);
      console.log(`    -> X=${x.toFixed(8)}, Y=${y.toFixed(8)}, Z=${z.toFixed(8)} AU`);
      spacecraftContent = updateSnapshotCoords(spacecraftContent, sc.id, x, y, z);
      spacecraftContent = updateEpochString(spacecraftContent, sc.id, epochDate);
      successCount++;
    } catch (err) {
      console.error(`  ERROR [${sc.id}]: ${err.message}`);
      failCount++;
    }
    await delay(1000);
  }

  // ── 3. Element bodies: moons ───────────────────────────────────────

  console.log('\n--- Fetching moon orbital elements ---');
  for (const body of ELEMENT_MOONS) {
    try {
      console.log(`  Fetching ${body.id} (${body.command}, center=${body.center})...`);
      const elems = await fetchHorizonsElements(body.command, body.center, jdRounded);
      console.log(`    -> a=${elems.a_km.toFixed(2)} km, e=${elems.e.toFixed(6)}, P=${elems.period_days.toFixed(4)} d`);
      moonsContent = updateElements(moonsContent, body.id, elems);
      successCount++;
    } catch (err) {
      console.error(`  ERROR [${body.id}]: ${err.message}`);
      failCount++;
    }
    await delay(1000);
  }

  // ── 4. Element bodies: Mars orbiters + Juno ────────────────────────

  console.log('\n--- Fetching Mars orbiter / Juno elements ---');
  for (const body of MARS_ORBITERS) {
    try {
      console.log(`  Fetching ${body.id} (${body.command}, center=${body.center})...`);
      const elems = await fetchHorizonsElements(body.command, body.center, jdRounded);
      console.log(`    -> a=${elems.a_km.toFixed(2)} km, e=${elems.e.toFixed(6)}, P=${elems.period_days.toFixed(4)} d`);
      spacecraftContent = updateElements(spacecraftContent, body.id, elems);
      if (body.id === 'maven') mavenUpdated = true;
      successCount++;
    } catch (err) {
      console.error(`  ERROR [${body.id}]: ${err.message}`);
      failCount++;
    }
    await delay(1000);
  }

  // Update MAVEN_EPOCH_JD only if MAVEN data was successfully fetched.
  // If MAVEN's HORIZONS coverage doesn't extend to today, leave it unchanged.
  if (mavenUpdated) {
    spacecraftContent = updateEpochConst(spacecraftContent, 'MAVEN_EPOCH_JD', jdRounded);
  } else {
    console.log('  MAVEN_EPOCH_JD: kept at original value (MAVEN data unavailable)');
  }

  // ── 5. Element bodies: small bodies ────────────────────────────────

  console.log('\n--- Fetching small body orbital elements ---');
  for (const body of SMALL_BODIES) {
    try {
      console.log(`  Fetching ${body.id} (${body.command}, center=${body.center})...`);
      const elems = await fetchHorizonsElements(body.command, body.center, jdRounded);
      console.log(`    -> a=${elems.a_km.toFixed(2)} km, e=${elems.e.toFixed(6)}, P=${elems.period_days.toFixed(4)} d`);
      smallBodiesContent = updateElements(smallBodiesContent, body.id, elems);
      successCount++;
    } catch (err) {
      console.error(`  ERROR [${body.id}]: ${err.message}`);
      failCount++;
    }
    await delay(1000);
  }

  // ── 6. Write files ─────────────────────────────────────────────────

  console.log('\n--- Summary ---');
  console.log(`  Succeeded: ${successCount}`);
  console.log(`  Failed:    ${failCount}`);

  if (DRY_RUN) {
    console.log('\n  DRY RUN: no files written.');
  } else {
    fs.writeFileSync(FILES.spacecraft, spacecraftContent, 'utf-8');
    console.log(`  Wrote: ${FILES.spacecraft}`);
    fs.writeFileSync(FILES.moons, moonsContent, 'utf-8');
    console.log(`  Wrote: ${FILES.moons}`);
    fs.writeFileSync(FILES.smallBodies, smallBodiesContent, 'utf-8');
    console.log(`  Wrote: ${FILES.smallBodies}`);
  }

  if (successCount === 0 && failCount > 0) {
    console.error('\nAll fetches failed!');
    process.exit(1);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
