/* ==========================================================================
   app.js — Interactive Controller for Plate 08 (General Profile & ISO 22081 Lab)
   ========================================================================== */

(function (global) {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const M = global.ISO22081;
    const D = global.ISO22081Draw;

    // Tab navigation
    const tabBtns = document.querySelectorAll('.tab-btn');
    const views = {
      profile: document.getElementById('view-profile'),
      compare: document.getElementById('view-compare'),
      titleblock: document.getElementById('view-titleblock'),
      rules: document.getElementById('view-rules')
    };

    let activeTab = 'profile';
    function switchTab(name) {
      activeTab = name;
      tabBtns.forEach((b) => {
        const on = b.dataset.tab === name;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', String(on));
      });
      Object.entries(views).forEach(([k, el]) => {
        el.classList.toggle('active', k === name);
      });
      renderActive();
    }

    tabBtns.forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

    // =========================================================================
    // TAB 1 STATE: PROFILE ⌓ & UZ
    // =========================================================================
    const pState = {
      t: 0.40,
      uz: 0.00,
      datumLocked: true,
      shiftX: 0.04,
      shiftY: 0.04,
      tiltDeg: 0.05,
      waveAmp: 0.05,
      stepErr: 0.04
    };

    const pPresets = {
      'bilateral-pass': { t: 0.40, uz: 0.00, datumLocked: true, shiftX: 0.04, shiftY: 0.04, tiltDeg: 0.05, waveAmp: 0.05, stepErr: 0.04 },
      'uz-stock': { t: 0.40, uz: 0.20, datumLocked: true, shiftX: 0.00, shiftY: 0.00, tiltDeg: 0.00, waveAmp: 0.04, stepErr: 0.30 },
      'datum-shift': { t: 0.40, uz: 0.00, datumLocked: true, shiftX: 0.26, shiftY: 0.14, tiltDeg: 0.12, waveAmp: 0.03, stepErr: 0.02 },
      'step-trap': { t: 0.40, uz: 0.00, datumLocked: true, shiftX: 0.02, shiftY: 0.02, tiltDeg: 0.02, waveAmp: 0.03, stepErr: 0.30 },
      'mold-in': { t: 0.40, uz: -0.10, datumLocked: true, shiftX: 0.00, shiftY: 0.00, tiltDeg: 0.00, waveAmp: 0.04, stepErr: -0.22 }
    };

    const elT = document.getElementById('sl-t');
    const elUZ = document.getElementById('sl-uz');
    const elSX = document.getElementById('sl-sx');
    const elSY = document.getElementById('sl-sy');
    const elTilt = document.getElementById('sl-tilt');
    const elWave = document.getElementById('sl-wave');
    const elStep = document.getElementById('sl-step');
    const btnToggleDatum = document.getElementById('btn-toggle-datum');
    const btnUzIn = document.getElementById('btn-uz-in');
    const btnUzZero = document.getElementById('btn-uz-zero');
    const btnUzOut = document.getElementById('btn-uz-out');

    function syncProfileInputs() {
      elT.value = pState.t.toFixed(2);
      elUZ.value = pState.uz.toFixed(2);
      elSX.value = pState.shiftX.toFixed(2);
      elSY.value = pState.shiftY.toFixed(2);
      elTilt.value = pState.tiltDeg.toFixed(2);
      elWave.value = pState.waveAmp.toFixed(2);
      elStep.value = pState.stepErr.toFixed(2);

      document.getElementById('val-t').textContent = `${pState.t.toFixed(2)} mm`;
      document.getElementById('val-uz').textContent = `${pState.uz >= 0 ? '+' : '−'}${Math.abs(pState.uz).toFixed(2)} mm`;
      document.getElementById('val-sx').textContent = `${pState.shiftX >= 0 ? '+' : ''}${pState.shiftX.toFixed(2)} mm`;
      document.getElementById('val-sy').textContent = `${pState.shiftY >= 0 ? '+' : ''}${pState.shiftY.toFixed(2)} mm`;
      document.getElementById('val-tilt').textContent = `${pState.tiltDeg >= 0 ? '+' : ''}${pState.tiltDeg.toFixed(2)}°`;
      document.getElementById('val-wave').textContent = `${pState.waveAmp.toFixed(2)} mm`;
      document.getElementById('val-step').textContent = `${pState.stepErr >= 0 ? '+' : ''}${pState.stepErr.toFixed(2)} mm`;

      btnToggleDatum.setAttribute('aria-pressed', String(pState.datumLocked));
      document.getElementById('ui-btn-datum-label').textContent = pState.datumLocked ? 'Datum-Locked' : 'Floating (Form)';

      const half = pState.t * 0.5;
      btnUzIn.classList.toggle('active', Math.abs(pState.uz + half) < 0.015);
      btnUzIn.classList.toggle('vermilion', Math.abs(pState.uz + half) < 0.015);
      btnUzZero.classList.toggle('active', Math.abs(pState.uz) < 0.015);
      btnUzZero.classList.toggle('vermilion', Math.abs(pState.uz) < 0.015);
      btnUzOut.classList.toggle('active', Math.abs(pState.uz - half) < 0.015);
      btnUzOut.classList.toggle('vermilion', Math.abs(pState.uz - half) < 0.015);
    }

    function renderProfile() {
      syncProfileInputs();
      const sol = M.solveProfileSpec(pState);

      D.drawProfilePlate(document.getElementById('canvas-profile'), sol);
      D.drawDeviationStrip(document.getElementById('canvas-deviation'), sol);

      // Verdicts
      const vActive = document.getElementById('p-v-active');
      vActive.className = `verdict-cell ${sol.activePass ? 'pass' : 'fail'}`;
      document.getElementById('p-active-val').textContent = sol.activePass ? 'PASS' : 'REJECT';
      document.getElementById('p-active-sub').textContent = sol.activePass
        ? `All ${sol.samples.length} points within ${sol.callout}`
        : `${sol.breachCount} sample points exceed ${sol.datumLocked ? 'datum-locked' : 'form'} profile zone`;

      const vBand = document.getElementById('p-v-band');
      vBand.className = `verdict-cell ${Math.abs(sol.uz) > 1e-6 ? 'info' : ''}`;
      document.getElementById('p-band-val').textContent = `${sol.lowerBound >= 0 ? '+' : ''}${sol.lowerBound.toFixed(2)} .. ${sol.upperBound >= 0 ? '+' : ''}${sol.upperBound.toFixed(2)}`;
      document.getElementById('p-band-sub').textContent = sol.uzMode;

      const vMode = document.getElementById('p-v-mode');
      vMode.className = `verdict-cell ${sol.datumShiftCaught ? 'paradox' : 'info'}`;
      document.getElementById('p-mode-val').textContent = sol.datumShiftCaught
        ? 'SHIFT CAUGHT!'
        : sol.datumLocked
          ? 'FORM+ORI+LOC'
          : 'FORM ONLY';
      document.getElementById('p-mode-sub').textContent = sol.datumShiftCaught
        ? `Form passes (${sol.formSpan.toFixed(2)} ≤ ${sol.t.toFixed(2)}), but datum shift fails!`
        : `Form span ${sol.formSpan.toFixed(3)} mm · Locked peak ±${sol.absPeakLocked.toFixed(3)} mm`;

      // Callout box
      const masterBox = document.getElementById('p-master-box');
      masterBox.className = `envelope-master ${sol.datumLocked ? 'active-m' : 'active-warn'}`;
      document.getElementById('p-fcf-display').textContent = sol.callout;
      document.getElementById('p-explain').textContent = sol.datumLocked
        ? `With Datums | A | B | C |, ISO 22081 locks Form, Orientation, and Location simultaneously around nominal CAD TEDs (${sol.lowerBound.toFixed(2)} to ${sol.upperBound >= 0 ? '+' : ''}${sol.upperBound.toFixed(2)} mm).`
        : `Without datums, ⌓ ${sol.t.toFixed(2)} floats freely to best-fit the manufactured part — controlling Form ONLY. Shift and tilt relative to A/B are ignored!`;

      // Telemetry table
      document.getElementById('p-telemetry').innerHTML = `
        <tr><th>Max Outward Deviation δ_max</th><td class="${sol.maxLocked > sol.upperBound + 1e-9 ? 'tag-fail' : 'tag-pass'}">${sol.maxLocked >= 0 ? '+' : ''}${sol.maxLocked.toFixed(3)} mm</td></tr>
        <tr><th>Max Inward Deviation δ_min</th><td class="${sol.minLocked < sol.lowerBound - 1e-9 ? 'tag-fail' : 'tag-pass'}">${sol.minLocked >= 0 ? '+' : ''}${sol.minLocked.toFixed(3)} mm</td></tr>
        <tr><th>Allowed Signed Band [−t/2+UZ, +t/2+UZ]</th><td class="tag-blue">[${sol.lowerBound.toFixed(2)}, ${sol.upperBound >= 0 ? '+' : ''}${sol.upperBound.toFixed(2)}] mm</td></tr>
        <tr><th>Min Bilateral ⌓ Needed (2 × max|δ|)</th><td>${sol.minBilateralReq.toFixed(3)} mm</td></tr>
        <tr><th>Pure Form Span (Floating ⌓)</th><td class="${sol.passFloating ? 'tag-pass' : 'tag-fail'}">${sol.formSpan.toFixed(3)} mm (${sol.passFloating ? 'PASS' : 'FAIL'})</td></tr>
        <tr><th>Datum-Locked Verdict (| A | B | C |)</th><td class="${sol.passLocked ? 'tag-pass' : 'tag-fail'}">${sol.passLocked ? 'PASS' : 'REJECT'}</td></tr>
      `;
    }

    document.querySelectorAll('#p-presets .preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pre = pPresets[btn.dataset.ppre];
        if (!pre) return;
        Object.assign(pState, pre);
        document.querySelectorAll('#p-presets .preset-btn').forEach((b) => b.classList.toggle('active', b === btn));
        renderProfile();
      });
    });

    function clearProfilePresetActive() {
      document.querySelectorAll('#p-presets .preset-btn').forEach((b) => b.classList.remove('active'));
    }

    elT.addEventListener('input', () => { pState.t = Number(elT.value); clearProfilePresetActive(); renderProfile(); });
    elUZ.addEventListener('input', () => { pState.uz = Number(elUZ.value); clearProfilePresetActive(); renderProfile(); });
    elSX.addEventListener('input', () => { pState.shiftX = Number(elSX.value); clearProfilePresetActive(); renderProfile(); });
    elSY.addEventListener('input', () => { pState.shiftY = Number(elSY.value); clearProfilePresetActive(); renderProfile(); });
    elTilt.addEventListener('input', () => { pState.tiltDeg = Number(elTilt.value); clearProfilePresetActive(); renderProfile(); });
    elWave.addEventListener('input', () => { pState.waveAmp = Number(elWave.value); clearProfilePresetActive(); renderProfile(); });
    elStep.addEventListener('input', () => { pState.stepErr = Number(elStep.value); clearProfilePresetActive(); renderProfile(); });

    btnToggleDatum.addEventListener('click', () => { pState.datumLocked = !pState.datumLocked; renderProfile(); });
    btnUzIn.addEventListener('click', () => { pState.uz = -(pState.t * 0.5); clearProfilePresetActive(); renderProfile(); });
    btnUzZero.addEventListener('click', () => { pState.uz = 0; clearProfilePresetActive(); renderProfile(); });
    btnUzOut.addEventListener('click', () => { pState.uz = pState.t * 0.5; clearProfilePresetActive(); renderProfile(); });

    // =========================================================================
    // TAB 2 STATE: ISO 22081 VS. ISO 2768-2 AUDIT
    // =========================================================================
    const cState = {
      iso2768Class: 'K',
      tProfile: 0.40,
      tSize: 0.20,
      stepShift: 0.26,
      freeformBulge: 0.34,
      wallTiltErr: 0.24,
      boreSizeErr: 0.14,
      viewMode: '22081'
    };

    const btnMode2768 = document.getElementById('btn-mode-2768');
    const btnMode22081 = document.getElementById('btn-mode-22081');

    function renderCompare() {
      document.getElementById('val-ct').textContent = `${cState.tProfile.toFixed(2)} mm`;
      document.getElementById('val-cs').textContent = `±${cState.tSize.toFixed(2)} mm`;
      document.getElementById('val-cstep').textContent = `${cState.stepShift.toFixed(2)} mm`;
      document.getElementById('val-cfree').textContent = `${cState.freeformBulge.toFixed(2)} mm`;
      document.getElementById('val-cwall').textContent = `${cState.wallTiltErr.toFixed(2)} mm`;
      document.getElementById('val-cbore').textContent = `${cState.boreSizeErr.toFixed(2)} mm`;

      const audit = M.auditLegacyVs22081(cState);
      D.drawComparePlate(document.getElementById('canvas-compare'), audit, cState.viewMode);

      document.getElementById('c-legacy-val').textContent = `${audit.legacyBlindspots} BLINDSPOTS`;
      document.getElementById('c-modern-val').textContent = `${audit.modernAmbiguities} AMBIGUITIES`;
      document.getElementById('c-pass-val').textContent = `${audit.modernPassCount} / ${audit.features.length} PASS`;

      const pillCls = (st) =>
        st === 'PASS' ? 'pass' : st === 'FAIL' || st === 'UNCONTROLLED' ? 'fail' : st === 'AMBIGUOUS' ? 'warn' : 'info';

      document.getElementById('c-audit-list').innerHTML = audit.features
        .map((f) => {
          const activeStatus = cState.viewMode === '2768' ? f.legacyStatus : f.modernStatus;
          const activeDetail = cState.viewMode === '2768' ? f.legacyDetail : f.modernDetail;
          return `
            <div class="audit-row">
              <div class="audit-row-top">
                <span class="audit-name">${f.name}</span>
                <span class="audit-pill ${pillCls(activeStatus)}">${activeStatus}</span>
              </div>
              <div class="audit-detail">${activeDetail}</div>
            </div>
          `;
        })
        .join('');
    }

    btnMode2768.addEventListener('click', () => {
      cState.viewMode = '2768';
      btnMode2768.classList.add('active', 'vermilion');
      btnMode22081.classList.remove('active', 'vermilion');
      renderCompare();
    });
    btnMode22081.addEventListener('click', () => {
      cState.viewMode = '22081';
      btnMode22081.classList.add('active', 'vermilion');
      btnMode2768.classList.remove('active', 'vermilion');
      renderCompare();
    });

    document.querySelectorAll('#c-class-btns .preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        cState.iso2768Class = btn.dataset.cls;
        document.querySelectorAll('#c-class-btns .preset-btn').forEach((b) => b.classList.toggle('active', b === btn));
        renderCompare();
      });
    });

    ['sl-ct', 'sl-cs', 'sl-cstep', 'sl-cfree', 'sl-cwall', 'sl-cbore'].forEach((id) => {
      const el = document.getElementById(id);
      el.addEventListener('input', () => {
        if (id === 'sl-ct') cState.tProfile = Number(el.value);
        if (id === 'sl-cs') cState.tSize = Number(el.value);
        if (id === 'sl-cstep') cState.stepShift = Number(el.value);
        if (id === 'sl-cfree') cState.freeformBulge = Number(el.value);
        if (id === 'sl-cwall') cState.wallTiltErr = Number(el.value);
        if (id === 'sl-cbore') cState.boreSizeErr = Number(el.value);
        renderCompare();
      });
    });

    // =========================================================================
    // TAB 3 STATE: ISO 22081 TITLE-BLOCK BUILDER
    // =========================================================================
    const tbState = {
      tProfile: 0.40,
      tSize: 0.20,
      hasDatums: true,
      datumStr: 'A | B | C',
      hasCadTed: true,
      hasGeneralSize: true,
      useUZ: false,
      uzVal: 0.10,
      cites2768: false
    };

    function renderTitleBlock() {
      document.getElementById('val-tbt').textContent = `${tbState.tProfile.toFixed(2)} mm`;
      document.getElementById('val-tbs').textContent = `±${tbState.tSize.toFixed(2)} mm`;
      document.getElementById('val-tbuz').textContent = `${tbState.uzVal >= 0 ? '+' : '−'}${Math.abs(tbState.uzVal).toFixed(2)} mm`;

      const res = M.validateTitleBlock(tbState);
      D.drawTitleBlockPlate(document.getElementById('canvas-titleblock'), tbState, res);

      const vStatus = document.getElementById('tb-v-status');
      vStatus.className = `verdict-cell ${res.valid ? 'pass' : res.errorCount > 0 ? 'fail' : 'paradox'}`;
      document.getElementById('tb-status-val').textContent = res.status;
      document.getElementById('tb-status-sub').textContent = res.valid
        ? 'Ready for release & CMM programming'
        : `${res.errorCount} error(s), ${res.warnCount} warning(s) detected`;

      document.getElementById('tb-fcf-val').textContent = res.fcfLine;
      const totalIssues = res.errorCount + res.warnCount;
      const vIssues = document.getElementById('tb-v-issues');
      vIssues.className = `verdict-cell ${totalIssues === 0 ? 'pass' : res.errorCount > 0 ? 'fail' : 'paradox'}`;
      document.getElementById('tb-issues-val').textContent = totalIssues === 0 ? '0 WARNINGS' : `${totalIssues} ISSUE${totalIssues > 1 ? 'S' : ''}`;

      const stack = document.getElementById('tb-issue-stack');
      if (res.issues.length === 0) {
        stack.innerHTML = `<div class="issue-item ok"><strong>✓ Fully ISO 22081 Compliant:</strong> Explicit datum system, CAD TED geometry, and general size are cleanly separated with zero legacy ISO 2768-2 conflicts.</div>`;
      } else {
        stack.innerHTML = res.issues
          .map((it) => `<div class="issue-item ${it.level}"><strong>${it.level === 'error' ? '✗ ERROR:' : '⚠ WARNING:'}</strong> ${it.msg}</div>`)
          .join('');
      }
    }

    document.getElementById('sl-tbt').addEventListener('input', (e) => { tbState.tProfile = Number(e.target.value); renderTitleBlock(); });
    document.getElementById('sl-tbs').addEventListener('input', (e) => { tbState.tSize = Number(e.target.value); renderTitleBlock(); });
    document.getElementById('sl-tbuz').addEventListener('input', (e) => { tbState.uzVal = Number(e.target.value); renderTitleBlock(); });
    document.getElementById('chk-tb-datums').addEventListener('change', (e) => { tbState.hasDatums = e.target.checked; renderTitleBlock(); });
    document.getElementById('chk-tb-cad').addEventListener('change', (e) => { tbState.hasCadTed = e.target.checked; renderTitleBlock(); });
    document.getElementById('chk-tb-size').addEventListener('change', (e) => { tbState.hasGeneralSize = e.target.checked; renderTitleBlock(); });
    document.getElementById('chk-tb-uz').addEventListener('change', (e) => { tbState.useUZ = e.target.checked; renderTitleBlock(); });
    document.getElementById('chk-tb-2768').addEventListener('change', (e) => { tbState.cites2768 = e.target.checked; renderTitleBlock(); });

    // =========================================================================
    // GUIDED TOUR (4 STOPS)
    // =========================================================================
    const TOUR = [
      {
        tab: 'profile',
        title: 'General Surface Profile ⌓ Locks Form, Orientation & Location Together',
        body: 'In Plate I, one callout | ⌓ | 0.40 | A | B | C | wraps the entire nominal CAD contour in a uniform ±0.20 mm skin. Click "Datum Shift Caught" or toggle Datum-Locked vs. Floating to see why referencing Datums A|B|C is essential.',
        action: () => { Object.assign(pState, pPresets['datum-shift']); renderProfile(); }
      },
      {
        tab: 'profile',
        title: 'Unequal & Unilateral Stock Allowances via UZ Modifier',
        body: 'Casting or finishing stock? Click "UZ +t/2" (or "Unilateral Stock") to shift the entire 0.40 mm zone outside nominal [0.00 .. +0.40 mm] without changing total tolerance width.',
        action: () => { Object.assign(pState, pPresets['uz-stock']); renderProfile(); }
      },
      {
        tab: 'compare',
        title: 'Why ISO 2768-2 Was Withdrawn in 2021',
        body: 'Toggle between "View ISO 2768-2 (Legacy)" and "View ISO 22081 (Active)" in Plate II. Watch how legacy 2768-2 leaves freeform surfaces uncontrolled and step heights ambiguous — while ISO 22081 resolves every single feature cleanly.',
        action: () => { cState.viewMode = '2768'; btnMode2768.click(); }
      },
      {
        tab: 'titleblock',
        title: 'Build a Release-Ready ISO 22081 Title Block',
        body: 'Use Plate III to verify your drawing title block. Try checking "Also leave legacy ISO 2768-mK" or unchecking Datums to see the exact compliance traps caught during supplier audits.',
        action: () => { renderTitleBlock(); }
      }
    ];

    let tourIdx = -1;
    const tourBanner = document.getElementById('tour-banner');
    function showTourStop(i) {
      tourIdx = (i + TOUR.length) % TOUR.length;
      const stop = TOUR[tourIdx];
      tourBanner.classList.remove('hidden');
      document.getElementById('tour-step-badge').textContent = `Stop ${tourIdx + 1} / ${TOUR.length}`;
      document.getElementById('tour-title').textContent = stop.title;
      document.getElementById('tour-body').textContent = stop.body;
      switchTab(stop.tab);
      if (stop.action) stop.action();
    }

    document.getElementById('btn-tour').addEventListener('click', () => showTourStop(0));
    document.getElementById('btn-tour-prev').addEventListener('click', () => showTourStop(tourIdx - 1));
    document.getElementById('btn-tour-next').addEventListener('click', () => showTourStop(tourIdx + 1));
    document.getElementById('btn-tour-close').addEventListener('click', () => tourBanner.classList.add('hidden'));

    function renderActive() {
      if (activeTab === 'profile') renderProfile();
      else if (activeTab === 'compare') renderCompare();
      else if (activeTab === 'titleblock') renderTitleBlock();
    }

    global.addEventListener('resize', renderActive);
    renderProfile();
  });
})(window);
