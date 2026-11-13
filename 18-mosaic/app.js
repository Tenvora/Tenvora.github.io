/* موزاييك — mosaic.lb
   1) load choreography + scroll reveal (with a hard fallback so the
      first screen can never stay blank)
   2) the commission sheet calculator — real workshop maths, no network.
*/
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------
     REVEALS
     ------------------------------------------------------------ */
  var targets = [];

  function collect() {
    var out = [];
    var n = document.querySelectorAll('[data-reveal], [class*="load-"]');
    for (var i = 0; i < n.length; i++) out.push(n[i]);
    return out;
  }

  function show(el) {
    if (el.classList.contains('is-in')) return;
    el.classList.add('is-in');
  }

  function showAll() {
    for (var i = 0; i < targets.length; i++) show(targets[i]);
  }

  /* Anything at or near the current viewport must be visible, full stop. */
  function showNearViewport() {
    var limit = (window.innerHeight || 800) * 1.25;
    for (var i = 0; i < targets.length; i++) {
      var el = targets[i];
      if (el.classList.contains('is-in')) continue;
      var r = el.getBoundingClientRect();
      if (r.top < limit) show(el);
    }
  }

  function initReveals() {
    targets = collect();

    if (reduce || !('IntersectionObserver' in window)) {
      for (var i = 0; i < targets.length; i++) {
        targets[i].classList.add('is-in');
        targets[i].style.transition = 'none';
      }
      return;
    }

    /* one load choreography: hero sequence, immediately on first frame */
    requestAnimationFrame(function () {
      var seq = document.querySelectorAll('[class*="load-"]');
      for (var i = 0; i < seq.length; i++) show(seq[i]);
    });

    /* one scroll reveal, only for what is below the fold */
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          show(entries[i].target);
          io.unobserve(entries[i].target);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    for (var j = 0; j < targets.length; j++) io.observe(targets[j]);

    /* belt and braces: never wait on a scroll trigger for the first screen */
    setTimeout(showNearViewport, 1200);
    setTimeout(showAll, 3000);
    window.addEventListener('pagehide', showAll);
  }

  /* ------------------------------------------------------------
     COMMISSION SHEET
     ------------------------------------------------------------ */
  var PER_M2 = {            // laid pieces per m², grout joint included
    '2x2': 1736,            // module 2.0 + 0.4 joint = 2.4 cm -> 10000/5.76
    '4x4': 494,             // module 4.0 + 0.5 joint = 4.5 cm -> 10000/20.25
    '10x10': 89             // module 10.0 + 0.6 joint = 10.6 cm -> 10000/112.36
  };
  var JOT = { '2x2': 4, '4x4': 5, '10x10': 6 };              // joint, mm
  var CUT_RATE = { '2x2': 420, '4x4': 150, '10x10': 40 };    // pieces/hour at factor 1
  var LAY_H = { '2x2': 14, '4x4': 6, '10x10': 2.5 };         // hours per m² at factor 1
  var SIDE = { '2x2': 2, '4x4': 4, '10x10': 10 };            // tessera edge, cm

  var MAT_RATE = { clay: 52, marble: 118, glass: 165 };      // $ per m² of tile
  var WASTE = { clay: 0.12, marble: 0.18, glass: 0.10 };     // breakage allowance
  var MAT_NAME = { clay: 'طين مزجج', marble: 'رخام', glass: 'زجاج مطعّم' };

  var CUT_F = { star: 1.35, squares: 1.15, calligraphy: 1.60, vegetal: 1.45 };
  var LAY_F = { star: 1.25, squares: 1.10, calligraphy: 1.45, vegetal: 1.35 };

  var CUT_WAGE = 12;      // $/hour — master cutter (مقطّ)
  var LAY_WAGE = 9;       // $/hour — layer (مفرش)
  var GROUT_RATE = 18;    // $/m² — mortar, lime putty and tinted grout
  var DESIGN_FEE = 85;    // $ per panel — setting-out drawing
  var CALLI_PER_M2 = 40;  // $ per m² — letterform layout on top of the drawing
  var RESTO_LABOUR = 0.35;
  var RESTO_SURVEY = 120; // $ — documenting and dismantling the failed area
  var DAY_HOURS = 6;      // productive cutting/laying hours per working day

  var MAX_AREA = 4;       // m² — the largest panel one bench can take
  var MIN_DIM = 10, MAX_DIM = 400;
  var LBP = 89500;        // approx. market rate, LBP per USD

  var form = document.getElementById('sheet');
  var out = {};
  var outs = document.querySelectorAll('[data-out]');
  for (var k = 0; k < outs.length; k++) out[outs[k].getAttribute('data-out')] = outs[k];
  var warn = document.getElementById('warn');
  var restoRow = document.querySelector('[data-row="resto"]');

  function money(v) { return nf(v, 2); }
  function nf(v, d) {
    return Number(v).toLocaleString('en-US', {
      minimumFractionDigits: d, maximumFractionDigits: d
    });
  }
  function int(v) { return Math.round(v).toLocaleString('en-US'); }
  function put(key, val) { if (out[key]) out[key].textContent = val; }

  function val(name) {
    var f = form.querySelector('input[name="' + name + '"]:checked');
    return f ? f.value : '';
  }

  function compute() {
    if (!form) return;

    var pattern = val('pattern') || 'star';
    var material = val('material') || 'clay';
    var tessera = val('tessera') || '2x2';
    var kind = val('kind') || 'new';

    var rawW = parseFloat(document.getElementById('w').value);
    var rawH = parseFloat(document.getElementById('h').value);
    if (!isFinite(rawW) || rawW < MIN_DIM) rawW = MIN_DIM;
    if (!isFinite(rawH) || rawH < MIN_DIM) rawH = MIN_DIM;
    if (rawW > MAX_DIM) rawW = MAX_DIM;
    if (rawH > MAX_DIM) rawH = MAX_DIM;

    var rawArea = (rawW * rawH) / 10000;
    var over = rawArea > MAX_AREA;
    var area = over ? MAX_AREA : rawArea;

    if (warn) {
      warn.hidden = !over;
      if (over) {
        warn.textContent =
          'القياس المُدخل ' + nf(rawArea, 2) + ' م² يتجاوز حدَّ اللوحة الواحدة ' +
          nf(MAX_AREA, 2) + ' م². الحسابُ موقوفٌ على ' + nf(MAX_AREA, 2) +
          ' م²؛ ما زاد يُنفَّذ كلوحاتٍ منفصلة بفواصل تحكُّم.';
      }
    }

    /* --- pieces --- */
    var perM2 = PER_M2[tessera];
    var laid = area * perM2;
    var waste = WASTE[material];
    var pcs = Math.ceil(laid * (1 + waste));

    /* --- material --- */
    var matCost = MAT_RATE[material] * area * (1 + waste);

    /* --- mortar & grout --- */
    var groutCost = GROUT_RATE * area;

    /* --- cutting labour --- */
    var cutHours = (pcs * CUT_F[pattern]) / CUT_RATE[tessera];
    var cutCost = cutHours * CUT_WAGE;

    /* --- laying labour --- */
    var layHours = area * LAY_H[tessera] * LAY_F[pattern];
    var layCost = layHours * LAY_WAGE;

    /* --- design --- */
    var design = DESIGN_FEE + (pattern === 'calligraphy' ? CALLI_PER_M2 * area : 0);

    var sub = matCost + groutCost + cutCost + layCost;
    var resto = 0;
    if (kind === 'restoration') resto = (cutCost + layCost) * RESTO_LABOUR + RESTO_SURVEY;

    var total = sub + design + resto;
    var unit = total / area;
    var days = Math.ceil((cutHours + layHours) / DAY_HOURS) + (kind === 'restoration' ? 9 : 7);

    /* --- write the sheet ---
       Equation cells are Latin/digit-only: an Arabic word inside a
       dir="ltr" isolate reorders itself and mangles the maths. */
    put('area-eq', nf(rawW, 0) + ' × ' + nf(rawH, 0) + ' ÷ 10,000' +
      (over ? ' → ' + nf(MAX_AREA, 2) + ' max' : ''));
    put('area', nf(area, 2));

    put('pcs-eq', nf(area, 2) + ' × ' + int(perM2) + ' × ' + nf(1 + waste, 2));
    put('pcs', int(pcs));

    put('mat-eq', '$' + nf(MAT_RATE[material], 0) + ' × ' + nf(area, 2) +
      ' × ' + nf(1 + waste, 2));
    put('mat', '$' + money(matCost));

    put('grout-eq', '$' + nf(GROUT_RATE, 0) + ' × ' + nf(area, 2));
    put('grout', '$' + money(groutCost));

    put('cut-eq', int(pcs) + ' × ' + nf(CUT_F[pattern], 2) + ' ÷ ' +
      int(CUT_RATE[tessera]) + ' × $' + CUT_WAGE);
    put('cut', '$' + money(cutCost));

    put('lay-eq', nf(area, 2) + ' × ' + nf(LAY_H[tessera], 1) + ' × ' +
      nf(LAY_F[pattern], 2) + ' × $' + LAY_WAGE);
    put('lay', '$' + money(layCost));

    put('subnote', nf(cutHours, 2) + ' h + ' + nf(layHours, 2) +
      ' h + material + mortar');
    put('sub', '$' + money(sub));

    put('des-eq', pattern === 'calligraphy'
      ? '$' + nf(DESIGN_FEE, 0) + ' + $' + CALLI_PER_M2 + ' × ' + nf(area, 2)
      : '$' + nf(DESIGN_FEE, 0));
    put('des', '$' + money(design));

    if (restoRow) restoRow.hidden = kind !== 'restoration';
    put('resto-eq', kind === 'restoration'
      ? '(' + money(cutCost) + ' + ' + money(layCost) + ') × ' +
        nf(RESTO_LABOUR, 2) + ' + $' + RESTO_SURVEY
      : '—');
    put('resto', kind === 'restoration' ? '$' + money(resto) : '—');

    put('total', '$' + money(total));
    put('unit', '$' + money(unit));
    put('days', int(days));
    put('rate', int(LBP));
    put('lbp', int(total * LBP));
  }

  /* ------------------------------------------------------------ */
  function init() {
    initReveals();
    if (form) {
      form.addEventListener('input', compute);
      form.addEventListener('change', compute);
      compute();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
