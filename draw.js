/* ==========================================================================
   draw.js — High-DPI Technical Drafting Renderers for TD-01 (ISO 22081)
   1967 Technical Book-Plate Palette (#0a101a, #e9edf5, #ff7d61, #58b691, #56a8e4)
   ========================================================================== */

(function (global) {
  'use strict';

  const C = {
    paper: '#0a101a',
    grid: 'rgba(233, 237, 245, 0.065)',
    ink: '#e9edf5',
    inkSoft: '#a8b3c5',
    dim: '#7f8b9f',
    vermilion: '#ff7d61',
    ok: '#58b691',
    okFill: 'rgba(88, 182, 145, 0.14)',
    blue: '#56a8e4',
    blueFill: 'rgba(86, 168, 228, 0.13)',
    amber: '#ed864b',
    amberFill: 'rgba(237, 134, 75, 0.14)',
    warnFill: 'rgba(255, 125, 97, 0.16)',
    partFill: 'rgba(233, 237, 245, 0.065)'
  };

  function setupCanvas(canvas) {
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 720;
    const h = canvas.clientHeight || 355;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function drawDraftingGrid(ctx, w, h, step = 24) {
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = step; x < w; x += step) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    for (let y = step; y < h; y += step) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();
  }

  function drawDatumTriangle(ctx, x, y, dir, label) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = C.ink;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    if (dir === 'bottom') {
      ctx.moveTo(0, 0);
      ctx.lineTo(-6, 10);
      ctx.lineTo(6, 10);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.lineTo(0, 22);
      ctx.stroke();
      ctx.fillStyle = C.paper;
      ctx.fillRect(-10, 22, 20, 18);
      ctx.strokeRect(-10, 22, 20, 18);
      ctx.fillStyle = C.ink;
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, 31);
    } else if (dir === 'left') {
      ctx.moveTo(0, 0);
      ctx.lineTo(-10, -6);
      ctx.lineTo(-10, 6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-22, 0);
      ctx.stroke();
      ctx.fillStyle = C.paper;
      ctx.fillRect(-42, -9, 20, 18);
      ctx.strokeRect(-42, -9, 20, 18);
      ctx.fillStyle = C.ink;
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, -32, 0);
    }
    ctx.restore();
  }

  // Shrinks the font until `text` fits into maxW (min 7px)
  function fitFont(ctx, text, maxW, size, weight, family) {
    let s = size;
    ctx.font = `${weight} ${s}px ${family}`;
    while (s > 7 && ctx.measureText(text).width > maxW) {
      s -= 0.5;
      ctx.font = `${weight} ${s}px ${family}`;
    }
    return s;
  }

  function drawTedBox(ctx, x, y, text) {
    ctx.save();
    ctx.font = '600 10.5px "JetBrains Mono", monospace';
    const tw = ctx.measureText(text).width + 10;
    ctx.fillStyle = C.paper;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.1;
    ctx.fillRect(x - tw / 2, y - 8, tw, 16);
    ctx.strokeRect(x - tw / 2, y - 8, tw, 16);
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /* ==========================================================================
     PLATE I — SURFACE PROFILE ⌓ ZONE & ACTUAL CONTOUR
     ========================================================================== */
  function drawProfilePlate(canvas, sol) {
    const { ctx, w, h } = setupCanvas(canvas);
    drawDraftingGrid(ctx, w, h, 24);

    // Map CAD mm (x: 0..80, y: 0..48) into canvas with generous margins
    const padL = 96, padR = 54, padT = 46, padB = 64;
    const scale = Math.min((w - padL - padR) / 86, (h - padT - padB) / 54);
    const ox = padL + ((w - padL - padR) - 80 * scale) * 0.5;
    const oy = h - padB - ((h - padT - padB) - 48 * scale) * 0.32;

    const exag = 14.0; // 14x visual exaggeration for tolerance zone & actual deviations
    const toX = (mmX) => ox + mmX * scale;
    const toY = (mmY) => oy - mmY * scale;

    const samples = sol.samples;
    // Zone is always [UZ − t/2, UZ + t/2]; in floating mode the part is shown after the rigid best fit
    const upperOff = sol.upperBound;
    const lowerOff = sol.lowerBound;

    // 1. Filled nominal CAD part body
    ctx.beginPath();
    samples.forEach((p, idx) => {
      const px = toX(p.x);
      const py = toY(p.y);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = C.partFill;
    ctx.fill();

    // 2. Tolerance Zone Ribbon (outer boundary + inner boundary via evenodd fill)
    ctx.beginPath();
    samples.forEach((p, idx) => {
      const px = toX(p.x + p.nx * upperOff * exag);
      const py = toY(p.y + p.ny * upperOff * exag);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    samples.forEach((p, idx) => {
      const px = toX(p.x + p.nx * lowerOff * exag);
      const py = toY(p.y + p.ny * lowerOff * exag);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = sol.datumLocked ? C.okFill : C.blueFill;
    ctx.fill('evenodd');

    // Dashed tolerance zone boundary lines
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = sol.datumLocked ? C.ok : C.blue;
    ctx.lineWidth = 1.3;
    [upperOff, lowerOff].forEach((off) => {
      ctx.beginPath();
      samples.forEach((p, idx) => {
        const px = toX(p.x + p.nx * off * exag);
        const py = toY(p.y + p.ny * off * exag);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.stroke();
    });
    ctx.restore();

    // 3. Nominal TED CAD contour (crisp thin ink)
    ctx.beginPath();
    samples.forEach((p, idx) => {
      const px = toX(p.x);
      const py = toY(p.y);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(233, 237, 245, 0.55)';
    ctx.lineWidth = 1.15;
    ctx.stroke();

    // 4. Actual Manufactured Contour (segment colored green if in-zone, vermilion if breached!)
    for (let i = 0; i < samples.length; i++) {
      const p0 = samples[i];
      const p1 = samples[(i + 1) % samples.length];

      const x0 = sol.datumLocked
        ? toX(p0.x + p0.dispX * exag)
        : toX(p0.x + p0.nx * p0.devFloat * exag);
      const y0 = sol.datumLocked
        ? toY(p0.y + p0.dispY * exag)
        : toY(p0.y + p0.ny * p0.devFloat * exag);
      const x1 = sol.datumLocked
        ? toX(p1.x + p1.dispX * exag)
        : toX(p1.x + p1.nx * p1.devFloat * exag);
      const y1 = sol.datumLocked
        ? toY(p1.y + p1.dispY * exag)
        : toY(p1.y + p1.ny * p1.devFloat * exag);

      const bad = sol.datumLocked
        ? p0.outLocked || p1.outLocked
        : p0.outFloat || p1.outFloat;

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = bad ? C.vermilion : C.ink;
      ctx.lineWidth = bad ? 2.8 : 2.1;
      ctx.stroke();
    }

    // 5. Datum Reference Symbols A & B + TED Dimension Boxes
    if (sol.datumLocked) {
      drawDatumTriangle(ctx, toX(40), toY(0), 'bottom', 'A');
      drawDatumTriangle(ctx, toX(0), toY(16), 'left', 'B');
    } else {
      ctx.fillStyle = C.blue;
      ctx.textAlign = 'center';
      fitFont(ctx, 'NO DATUMS — ZONE MOVED AS A RIGID BODY TO BEST FIT THE PART', w - 24, 10.5, '600', '"JetBrains Mono", monospace');
      ctx.fillText('NO DATUMS — ZONE MOVED AS A RIGID BODY TO BEST FIT THE PART', w * 0.5, toY(0) + 40);
    }

    // TED annotations on drawing (48 and 32 from A, 80 from B along the base)
    drawTedBox(ctx, toX(41), toY(48) - 22, '48.00');
    drawTedBox(ctx, toX(14), toY(32) - 18, '32.00');
    drawTedBox(ctx, toX(64), toY(0) + 18, '80.00');

    // Legend strip in top-left (wraps to a new line instead of clipping on narrow canvases)
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    const legend = [
      ['— Actual contour', C.ink],
      ['--- ⌓ Tolerance zone', sol.datumLocked ? C.ok : C.blue],
      ['— Out-of-zone breach', C.vermilion]
    ];
    let lx = 14, ly = 18;
    legend.forEach(([txt, col]) => {
      const tw = ctx.measureText(txt).width;
      if (lx > 14 && lx + tw > w - 14) { lx = 14; ly += 14; }
      ctx.fillStyle = col;
      ctx.fillText(txt, lx, ly);
      lx += tw + 22;
    });
  }

  /* ==========================================================================
     FIG. 1B — UNWRAPPED SIGNED NORMAL DEVIATION δ(s)
     ========================================================================== */
  function drawDeviationStrip(canvas, sol) {
    const { ctx, w, h } = setupCanvas(canvas);
    drawDraftingGrid(ctx, w, h, 20);

    const padL = 56, padR = 18, padT = 18, padB = 26;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const devOf = (p) => (sol.datumLocked ? p.devLocked : p.devFloat);
    const peak = sol.datumLocked
      ? sol.absPeakLocked
      : Math.max(Math.abs(sol.maxFloat), Math.abs(sol.minFloat));
    const maxY = Math.max(0.55, Math.abs(sol.upperBound) + 0.12, Math.abs(sol.lowerBound) + 0.12, peak + 0.08);
    const mapX = (s) => padL + (s / sol.totalPerimeter) * plotW;
    const mapY = (v) => padT + plotH * 0.5 - (v / maxY) * (plotH * 0.46);

    // Tolerance band shading (same band in both modes; floating values are after the best fit)
    const uVal = sol.upperBound;
    const lVal = sol.lowerBound;
    const yTop = mapY(uVal);
    const yBot = mapY(lVal);

    ctx.fillStyle = sol.datumLocked ? C.okFill : C.blueFill;
    ctx.fillRect(padL, yTop, plotW, yBot - yTop);

    // Zero nominal CAD line
    const y0 = mapY(0);
    ctx.strokeStyle = 'rgba(233, 237, 245, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, y0);
    ctx.lineTo(padL + plotW, y0);
    ctx.stroke();

    // Upper & lower dashed bounds
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = sol.datumLocked ? C.ok : C.blue;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(padL, yTop); ctx.lineTo(padL + plotW, yTop);
    ctx.moveTo(padL, yBot); ctx.lineTo(padL + plotW, yBot);
    ctx.stroke();
    ctx.restore();

    // Axis labels
    ctx.fillStyle = C.dim;
    ctx.font = '600 9.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const signed = (v) => {
      const r = Number(v.toFixed(2));
      return r === 0 ? '0.00' : `${r > 0 ? '+' : '−'}${Math.abs(r).toFixed(2)}`;
    };
    if (Math.abs(yTop - y0) > 10) ctx.fillText(signed(uVal), padL - 6, yTop);
    ctx.fillText('0.00', padL - 6, y0);
    if (Math.abs(yBot - y0) > 10) ctx.fillText(signed(lVal), padL - 6, yBot);

    // Deviation waveform
    const samples = sol.samples;
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1];
      const b = samples[i];
      const va = devOf(a);
      const vb = devOf(b);
      const bad = sol.datumLocked ? a.outLocked || b.outLocked : a.outFloat || b.outFloat;

      ctx.beginPath();
      ctx.moveTo(mapX(a.s), mapY(va));
      ctx.lineTo(mapX(b.s), mapY(vb));
      ctx.strokeStyle = bad ? C.vermilion : C.ink;
      ctx.lineWidth = bad ? 2.4 : 1.8;
      ctx.stroke();
    }

    // Perimeter landmarks derived from the segment arc lengths
    const spans = sol.segments.map((seg) => {
      const pts = samples.filter((p) => p.segId === seg.id);
      const s0 = pts[0].s;
      const next = samples[samples.indexOf(pts[pts.length - 1]) + 1];
      const s1 = next ? next.s : sol.totalPerimeter;
      return { name: seg.name, s0, s1 };
    });

    // Segment boundary ticks
    ctx.strokeStyle = 'rgba(233, 237, 245, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    spans.forEach((sp, i) => {
      if (i === 0) return;
      const x = Math.round(mapX(sp.s0)) + 0.5;
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
    });
    ctx.stroke();

    // Labels centred on each segment; skipped where they would overlap a neighbour
    ctx.fillStyle = C.dim;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    let lastRight = -Infinity;
    spans.forEach((sp) => {
      const cxs = mapX((sp.s0 + sp.s1) * 0.5);
      const segW = mapX(sp.s1) - mapX(sp.s0);
      const tw = ctx.measureText(sp.name).width;
      if (tw > segW - 4 || cxs - tw / 2 < lastRight + 6) return;
      ctx.fillText(sp.name, cxs, h - 16);
      lastRight = cxs + tw / 2;
    });
  }

  /* ==========================================================================
     PLATE II — ISO 22081 VS. ISO 2768-2 INTERACTIVE DRAWING AUDIT
     ========================================================================== */
  function drawComparePlate(canvas, audit, viewMode) {
    const { ctx, w, h } = setupCanvas(canvas);
    drawDraftingGrid(ctx, w, h, 24);

    const isLegacy = viewMode === '2768';
    const padL = 86, padR = 56, padT = 62, padB = 68;
    const scale = Math.min((w - padL - padR) / 92, (h - padT - padB) / 56);
    const ox = padL + ((w - padL - padR) - 82 * scale) * 0.5;
    const oy = h - padB - ((h - padT - padB) - 48 * scale) * 0.25;

    const toX = (x) => ox + x * scale;
    const toY = (y) => oy - y * scale;

    // Mode banner badge
    ctx.save();
    ctx.fillStyle = isLegacy ? C.warnFill : C.okFill;
    ctx.strokeStyle = isLegacy ? C.vermilion : C.ok;
    ctx.lineWidth = 1.4;
    ctx.fillRect(14, 12, w - 28, 30);
    ctx.strokeRect(14, 12, w - 28, 30);
    ctx.fillStyle = isLegacy ? C.vermilion : C.ok;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const n = audit.features.length;
    const bannerVariants = isLegacy
      ? [`LEGACY VIEW: ${audit.iso2768Label} (PART 2 WITHDRAWN 2021) — ${audit.legacyGaps} OF ${n} FEATURES WITHOUT A CLEAR REQUIREMENT`,
         `LEGACY: ${audit.iso2768Label} — ${audit.legacyGaps} OF ${n} WITHOUT CLEAR REQUIREMENT`,
         `${audit.iso2768Label}: ${audit.legacyGaps} OF ${n} UNDEFINED`]
      : [`ISO 22081 VIEW — | ⌓ | ${audit.tProfile.toFixed(2)} | A | B | C | + GENERAL SIZE ±${audit.tSize.toFixed(2)}`,
         `ISO 22081: | ⌓ | ${audit.tProfile.toFixed(2)} | A | B | C | ±${audit.tSize.toFixed(2)}`];
    const bannerFont = '"JetBrains Mono", monospace';
    ctx.font = `700 9px ${bannerFont}`;
    const bannerTxt = bannerVariants.find((t) => ctx.measureText(t).width <= w - 48) || bannerVariants[bannerVariants.length - 1];
    fitFont(ctx, bannerTxt, w - 48, 11.5, '700', bannerFont);
    ctx.fillText(bannerTxt, 24, 27);
    ctx.restore();

    // Draw Part Silhouette
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(0));
    ctx.lineTo(toX(80), toY(0));
    ctx.lineTo(toX(80), toY(34));
    ctx.quadraticCurveTo(toX(80), toY(48), toX(54), toY(48));
    ctx.lineTo(toX(28), toY(48));
    ctx.lineTo(toX(28), toY(32));
    ctx.lineTo(toX(0), toY(32));
    ctx.closePath();
    ctx.fillStyle = C.partFill;
    ctx.fill();

    // Under ISO 22081, wrap the entire non-overridden perimeter in a translucent green general ⌓ skin!
    if (!isLegacy) {
      ctx.save();
      ctx.strokeStyle = 'rgba(88, 182, 145, 0.24)';
      ctx.lineWidth = 12;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    }

    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Mounting Bore Ø20 (Feature of Size) at (18, 16)
    const boreX = toX(18), boreY = toY(16), boreR = 10 * scale; // Ø20
    const boreFeat = audit.features[3];
    const boreBad = isLegacy ? boreFeat.legacyStatus === 'FAIL' : !boreFeat.modernPass;
    ctx.beginPath();
    ctx.arc(boreX, boreY, boreR, 0, Math.PI * 2);
    ctx.fillStyle = C.paper;
    ctx.fill();
    ctx.strokeStyle = boreBad ? C.vermilion : C.blue;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Precision Bearing Seat (Individual Override) at (58, 22)
    const seatX = toX(58), seatY = toY(22), seatR = 10.5 * scale;
    ctx.beginPath();
    ctx.arc(seatX, seatY, seatR, 0, Math.PI * 2);
    ctx.fillStyle = C.paper;
    ctx.fill();
    ctx.strokeStyle = C.blue;
    ctx.lineWidth = 2.4;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Highlight each inspected zone with crisp callout badges
    function badge(x, y, title, status, color) {
      ctx.save();
      ctx.font = '700 9.5px "JetBrains Mono", monospace';
      const wBox = Math.max(ctx.measureText(title).width, ctx.measureText(status).width) + 14;
      const bx = x - wBox * 0.5;
      const by = y - 16;
      ctx.fillStyle = C.paper;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.fillRect(bx, by, wBox, 31);
      ctx.strokeRect(bx, by, wBox, 31);
      ctx.fillStyle = C.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(title, x, by + 4);
      ctx.fillStyle = color;
      ctx.fillText(status, x, by + 17);
      ctx.restore();
    }

    const colorFor = (st) =>
      st === 'PASS' ? C.ok : st === 'FAIL' || st === 'UNCONTROLLED' ? C.vermilion : st === 'AMBIGUOUS' ? C.amber : C.blue;

    // 1. Step Face
    const fStep = audit.features[0];
    const stStep = isLegacy ? fStep.legacyStatus : fStep.modernStatus;
    ctx.strokeStyle = colorFor(stStep);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(toX(28), toY(48));
    ctx.lineTo(toX(54), toY(48));
    ctx.stroke();
    badge(toX(41), toY(48) - 24, 'STEP FACE', stStep, colorFor(stStep));

    // 2. Freeform Shoulder
    const fFree = audit.features[1];
    const stFree = isLegacy ? fFree.legacyStatus : fFree.modernStatus;
    ctx.strokeStyle = colorFor(stFree);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(toX(80), toY(34));
    ctx.quadraticCurveTo(toX(80), toY(48), toX(54), toY(48));
    ctx.stroke();
    badge(toX(76), toY(46) - 18, 'FREEFORM', stFree, colorFor(stFree));

    // 3. Side Wall
    const fWall = audit.features[2];
    const stWall = isLegacy ? fWall.legacyStatus : fWall.modernStatus;
    ctx.strokeStyle = colorFor(stWall);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(toX(80), toY(0));
    ctx.lineTo(toX(80), toY(34));
    ctx.stroke();
    badge(toX(80) + 12, toY(16), 'WALL ⊥', stWall, colorFor(stWall));

    // 4. Bore Size
    const stBore = isLegacy ? boreFeat.legacyStatus : boreFeat.modernStatus;
    badge(boreX, boreY + boreR + 18, 'Ø20 SIZE', stBore, colorFor(stBore));

    // 5. Precision Override
    const fSeat = audit.features[4];
    const stSeat = isLegacy ? fSeat.legacyStatus : fSeat.modernStatus;
    badge(seatX, seatY + seatR + 18, '⊥ 0.02|A', stSeat, colorFor(stSeat));

    // Datums (datum system under ISO 22081; ISO 2768-2 uses the longer leg of an angle)
    if (!isLegacy) {
      drawDatumTriangle(ctx, toX(40), toY(0), 'bottom', 'A');
      drawDatumTriangle(ctx, toX(0), toY(16), 'left', 'B');
    } else {
      const note = 'ISO 2768-2: NO DATUM SYSTEM — FOR ⊥ THE LONGER LEG SERVES AS DATUM';
      ctx.fillStyle = C.amber;
      ctx.textAlign = 'center';
      fitFont(ctx, note, w - 28, 10.5, '700', '"JetBrains Mono", monospace');
      ctx.fillText(note, w * 0.5, toY(0) + 34);
    }
  }

  /* ==========================================================================
     PLATE III — ISO 22081 TITLE-BLOCK & COVERAGE MAP PREVIEW
     ========================================================================== */
  function drawTitleBlockPlate(canvas, cfg, res) {
    const { ctx, w, h } = setupCanvas(canvas);
    drawDraftingGrid(ctx, w, h, 24);

    // Outer technical drawing border
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.lineWidth = 0.8;
    ctx.strokeRect(24, 24, w - 48, h - 48);

    // Top-left schematic coverage preview
    ctx.fillStyle = C.ink;
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('DRAWING FIELD — FEATURE COVERAGE BY SPECIFICATION LAYER', 38, 46);

    const blocks = [
      {
        label: '1. Untoleranced Planes, Steps & Freeform',
        cov: cfg.hasDatums ? `Covered by ${res.fcfLine}` : '⚠ Floating zone (rigid best fit), not tied to A|B|C',
        ok: cfg.hasDatums && cfg.hasCadTed
      },
      {
        label: '2. Untoleranced Features of Size (Bores/Slots)',
        cov: cfg.hasGeneralSize ? `Covered by General Size ±${Number(cfg.tSize).toFixed(2)} mm` : '⚠ Requires individual size on every bore!',
        ok: cfg.hasGeneralSize
      },
      {
        label: '3. Precision Individual Callouts (e.g. Ø25 H7, ⊥ 0.02 | A)',
        cov: 'Indicated on the feature; interplay with the general spec: ISO 22081 §5.2',
        ok: true
      },
      {
        label: '4. Legacy Standard Conflict Check',
        cov: cfg.cites2768 ? '✗ CONFLICT: two general geometrical specs, remove ISO 2768-2 (K)' : 'Clean: ISO 8015 + ISO 22081 only',
        ok: !cfg.cites2768
      }
    ];

    blocks.forEach((b, i) => {
      const y = 62 + i * 44;
      ctx.fillStyle = b.ok ? C.okFill : C.warnFill;
      ctx.strokeStyle = b.ok ? C.ok : C.vermilion;
      ctx.lineWidth = 1.2;
      ctx.fillRect(38, y, w - 76, 36);
      ctx.strokeRect(38, y, w - 76, 36);

      ctx.fillStyle = C.ink;
      ctx.font = '700 11px "Inter", sans-serif';
      ctx.fillText(b.label, 50, y + 14);
      ctx.fillStyle = b.ok ? C.ok : C.vermilion;
      ctx.font = '600 10.5px "JetBrains Mono", monospace';
      ctx.fillText(b.cov, 50, y + 29);
    });

    // Bottom-right authentic ISO 7200 / ISO 22081 Engineering Title Block
    const tbW = Math.min(w - 76, 560);
    const tbH = 166;
    const tbX = w - 38 - tbW;
    const tbY = h - 38 - tbH;

    ctx.fillStyle = C.paper;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.fillRect(tbX, tbY, tbW, tbH);
    ctx.strokeRect(tbX, tbY, tbW, tbH);

    // Header row of title block
    ctx.fillStyle = res.valid ? C.okFill : res.errorCount > 0 ? C.warnFill : C.amberFill;
    ctx.fillRect(tbX, tbY, tbW, 30);
    ctx.beginPath();
    ctx.moveTo(tbX, tbY + 30);
    ctx.lineTo(tbX + tbW, tbY + 30);
    ctx.stroke();

    ctx.fillStyle = C.ink;
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('TITLE BLOCK · GENERAL GEOMETRICAL SPECIFICATION', tbX + 12, tbY + 15);

    ctx.fillStyle = res.valid ? C.ok : res.errorCount > 0 ? C.vermilion : C.amber;
    ctx.textAlign = 'right';
    ctx.fillText(res.status, tbX + tbW - 12, tbY + 15);

    // Specification lines inside title block
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    res.lines.forEach((line, idx) => {
      const ly = tbY + 42 + idx * 20;
      const isBad = line.startsWith('✗') || line.startsWith('⚠');
      ctx.fillStyle = isBad ? C.vermilion : idx === 2 ? C.blue : C.ink;
      ctx.font = idx === 2 ? '700 12px "JetBrains Mono", monospace' : '500 11px "JetBrains Mono", monospace';
      ctx.fillText(line, tbX + 14, ly);
    });
  }

  global.ISO22081Draw = {
    drawProfilePlate,
    drawDeviationStrip,
    drawComparePlate,
    drawTitleBlockPlate
  };
})(window);
