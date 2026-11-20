/* ==========================================================================
   profile-math.js — Pure Analytical Engine for TD-01
   ISO 22081:2021 (DIN EN ISO 22081:2022-10) vs. ISO 2768-2 (withdrawn 2021)
   General surface profile ⌓, UZ offset per ISO 1101
   Zero DOM dependencies · Works in Browser (window.ISO22081) & Node (require)
   ========================================================================== */

(function (global) {
  'use strict';

  const DEG2RAD = Math.PI / 180;

  // ISO 2768-2:1989 (withdrawn 2021) table excerpts (mm):
  //   Table 1 straightness/flatness, Table 2 perpendicularity (by the SHORTER leg).
  // linear1 = ISO 2768-1:1989 Table 1, range "over 6 up to 30 mm" (covers the Ø20 bore and
  //   the 16 mm step): f ±0.1, m ±0.2, c ±0.5. ISO 2768-1 is still valid.
  //   The pairing H–f, K–m, L–c is the usual combination (e.g. "ISO 2768-mK"), not a rule.
  const ISO2768_2_TABLES = {
    H: {
      label: 'ISO 2768-fH',
      part1Class: 'f',
      flatness: [
        { maxL: 10, t: 0.02 },
        { maxL: 30, t: 0.05 },
        { maxL: 100, t: 0.10 },
        { maxL: 300, t: 0.20 },
        { maxL: 1000, t: 0.30 }
      ],
      perp: [
        { maxL: 100, t: 0.20 },
        { maxL: 300, t: 0.30 },
        { maxL: 1000, t: 0.40 }
      ],
      linear1: 0.10
    },
    K: {
      label: 'ISO 2768-mK',
      part1Class: 'm',
      flatness: [
        { maxL: 10, t: 0.05 },
        { maxL: 30, t: 0.10 },
        { maxL: 100, t: 0.20 },
        { maxL: 300, t: 0.40 },
        { maxL: 1000, t: 0.60 }
      ],
      perp: [
        { maxL: 100, t: 0.40 },
        { maxL: 300, t: 0.60 },
        { maxL: 1000, t: 0.80 }
      ],
      linear1: 0.20
    },
    L: {
      label: 'ISO 2768-cL',
      part1Class: 'c',
      flatness: [
        { maxL: 10, t: 0.10 },
        { maxL: 30, t: 0.20 },
        { maxL: 100, t: 0.40 },
        { maxL: 300, t: 0.80 },
        { maxL: 1000, t: 1.20 }
      ],
      perp: [
        { maxL: 100, t: 0.60 },
        { maxL: 300, t: 1.00 },
        { maxL: 1000, t: 1.50 }
      ],
      linear1: 0.50
    }
  };

  function lookupTable(rows, len) {
    for (let i = 0; i < rows.length; i++) {
      if (len <= rows[i].maxL) return rows[i].t;
    }
    return rows[rows.length - 1].t;
  }

  /**
   * Builds a clean 2D stepped-housing CAD nominal contour (TED geometry, mm)
   * Origin (0,0) = Datum A (bottom y=0) intersecting Datum B (left x=0).
   * Contour goes CCW:
   *   Seg 0 (Datum A Base):    (0, 0)  -> (80, 0)
   *   Seg 1 (Right Wall):      (80, 0) -> (80, 34)
   *   Seg 2 (Freeform Curve):  (80, 34) -> (54, 48) (quadratic Bézier)
   *   Seg 3 (Upper Step Face): (54, 48) -> (28, 48)
   *   Seg 4 (Step Wall):       (28, 48) -> (28, 32)   (16 mm step height)
   *   Seg 5 (Lower Deck):      (28, 32) -> (0, 32)
   *   Seg 6 (Datum B Wall):    (0, 32)  -> (0, 0)
   */
  const SEGMENTS = [
    { id: 0, name: 'Datum A', datum: true },
    { id: 1, name: 'Right wall' },
    { id: 2, name: 'Freeform' },
    { id: 3, name: 'Upper step' },
    { id: 4, name: 'Step wall' },
    { id: 5, name: 'Lower deck' },
    { id: 6, name: 'Datum B', datum: true }
  ];

  function buildNominalContour(samplesPerSeg = 22) {
    const pts = [];
    let cumS = 0;

    function pushPoint(x, y, nx, ny, segId, isStep) {
      if (pts.length > 0) {
        const prev = pts[pts.length - 1];
        cumS += Math.hypot(x - prev.x, y - prev.y);
      }
      pts.push({ x, y, nx, ny, s: cumS, segId, segName: SEGMENTS[segId].name, isStep: !!isStep });
    }

    function addLine(x0, y0, x1, y1, segId, isStep) {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      // Outward normal for CCW polygon is (dy/len, -dx/len)
      const nx = dy / len;
      const ny = -dx / len;
      for (let i = 0; i < samplesPerSeg; i++) {
        const u = i / samplesPerSeg;
        pushPoint(x0 + dx * u, y0 + dy * u, nx, ny, segId, isStep);
      }
    }

    addLine(0, 0, 80, 0, 0, false);
    addLine(80, 0, 80, 34, 1, false);

    const p0 = { x: 80, y: 34 };
    const p1 = { x: 80, y: 48 };
    const p2 = { x: 54, y: 48 };
    for (let i = 0; i < samplesPerSeg; i++) {
      const u = i / samplesPerSeg;
      const omt = 1 - u;
      const x = omt * omt * p0.x + 2 * omt * u * p1.x + u * u * p2.x;
      const y = omt * omt * p0.y + 2 * omt * u * p1.y + u * u * p2.y;
      const tx = 2 * omt * (p1.x - p0.x) + 2 * u * (p2.x - p1.x);
      const ty = 2 * omt * (p1.y - p0.y) + 2 * u * (p2.y - p1.y);
      const tLen = Math.hypot(tx, ty) || 1;
      pushPoint(x, y, ty / tLen, -tx / tLen, 2, false);
    }

    addLine(54, 48, 28, 48, 3, true);
    addLine(28, 48, 28, 32, 4, true);
    addLine(28, 32, 0, 32, 5, false);
    addLine(0, 32, 0, 0, 6, false);

    const totalPerimeter = cumS + Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y);
    return { pts, totalPerimeter };
  }

  /**
   * Rigid-body minimax (Chebyshev) fit of a tolerance zone to normal deviations.
   * Finds translation (a, b) and small rotation c [rad] about the reference point that minimise
   *   z = max_i | e_i − (a·nx_i + b·ny_i + c·m_i) |,
   * where m_i = (x_i − cx)·ny_i − (y_i − cy)·nx_i is the normal component of a unit rotation.
   * Solved exactly as a linear programme (dense simplex, origin-feasible form):
   *   maximise w = Z0 − z subject to ±(e_i − g_i·p) ≤ Z0 − w.
   */
  function rigidMinimaxFit(rows, e) {
    const n = rows.length;
    let Z0 = 1;
    for (let i = 0; i < n; i++) Z0 = Math.max(Z0, Math.abs(e[i]) + 1);

    const NV = 7; // a+, a−, b+, b−, c+, c−, w
    const R = 2 * n;
    const C = NV + R + 1; // structural + slack + RHS
    const T = new Float64Array((R + 1) * C);
    const basis = new Int32Array(R);

    for (let i = 0; i < n; i++) {
      const g = [rows[i].nx, rows[i].ny, rows[i].m];
      for (let k = 0; k < 2; k++) {
        const r = 2 * i + k;
        const s = k === 0 ? -1 : 1;
        const base = r * C;
        for (let j = 0; j < 3; j++) {
          T[base + 2 * j] = s * g[j];
          T[base + 2 * j + 1] = -s * g[j];
        }
        T[base + 6] = 1;
        T[base + NV + r] = 1;
        T[base + C - 1] = k === 0 ? Z0 - e[i] : Z0 + e[i];
        basis[r] = NV + r;
      }
    }
    const obj = R * C;
    T[obj + 6] = -1; // maximise w

    const EPS = 1e-12;
    for (let iter = 0; iter < 5000; iter++) {
      // Dantzig's rule, Bland's rule after 200 pivots (anti-cycling)
      let enter = -1;
      if (iter < 200) {
        let most = -EPS;
        for (let j = 0; j < C - 1; j++) {
          if (T[obj + j] < most) { most = T[obj + j]; enter = j; }
        }
      } else {
        for (let j = 0; j < C - 1; j++) {
          if (T[obj + j] < -EPS) { enter = j; break; }
        }
      }
      if (enter < 0) break;

      let leave = -1;
      let best = Infinity;
      for (let r = 0; r < R; r++) {
        const a = T[r * C + enter];
        if (a > EPS) {
          const ratio = T[r * C + C - 1] / a;
          if (ratio < best - 1e-15 || (ratio <= best + 1e-15 && leave >= 0 && basis[r] < basis[leave])) {
            best = ratio;
            leave = r;
          }
        }
      }
      if (leave < 0) break; // cannot happen: w ≤ Z0

      const pr = leave * C;
      const pv = T[pr + enter];
      for (let j = 0; j < C; j++) T[pr + j] /= pv;
      for (let r = 0; r <= R; r++) {
        if (r === leave) continue;
        const f = T[r * C + enter];
        if (f === 0) continue;
        const rb = r * C;
        for (let j = 0; j < C; j++) T[rb + j] -= f * T[pr + j];
      }
      basis[leave] = enter;
    }

    const x = new Float64Array(NV);
    for (let r = 0; r < R; r++) if (basis[r] < NV) x[basis[r]] = T[r * C + C - 1];
    const a = x[0] - x[1];
    const b = x[2] - x[3];
    const c = x[4] - x[5];

    // Report the residual peak computed directly (equals the LP optimum)
    let z = 0;
    for (let i = 0; i < n; i++) {
      z = Math.max(z, Math.abs(e[i] - (a * rows[i].nx + b * rows[i].ny + c * rows[i].m)));
    }
    return { a, b, c, z };
  }

  /**
   * ISO 1101 / ISO 22081 general surface profile evaluation of the 2D demo contour.
   *
   * Parameters (all lengths in mm):
   * - t:           total profile tolerance zone width, e.g. 0.40
   * - uz:          UZ offset (ISO 1101): zone [UZ − t/2, UZ + t/2], positive = outside material
   * - datumLocked: true  => `⌓ t | A | B | C` — zone fixed to the datum frame
   *                false => `⌓ t` — zone may be moved as a rigid body to best fit the part
   * - shiftX/Y:    displacement of the NON-DATUM faces relative to datum B (x) / datum A (y),
   *                e.g. faces machined in a second setup. The datum faces define the frame and
   *                do not move with it.
   * - tiltDeg:     rotation of the non-datum faces about the part centre (40, 22), degrees
   * - waveAmp:     form waviness amplitude on all faces (datum faces included)
   * - stepErr:     local normal deviation on the upper step (and partly shoulder / step wall)
   *
   * Simplification: the datum frame is the nominal position of faces A and B; the datum faces
   * carry only their form error. (A full ISO 5459 association is not modelled.)
   */
  function solveProfileSpec(raw = {}) {
    const t = Math.max(0.02, Number(raw.t ?? 0.40));
    const uz = Number(raw.uz ?? 0.0);
    const datumLocked = raw.datumLocked !== undefined ? !!raw.datumLocked : true;
    const shiftX = Number(raw.shiftX ?? 0.0);
    const shiftY = Number(raw.shiftY ?? 0.0);
    const tiltDeg = Number(raw.tiltDeg ?? 0.0);
    const waveAmp = Number(raw.waveAmp ?? 0.05);
    const stepErr = Number(raw.stepErr ?? 0.0);

    const upperBound = t * 0.5 + uz;
    const lowerBound = -t * 0.5 + uz;

    const { pts, totalPerimeter } = buildNominalContour(22);
    const cx = 40;
    const cy = 22;
    const rad = tiltDeg * DEG2RAD;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    const samples = [];
    let maxLocked = -Infinity;
    let minLocked = Infinity;

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const phase = (p.s / totalPerimeter) * Math.PI * 2;
      const isDatum = !!SEGMENTS[p.segId].datum;

      const wave = waveAmp * Math.sin(phase * 4.0 + 0.5);
      let localBump = 0;
      if (p.segId === 3) localBump = stepErr;
      else if (p.segId === 2) localBump = stepErr * 0.65;
      else if (p.segId === 4) localBump = stepErr * 0.25;
      const formDev = wave + localBump;

      // Rigid displacement of the non-datum faces relative to the datum frame
      let fx = 0;
      let fy = 0;
      if (!isDatum) {
        const rx = p.x - cx;
        const ry = p.y - cy;
        fx = shiftX + (cx + rx * cosA - ry * sinA - p.x);
        fy = shiftY + (cy + rx * sinA + ry * cosA - p.y);
      }
      const dispX = fx + p.nx * formDev;
      const dispY = fy + p.ny * formDev;

      // Signed normal deviation from the nominal TED contour in the datum frame
      const devLocked = dispX * p.nx + dispY * p.ny;
      if (devLocked > maxLocked) maxLocked = devLocked;
      if (devLocked < minLocked) minLocked = devLocked;

      samples.push({
        ...p,
        isDatum,
        dispX,
        dispY,
        devLocked,
        formDev,
        m: (p.x - cx) * p.ny - (p.y - cy) * p.nx
      });
    }

    // Floating zone: rigid best fit (translation + rotation), zone centred on UZ
    const fit = rigidMinimaxFit(samples, samples.map((s) => s.devLocked - uz));
    let maxFloat = -Infinity;
    let minFloat = Infinity;
    let breachLocked = 0;
    let breachFloat = 0;
    samples.forEach((s) => {
      s.devFloat = s.devLocked - (fit.a * s.nx + fit.b * s.ny + fit.c * s.m);
      s.outLocked = s.devLocked > upperBound + 1e-9 || s.devLocked < lowerBound - 1e-9;
      s.outFloat = s.devFloat > upperBound + 1e-9 || s.devFloat < lowerBound - 1e-9;
      if (s.outLocked) breachLocked++;
      if (s.outFloat) breachFloat++;
      if (s.devFloat > maxFloat) maxFloat = s.devFloat;
      if (s.devFloat < minFloat) minFloat = s.devFloat;
    });

    const absPeakLocked = Math.max(Math.abs(maxLocked), Math.abs(minLocked));
    const minBilateralReq = 2 * absPeakLocked;
    const lockedSpan = maxLocked - minLocked;
    const optimalUZ = (maxLocked + minLocked) * 0.5;
    const minFloatingReq = 2 * fit.z; // smallest t that passes floating with this UZ

    const passLocked = maxLocked <= upperBound + 1e-9 && minLocked >= lowerBound - 1e-9;
    const passFloating = fit.z <= t * 0.5 + 1e-9;
    const activePass = datumLocked ? passLocked : passFloating;
    // Best fit would accept the part, the datum-locked zone rejects it
    const datumShiftCaught = passFloating && !passLocked;

    let uzMode = 'Bilateral Equal (Symmetric)';
    if (Math.abs(uz - t * 0.5) < 1e-6) uzMode = 'Unilateral Outside (+Material)';
    else if (Math.abs(uz + t * 0.5) < 1e-6) uzMode = 'Unilateral Inside (−Material)';
    else if (Math.abs(uz) > 1e-6) uzMode = uz > 0 ? 'Unequal Shifted Outside (UZ+)' : 'Unequal Shifted Inside (UZ−)';

    const uzStr = Math.abs(uz) < 1e-6 ? '' : ` UZ ${uz > 0 ? '+' : '−'}${Math.abs(uz).toFixed(2)}`;
    const callout = datumLocked
      ? `| ⌓ | ${t.toFixed(2)}${uzStr} | A | B | C |`
      : `| ⌓ | ${t.toFixed(2)}${uzStr} |`;

    return {
      t,
      uz,
      datumLocked,
      upperBound,
      lowerBound,
      uzMode,
      callout,
      samples,
      totalPerimeter,
      segments: SEGMENTS,
      maxLocked,
      minLocked,
      absPeakLocked,
      minBilateralReq,
      lockedSpan,
      optimalUZ,
      maxFloat,
      minFloat,
      floatFit: { dx: fit.a, dy: fit.b, rotDeg: fit.c / DEG2RAD, halfSpan: fit.z },
      minFloatingReq,
      passLocked,
      passFloating,
      activePass,
      datumShiftCaught,
      breachLocked,
      breachFloat,
      breachCount: datumLocked ? breachLocked : breachFloat
    };
  }

  /**
   * Side-by-side audit: withdrawn ISO 2768-2 (with ISO 2768-1) vs. ISO 22081.
   * Evaluates 5 features on a stepped bracket.
   */
  function auditLegacyVs22081(raw = {}) {
    const cls = ISO2768_2_TABLES[raw.iso2768Class] ? raw.iso2768Class : 'K';
    const tbl = ISO2768_2_TABLES[cls];
    const tProfile = Math.max(0.05, Number(raw.tProfile ?? 0.40));
    const tSize = Math.max(0.05, Number(raw.tSize ?? 0.20));

    const stepShift = Number(raw.stepShift ?? 0.26);         // mm, error of the 16 mm step height
    const freeformBulge = Number(raw.freeformBulge ?? 0.34); // mm, normal deviation of the shoulder
    const wallTiltErr = Number(raw.wallTiltErr ?? 0.24);     // mm, top of the 34 mm wall off square
    const boreSizeErr = Number(raw.boreSizeErr ?? 0.14);     // mm, Ø20 size error
    const seatPerpErr = Number(raw.seatPerpErr ?? 0.015);    // mm, individual ⊥ 0.02 | A

    // ISO 2768-2 Table 2: perpendicularity by the shorter leg (34 mm wall vs. 80 mm base)
    const perpLimit2768 = lookupTable(tbl.perp, 34);
    const lin = tbl.linear1;
    const c1 = tbl.part1Class;
    const half = tProfile * 0.5;
    const within = (v, lim) => Math.abs(v) <= lim + 1e-9;
    const zoneLimit = `±${half.toFixed(2)} (⌓ ${tProfile.toFixed(2)} | A | B | C)`;

    const features = [
      {
        id: 'step-height',
        name: '16 mm Step Height (not a size)',
        actualErr: stepShift,
        legacyStatus: 'AMBIGUOUS',
        legacyDetail: `ISO 2768-1 (${c1}) ±${lin.toFixed(2)} on a step distance: no datum, no defined measurement — ISO 14405-2 calls ± on such dimensions ambiguous`,
        modernLimit: zoneLimit,
        modernPass: within(stepShift, half),
        modernStatus: within(stepShift, half) ? 'PASS' : 'FAIL',
        modernDetail: within(stepShift, half)
          ? `Upper face located from Datum A: |${stepShift.toFixed(2)}| ≤ ${half.toFixed(2)} mm`
          : `Upper face out of zone: |${stepShift.toFixed(2)}| > ${half.toFixed(2)} mm from its TED position`
      },
      {
        id: 'freeform',
        name: 'Curved Freeform Shoulder',
        actualErr: freeformBulge,
        legacyStatus: 'UNCONTROLLED',
        legacyDetail: 'ISO 2768-2 has no profile tolerance, ISO 2768-1 no tolerance for free-form shapes',
        modernLimit: zoneLimit,
        modernPass: within(freeformBulge, half),
        modernStatus: within(freeformBulge, half) ? 'PASS' : 'FAIL',
        modernDetail: within(freeformBulge, half)
          ? `Inside the general ⌓ zone: |${freeformBulge.toFixed(2)}| ≤ ${half.toFixed(2)} mm`
          : `Out of the general ⌓ zone: |${freeformBulge.toFixed(2)}| > ${half.toFixed(2)} mm`
      },
      {
        id: 'wall-perp',
        name: '34 mm Side Wall ⊥ to 80 mm Base',
        actualErr: wallTiltErr,
        legacyStatus: within(wallTiltErr, perpLimit2768) ? 'PASS' : 'FAIL',
        legacyDetail: `ISO 2768-2 Table 2: ⊥ ${perpLimit2768.toFixed(2)} by the shorter leg (34 mm); the longer leg (base) is the datum`,
        modernLimit: zoneLimit,
        modernPass: within(wallTiltErr, half),
        modernStatus: within(wallTiltErr, half) ? 'PASS' : 'FAIL',
        modernDetail: within(wallTiltErr, half)
          ? `Wall top ${wallTiltErr.toFixed(2)} mm off its TED position ≤ ${half.toFixed(2)} mm (orientation via Datum A)`
          : `Wall top ${wallTiltErr.toFixed(2)} mm off its TED position > ${half.toFixed(2)} mm`
      },
      {
        id: 'linear-size',
        name: 'Ø20 Mounting Bore (Feature of Size)',
        actualErr: boreSizeErr,
        legacyStatus: within(boreSizeErr, lin) ? 'PASS' : 'FAIL',
        legacyDetail: `ISO 2768-1 (${c1}) ±${lin.toFixed(2)} for 6–30 mm (part 1 is still valid)`,
        modernLimit: `General size ±${tSize.toFixed(2)} (ISO 22081)`,
        modernPass: within(boreSizeErr, tSize),
        modernStatus: within(boreSizeErr, tSize) ? 'PASS' : 'FAIL',
        modernDetail: within(boreSizeErr, tSize)
          ? `General size: |${boreSizeErr.toFixed(2)}| ≤ ${tSize.toFixed(2)} mm; bore position falls under the general ⌓`
          : `Out of general size: |${boreSizeErr.toFixed(2)}| > ±${tSize.toFixed(2)} mm`
      },
      {
        id: 'individual-seat',
        name: 'Bearing Seat (Individual ⊥ 0.02 | A)',
        actualErr: seatPerpErr,
        legacyStatus: 'INDIVIDUAL',
        legacyDetail: 'Individual tolerance applies; ISO 2768 general tolerances cover only features without one',
        modernLimit: 'Individual ⊥ 0.02 | A',
        modernPass: within(seatPerpErr, 0.02),
        modernStatus: within(seatPerpErr, 0.02) ? 'INDIVIDUAL' : 'FAIL',
        modernDetail: within(seatPerpErr, 0.02)
          ? `Individual spec met (${seatPerpErr.toFixed(3)} ≤ 0.020 mm). How it combines with the general ⌓: ISO 22081 §5.2 (not checked here)`
          : `Individual ⊥ 0.02 | A violated (${seatPerpErr.toFixed(3)} > 0.020 mm)`
      }
    ];

    const legacyGaps = features.filter(
      (f) => f.legacyStatus === 'UNCONTROLLED' || f.legacyStatus === 'AMBIGUOUS'
    ).length;
    const modernDefined = features.filter((f) => !!f.modernLimit).length;
    const modernPassCount = features.filter((f) => f.modernPass).length;

    return {
      iso2768Class: cls,
      iso2768Label: tbl.label,
      part1Class: c1,
      linear2768_1: lin,
      perpLimit2768,
      tProfile,
      tSize,
      features,
      legacyGaps,
      modernDefined,
      modernPassCount
    };
  }

  /**
   * Checks an ISO 22081 title-block declaration against the lab's checklist.
   * Levels: error (contradiction), warn (missing item), note (unverified point, not counted).
   */
  function validateTitleBlock(cfg = {}) {
    const tProfile = Math.max(0.05, Number(cfg.tProfile ?? 0.40));
    const tSize = Math.max(0.05, Number(cfg.tSize ?? 0.20));
    const hasDatums = cfg.hasDatums !== undefined ? !!cfg.hasDatums : true;
    const datumStr = (cfg.datumStr || 'A | B | C').trim();
    const hasCadTed = cfg.hasCadTed !== undefined ? !!cfg.hasCadTed : true;
    const hasGeneralSize = cfg.hasGeneralSize !== undefined ? !!cfg.hasGeneralSize : true;
    const cites2768 = !!cfg.cites2768;
    const useUZ = !!cfg.useUZ;
    const uzVal = useUZ ? Number(cfg.uzVal ?? 0.10) : 0;

    const issues = [];
    if (cites2768) {
      issues.push({
        level: 'error',
        msg: 'Two general geometrical specifications: the K in "ISO 2768-mK" calls up ISO 2768-2 (withdrawn 2021), which ISO 22081 replaces. Remove it. ISO 2768-1 (class m) itself is still valid.'
      });
    }
    if (!hasDatums) {
      issues.push({
        level: 'warn',
        msg: 'No datum system: the general ⌓ zone may then be moved as a rigid body to best fit the part, so locations relative to the functional datums are not controlled. ISO 22081 §5.3 has rules for the datum system; whether one is mandatory is not verified here.'
      });
    }
    if (!hasCadTed) {
      issues.push({
        level: 'warn',
        msg: 'No TED source: the general ⌓ needs nominal geometry (TEDs on the drawing or a referenced 3D CAD model).'
      });
    }
    if (!hasGeneralSize) {
      issues.push({
        level: 'warn',
        msg: 'No general size specification: ⌓ does not give untoleranced bores and shafts a size tolerance. ISO 22081 provides a general size specification for linear and angular sizes.'
      });
    }
    if (useUZ && Math.abs(uzVal) > 1e-6) {
      issues.push({
        level: 'note',
        msg: 'UZ is defined in ISO 1101. Whether ISO 22081 allows UZ in the general specification is not verified here — check the standard before using it.'
      });
    }

    const uzPart = useUZ && Math.abs(uzVal) > 1e-6 ? ` UZ ${uzVal > 0 ? '+' : '−'}${Math.abs(uzVal).toFixed(2)}` : '';
    const fcfLine = hasDatums
      ? `| ⌓ | ${tProfile.toFixed(2)}${uzPart} | ${datumStr} |`
      : `| ⌓ | ${tProfile.toFixed(2)}${uzPart} |`;

    const lines = [
      'Tolerancing: ISO 8015',
      'General geometrical specification: ISO 22081',
      `General profile: ${fcfLine}`,
      hasGeneralSize ? `General size (linear): ±${tSize.toFixed(2)} mm` : '(No general size — all sizes individually toleranced)',
      hasCadTed ? 'Untoleranced geometry = TED from linked 3D CAD model' : '⚠ Missing CAD / TED declaration!'
    ];
    if (cites2768) {
      lines.push('✗ ISO 2768-mK: K = part 2, withdrawn, conflicts');
    }

    const errorCount = issues.filter((i) => i.level === 'error').length;
    const warnCount = issues.filter((i) => i.level === 'warn').length;
    const noteCount = issues.filter((i) => i.level === 'note').length;
    const status = errorCount > 0 ? 'CONFLICT' : warnCount > 0 ? 'INCOMPLETE' : 'COMPLETE';

    return {
      status,
      valid: errorCount === 0 && warnCount === 0,
      errorCount,
      warnCount,
      noteCount,
      issues,
      fcfLine,
      lines
    };
  }

  const api = {
    ISO2768_2_TABLES,
    SEGMENTS,
    buildNominalContour,
    rigidMinimaxFit,
    solveProfileSpec,
    auditLegacyVs22081,
    validateTitleBlock
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.ISO22081 = api;
})(typeof window !== 'undefined' ? window : globalThis);
