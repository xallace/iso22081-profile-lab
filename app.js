/* ==========================================================================
   app.js — Interactive Controller for TD-01 (General Profile & ISO 22081 Lab)
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
      'uz-stock': { t: 0.40, uz: 0.20, datumLocked: true, shiftX: 0.00, shiftY: 0.00, tiltDeg: 0.00, waveAmp: 0.00, stepErr: 0.30 },
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
      document.getElementById('ui-btn-datum-label').textContent = pState.datumLocked ? 'Datum-Locked' : 'Floating (Best Fit)';

      const half = pState.t * 0.5;
      const near = (a, b) => Math.abs(a - b) < 0.005;
      btnUzIn.classList.toggle('active', near(pState.uz, -half));
      btnUzIn.classList.toggle('vermilion', near(pState.uz, -half));
      btnUzZero.classList.toggle('active', near(pState.uz, 0));
      btnUzZero.classList.toggle('vermilion', near(pState.uz, 0));
      btnUzOut.classList.toggle('active', near(pState.uz, half));
      btnUzOut.classList.toggle('vermilion', near(pState.uz, half));
    }

    // Signed value with a typographic minus, "0.00" without sign
    function signed(v, d = 2) {
      const r = Number(v.toFixed(d));
      return r === 0 ? (0).toFixed(d) : `${r > 0 ? '+' : '−'}${Math.abs(r).toFixed(d)}`;
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
        : `${sol.breachCount} of ${sol.samples.length} points outside the ${sol.datumLocked ? 'datum-locked' : 'best-fit'} zone`;

      const vBand = document.getElementById('p-v-band');
      vBand.className = `verdict-cell ${Math.abs(sol.uz) > 1e-6 ? 'info' : ''}`;
      document.getElementById('p-band-val').textContent = `${signed(sol.lowerBound)} .. ${signed(sol.upperBound)}`;
      document.getElementById('p-band-sub').textContent = sol.uzMode;

      const fit = sol.floatFit;
      const vMode = document.getElementById('p-v-mode');
      vMode.className = `verdict-cell ${sol.datumShiftCaught ? 'paradox' : 'info'}`;
      document.getElementById('p-mode-val').textContent = sol.datumShiftCaught
        ? sol.datumLocked ? 'DATUMS CATCH IT' : 'BEST FIT HIDES IT'
        : sol.datumLocked
          ? 'FORM+ORI+LOC'
          : 'RIGID BEST FIT';
      document.getElementById('p-mode-sub').textContent = sol.datumShiftCaught
        ? `Best fit needs t ≥ ${sol.minFloatingReq.toFixed(2)} and passes; locked to A|B|C the part ${sol.datumLocked ? 'fails' : 'would fail'}`
        : sol.datumLocked
          ? `Locked peak ±${sol.absPeakLocked.toFixed(3)} mm · best fit would need t ≥ ${sol.minFloatingReq.toFixed(3)}`
          : `Fit Δx ${signed(fit.dx, 3)} · Δy ${signed(fit.dy, 3)} mm · rot ${signed(fit.rotDeg, 3)}°`;

      // Callout box
      const masterBox = document.getElementById('p-master-box');
      masterBox.className = `envelope-master ${sol.datumLocked ? 'active-m' : 'active-warn'}`;
      document.getElementById('p-fcf-display').textContent = sol.callout;
      document.getElementById('p-explain').textContent = sol.datumLocked
        ? `With datums | A | B | C | the zone (${signed(sol.lowerBound)} .. ${signed(sol.upperBound)} mm) is fixed to the datum frame: form, orientation and location of every face are checked against the CAD TEDs. Faces A and B define the frame, so only faces displaced relative to them deviate. (C is normal to this view.)`
        : `Without datums the ⌓ ${sol.t.toFixed(2)} zone may be moved as a rigid body (translation + rotation) to best fit the part. All faces still share one zone, so distances such as the 80 mm width stay controlled, but location and orientation relative to A and B do not.`;

      // Telemetry table
      const tag = (ok) => (ok ? 'tag-pass' : 'tag-fail');
      const maxA = sol.datumLocked ? sol.maxLocked : sol.maxFloat;
      const minA = sol.datumLocked ? sol.minLocked : sol.minFloat;
      const modeTag = sol.datumLocked ? 'locked' : 'after best fit';
      document.getElementById('p-telemetry').innerHTML = `
        <tr><th>Max Outward Deviation δ_max (${modeTag})</th><td class="${tag(maxA <= sol.upperBound + 1e-9)}">${signed(maxA, 3)} mm</td></tr>
        <tr><th>Max Inward Deviation δ_min (${modeTag})</th><td class="${tag(minA >= sol.lowerBound - 1e-9)}">${signed(minA, 3)} mm</td></tr>
        <tr><th>Allowed Signed Band [UZ − t/2, UZ + t/2]</th><td class="tag-blue">[${signed(sol.lowerBound)}, ${signed(sol.upperBound)}] mm</td></tr>
        <tr><th>Min Bilateral ⌓ Needed, Locked (2 × max|δ|)</th><td>${sol.minBilateralReq.toFixed(3)} mm</td></tr>
        <tr><th>Min ⌓ Needed, Floating (best fit, this UZ)</th><td>${sol.minFloatingReq.toFixed(3)} mm</td></tr>
        <tr><th>Best-Fit Move (Δx, Δy, rotation)</th><td>${signed(fit.dx, 3)}, ${signed(fit.dy, 3)} mm, ${signed(fit.rotDeg, 3)}°</td></tr>
        <tr><th>Floating Verdict (| ⌓ | t |)</th><td class="${tag(sol.passFloating)}">${sol.passFloating ? 'PASS' : 'REJECT'}</td></tr>
        <tr><th>Datum-Locked Verdict (| A | B | C |)</th><td class="${tag(sol.passLocked)}">${sol.passLocked ? 'PASS' : 'REJECT'}</td></tr>
      `;
    }

    function applyProfilePreset(name) {
      const pre = pPresets[name];
      if (!pre) return;
      Object.assign(pState, pre);
      document.querySelectorAll('#p-presets .preset-btn').forEach((b) => b.classList.toggle('active', b.dataset.ppre === name));
      renderProfile();
    }

    document.querySelectorAll('#p-presets .preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => applyProfilePreset(btn.dataset.ppre));
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

    btnToggleDatum.addEventListener('click', () => { pState.datumLocked = !pState.datumLocked; clearProfilePresetActive(); renderProfile(); });
    // ±t/2 rounded to the UZ slider step (0.01 mm) so state and slider agree
    const halfT = () => Math.round(pState.t * 50) / 100;
    btnUzIn.addEventListener('click', () => { pState.uz = -halfT(); clearProfilePresetActive(); renderProfile(); });
    btnUzZero.addEventListener('click', () => { pState.uz = 0; clearProfilePresetActive(); renderProfile(); });
    btnUzOut.addEventListener('click', () => { pState.uz = halfT(); clearProfilePresetActive(); renderProfile(); });

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

      const nF = audit.features.length;
      document.getElementById('c-legacy-val').textContent = `${nF - audit.legacyGaps} / ${nF} DEFINED`;
      document.getElementById('c-modern-val').textContent = `${audit.modernDefined} / ${nF} DEFINED`;
      document.getElementById('c-pass-val').textContent = `${audit.modernPassCount} / ${nF} IN TOL.`;

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
        ? 'All checklist items declared'
        : `${res.errorCount} conflict(s), ${res.warnCount} missing item(s)`;

      document.getElementById('tb-fcf-val').textContent = res.fcfLine;
      const totalIssues = res.errorCount + res.warnCount;
      const vIssues = document.getElementById('tb-v-issues');
      vIssues.className = `verdict-cell ${totalIssues === 0 ? 'pass' : res.errorCount > 0 ? 'fail' : 'paradox'}`;
      document.getElementById('tb-issues-val').textContent = totalIssues === 0 ? '0 ISSUES' : `${totalIssues} ISSUE${totalIssues > 1 ? 'S' : ''}`;
      document.getElementById('tb-issues-sub').textContent = res.noteCount > 0
        ? `${res.noteCount} unverified point${res.noteCount > 1 ? 's' : ''} noted`
        : 'Lab checklist, not a conformity check';

      const label = { error: '✗ CONFLICT:', warn: '⚠ MISSING:', note: 'ℹ NOTE:' };
      const head = totalIssues === 0
        ? `<div class="issue-item ok"><strong>✓ Checklist complete:</strong> datum system, CAD/TED source and general size are declared; no ISO 2768-2 class is cited.</div>`
        : '';
      document.getElementById('tb-issue-stack').innerHTML = head + res.issues
        .map((it) => `<div class="issue-item ${it.level}"><strong>${label[it.level]}</strong> ${it.msg}</div>`)
        .join('');
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
        body: 'One callout | ⌓ | 0.40 | A | B | C | puts the whole CAD contour in a ±0.20 mm zone fixed to the datums. Here the upper faces sit 0.26 mm off relative to datum faces A and B (second setup). Toggle Datum-Locked vs. Floating: the best-fit zone absorbs part of the offset and accepts the part, the datum-locked zone rejects it.',
        action: () => { applyProfilePreset('datum-shift'); }
      },
      {
        tab: 'profile',
        title: 'Unequal & Unilateral Zones via UZ (ISO 1101)',
        body: 'Casting or finishing stock? "Unilateral Stock" uses UZ +0.20 to move the 0.40 mm zone fully outside the nominal surface (0.00 .. +0.40 mm) without changing its width. Any face that dips below nominal now fails.',
        action: () => { applyProfilePreset('uz-stock'); }
      },
      {
        tab: 'compare',
        title: 'What ISO 2768-2 Left Open',
        body: 'Toggle "View ISO 2768-2 (Legacy)" and "View ISO 22081 (Active)". Under ISO 2768 the free-form shoulder has no general tolerance and the 16 mm step gets an ambiguous ± value; under ISO 22081 each feature has a stated requirement.',
        action: () => { btnMode2768.click(); }
      },
      {
        tab: 'titleblock',
        title: 'Build an ISO 22081 Title Block',
        body: 'Check "Also leave ISO 2768-mK" or uncheck the datum system to see what the checklist flags. It is a lab checklist, not a conformity check against the standard.',
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
