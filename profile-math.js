/* ==========================================================================
   profile-math.js — Pure Analytical Engine for Plate 08
   DIN EN ISO 22081:2021 vs. ISO 2768-2 (Withdrawn) & General Surface Profile ⌓
   Zero DOM dependencies · Works in Browser (window.ISO22081) & Node (require)
   ========================================================================== */

(function (global) {
  'use strict';

  const DEG2RAD = Math.PI / 180;

  // Authentic ISO 2768-2:1989 (Withdrawn 2021) table excerpts (mm)
  const ISO2768_2_TABLES = {
    H: {
      label: 'ISO 2768-H (Fine)',
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
      linearM: 0.10 // paired with typical 2768-f / m reference for step
    },
    K: {
      label: 'ISO 2768-K (Medium)',
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
      linearM: 0.20
    },
    L: {
      label: 'ISO 2768-L (Coarse)',
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
      linearM: 0.30
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
   *   Seg 1 (Right Boss Wall): (80, 0) -> (80, 34)
   *   Seg 2 (Freeform Curve):  (80, 34) -> (54, 48) (smooth quarter-arch / fillet)
   *   Seg 3 (Upper Step Face): (54, 48) -> (28, 48)
   *   Seg 4 (Step Drop):       (28, 48) -> (28, 32)
   *   Seg 5 (Lower Deck):      (28, 32) -> (0, 32)
   *   Seg 6 (Datum B Wall):    (0, 32)  -> (0, 0)
   */
  function buildNominalContour(samplesPerSeg = 22) {
    const pts = [];
    let cumS = 0;

    function pushPoint(x, y, nx, ny, segId, segName, isStep) {
      if (pts.length > 0) {
        const prev = pts[pts.length - 1];
        cumS += Math.hypot(x - prev.x, y - prev.y);
      }
      pts.push({ x, y, nx, ny, s: cumS, segId, segName, isStep: !!isStep });
    }

    function addLine(x0, y0, x1, y1, segId, segName, isStep) {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      // Outward normal for CCW polygon is (dy/len, -dx/len)
      const nx = dy / len;
      const ny = -dx / len;
      for (let i = 0; i < samplesPerSeg; i++) {
        const u = i / samplesPerSeg;
        pushPoint(x0 + dx * u, y0 + dy * u, nx, ny, segId, segName, isStep);
      }
    }

    // 0: Base Datum A (bottom, outward normal = 0, -1)
    addLine(0, 0, 80, 0, 0, 'Datum A Base', false);
    // 1: Right Boss Wall (outward normal = +1, 0)
    addLine(80, 0, 80, 34, 1, 'Right Wall', false);

    // 2: Smooth curved freeform shoulder from (80, 34) to (54, 48) via quadratic Bezier
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
      // Outward normal for CCW
      const nx = ty / tLen;
      const ny = -tx / tLen;
      pushPoint(x, y, nx, ny, 2, 'Freeform Shoulder', false);
    }

    // 3: Upper Step Face (outward normal = 0, +1) — classic non-size step feature!
    addLine(54, 48, 28, 48, 3, 'Upper Step Face', true);
    // 4: Vertical Step Drop (outward normal = -1, 0)
    addLine(28, 48, 28, 32, 4, 'Step Wall', true);
    // 5: Lower Deck (outward normal = 0, +1)
    addLine(28, 32, 0, 32, 5, 'Lower Deck', false);
    // 6: Datum B Left Wall (outward normal = -1, 0)
    addLine(0, 32, 0, 0, 6, 'Datum B Wall', false);

    const totalPerimeter = cumS + Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y);
    return { pts, totalPerimeter };
  }

  /**
   * Computes the exact ISO 1101 / ISO 22081 General Surface Profile evaluation.
   *
   * Parameters (all lengths in mm):
   * - t:         total profile tolerance zone width (mm), e.g. 0.40
   * - uz:        UZ offset modifier (mm), 0 = bilateral [-t/2, +t/2],
   *              +t/2 = unilateral outside [0, +t], -t/2 = unilateral inside [-t, 0]
   * - datumLocked: true => `⌓ t | A | B | C` (controls Form + Orientation + Location),
   *                false => `⌓ t` (floating, controls Form ONLY)
   * - shiftX:    rigid X-shift relative to Datum B (mm)
   * - shiftY:    rigid Y-shift relative to Datum A (mm)
   * - tiltDeg:   angular orientation error relative to Datum A (degrees, around centroid)
   * - waveAmp:   surface form waviness amplitude (mm)
   * - stepErr:   local outward/inward deviation on the upper step & shoulder (mm)
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
    let maxForm = -Infinity;
    let minForm = Infinity;
    let breachCount = 0;

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const phase = (p.s / totalPerimeter) * Math.PI * 2;

      // Pure form error along outward normal (independent of datum shift/tilt)
      const wave = waveAmp * Math.sin(phase * 4.0 + 0.5);
      // Smooth local bump focused on the upper step / shoulder region (seg 2 & 3)
      let localBump = 0;
      if (p.segId === 3) {
        localBump = stepErr;
      } else if (p.segId === 2) {
        localBump = stepErr * 0.65;
      } else if (p.segId === 4) {
        localBump = stepErr * 0.25;
      }
      const formDev = wave + localBump;

      // Rigid-body displacement relative to Datum A/B
      const rx = p.x - cx;
      const ry = p.y - cy;
      const rotX = cx + rx * cosA - ry * sinA - p.x;
      const rotY = cy + rx * sinA + ry * cosA - p.y;

      // Datum features A (seg 0) and B (seg 6) are shown with full contour transform
      const dispX = shiftX + rotX + p.nx * formDev;
      const dispY = shiftY + rotY + p.ny * formDev;

      // Signed normal deviation against datum-locked nominal TED contour
      const devLocked = dispX * p.nx + dispY * p.ny;

      if (devLocked > maxLocked) maxLocked = devLocked;
      if (devLocked < minLocked) minLocked = devLocked;
      if (formDev > maxForm) maxForm = formDev;
      if (formDev < minForm) minForm = formDev;

      const outLocked = devLocked > upperBound + 1e-9 || devLocked < lowerBound - 1e-9;
      if (outLocked) breachCount++;

      samples.push({
        ...p,
        dispX,
        dispY,
        devLocked,
        formDev,
        outLocked
      });
    }

    const absPeakLocked = Math.max(Math.abs(maxLocked), Math.abs(minLocked));
    const minBilateralReq = 2 * absPeakLocked;
    const lockedSpan = maxLocked - minLocked;
    const optimalUZ = (maxLocked + minLocked) * 0.5;

    // Floating (no datum): best-fit translation eliminates shift/tilt; remaining peak-to-valley is pure formSpan
    const formSpan = maxForm - minForm;
    const formMid = (maxForm + minForm) * 0.5;

    const passLocked = maxLocked <= upperBound + 1e-9 && minLocked >= lowerBound - 1e-9;
    const passFloating = formSpan <= t + 1e-9;
    const activePass = datumLocked ? passLocked : passFloating;
    const datumShiftCaught = passFloating && !passLocked;

    // Determine UZ mode label
    let uzMode = 'Bilateral Equal (Symmetric)';
    if (Math.abs(uz - t * 0.5) < 1e-6) uzMode = 'Unilateral Outside (+Material)';
    else if (Math.abs(uz + t * 0.5) < 1e-6) uzMode = 'Unilateral Inside (−Material)';
    else if (Math.abs(uz) > 1e-6) uzMode = uz > 0 ? 'Unequal Shifted Outside (UZ+)' : 'Unequal Shifted Inside (UZ−)';

    const uzStr =
      Math.abs(uz) < 1e-6
        ? ''
        : ` UZ ${uz > 0 ? '+' : '−'}${Math.abs(uz).toFixed(2)}`;
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
      maxLocked,
      minLocked,
      absPeakLocked,
      minBilateralReq,
      lockedSpan,
      optimalUZ,
      maxForm,
      minForm,
      formSpan,
      formMid,
      passLocked,
      passFloating,
      activePass,
      datumShiftCaught,
      breachCount
    };
  }

  /**
   * Side-by-side audit comparing Withdrawn ISO 2768-2 (H/K/L) vs. Active ISO 22081.
   * Evaluates 5 real features on a stepped machined bracket.
   */
  function auditLegacyVs22081(raw = {}) {
    const cls = ISO2768_2_TABLES[raw.iso2768Class] ? raw.iso2768Class : 'K';
    const tbl = ISO2768_2_TABLES[cls];
    const tProfile = Math.max(0.05, Number(raw.tProfile ?? 0.40));
    const tSize = Math.max(0.05, Number(raw.tSize ?? 0.20));

    // User-injected manufacturing deviations on the 5 features
    const stepShift = Number(raw.stepShift ?? 0.26);       // mm (15mm step height error)
    const freeformBulge = Number(raw.freeformBulge ?? 0.34); // mm (curved shoulder deviation)
    const wallTiltErr = Number(raw.wallTiltErr ?? 0.24);   // mm (perpendicularity over 40mm wall)
    const boreSizeErr = Number(raw.boreSizeErr ?? 0.14);   // mm (Ø20 linear size error)
    const seatPerpErr = Number(raw.seatPerpErr ?? 0.015);  // mm (individual override ⊥ 0.02 | A)

    const perpLimit2768 = lookupTable(tbl.perp, 40);       // 0.20 / 0.40 / 0.60
    const flatLimit2768 = lookupTable(tbl.flatness, 60);   // 0.10 / 0.20 / 0.40
    const profileHalf = tProfile * 0.5;

    const features = [
      {
        id: 'step-height',
        name: '15 mm Step Face (Non-Size)',
        actualErr: stepShift,
        legacyStatus: 'AMBIGUOUS',
        legacyDetail: `±${tbl.linearM.toFixed(2)} linear? No datum hierarchy — CMM vs. caliper dispute`,
        modernLimit: `±${profileHalf.toFixed(2)} (⌓ ${tProfile.toFixed(2)} | A | B | C)`,
        modernPass: Math.abs(stepShift) <= profileHalf + 1e-9,
        modernStatus: Math.abs(stepShift) <= profileHalf + 1e-9 ? 'PASS' : 'FAIL',
        modernDetail:
          Math.abs(stepShift) <= profileHalf + 1e-9
            ? `CAD TED locked to A|B|C: |${stepShift.toFixed(2)}| ≤ ${profileHalf.toFixed(2)} mm`
            : `Caught cleanly: |${stepShift.toFixed(2)}| > ${profileHalf.toFixed(2)} mm from Datum A`
      },
      {
        id: 'freeform',
        name: 'Curved Freeform Shoulder',
        actualErr: freeformBulge,
        legacyStatus: 'UNCONTROLLED',
        legacyDetail: 'ISO 2768-2 has NO profile of a surface tolerance — blindspot!',
        modernLimit: `±${profileHalf.toFixed(2)} (⌓ ${tProfile.toFixed(2)} | A | B | C)`,
        modernPass: Math.abs(freeformBulge) <= profileHalf + 1e-9,
        modernStatus: Math.abs(freeformBulge) <= profileHalf + 1e-9 ? 'PASS' : 'FAIL',
        modernDetail:
          Math.abs(freeformBulge) <= profileHalf + 1e-9
            ? `3D skin enclosed: |${freeformBulge.toFixed(2)}| ≤ ${profileHalf.toFixed(2)} mm`
            : `Blindspot closed! |${freeformBulge.toFixed(2)}| > ${profileHalf.toFixed(2)} mm`
      },
      {
        id: 'wall-perp',
        name: '40 mm Side Wall Perpendicularity',
        actualErr: wallTiltErr,
        legacyStatus: Math.abs(wallTiltErr) <= perpLimit2768 + 1e-9 ? 'AMBIGUOUS' : 'FAIL',
        legacyDetail: `⊥ ${perpLimit2768.toFixed(2)} using "longer feature = datum" (breaks on equal walls)`,
        modernLimit: `⌓ ${tProfile.toFixed(2)} | A | B | C`,
        modernPass: Math.abs(wallTiltErr) <= tProfile + 1e-9,
        modernStatus: Math.abs(wallTiltErr) <= tProfile + 1e-9 ? 'PASS' : 'FAIL',
        modernDetail:
          Math.abs(wallTiltErr) <= tProfile + 1e-9
            ? `Explicit Datum A locks orientation: ${wallTiltErr.toFixed(2)} ≤ ${tProfile.toFixed(2)} mm`
            : `Tilt ${wallTiltErr.toFixed(2)} exceeds ⌓ ${tProfile.toFixed(2)} | A | B | C`
      },
      {
        id: 'linear-size',
        name: 'Ø20 Mounting Bore (Feature of Size)',
        actualErr: boreSizeErr,
        legacyStatus: Math.abs(boreSizeErr) <= tbl.linearM + 1e-9 ? 'PASS' : 'FAIL',
        legacyDetail: `ISO 2768-1 linear ±${tbl.linearM.toFixed(2)} (no explicit size vs. step distinction)`,
        modernLimit: `General Size ±${tSize.toFixed(2)} (ISO 22081)`,
        modernPass: Math.abs(boreSizeErr) <= tSize + 1e-9,
        modernStatus: Math.abs(boreSizeErr) <= tSize + 1e-9 ? 'PASS' : 'FAIL',
        modernDetail:
          Math.abs(boreSizeErr) <= tSize + 1e-9
            ? `ISO 22081 General Size applies only to features of size: |${boreSizeErr.toFixed(2)}| ≤ ${tSize.toFixed(2)}`
            : `Out of general size limit: |${boreSizeErr.toFixed(2)}| > ±${tSize.toFixed(2)} mm`
      },
      {
        id: 'override-seat',
        name: 'Bearing Seat (Individual ⊥ 0.02 | A)',
        actualErr: seatPerpErr,
        legacyStatus: 'OVERRIDE',
        legacyDetail: 'Individual tolerance supersedes general table',
        modernLimit: 'Individual ⊥ 0.02 | A (Overrides ISO 22081)',
        modernPass: Math.abs(seatPerpErr) <= 0.02 + 1e-9,
        modernStatus: Math.abs(seatPerpErr) <= 0.02 + 1e-9 ? 'OVERRIDE' : 'FAIL',
        modernDetail:
          Math.abs(seatPerpErr) <= 0.02 + 1e-9
            ? `Individual spec wins (${seatPerpErr.toFixed(3)} ≤ 0.020 mm); general ⌓ does not loosen it`
            : `Individual ⊥ 0.02 | A violated (${seatPerpErr.toFixed(3)} > 0.020 mm)`
      }
    ];

    const legacyBlindspots = features.filter(
      (f) => f.legacyStatus === 'UNCONTROLLED' || f.legacyStatus === 'AMBIGUOUS'
    ).length;
    const modernAmbiguities = 0; // ISO 22081 with CAD TED + Datum System has zero ambiguity
    const modernPassCount = features.filter((f) => f.modernPass).length;

    return {
      iso2768Class: cls,
      iso2768Label: tbl.label,
      perpLimit2768,
      flatLimit2768,
      tProfile,
      tSize,
      features,
      legacyBlindspots,
      modernAmbiguities,
      modernPassCount
    };
  }

  /**
   * Validates an ISO 22081 Title-Block Specification & computes feature coverage.
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
        msg: 'Conflict: Do NOT cite withdrawn ISO 2768-2 alongside ISO 22081 on the same drawing.'
      });
    }
    if (!hasDatums) {
      issues.push({
        level: 'error',
        msg: 'Missing Datum System: Without | A | B | C |, general ⌓ only controls form — feature locations & angles float!'
      });
    }
    if (!hasCadTed) {
      issues.push({
        level: 'warn',
        msg: 'Missing TED Source: ISO 22081 requires Theoretically Exact Dimensions (explicit TEDs or linked 3D CAD model).'
      });
    }
    if (!hasGeneralSize) {
      issues.push({
        level: 'warn',
        msg: 'No General Size Tolerance: Remember that ⌓ alone does not define an ISO 14405-1 two-point size tolerance for untoleranced bores/shafts.'
      });
    }

    const uzPart =
      useUZ && Math.abs(uzVal) > 1e-6
        ? ` UZ ${uzVal > 0 ? '+' : '−'}${Math.abs(uzVal).toFixed(2)}`
        : '';
    const fcfLine = hasDatums
      ? `| ⌓ | ${tProfile.toFixed(2)}${uzPart} | ${datumStr} |`
      : `| ⌓ | ${tProfile.toFixed(2)}${uzPart} |`;

    const lines = [
      'Tolerancing: ISO 8015',
      'General geometrical specification: ISO 22081',
      `General profile: ${fcfLine}`,
      hasGeneralSize ? `General linear size: ±${tSize.toFixed(2)} mm` : '(No general size — all sizes individually toleranced)',
      hasCadTed ? 'Untoleranced geometry = TED from linked 3D CAD model' : '⚠ Missing CAD / TED declaration!'
    ];
    if (cites2768) {
      lines.push('✗ INVALID: ISO 2768-mK (withdrawn conflict!)');
    }

    const errorCount = issues.filter((i) => i.level === 'error').length;
    const warnCount = issues.filter((i) => i.level === 'warn').length;
    const status = errorCount > 0 ? 'NON-COMPLIANT' : warnCount > 0 ? 'INCOMPLETE' : 'ISO 22081 VALID';

    return {
      status,
      valid: errorCount === 0 && warnCount === 0,
      errorCount,
      warnCount,
      issues,
      fcfLine,
      lines
    };
  }

  const api = {
    ISO2768_2_TABLES,
    buildNominalContour,
    solveProfileSpec,
    auditLegacyVs22081,
    validateTitleBlock
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.ISO22081 = api;
})(typeof window !== 'undefined' ? window : globalThis);
