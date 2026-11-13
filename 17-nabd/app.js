/* نبض · nabd.lb — حاسبة مناطق النبض (كارفونن) + حركة الصفحة
   لا شبكات، لا مكتبات، لا تخزين. كل الحسابات محليّة. */
(function () {
  "use strict";

  /* ============================================================
     1) الحاسبة — Karvonen: Target = (HRmax − HRrest) × % + HRrest
        HRmax مقدّرة نظريًا بـ 220 − العمر
     ============================================================ */

  var WEIGHT_KG = 70;            // فرض معلن في النص أسفل الحاسبة
  var WARMUP_MIN = 5;            // إحماء في المنطقة 1
  var COOLDOWN_MIN = 5;          // تهدئة في المنطقة 1
  var TARGET_SESSION_MIN = 45;   // طول الجلسة المرجعي لاشتقاق عدد الجلسات
  var SESSION_MIN = 2, SESSION_MAX = 6;

  var ZONES = [
    { name: "تعافي",      lo: 0.50, hi: 0.60, mets: 3.5,  note: "مشي سريع أو هرولة خفيفة" },
    { name: "حرق دهون",   lo: 0.60, hi: 0.70, mets: 5.0,  note: "هرولة بمحادثة متقطّعة" },
    { name: "كارديو",     lo: 0.70, hi: 0.80, mets: 7.5,  note: "إيقاع متواصل، تنفّس عميق" },
    { name: "حدّ أقصى",   lo: 0.80, hi: 0.90, mets: 10.0, note: "متقطّع قصير، لا يتجاوز 20 دقيقة" }
  ];

  var form   = document.getElementById("hrForm");
  var ageEl  = document.getElementById("age");
  var rhrEl  = document.getElementById("rhr");
  var minsEl = document.getElementById("mins");
  var rowsEl = document.getElementById("zoneRows");

  var outBand     = document.getElementById("outBand");
  var outBandName = document.getElementById("outBandName");
  var outMax      = document.getElementById("outMax");
  var outHrr      = document.getElementById("outHrr");
  var outAvg      = document.getElementById("outAvg");
  var outSession  = document.getElementById("outSession");
  var outInZone   = document.getElementById("outInZone");
  var outSessions = document.getElementById("outSessions");
  var outKcal     = document.getElementById("outKcal");
  var outKcalAll  = document.getElementById("outKcalAll");

  if (!form || !rowsEl) return;

  /* أدوات */
  function clampInt(el, min, max, fallback) {
    var v = parseInt(el.value, 10);
    if (isNaN(v)) v = fallback;
    if (v < min) v = min;
    if (v > max) v = max;
    return v;
  }
  function fmt(n, digits) {
    var v = typeof digits === "number" ? n.toFixed(digits) : String(Math.round(n));
    var parts = v.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }
  function ltr(text) {
    return '<bdi dir="ltr">' + text + "</bdi>";
  }
  function bpm(n) { return fmt(n) + " bpm"; }
  function pctRange(z) {
    return fmt(z.lo * 100) + "–" + fmt(z.hi * 100) + "%";
  }
  function kcalPerMin(z) {
    /* kcal/min = METs × 3.5 × الوزن(كغ) ÷ 200 */
    return (z.mets * 3.5 * WEIGHT_KG) / 200;
  }

  function selectedBand() {
    var checked = form.querySelector('input[name="band"]:checked');
    return checked ? parseInt(checked.value, 10) : 1;
  }

  function compute() {
    var age      = clampInt(ageEl, 14, 85, 32);
    var rhr      = clampInt(rhrEl, 35, 100, 58);
    var weekly   = clampInt(minsEl, 30, 900, 180);
    var band     = selectedBand();

    var hrmax = 220 - age;               // أقصى نبض مقدّر
    var hrr   = hrmax - rhr;             // احتياطي النبض

    var limits = ZONES.map(function (z) {
      return {
        lo: Math.round(hrr * z.lo + rhr),
        hi: Math.round(hrr * z.hi + rhr)
      };
    });

    /* بنية الأسبوع */
    var sessions = Math.round(weekly / TARGET_SESSION_MIN);
    if (sessions < SESSION_MIN) sessions = SESSION_MIN;
    if (sessions > SESSION_MAX) sessions = SESSION_MAX;
    var perSession = Math.round(weekly / sessions);
    var transition = WARMUP_MIN + COOLDOWN_MIN;
    var inZonePerSession = band === 0 ? perSession : Math.max(0, perSession - transition);
    var transPerSession  = band === 0 ? 0 : Math.min(transition, perSession);

    /* دقائق المنطقة داخل كل جلسة */
    var minutesIn = ZONES.map(function (z, i) {
      if (i === band) return inZonePerSession;
      if (i === 0) return transPerSession;
      return 0;
    });

    /* الحرق */
    var bandKcal = kcalPerMin(ZONES[band]) * inZonePerSession * sessions;
    var transKcal = kcalPerMin(ZONES[0]) * transPerSession * sessions;
    var totalKcal = bandKcal + transKcal;

    var avgTarget = Math.round((limits[band].lo + limits[band].hi) / 2);

    return {
      age: age, rhr: rhr, weekly: weekly, band: band,
      hrmax: hrmax, hrr: hrr, limits: limits,
      sessions: sessions, perSession: perSession,
      inZonePerSession: inZonePerSession, transPerSession: transPerSession,
      minutesIn: minutesIn, bandKcal: bandKcal, totalKcal: totalKcal,
      avgTarget: avgTarget
    };
  }

  function render() {
    var r = compute();
    var z = ZONES[r.band], lim = r.limits[r.band];

    outBand.textContent = lim.lo + "–" + lim.hi + " bpm";
    outBandName.textContent = "«" + z.name + "» · " + pctRange(z) +
      " من احتياطي النبض · " + z.note;
    outMax.textContent = bpm(r.hrmax);
    outHrr.textContent = bpm(r.hrr);
    outAvg.textContent = bpm(r.avgTarget);

    outSession.innerHTML = ltr(r.perSession + " min");
    outInZone.textContent = r.inZonePerSession + " min";
    outSessions.textContent = String(r.sessions);
    outKcal.textContent = fmt(r.bandKcal) + " kcal";
    outKcalAll.textContent = fmt(r.totalKcal) + " kcal";

    var html = "";
    ZONES.forEach(function (zone, i) {
      var l = r.limits[i];
      var mins = r.minutesIn[i];
      html +=
        '<tr' + (i === r.band ? ' class="is-hot"' : "") + ">" +
          '<td class="z-name">المنطقة ' + ltr(i + 1) + " · " + zone.name + "</td>" +
          "<td>" + ltr(pctRange(zone)) + "</td>" +
          "<td>" + ltr(String(l.lo)) + "</td>" +
          "<td>" + ltr(String(l.hi)) + "</td>" +
          "<td>" + ltr(mins > 0 ? mins + " min" : "—") + "</td>" +
          "<td>" + ltr(kcalPerMin(zone).toFixed(1) + " kcal") + "</td>" +
        "</tr>";
    });
    rowsEl.innerHTML = html;
  }

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("submit", function (e) { e.preventDefault(); render(); });
  render();

  /* ============================================================
     2) حركة واحدة عند التحميل + كشف واحد عند التمرير
        مع مؤقّت احتياطي يكشف كل شيء بعد 1200ms
     ============================================================ */

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var heroItems = Array.prototype.slice.call(document.querySelectorAll(".hero .reveal"));

  function show(el, delay) {
    if (typeof delay === "number") el.style.setProperty("--d", delay + "ms");
    el.classList.add("is-in");
  }

  /* التسلسل عند التحميل — لا ينتظر أي تمرير */
  if (reduce) {
    Array.prototype.forEach.call(document.querySelectorAll(".reveal"), function (el) { show(el); });
  } else {
    var start = function () {
      heroItems.forEach(function (el, i) { show(el, i * 90); });
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start);
    } else {
      start();
    }
  }

  /* الكشف بالتمرير */
  var rest = Array.prototype.slice.call(document.querySelectorAll(".reveal")).filter(function (el) {
    return heroItems.indexOf(el) === -1;
  });

  if (!reduce && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          show(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    rest.forEach(function (el) { io.observe(el); });
  } else {
    rest.forEach(function (el) { show(el); });
  }

  /* المؤقّت الاحتياطي: كل ما بقي مخفيًا يُكشف قسرًا */
  window.setTimeout(function () {
    Array.prototype.forEach.call(document.querySelectorAll(".reveal:not(.is-in)"), function (el) {
      show(el);
    });
  }, 1200);
})();
