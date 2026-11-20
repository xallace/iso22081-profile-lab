/* ==========================================================================
   Analytical Verification Suite — Plate 08: General Profile & ISO 22081 Lab
   Run: node tests/verify.mjs
   ========================================================================== */

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ISO22081 = require(path.resolve(__dirname, '..', 'profile-math.js'));

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  [PASS] ${name}`);
}

console.log('=== 1. Surface Profile ⌓ & UZ Offset Equations (ISO 1101 / ISO 22081) ===');

check('Bilateral ⌓ 0.40 (UZ = 0) yields exact band [-0.20, +0.20]', () => {
  const s = ISO22081.solveProfileSpec({ t: 0.40, uz: 0.00, shiftX: 0, shiftY: 0, tiltDeg: 0, waveAmp: 0, stepErr: 0 });
  assert.ok(Math.abs(s.lowerBound - (-0.20)) < 1e-9);
  assert.ok(Math.abs(s.upperBound - 0.20) < 1e-9);
  assert.equal(s.passLocked, true);
  assert.equal(s.passFloating, true);
  assert.equal(s.callout, '| ⌓ | 0.40 | A | B | C |');
});

check('Unilateral Outside ⌓ 0.40 UZ +0.20 shifts band to [0.00, +0.40]', () => {
  const s = ISO22081.solveProfileSpec({ t: 0.40, uz: 0.20, shiftX: 0, shiftY: 0, tiltDeg: 0, waveAmp: 0.0, stepErr: 0.30 });
  assert.ok(Math.abs(s.lowerBound - 0.00) < 1e-9);
  assert.ok(Math.abs(s.upperBound - 0.40) < 1e-9);
  assert.equal(s.passLocked, true);
  assert.equal(s.callout, '| ⌓ | 0.40 UZ +0.20 | A | B | C |');
});

check('Unilateral Inside ⌓ 0.40 UZ -0.20 shifts band to [-0.40, 0.00]', () => {
  const s = ISO22081.solveProfileSpec({ t: 0.40, uz: -0.20, shiftX: 0, shiftY: 0, tiltDeg: 0, waveAmp: 0.0, stepErr: -0.30 });
  assert.ok(Math.abs(s.lowerBound - (-0.40)) < 1e-9);
  assert.ok(Math.abs(s.upperBound - 0.00) < 1e-9);
  assert.equal(s.passLocked, true);
});

check('Positive stock (+0.30 mm) fails bilateral ⌓ 0.40 but passes ⌓ 0.40 UZ +0.20', () => {
  const sBi = ISO22081.solveProfileSpec({ t: 0.40, uz: 0.00, waveAmp: 0.0, stepErr: 0.30 });
  const sUZ = ISO22081.solveProfileSpec({ t: 0.40, uz: 0.20, waveAmp: 0.0, stepErr: 0.30 });
  assert.equal(sBi.passLocked, false);
  assert.equal(sUZ.passLocked, true);
});

check('Datum Shift Trap: low form error (0.03 mm) + rigid shift (+0.26 mm) passes Floating ⌓ but FAILS Datum-Locked ⌓ | A | B | C', () => {
  const s = ISO22081.solveProfileSpec({ t: 0.40, uz: 0, datumLocked: true, shiftX: 0.26, shiftY: 0.14, tiltDeg: 0.10, waveAmp: 0.03, stepErr: 0 });
  assert.equal(s.passFloating, true);
  assert.equal(s.passLocked, false);
  assert.equal(s.datumShiftCaught, true);
});

check('Disabling Datum Lock (Floating ⌓) drops | A | B | C | and evaluates pure form', () => {
  const s = ISO22081.solveProfileSpec({ t: 0.40, uz: 0, datumLocked: false, shiftX: 0.30, shiftY: 0.20, tiltDeg: 0.20, waveAmp: 0.05, stepErr: 0 });
  assert.equal(s.callout, '| ⌓ | 0.40 |');
  assert.equal(s.passFloating, true);
  assert.equal(s.activePass, true);
});

check('Min required bilateral tolerance equals 2 × max(|δ_max|, |δ_min|)', () => {
  const s = ISO22081.solveProfileSpec({ t: 0.40, uz: 0, shiftX: 0.15, shiftY: -0.10, waveAmp: 0.04, stepErr: 0.12 });
  const expected = 2 * Math.max(Math.abs(s.maxLocked), Math.abs(s.minLocked));
  assert.ok(Math.abs(s.minBilateralReq - expected) < 1e-9);
});

console.log('\n=== 2. ISO 22081 vs. Withdrawn ISO 2768-2 Audit ===');

check('ISO 2768-K (Med) has 3 ambiguities/blindspots while ISO 22081 has 0', () => {
  const a = ISO22081.auditLegacyVs22081({ iso2768Class: 'K', tProfile: 0.40, tSize: 0.20, stepShift: 0.26, freeformBulge: 0.34, wallTiltErr: 0.24, boreSizeErr: 0.14 });
  assert.equal(a.legacyBlindspots, 3);
  assert.equal(a.modernAmbiguities, 0);
  assert.equal(a.features[1].legacyStatus, 'UNCONTROLLED');
  assert.equal(a.features[1].modernStatus, 'FAIL');
});

check('ISO 2768-2 class tables return exact H/K/L perpendicularity values (0.20 / 0.40 / 0.60 at L=40)', () => {
  assert.equal(ISO22081.auditLegacyVs22081({ iso2768Class: 'H' }).perpLimit2768, 0.20);
  assert.equal(ISO22081.auditLegacyVs22081({ iso2768Class: 'K' }).perpLimit2768, 0.40);
  assert.equal(ISO22081.auditLegacyVs22081({ iso2768Class: 'L' }).perpLimit2768, 0.60);
});

check('Tightening ISO 22081 general profile to 0.80 mm passes stepShift 0.26 & freeformBulge 0.34 (both ≤ ±0.40)', () => {
  const a = ISO22081.auditLegacyVs22081({ tProfile: 0.80, tSize: 0.20, stepShift: 0.26, freeformBulge: 0.34, wallTiltErr: 0.24, boreSizeErr: 0.14 });
  assert.equal(a.features[0].modernStatus, 'PASS');
  assert.equal(a.features[1].modernStatus, 'PASS');
  assert.equal(a.modernPassCount, 5);
});

check('Individual override (Bearing Seat ⊥ 0.02 | A) fails if seatPerpErr > 0.02 regardless of general ⌓ 1.00', () => {
  const a = ISO22081.auditLegacyVs22081({ tProfile: 1.00, seatPerpErr: 0.035 });
  assert.equal(a.features[4].modernStatus, 'FAIL');
  assert.equal(a.features[4].modernPass, false);
});

console.log('\n=== 3. ISO 22081 Title-Block Validator ===');

check('Clean ISO 22081 title block (datums + CAD TED + general size + no 2768) validates cleanly', () => {
  const r = ISO22081.validateTitleBlock({ tProfile: 0.40, tSize: 0.20, hasDatums: true, hasCadTed: true, hasGeneralSize: true, cites2768: false });
  assert.equal(r.valid, true);
  assert.equal(r.status, 'ISO 22081 VALID');
  assert.equal(r.errorCount, 0);
  assert.equal(r.warnCount, 0);
});

check('Citing withdrawn ISO 2768-2 alongside ISO 22081 triggers NON-COMPLIANT error', () => {
  const r = ISO22081.validateTitleBlock({ hasDatums: true, hasCadTed: true, hasGeneralSize: true, cites2768: true });
  assert.equal(r.valid, false);
  assert.equal(r.status, 'NON-COMPLIANT');
  assert.ok(r.errorCount >= 1);
});

check('Omitting Datum System on general profile triggers NON-COMPLIANT error', () => {
  const r = ISO22081.validateTitleBlock({ hasDatums: false, hasCadTed: true, hasGeneralSize: true, cites2768: false });
  assert.equal(r.valid, false);
  assert.equal(r.status, 'NON-COMPLIANT');
  assert.equal(r.fcfLine, '| ⌓ | 0.40 |');
});

console.log(`\nALL ${passed} ANALYTICAL CHECKS PASSED.`);
