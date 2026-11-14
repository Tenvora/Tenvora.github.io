(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* sticky bar */
  var bar = document.getElementById("topbar");
  function onScroll() { bar.classList.toggle("is-stuck", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* mobile nav */
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

  /* scroll reveal */
  var items = document.querySelectorAll("[data-reveal]");
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        entry.target.style.transitionDelay = Math.min(i * 70, 210) + "ms";
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* حاسبة تكلفة البناء — أسعار إرشادية لعام 2026 بالريال السعودي
   السعر النهائي = (سعر المتر المرجعي + البدلات) × المساحة المبنية
   + بدل تسريع الجدول إن طُلبت مدة أقصر من الأساسية */
  var RATE = {                                  /* ريال / م² مبنية */
    res: { std: 1850, plus: 2450, lux: 3200 },
    com: { std: 2100, plus: 2750, lux: 3600 },
    wh:  { std: 1150, plus: 1450, lux: 1850 }
  };
  var ADDER = { basement: 255, lifts: 120, hvac: 165 };   /* ريال / م² */
  var PROD  = { res: 1400, com: 1700, wh: 5200 };         /* م² مبنية في الشهر */
  var SETUP = { res: 6, com: 8, wh: 4 };                  /* أشهر التجهيز والاعتمادات */
  var ENG   = { res: 1.0, com: 1.2, wh: 0.7 };            /* مهندس لكل 5,000 م² */
  var CREW  = { res: 0.05, com: 0.042, wh: 0.02 };        /* عامل لكل م² عند الذروة */
  var BAND = 0.15;            /* نطاق التقدير ±15% */
  var ACCEL = 0.45;           /* حساسية بدل التسريع */
  var ACCEL_CAP = 0.22;       /* سقف بدل التسريع 22% */
  var AREA_MIN = 200, AREA_MAX = 250000, MONTH_MIN = 4, MONTH_MAX = 72;

  var state = { type: "res", fin: "plus" };

  var areaIn = document.getElementById("area");
  var areaRange = document.getElementById("areaRange");
  var monthsIn = document.getElementById("months");
  var optBasement = document.getElementById("optBasement");
  var optLifts = document.getElementById("optLifts");
  var optHvac = document.getElementById("optHvac");
  var out = document.getElementById("estOut");
  var durHint = document.querySelector("#durHint span");

  var v = {
    unitBase: document.getElementById("oUnitBase"),
    add: document.getElementById("oAdd"),
    rate: document.getElementById("oRate"),
    area: document.getElementById("oArea"),
    prem: document.getElementById("oPrem"),
    total: document.getElementById("oTotal"),
    range: document.getElementById("oRange"),
    eng: document.getElementById("oEng"),
    crew: document.getElementById("oCrew"),
    baseMonths: document.getElementById("oBaseMonths"),
    reqMonths: document.getElementById("oReq"),
    reqNote: document.getElementById("oReqNote")
  };

  var fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  var fmt1 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function readNumber(el, min, max, fallback) {
    var n = parseFloat(el.value);
    if (!isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }
  function thousands(n) { return Math.round(n / 1000) * 1000; }

  function compute() {
    var area = readNumber(areaIn, AREA_MIN, AREA_MAX, AREA_MIN);
    var reqMonths = Math.round(readNumber(monthsIn, MONTH_MIN, MONTH_MAX, MONTH_MIN));

    var addSum = 0;
    if (optBasement.checked) addSum += ADDER.basement;
    if (optLifts.checked) addSum += ADDER.lifts;
    if (optHvac.checked) addSum += ADDER.hvac;

    var unitBase = RATE[state.type][state.fin];
    var unitRate = unitBase + addSum;
    var subtotal = unitRate * area;

    /* المدة الأساسية = المساحة ÷ معدل الإنتاجية + مدة التجهيز */
    var baseMonths = Math.ceil(area / PROD[state.type] + SETUP[state.type]);

    var premPct = 0;
    if (reqMonths < baseMonths) {
      premPct = Math.min(ACCEL_CAP, (baseMonths / reqMonths - 1) * ACCEL);
    }
    var premium = thousands(subtotal * premPct);
    var total = thousands(subtotal + premium);
    var low = thousands(total * (1 - BAND));
    var high = thousands(total * (1 + BAND));

    var engineers = Math.min(28, Math.max(3, Math.round((area / 5000) * ENG[state.type] + (premPct > 0 ? 1 : 0))));
    var crew = Math.round(area * CREW[state.type] * (optBasement.checked ? 1.08 : 1) * (1 + premPct * 0.8));

    return {
      area: area, unitBase: unitBase, addSum: addSum, unitRate: unitRate,
      baseMonths: baseMonths, reqMonths: reqMonths, premPct: premPct,
      premium: premium, total: total, low: low, high: high,
      engineers: engineers, crew: crew
    };
  }

  function paint() {
    var r = compute();

    v.unitBase.textContent = fmt.format(r.unitBase);
    v.add.textContent = r.addSum ? "+" + fmt.format(r.addSum) : "—";
    v.rate.textContent = fmt.format(r.unitRate);
    v.area.textContent = fmt.format(r.area);
    v.prem.textContent = r.premPct > 0 ? "+" + fmt.format(r.premium) : "—";
    v.total.textContent = fmt.format(r.total);
    v.range.textContent = fmt.format(r.low) + " – " + fmt.format(r.high);
    v.eng.textContent = fmt.format(r.engineers);
    v.crew.textContent = fmt.format(r.crew);
    v.baseMonths.textContent = fmt.format(r.baseMonths);
    v.reqMonths.textContent = fmt.format(r.reqMonths);

    if (r.premPct > 0) {
      v.reqNote.textContent = "أقصر من الأساسي · +" + fmt1.format(r.premPct * 100) + "%";
      durHint.innerHTML = "المدة الأساسية <bdi class=\"num\">" + r.baseMonths + "</bdi> أشهر. الجدول المضغوط يُضيف بدل تسريعًا سقفه <bdi class=\"num\" dir=\"ltr\">22%</bdi>.";
    } else if (r.reqMonths === r.baseMonths) {
      v.reqNote.textContent = "مطابقة للأساسي";
      durHint.innerHTML = "المدة المطلوبة مطابقة للمدة الأساسية <bdi class=\"num\">" + r.baseMonths + "</bdi> أشهر — بلا بدل تسريع.";
    } else {
      v.reqNote.textContent = "أطول من الأساسي";
      durHint.innerHTML = "المدة الأساسية <bdi class=\"num\">" + r.baseMonths + "</bdi> أشهر، والمدة المطلوبة أطول — لا يُضاف بدل تسريع.";
    }

    if (!reduce) {
      out.classList.add("is-flash");
      window.setTimeout(function () { out.classList.remove("is-flash"); }, 240);
    }
  }

  /* controls */
  document.querySelectorAll(".seg__btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var group = btn.parentNode;
      group.querySelectorAll(".seg__btn").forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", String(on));
      });
      if (btn.getAttribute("data-type")) state.type = btn.getAttribute("data-type");
      if (btn.getAttribute("data-fin")) state.fin = btn.getAttribute("data-fin");
      paint();
    });
  });

  areaIn.addEventListener("input", function () {
    areaRange.value = String(readNumber(areaIn, AREA_MIN, AREA_MAX, AREA_MIN));
    paint();
  });
  areaRange.addEventListener("input", function () {
    areaIn.value = areaRange.value;
    paint();
  });
  areaIn.addEventListener("blur", function () {
    areaIn.value = String(readNumber(areaIn, AREA_MIN, AREA_MAX, AREA_MIN));
    areaRange.value = areaIn.value;
    paint();
  });

  monthsIn.addEventListener("input", paint);
  monthsIn.addEventListener("blur", function () {
    monthsIn.value = String(Math.round(readNumber(monthsIn, MONTH_MIN, MONTH_MAX, MONTH_MIN)));
    paint();
  });
  [optBasement, optLifts, optHvac].forEach(function (el) { el.addEventListener("change", paint); });

  document.getElementById("estForm").addEventListener("submit", function (e) { e.preventDefault(); });
  paint();

  /* نموذج الطلب: بصري فقط، لا إرسال ولا تخزين */
  var askForm = document.getElementById("askForm");
  var askHint = document.getElementById("askHint");
  askForm.addEventListener("submit", function (e) {
    e.preventDefault();
    askHint.textContent = "لم يُرسل شيء — هذا نموذج للعرض البصري فقط. الطلبات الفعلية تصل عبر بريد المناقصات المذكور أعلى.";
  });
})();

/* scroll motion */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var all = function (sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  };

  /* headlines: every line climbs out from behind its own edge */
  all('h1').forEach(function (h) {
    var line = [], lines = [line];
    Array.prototype.forEach.call(h.childNodes, function (n) {
      if (n.nodeType === 1 && n.tagName === "BR") { line = []; lines.push(line); return; }
      line.push(n);
    });
    h.textContent = "";
    lines.forEach(function (parts, i) {
      if (!parts.length) return;
      var box = document.createElement("span"), run = document.createElement("span");
      box.className = "ml";
      run.style.transitionDelay = (i * 90) + "ms";
      parts.forEach(function (n) { run.appendChild(n); });
      box.appendChild(run);
      h.appendChild(box);
    });
    var shown = h.classList.contains("is-in");
    if (shown) h.classList.remove("is-in");
    h.classList.add("m-mask");
    void h.offsetHeight;
    requestAnimationFrame(function () { h.classList.add("is-in"); });
  });

  /* figures drift against the scroll, each selector with its own travel */
  var PLANES = {".work__fig": 20};
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
  var TARGETS = all('.num:not(.footer__phone):not(.opt__rate)');
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
