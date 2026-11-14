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

  /* reveals */
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

  /* commission sheet */
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

/* scroll motion */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var all = function (sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  };

  /* figures drift against the scroll, each selector with its own travel */
  var PLANES = {".band-fig": 18};
  var planes = [];
  Object.keys(PLANES).forEach(function (sel) {
    all(sel).forEach(function (el) { planes.push([el, PLANES[sel]]); });
  });
  function drift() {
    var vh = window.innerHeight || 800;
    planes.forEach(function (p) {
      var r = p[0].getBoundingClientRect();
      if (r.bottom < -240 || r.top > vh + 240) return;
      var mid = (r.top + r.height / 2 - vh / 2) / vh;
      p[0].style.setProperty("--py", (mid * -p[1]).toFixed(1) + "px");
    });
  }
  var queued = false;
  window.addEventListener("scroll", function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; drift(); });
  }, { passive: true });
  drift();

  /* statistics roll up to the figure printed in the markup */
  var TARGETS = all('.num.big');
  function toAscii(str) {
    var out = "";
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      out += (c >= 0x0660 && c <= 0x0669) ? String.fromCharCode(c - 0x0660 + 48) : str.charAt(i);
    }
    return out;
  }
  function roll(el) {
    var raw = el.textContent;
    if (raw.indexOf("+") > -1) return;
    var hit = raw.match(/[0-9\u0660-\u0669][0-9\u0660-\u0669.,\u066c\u066b]*/);
    if (!hit) return;
    var run = hit[0];
    var a = toAscii(run).replace(/\u066b/g, ".").replace(/\u066c/g, ",");
    var value = parseFloat(a.replace(/,/g, ""));
    var dec = (a.split(".")[1] || "").length;
    var digitsOnly = a.replace(/[^0-9]/g, "");
    if (!isFinite(value) || value === 0 || digitsOnly.length > 7) return;
    var sep = run.indexOf("\u066c") > -1 ? "\u066c" : (a.indexOf(",") > -1 ? "," : "");
    var arabic = /[\u0660-\u0669]/.test(run);
    var at = raw.indexOf(run);
    function show(v) {
      var s = v.toFixed(dec);
      if (sep) {
        var half = s.split(".");
        half[0] = half[0].replace(/\B(?=(\d{3})+(?!\d))/g, sep);
        s = half.join(".");
      }
      if (arabic) s = s.replace(/[0-9]/g, function (d) {
        return String.fromCharCode(d.charCodeAt(0) - 48 + 0x0660);
      }).replace(/\./g, "\u066b");
      el.textContent = raw.slice(0, at) + s + raw.slice(at + run.length);
    }
    var t0 = 0, dur = 900 + (digitsOnly.length * 110), done = false;
    window.setTimeout(function () { done = true; el.textContent = raw; }, dur + 300);
    function step(ts) {
      if (done) return;
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      show(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
      else { done = true; el.textContent = raw; }
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window) {
    var cin = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        roll(e.target);
        cin.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.4 });
    TARGETS.forEach(function (el) { cin.observe(el); });
  }

  /* the bar keeps the section you are reading lit */
  var LINKS = {};
  all('.nav a').forEach(function (a) {
    var href = a.getAttribute("href") || "";
    if (href.charAt(0) === "#" && href.length > 1) LINKS[href.slice(1)] = a;
  });
  var read = Object.keys(LINKS);
  if (read.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        read.forEach(function (id) {
          LINKS[id].classList.toggle("is-current", id === e.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    read.forEach(function (id) {
      var section = document.getElementById(decodeURIComponent(id));
      if (section) spy.observe(section);
    });
  }

  /* hairline under the bar tracks how far the page has gone */
  var root = document.documentElement;
  function track() {
    var left = root.scrollHeight - window.innerHeight;
    root.style.setProperty("--sp", (left > 0 ? Math.min(1, window.scrollY / left) : 0).toFixed(4));
  }
  window.addEventListener("scroll", track, { passive: true });
  window.addEventListener("resize", track);
  track();

})();
