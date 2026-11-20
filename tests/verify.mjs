/* ==========================================================================
   Model checks — TD-01: General Profile & ISO 22081 Lab
   Tests the lab's own formulas (zones, rigid best fit, tables, checklist).
   This is not a conformity test against the standard.
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
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;

console.log('=== 1. Surface Profile ⌓ & UZ (ISO 1101 zone, demo contour) ===');

check('Bilateral ⌓ 0.40 (UZ = 0) yields band [−0.20, +0.20]; perfect part passes both modes', () => {
  const s = ISO22081.solveProfileSpec({ t: 0.40, uz: 0.00, shiftX: 0, shiftY: 0, tiltDeg: 0, waveAmp: 0, stepErr: 0 });
  assert.ok(near(s.lowerBound, -0.20));
  assert.ok(near(s.upperBound, 0.20));
  assert.equal(s.passLocked, true);
  assert.equal(s.passFloating, true);
  assert.equal(s.callout, '| ⌓ | 0.40 | A | B | C |');
});

check('UZ +0.20 with t 0.40 gives band [0.00, +0.40]; 0.30 mm stock on the step passes', () => {
  const s = ISO22081.solveProfileSpec({ t: 0.40, uz: 0.20, shiftX: 0, shiftY: 0, tiltDeg: 0, waveAmp: 0.0, stepErr: 0.30 });
  assert.ok(near(s.lowerBound, 0.00));
  assert.ok(near(s.upperBound, 0.40));
  assert.equal(s.passLocked, true);
  assert.equal(s.callout, '| ⌓ | 0.40 UZ +0.20 | A | B | C |');
});

check('UZ −0.20 with t 0.40 gives band [−0.40, 0.00]', () => {
  const s = ISO22081.solveProfileSpec({ t: 0.40, uz: -0.20, shiftX: 0, shiftY: 0, tiltDeg: 0, waveAmp: 0.0, stepErr: -0.30 });
  assert.ok(near(s.lowerBound, -0.40));
  assert.ok(near(s.upperBound, 0.00));
  assert.equal(s.passLocked, true);
});

check('Unilateral zone rejects any face below nominal (waviness 0.04 under UZ +t/2)', () => {
  const s = ISO22081.solveProfileSpec({ t: 0.40, uz: 0.20, waveAmp: 0.04, stepErr: 0.30 });
  assert.equal(s.passLocked, false);
  assert.ok(s.minLocked < 0);
});

check('Positive stock (+0.30 mm) fails bilateral ⌓ 0.40 but passes ⌓ 0.40 UZ +0.20', () => {
  const sBi = ISO22081.solveProfileSpec({ t: 0.40, uz: 0.00, waveAmp: 0.0, stepErr: 0.30 });
  const sUZ = ISO22081.solveProfileSpec({ t: 0.40, uz: 0.20, waveAmp: 0.0, stepErr: 0.30 });
  assert.equal(sBi.passLocked, false);
  assert.equal(sUZ.passLocked, true);
});

check('Datum faces define the frame: a face shift leaves A and B at zero and moves the other faces', () => {
  const s = ISO22081.solveProfileSpec({ t: 0.40, shiftX: 0.26, shiftY: 0, tiltDeg: 0, waveAmp: 0, stepErr: 0 });
  const seg = (id) => s.samples.filter((p) => p.segId === id);
  seg(0).concat(seg(6)).forEach((p) => assert.ok(near(p.devLocked, 0)));
  seg(1).forEach((p) => assert.ok(near(p.devLocked, 0.26)));   // right wall, normal +x
  seg(4).forEach((p) => assert.ok(near(p.devLocked, -0.26)));  // step wall, normal −x
  assert.equal(s.passLocked, false);
});

check('Rigid best fit recovers a pure rigid motion exactly (residual 0)', () => {
  const { pts } = ISO22081.buildNominalContour(22);
  const rows = pts.map((p) => ({ nx: p.nx, ny: p.ny, m: (p.x - 40) * p.ny - (p.y - 22) * p.nx }));
  const e = rows.map((r) => 0.2 * r.nx - 0.1 * r.ny + 0.003 * r.m);
  const f = ISO22081.rigidMinimaxFit(rows, e);
  assert.ok(f.z < 1e-9);
  assert.ok(near(f.a, 0.2, 1e-9) && near(f.b, -0.1, 1e-9) && near(f.c, 0.003, 1e-9));
});

check('Rigid best fit is minimax-optimal (no random nearby placement is better)', () => {
  const s = ISO22081.solveProfileSpec({ t: 0.40, shiftX: 0.26, shiftY: 0.14, tiltDeg: 0.12, waveAmp: 0.03, stepErr: 0.02 });
  const rows = s.samples;
  const e = rows.map((r) => r.devLocked - s.uz);
  const f = ISO22081.rigidMinimaxFit(rows, e);
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) - 0.5;
  for (let k = 0; k < 5000; k++) {
    const a = f.a + rnd() * 0.02, b = f.b + rnd() * 0.02, c = f.c + rnd() * 2e-4;
    let z = 0;
    for (let i = 0; i < rows.length; i++) z = Math.max(z, Math.abs(e[i] - (a * rows[i].nx + b * rows[i].ny + c * rows[i].m)));
    assert.ok(z >= f.z - 1e-12);
  }
});

check('Face shift (0.26 / 0.14 mm): best-fit zone accepts, datum-locked zone rejects', () => {
  const s = ISO22081.solveProfileSpec({ t: 0.40, uz: 0, datumLocked: true, shiftX: 0.26, shiftY: 0.14, tiltDeg: 0.12, waveAmp: 0.03, stepErr: 0.02 });
  assert.equal(s.passFloating, true);
  assert.equal(s.passLocked, false);
  assert.equal(s.datumShiftCaught, true);
});

check('Floating ⌓ still controls the part: 0.26 mm face shift needs t ≥ ~0.26 even with best fit', () => {
  const s = ISO22081.solveProfileSpec({ t: 0.20, datumLocked: false, shiftX: 0.26, shiftY: 0, tiltDeg: 0, waveAmp: 0, stepErr: 0 });
  assert.equal(s.callout, '| ⌓ | 0.20 |');
  assert.equal(s.passFloating, false);
  assert.equal(s.activePass, false);
  assert.ok(near(s.minFloatingReq, 0.26, 1e-6));
});

check('Min required bilateral tolerance equals 2 × max(|δ_max|, |δ_min|)', () => {
  const s = ISO22081.solveProfileSpec({ t: 0.40, uz: 0, shiftX: 0.15, shiftY: -0.10, waveAmp: 0.04, stepErr: 0.12 });
  const expected = 2 * Math.max(Math.abs(s.maxLocked), Math.abs(s.minLocked));
  assert.ok(near(s.minBilateralReq, expected));
});

console.log('\n=== 2. ISO 22081 vs. ISO 2768 Audit ===');

check('ISO 2768-mK leaves 2 of 5 features without a clear requirement; wall ⊥ is a real PASS/FAIL', () => {
  const a = ISO22081.auditLegacyVs22081({ iso2768Class: 'K', tProfile: 0.40, tSize: 0.20, stepShift: 0.26, freeformBulge: 0.34, wallTiltErr: 0.24, boreSizeErr: 0.14 });
  assert.equal(a.legacyGaps, 2);
  assert.equal(a.modernDefined, 5);
  assert.equal(a.features[0].legacyStatus, 'AMBIGUOUS');
  assert.equal(a.features[1].legacyStatus, 'UNCONTROLLED');
  assert.equal(a.features[1].modernStatus, 'FAIL');
  assert.equal(a.features[2].legacyStatus, 'PASS');
});

check('Legacy gap count does not depend on class or measured values', () => {
  for (const cls of ['H', 'K', 'L']) {
    for (const w of [0.0, 0.3, 0.6]) {
      assert.equal(ISO22081.auditLegacyVs22081({ iso2768Class: cls, wallTiltErr: w }).legacyGaps, 2);
    }
  }
});

check('ISO 2768-2 Table 2 perpendicularity for the 34 mm leg: H/K/L = 0.20 / 0.40 / 0.60', () => {
  assert.equal(ISO22081.auditLegacyVs22081({ iso2768Class: 'H' }).perpLimit2768, 0.20);
  assert.equal(ISO22081.auditLegacyVs22081({ iso2768Class: 'K' }).perpLimit2768, 0.40);
  assert.equal(ISO22081.auditLegacyVs22081({ iso2768Class: 'L' }).perpLimit2768, 0.60);
});

check('ISO 2768-1 Table 1, 6–30 mm, paired f/m/c: ±0.10 / ±0.20 / ±0.50', () => {
  const h = ISO22081.auditLegacyVs22081({ iso2768Class: 'H' });
  const k = ISO22081.auditLegacyVs22081({ iso2768Class: 'K' });
  const l = ISO22081.auditLegacyVs22081({ iso2768Class: 'L' });
  assert.deepEqual([h.part1Class, k.part1Class, l.part1Class], ['f', 'm', 'c']);
  assert.deepEqual([h.linear2768_1, k.linear2768_1, l.linear2768_1], [0.10, 0.20, 0.50]);
  assert.equal(ISO22081.auditLegacyVs22081({ iso2768Class: 'L', boreSizeErr: 0.40 }).features[3].legacyStatus, 'PASS');
});

check('Wall is checked against t/2 like every other face (0.24 fails ⌓ 0.40, passes ⌓ 0.50)', () => {
  assert.equal(ISO22081.auditLegacyVs22081({ tProfile: 0.40, wallTiltErr: 0.24 }).features[2].modernStatus, 'FAIL');
  assert.equal(ISO22081.auditLegacyVs22081({ tProfile: 0.50, wallTiltErr: 0.24 }).features[2].modernStatus, 'PASS');
});

check('Widening the general profile to 0.80 mm passes step 0.26, shoulder 0.34, wall 0.24 (all ≤ 0.40)', () => {
  const a = ISO22081.auditLegacyVs22081({ tProfile: 0.80, tSize: 0.20, stepShift: 0.26, freeformBulge: 0.34, wallTiltErr: 0.24, boreSizeErr: 0.14 });
  assert.equal(a.features[0].modernStatus, 'PASS');
  assert.equal(a.features[1].modernStatus, 'PASS');
  assert.equal(a.features[2].modernStatus, 'PASS');
  assert.equal(a.modernPassCount, 5);
});

check('Individual ⊥ 0.02 | A fails at 0.035 regardless of general ⌓ 1.00', () => {
  const a = ISO22081.auditLegacyVs22081({ tProfile: 1.00, seatPerpErr: 0.035 });
  assert.equal(a.features[4].modernStatus, 'FAIL');
  assert.equal(a.features[4].modernPass, false);
});

console.log('\n=== 3. Title-Block Checklist ===');

check('Datums + CAD TED + general size + no ISO 2768-2 → COMPLETE', () => {
  const r = ISO22081.validateTitleBlock({ tProfile: 0.40, tSize: 0.20, hasDatums: true, hasCadTed: true, hasGeneralSize: true, cites2768: false });
  assert.equal(r.valid, true);
  assert.equal(r.status, 'COMPLETE');
  assert.equal(r.errorCount, 0);
  assert.equal(r.warnCount, 0);
});

check('Citing ISO 2768-mK alongside ISO 22081 → CONFLICT, and the text keeps part 1 valid', () => {
  const r = ISO22081.validateTitleBlock({ hasDatums: true, hasCadTed: true, hasGeneralSize: true, cites2768: true });
  assert.equal(r.valid, false);
  assert.equal(r.status, 'CONFLICT');
  assert.ok(r.errorCount >= 1);
  assert.match(r.issues[0].msg, /ISO 2768-1 \(class m\) itself is still valid/);
});

check('No datum system → warning (INCOMPLETE), floating callout', () => {
  const r = ISO22081.validateTitleBlock({ hasDatums: false, hasCadTed: true, hasGeneralSize: true, cites2768: false });
  assert.equal(r.status, 'INCOMPLETE');
  assert.equal(r.errorCount, 0);
  assert.equal(r.warnCount, 1);
  assert.equal(r.fcfLine, '| ⌓ | 0.40 |');
});

check('UZ in the general callout adds a note (unverified), not an error or warning', () => {
  const r = ISO22081.validateTitleBlock({ useUZ: true, uzVal: 0.10 });
  assert.equal(r.status, 'COMPLETE');
  assert.equal(r.noteCount, 1);
  assert.equal(r.fcfLine, '| ⌓ | 0.40 UZ +0.10 | A | B | C |');
});

console.log(`\nALL ${passed} MODEL CHECKS PASSED.`);
