(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- sticky bar ---------- */
  var bar = document.getElementById("topbar");
  var onScroll = function () { bar.classList.toggle("is-stuck", window.scrollY > 8); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- mobile nav ---------- */
  var menuBtn = document.getElementById("menuBtn");
  var mobileNav = document.getElementById("mobileNav");
  menuBtn.addEventListener("click", function () {
    var open = menuBtn.getAttribute("aria-expanded") === "true";
    menuBtn.setAttribute("aria-expanded", String(!open));
    mobileNav.hidden = open;
  });
  mobileNav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") { mobileNav.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); }
  });

  /* ---------- scroll reveal ---------- */
  var items = document.querySelectorAll("[data-reveal]");
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.style.transitionDelay = Math.min(i * 70, 210) + "ms";
        el.classList.add("is-in");
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* =========================================================
     Fit-out budget estimator
     Indicative rates for the Dubai design-and-build market
     (AED per built-up square metre, materials + installation,
     excluding land, MEP base-capacity upgrades and 5% VAT).
     ========================================================= */
  var LEVELS = {
    basic:      { name: "أساسي",   rate: 1850 },
    executive:  { name: "تنفيذي",  rate: 3200 },
    luxury:     { name: "فاخر",    rate: 5400 }
  };
  var UNITS = {
    apartment: { name: "شقة",             mult: 1.00, weeks: 0 },
    villa:     { name: "فيلا",            mult: 1.08, weeks: 3 },
    hotel:     { name: "فندق Boutique",   mult: 1.22, weeks: 8 }
  };
  var ADDONS = {
    lighting: { id: "optLighting", name: "إضاءة ديكورية",      note: "طبقات إضاءة مُخطّطة", rate: 260 },
    joinery:  { id: "optJoinery",  name: "أعمال خشب مخصصة",    note: "خزائن وألواح جدارية", rate: 420 },
    smart:    { id: "optSmart",    name: "أنظمة منزل ذكي",     note: "إضاءة وتكييف وأمان",  rate: 180 }
  };
  var BAND = 0.12;                 /* ±12% */
  var SCALE_MAX = 9000000;         /* gauge ceiling in AED */

  var areaInput = document.getElementById("area");
  var areaRange = document.getElementById("areaRange");
  var unitSel = document.getElementById("unit");
  var segBtns = document.querySelectorAll(".segment__btn");
  var addonBoxes = {};
  Object.keys(ADDONS).forEach(function (k) { addonBoxes[k] = document.getElementById(ADDONS[k].id); });

  var views = {
    total: document.getElementById("oTotal"),
    range: document.getElementById("oRange"),
    lines: document.getElementById("oLines"),
    per:   document.getElementById("oPer"),
    weeks: document.getElementById("oWeeks"),
    barLo: document.getElementById("oBarLo"),
    barHi: document.getElementById("oBarHi"),
    cap:   document.getElementById("oCap"),
    out:   document.getElementById("estOut")
  };

  var fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

  var level = "executive";

  function num(el, fallback) {
    var n = parseFloat(el.value);
    return isFinite(n) && n > 0 ? n : fallback;
  }
  function clampArea(n) {
    return Math.max(20, Math.min(5000, n));
  }

  function render() {
    var area = clampArea(num(areaInput, 420));
    var lv = LEVELS[level];
    var un = UNITS[unitSel.value] || UNITS.villa;

    /* base finishing works (finish level, before unit adjustment) */
    var baseCost = area * lv.rate;
    /* unit-type uplift */
    var unitCost = area * lv.rate * (un.mult - 1);
    /* selected add-ons */
    var addonCost = 0;
    var addonLines = [];
    Object.keys(ADDONS).forEach(function (k) {
      if (addonBoxes[k] && addonBoxes[k].checked) {
        var c = area * ADDONS[k].rate;
        addonCost += c;
        addonLines.push({ name: ADDONS[k].name, note: ADDONS[k].note, amount: c });
      }
    });

    var mid = baseCost + unitCost + addonCost;
    var low = mid * (1 - BAND);
    var high = mid * (1 + BAND);
    var perM2 = lv.rate * un.mult + addonCost / area;

    /* headline */
    views.total.textContent = fmt.format(Math.round(mid));
    views.range.innerHTML = "النطاق <bdi>" + fmt.format(Math.round(low)) + " – " + fmt.format(Math.round(high)) + "</bdi> درهم";

    /* gauge: solid to mid, translucent uncertainty tail to high */
    var midPct = Math.min(mid / SCALE_MAX, 1) * 100;
    var tailPct = Math.min((high - mid) / SCALE_MAX, 1 - midPct / 100) * 100;
    views.barLo.style.inlineSize = midPct + "%";
    views.barHi.style.inlineSize = tailPct + "%";
    views.barHi.style.insetInlineStart = midPct + "%";

    /* per-line breakdown */
    var rows = [];
    rows.push({
      cls: "",
      name: "أعمال التشطيب — مستوى " + lv.name,
      note: fmt.format(lv.rate) + " ÷ م²",
      amount: baseCost
    });
    if (unitCost > 0) {
      rows.push({
        cls: "",
        name: "تعدّل نوع الوحدة — " + un.name,
        note: "×" + un.mult.toFixed(2) + " على التشطيب",
        amount: unitCost
      });
    }
    addonLines.forEach(function (a) {
      rows.push({ cls: "est__line--opt", name: a.name, note: fmt.format(ADDONS[findKey(a.name)].rate) + " ÷ م²", amount: a.amount });
    });

    views.lines.innerHTML = rows.map(function (r) {
      return '<li class="est__line ' + r.cls + '"><span>' + r.name + "<small>" + r.note + "</small></span>" +
             "<strong>" + fmt.format(Math.round(r.amount)) + "</strong></li>";
    }).join("");

    /* per-m² and duration */
    views.per.textContent = fmt.format(Math.round(perM2)) + " ÷m²";
    var wkLo = Math.max(6, Math.round(area / 46) + un.weeks);
    var wkHi = Math.round(wkLo * 1.25);
    views.weeks.textContent = wkLo + "–" + wkHi;

    /* caption */
    var cap;
    if (area <= 40 && Object.keys(ADDONS).every(function (k) { return !addonBoxes[k].checked; })) {
      cap = "حرّك المؤشرات لعرض تقدير أشمل.";
    } else {
      cap = "تقدير إرشادي لسوق دبي يشمل التشطيب والمواد والتركيب؛ لا يشمل أعمال التكييف المركزي الكبرى ولا ضريبة القيمة المضافة <bdi>5%</bdi>. العرض النهائي بعد الكشف وقياس الموقع.";
    }
    views.cap.innerHTML = cap;

    if (!reduce) {
      views.out.animate(
        [{ boxShadow: "var(--sh-3)" }, { boxShadow: "0 0 0 3px rgba(166,90,46,.35), var(--sh-3)" }, { boxShadow: "var(--sh-3)" }],
        { duration: 460, easing: "cubic-bezier(.22,.61,.21,1)" }
      );
    }
  }

  function findKey(name) {
    var key = "";
    Object.keys(ADDONS).forEach(function (k) { if (ADDONS[k].name === name) key = k; });
    return key;
  }

  /* ---------- area sync (input <-> slider) ---------- */
  areaInput.addEventListener("input", function () { areaRange.value = clampArea(num(areaInput, 420)); render(); });
  areaRange.addEventListener("input", function () { areaInput.value = areaRange.value; render(); });
  unitSel.addEventListener("change", render);
  Object.keys(addonBoxes).forEach(function (k) { addonBoxes[k].addEventListener("change", render); });

  /* ---------- finish-level segment ---------- */
  segBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      segBtns.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-checked", String(on));
      });
      level = btn.getAttribute("data-level");
      render();
    });
  });

  render();

  /* ---------- enquiry form (visual only) ---------- */
  var enqForm = document.getElementById("enqForm");
  var enqNote = document.getElementById("enqNote");
  enqForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!enqForm.checkValidity()) { enqForm.reportValidity(); return; }
    enqNote.hidden = false;
    enqForm.querySelector('input[type="text"]').value = "";
  });
})();
