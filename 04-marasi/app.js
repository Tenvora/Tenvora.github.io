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

  /* scroll reveal (opacity + translatey only) */
  var items = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
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
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
    items.forEach(function (el) { io.observe(el); });
    /* safety: force-reveal anything still hidden (headless / fast scroll) */
    window.setTimeout(function () {
      items.forEach(function (el) { el.classList.add("is-in"); });
    }, 1500);
  }

  var MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  var money = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  function fmtAr(iso) {
    if (!iso) return "—";
    var p = iso.split("-");
    return parseInt(p[2], 10) + " " + MONTHS[parseInt(p[1], 10) - 1] + " " + p[0];
  }

  /* (a) SHIPMENT TRACKING LOOKUP — seeded, client-side only */
  var SHIPMENTS = {
    "MRSI-2026-4471": {
      vessel: "AL NUAIMA", voyage: "MR-2141", lane: "موندرا ← الدوحة",
      type: "حاوية 40 قدم (HC)", weight: "18.4",
      status: "قيد التخليص", stage: 2,
      dates: ["2026-11-12", "2026-11-13", "2026-11-15", null]
    },
    "MRSI-2026-5502": {
      vessel: "الشحانية", voyage: "MR-2156", lane: "كولومبو ← الدوحة",
      type: "حاوية 20 قدم", weight: "12.1",
      status: "قيد التفريغ", stage: 1,
      dates: ["2026-11-14", "2026-11-15", null, null]
    },
    "MRSI-2026-3820": {
      vessel: "أم صلال", voyage: "MR-2102", lane: "جدة ← الدوحة",
      type: "حجمي LCL", weight: "6.2",
      status: "تم التسليم", stage: 4,
      dates: ["2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"]
    },
    "MRSI-2025-9014": {
      vessel: "الوعب", voyage: "MR-2077", lane: "روتردام ← الدوحة",
      type: "حاوية 40 قدم مبرّدة", weight: "21.0",
      status: "تم التسليم", stage: 4,
      dates: ["2025-12-19", "2025-12-21", "2025-12-23", "2025-12-24"]
    }
  };
  var STAGES = ["وصول السفينة", "تفريغ الحاوية", "التخليص الجمركي", "التسليم للمستلم"];

  var trackForm = document.getElementById("trackForm");
  var trackInput = document.getElementById("trackInput");
  var trackOut = document.getElementById("trackOut");

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function bdiNum(text) { return '<bdi class="num">' + text + "</bdi>"; }

  function renderError(reason) {
    trackOut.textContent = "";
    var wrap = el("div", "tr-err");
    var lead = el("p", null, reason === "empty"
      ? "أدخل رقم التتبّع أولًا حتى نبحث عن الحاوية."
      : "لم نعثر على هذه الحاوية في سجلّ الرحلات.");
    wrap.appendChild(lead);
    var list = el("ul");
    [
      "الصيغة المطلوبة: " + bdiNum("MRSI") + "-YYYY-NNNN (مثال " + bdiNum("MRSI-2026-4471") + ").",
      "استخدم الأرقام اللاتينية لا العربية، والأحرف اللاتينية الكبيرة.",
      "تأكد من عدم وجود مسافات زائدة قبل الرقم أو بعده.",
      "إذا كان الرقم يخصّ رحلة لم تغادر بعد فقد يظهر بعد أول بوابة عبور."
    ].forEach(function (t) { list.appendChild(el("li", null, "<b>!</b><span>" + t + "</span>")); });
    wrap.appendChild(list);
    trackOut.appendChild(wrap);
  }

  function renderShipment(id, d) {
    trackOut.textContent = "";

    var head = el("div", "tr-head");
    head.appendChild(el("span", "tr-id", id));
    head.appendChild(el("span", "tr-badge", d.status));
    trackOut.appendChild(head);

    var meta = el("div", "tr-meta");
    [
      ["السفينة", d.vessel],
      ["الرحلة", '<bdi class="num">' + d.voyage + "</bdi>"],
      ["المسار", d.lane],
      ["نوع الحمولة", d.type],
      ["الوزن", '<bdi class="num">' + d.weight + "</bdi> طن"],
      ["رقم الحاوية", '<bdi class="num">' + id + "</bdi>"]
    ].forEach(function (r) {
      var row = el("div");
      row.appendChild(el("span", null, r[0]));
      row.appendChild(el("b", null, r[1]));
      meta.appendChild(row);
    });
    trackOut.appendChild(meta);

    var tl = el("ol", "tl");
    STAGES.forEach(function (name, i) {
      var cls = i < d.stage ? "done" : (i === d.stage ? "now" : "next");
      var item = el("li", "tl-item " + cls);
      var glyph = cls === "done" ? "✓" : (cls === "now" ? "●" : "");
      item.appendChild(el("span", "tl-dot", glyph));
      var main = el("div", "tl-main");
      main.appendChild(el("span", "tl-name", name));
      main.appendChild(el("time", "tl-date", fmtAr(d.dates[i])));
      item.appendChild(main);
      tl.appendChild(item);
    });
    trackOut.appendChild(tl);
  }

  function doLookup() {
    var raw = trackInput.value.trim().toUpperCase();
    if (!raw) { renderError("empty"); return; }
    var rec = SHIPMENTS[raw];
    if (rec) { renderShipment(raw, rec); }
    else { renderError("notfound"); }
  }

  trackForm.addEventListener("submit", function (e) { e.preventDefault(); doLookup(); });
  trackInput.addEventListener("input", function () {
    if (trackOut.querySelector(".tr-err")) {
      var v = trackInput.value.trim().toUpperCase();
      if (!v || !SHIPMENTS[v]) trackOut.textContent = '<p class="track__placeholder">اختر رقمًا أو أدخله لبدء التتبّع.</p>';
    }
  });
  Array.prototype.forEach.call(document.querySelectorAll(".ex"), function (btn) {
    btn.addEventListener("click", function () {
      trackInput.value = btn.getAttribute("data-id");
      doLookup();
    });
  });

  /* shareable deep link: ?track=MRSI-2026-4471 */
  var pre = (new URLSearchParams(window.location.search).get("track") || "").trim().toUpperCase();
  if (pre && SHIPMENTS[pre]) { trackInput.value = pre; renderShipment(pre, SHIPMENTS[pre]); }

  /* (b) FREIGHT ESTIMATOR — chargeable weight = max(actual,
   volumetric @ 1000 kg / m³), then a QAR total + range */
  var LANES = {
    jebel_ali: { name: "جبل علي", fcl20: 1200, fcl40: 1900, perTon: 550, perTonBulk: 480, baf20: 120, baf40: 210, bafTon: 55 },
    dammam:    { name: "الدمام", fcl20: 1500, fcl40: 2400, perTon: 680, perTonBulk: 600, baf20: 150, baf40: 260, bafTon: 70 },
    salalah:   { name: "صلالة", fcl20: 1900, fcl40: 3000, perTon: 820, perTonBulk: 720, baf20: 180, baf40: 320, bafTon: 85 },
    jeddah:    { name: "جدة", fcl20: 2600, fcl40: 4200, perTon: 1100, perTonBulk: 950, baf20: 240, baf40: 430, bafTon: 110 },
    mundra:    { name: "موندرا", fcl20: 3200, fcl40: 5200, perTon: 1350, perTonBulk: 1150, baf20: 280, baf40: 500, bafTon: 130 },
    colombo:   { name: "كولومبو", fcl20: 4000, fcl40: 6400, perTon: 1600, perTonBulk: 1350, baf20: 340, baf40: 600, bafTon: 155 },
    genoa:     { name: "جنوة", fcl20: 6600, fcl40: 10400, perTon: 2400, perTonBulk: 1950, baf20: 560, baf40: 980, bafTon: 235 },
    rotterdam: { name: "روتردام", fcl20: 7200, fcl40: 11200, perTon: 2600, perTonBulk: 2100, baf20: 620, baf40: 1080, bafTon: 260 }
  };
  var THC20 = 550, THC40 = 880, THC_TON = 55;
  var DOC = 250, ISPS = 45, CUSTOMS = 650, DELIVERY = 480;
  var VOL_FACTOR = 1;              /* 1000 kg per m³  →  1 ton per m³ */
  var PAYLOAD = { c20: 27, c40: 26 };
  var CARGO_LABEL = { c20: "حاوية 20 قدم", c40: "حاوية 40 قدم", lcl: "حجمي LCL", bulk: "سائب" };

  var estForm = document.getElementById("estForm");
  var wt = document.getElementById("wt");
  var vol = document.getElementById("vol");
  var laneSel = document.getElementById("lane");
  var adClear = document.getElementById("adClear");
  var adIns = document.getElementById("adIns");
  var adDel = document.getElementById("adDel");
  var out = document.getElementById("estOut");
  var linesBox = document.getElementById("estLines");
  var cwActual = document.getElementById("cwActual");
  var cwVol = document.getElementById("cwVol");
  var cwWin = document.getElementById("cwCharge");
  var estTotal = document.getElementById("estTotal");
  var estLow = document.getElementById("estLow");
  var estHigh = document.getElementById("estHigh");
  var estCap = document.getElementById("estCap");
  var cwVolFormula = document.getElementById("cwVolFormula");

  function num(v) { var n = parseFloat(v); return isFinite(n) && n > 0 ? n : 0; }
  function tons(n) { return (Math.round(n * 10) / 10).toFixed(1); }
  function q(amount) { return '<bdi class="num">' + money.format(Math.round(amount)) + " QAR</bdi>"; }
  function line(label, formula, amount, isAdd) {
    var node = el("div", "est__line" + (isAdd ? " is-add" : ""));
    var left = el("span", null, label);
    if (formula) left.appendChild(el("small", null, formula));
    node.appendChild(left);
    node.appendChild(el("span", "num", amount));
    return node;
  }

  function computeEstimator() {
    var type = (estForm.querySelector('input[name="cargo"]:checked') || {}).value || "lcl";
    var actual = num(wt.value);
    var volume = num(vol.value);
    var lane = LANES[laneSel.value] || LANES.mundra;

    var volWt = volume * VOL_FACTOR;
    var chargeable = Math.max(actual, volWt);

    cwActual.innerHTML = '<bdi class="num">' + tons(actual) + "</bdi> طن";
    cwVol.innerHTML = '<bdi class="num">' + tons(volWt) + "</bdi> طن";
    cwWin.innerHTML = '<bdi class="num">' + tons(chargeable) + "</bdi> طن";
    if (cwVolFormula) cwVolFormula.textContent = "الحجم " + tons(volume) + " م³ × 1";

    linesBox.textContent = "";
    var total = 0;
    var basisTons = (type === "bulk") ? actual : chargeable;

    /* base freight */
    if (type === "c20" || type === "c40") {
      var rate = type === "c20" ? lane.fcl20 : lane.fcl40;
      total += rate;
      linesBox.appendChild(line("أجرة الخط — " + CARGO_LABEL[type], lane.name + " · " + money.format(rate) + " QAR / حاوية", money.format(rate), false));
      var bafC = type === "c20" ? lane.baf20 : lane.baf40;
      total += bafC;
      linesBox.appendChild(line("وقود (BAF)", "1 × " + money.format(bafC), money.format(bafC), true));
      var thc = type === "c20" ? THC20 : THC40;
      total += thc;
      linesBox.appendChild(line("مناولة الرصيف (THC)", "1 × " + money.format(thc), money.format(thc), true));
    } else {
      var per = type === "lcl" ? lane.perTon : lane.perTonBulk;
      var unitLabel = type === "lcl" ? "طن معتمد W/M" : "طن فعلي";
      var b = per * basisTons;
      total += b;
      linesBox.appendChild(line("أجرة الخط — " + CARGO_LABEL[type], tons(basisTons) + " × " + money.format(per) + " QAR / " + unitLabel, money.format(b), false));
      var bt = lane.bafTon * basisTons;
      total += bt;
      linesBox.appendChild(line("وقود (BAF)", tons(basisTons) + " × " + money.format(lane.bafTon), money.format(bt), true));
      var tt = THC_TON * basisTons;
      total += tt;
      linesBox.appendChild(line("مناولة الرصيف (THC)", tons(basisTons) + " × " + money.format(THC_TON), money.format(tt), true));
    }

    /* flat fees */
    total += DOC;
    linesBox.appendChild(line("مستندات وبيان شحن", "رسم ثابت", money.format(DOC), true));
    total += ISPS;
    linesBox.appendChild(line("رسم أمني (ISPS)", "رسم ثابت", money.format(ISPS), true));

    /* add-ons */
    if (adClear.checked) { total += CUSTOMS; linesBox.appendChild(line("تخليص جمركي", "رسم ثابت", money.format(CUSTOMS), true)); }
    if (adIns.checked) { var ins = Math.max(200, Math.round((total * 0.005))); total += ins; linesBox.appendChild(line("تأمين على الحمولة", "0.5% من الأساس", money.format(ins), true)); }
    if (adDel.checked) { total += DELIVERY; linesBox.appendChild(line("توصيل إلى الباب — الدوحة", "رسم ثابت", money.format(DELIVERY), true)); }

    estTotal.textContent = money.format(Math.round(total)) + " QAR";
    estLow.textContent = money.format(Math.round(total * 0.94 / 10) * 10);
    estHigh.textContent = money.format(Math.round(total * 1.08 / 10) * 10);

    /* caption + container-limit note */
    var cap;
    if (actual === 0 && volume === 0) {
      cap = "أدخل الوزن أو الحجم لبدء الاحتساب.";
    } else if ((type === "c20" || type === "c40") && actual > PAYLOAD[type]) {
      cap = "تنبيه: الوزن الفعلي " + tons(actual) + " طن تجاوز الحمولة الآمنة لـ" + CARGO_LABEL[type] + " (" + PAYLOAD[type] + " طن). يلزم حاوية إضافية أو تقسيم الحمولة، والسعر أعلاه لحاوية واحدة.";
    } else if (type === "lcl") {
      cap = "الأساس هو الوزن المعتمد W/M: " + (chargeable >= actual ? "الحجمي أعلى فاعتُمد" : "الفعلي أعلى فاعتُمد") + ". السعر مبدئي يشمل أجرة الخط والوقود ومناولة الرصيف والمستندات.";
    } else if (type === "bulk") {
      cap = "تُسعَّر الحمولة السائبة على الوزن الفعلي لا الحجم. السعر مبدئي وقابل للتثبيت بعد المعاينة.";
    } else {
      cap = "لحاوية كاملة (FCL) تُحاسب الأجرة على الحاوية لا على الوزن؛ الوزن المعتمد يُستعان به للتحميل الآمن. السعر مبدئي.";
    }
    estCap.textContent = cap;
  }

  ["input", "change"].forEach(function (evt) {
    estForm.addEventListener(evt, computeEstimator);
  });
  estForm.addEventListener("submit", function (e) { e.preventDefault(); });
  computeEstimator();
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
  var PLANES = {".net__fig": 20, ".cap__fig": 16};
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
  var TARGETS = all('.num');
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

})();
