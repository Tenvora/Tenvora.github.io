(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

  /* ============================================================
     قواعد قفّص لإيواء الطيور
     a1  = المساحة الأرضية للطائر الأول (سم²)
     an  = الزيادة لكل طائر إضافي (سم²)
     lmin / wmin / hmin = حدود الأبعاد الصلبة بالسم
     fl  = أقل طول لغرفة الطيران (سم)
     ============================================================ */
  var ASPECT = 1.8;
  var SPECIES = {
    canary: { name: "كناري",           a1: 1800, an: 900,  lmin: 60,  wmin: 35, hmin: 40,  fl: 150, bar: "1.25" },
    zebra:  { name: "زيبرا فينش",       a1: 1400, an: 1200, lmin: 60,  wmin: 35, hmin: 40,  fl: 150, bar: "1.0"  },
    java:   { name: "فيش جافا",         a1: 2200, an: 1600, lmin: 80,  wmin: 45, hmin: 50,  fl: 150, bar: "1.0"  },
    munia:  { name: "بوش (مونيا)",      a1: 1600, an: 1400, lmin: 70,  wmin: 40, hmin: 45,  fl: 150, bar: "1.0"  },
    dove:   { name: "كميت",             a1: 1350, an: 1350, lmin: 60,  wmin: 40, hmin: 45,  fl: 150, bar: "1.25" },
    pigeon: { name: "حمام زينة",        a1: 2200, an: 1100, lmin: 90,  wmin: 60, hmin: 60,  fl: 200, bar: "2.5"  },
    fowl:   { name: "ديك زينة (بانتام)", a1: 2200, an: 1850, lmin: 120, wmin: 80, hmin: 120, fl: 200, bar: "2.5–5" }
  };
  var TENURE = {
    indoor: { name: "قفص داخلي",  f: 1,    hfac: 1,    hFloor: 0   },
    wire:   { name: "سلك خارجي",  f: 1.35, hfac: 1.15, hFloor: 60  },
    flight: { name: "غرفة طيران", f: 2,    hfac: 1,    hFloor: 200 }
  };

  function ceil5(v) { return Math.ceil(v / 5) * 5; }
  function ceil50(v) { return Math.ceil(v / 50) * 50; }

  function requirement(key, count, tenure) {
    var s = SPECIES[key], t = TENURE[tenure];
    var area = ceil50(t.f * (s.a1 + s.an * (count - 1)));
    var w = Math.max(ceil5(Math.sqrt(area / ASPECT)), s.wmin);
    var l = Math.max(ceil5(Math.sqrt(area * ASPECT)), s.lmin);
    var h = Math.max(ceil5(s.hmin * t.hfac), t.hFloor);
    if (tenure === "flight") { l = Math.max(l, s.fl); }
    return { area: area, l: l, w: w, h: h, s: s, t: t };
  }

  /* ============================================================
     sticky bar + mobile nav
     ============================================================ */
  var bar = document.getElementById("topbar");
  function onScroll() { bar.classList.toggle("is-stuck", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

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

  /* ============================================================
     scroll reveal
     ============================================================ */
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
    }, { rootMargin: "0px 0px -80px 0px", threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ============================================================
     حاسبة مقاس الحيازة
     ============================================================ */
  var form = document.getElementById("sizeForm");
  var outBox = document.getElementById("sizeOut");
  var sType = document.getElementById("sType");
  var sCount = document.getElementById("sCount");
  var sCountOut = document.getElementById("sCountOut");
  var minus = document.getElementById("minus");
  var plus = document.getElementById("plus");
  var curPreset = document.getElementById("curPreset");
  var presetRead = document.getElementById("presetRead");
  var curL = document.getElementById("curL");
  var curW = document.getElementById("curW");
  var curH = document.getElementById("curH");
  var verdict = document.getElementById("verdict");
  var cmpBody = document.getElementById("cmpBody");
  var oDims = document.getElementById("oDims");
  var oAllow = document.getElementById("oAllow");
  var oArea = document.getElementById("oArea");
  var oCap = document.getElementById("oCap");

  function num(v) {
    var n = parseFloat(v);
    return isFinite(n) && n > 0 ? n : 0;
  }

  function tenure() {
    var checked = form.querySelector('input[name="tenure"]:checked');
    return checked ? checked.value : "indoor";
  }

  function signed(v, unit) {
    var sign = v < 0 ? "-" : "+";
    return sign + fmt.format(Math.abs(v)) + (unit ? " " + unit : "");
  }

  /* رقم معزول دائمًا: لا عربية داخل خط الـ mono أبدًا */
  function N(v) { return '<bdi class="num" dir="ltr">' + v + "</bdi>"; }

  function row(label, reqTxt, curTxt, diffTxt, okTxt, short) {
    return '<tr' + (short ? ' class="is-short"' : "") + '>' +
      '<th scope="row">' + label + "</th>" +
      "<td>" + reqTxt + "</td>" +
      "<td>" + curTxt + "</td>" +
      "<td>" + diffTxt + "</td>" +
      "<td>" + okTxt + "</td></tr>";
  }

  function renderSizing() {
    var key = sType.value;
    var count = Math.max(1, Math.min(12, parseInt(sCount.value, 10) || 1));
    var ten = tenure();
    var r = requirement(key, count, ten);

    sCount.value = String(count);
    sCountOut.textContent = String(count);
    sCount.setAttribute("aria-valuetext", count + " " + (count > 2 ? "طيور" : "طائرين"));

    var cl = num(curL.value), cw = num(curW.value), ch = num(curH.value);
    var hasDims = cl > 0 && cw > 0 && ch > 0;
    var fp = hasDims ? cl * cw : 0;

    var okArea = hasDims && fp >= r.area;
    var okL = hasDims && cl >= r.l;
    var okW = hasDims && cw >= r.w;
    var okH = hasDims && ch >= r.h;

    /* كم طائرًا تسمح المساحة الموجودة فعليًا */
    var norm = hasDims ? fp / r.t.f : 0;
    var allowed = 0;
    if (norm >= r.s.a1) { allowed = 1 + Math.floor((norm - r.s.a1) / r.s.an); }

    var gaps = [];
    if (hasDims) {
      if (!okArea) gaps.push({ what: "المساحة الأرضية", by: r.area - fp, unit: "سم²" });
      if (!okL) gaps.push({ what: "الطول", by: r.l - cl, unit: "سم" });
      if (!okW) gaps.push({ what: "العرض", by: r.w - cw, unit: "سم" });
      if (!okH) gaps.push({ what: "الارتفاع", by: r.h - ch, unit: "سم" });
    }

    cmpBody.innerHTML =
      row("المساحة الأرضية", N(fmt.format(r.area)) + " سم²",
          hasDims ? N(fmt.format(fp)) + " سم²" : "—",
          hasDims ? N(signed(fp - r.area, "")) : "—",
          okArea ? "يكفي" : (hasDims ? "ينقص " + N(fmt.format(r.area - fp)) + " سم²" : "—"), !okArea) +
      row("الطول", N(r.l) + " سم", hasDims ? N(cl) + " سم" : "—",
          hasDims ? N(signed(cl - r.l, "")) : "—",
          okL ? "يكفي" : (hasDims ? "ينقص " + N(fmt.format(r.l - cl)) + " سم" : "—"), !okL) +
      row("العرض", N(r.w) + " سم", hasDims ? N(cw) + " سم" : "—",
          hasDims ? N(signed(cw - r.w, "")) : "—",
          okW ? "يكفي" : (hasDims ? "ينقص " + N(fmt.format(r.w - cw)) + " سم" : "—"), !okW) +
      row("الارتفاع", N(r.h) + " سم", hasDims ? N(ch) + " سم" : "—",
          hasDims ? N(signed(ch - r.h, "")) : "—",
          okH ? "يكفي" : (hasDims ? "ينقص " + N(fmt.format(r.h - ch)) + " سم" : "—"), !okH);

    oDims.innerHTML = N(r.l + "×" + r.w + "×" + r.h) + " سم";
    oAllow.innerHTML = hasDims ? N(allowed) + " طائرًا" : "—";
    oArea.innerHTML = hasDims ? N(fmt.format(fp)) + " سم²" : "—";

    var extra = count - 1;
    verdict.classList.toggle("is-short", hasDims && gaps.length > 0);

    if (!hasDims) {
      verdict.innerHTML = "أدخل أبعاد حيازتك الحالية بالسنتيمتر لعرض المقارنة.";
    } else if (gaps.length === 0) {
      verdict.innerHTML = "تحقق الحد الأدنى: مساحتك الأرضية تزيد على المطلوب بـ " +
        N(fmt.format(fp - r.area)) + " سم²، وأضيق ضلع عندك هو " + widest(r, cl, cw, ch) + ".";
    } else {
      var first = gaps[0];
      verdict.innerHTML = "ينقصها " + N(fmt.format(first.by)) + " " + first.unit + " في " + first.what +
        (gaps.length > 1 ? " — و" + N(gaps.length - 1) + " بنود أخرى تحت الحد." : ".");
    }

    oCap.innerHTML = "القاعدة المطبَّقة: " + r.s.name + " — الطائر الأول <bdi class=\"num\" dir=\"ltr\">" +
      fmt.format(r.s.a1) + "</bdi> سم²، وكل طائر إضافي <bdi class=\"num\" dir=\"ltr\">" + fmt.format(r.s.an) +
      "</bdi> سم² (" + (extra === 0 ? "بلا إضافيين" : "مع " + N(extra) + " إضافي") + ")، بمعامل " + r.t.name +
      " <bdi class=\"num\" dir=\"ltr\">×" + r.t.f + "</bdi> = <bdi class=\"num\" dir=\"ltr\">" + fmt.format(r.area) +
      "</bdi> سم². نحوّلها لمستطيل نسبة طوله إلى عرضه <bdi class=\"num\" dir=\"ltr\">1.8:1</bdi> ونقرّب كل ضلع إلى <bdi class=\"num\" dir=\"ltr\">5</bdi> سم، فيصبح الحد الأدنى <bdi class=\"num\" dir=\"ltr\">" +
      r.l + "×" + r.w + "×" + r.h + "</bdi> سم، بمسافة سلك أقصى <bdi class=\"num\" dir=\"ltr\">" + r.s.bar + "</bdi> سم.";

    if (!reduce) {
      outBox.classList.add("is-flash");
      window.setTimeout(function () { outBox.classList.remove("is-flash"); }, 260);
    }
  }

  function widest(r, cl, cw, ch) {
    var m = Math.min(cl - r.l, cw - r.w);
    return m <= ch - r.h ? "الضلع الأفقي" : "الارتفاع";
  }

  ["change", "input"].forEach(function (ev) { form.addEventListener(ev, renderSizing); });
  minus.addEventListener("click", function () {
    sCount.value = String(Math.max(1, (parseInt(sCount.value, 10) || 1) - 1));
    renderSizing();
  });
  plus.addEventListener("click", function () {
    sCount.value = String(Math.min(12, (parseInt(sCount.value, 10) || 1) + 1));
    renderSizing();
  });

  var PRESETS = {
    "60,30,30": "قفص مستطيل صغير",
    "60,40,40": "قفص كناري شائع",
    "80,45,55": "قفص عرض كبير",
    "100,50,60": "قفص تفريخ",
    "150,80,180": "سلك خارجي قائم",
    "200,100,200": "غرفة طيران جاهزة"
  };
  curPreset.addEventListener("change", function () {
    var v = curPreset.value;
    if (v === "custom") {
      presetRead.innerHTML = "مقاس خاص: تُقرأ الأبعاد من الخانات الثلاث أدناه.";
    } else {
      var p = v.split(",");
      curL.value = p[0]; curW.value = p[1]; curH.value = p[2];
      presetRead.innerHTML = "المقاس المحدد: <bdi class=\"num\" dir=\"ltr\">" + p.join("×") +
        "</bdi> سم — <span class=\"preset-name\">" + PRESETS[v] + "</span>";
    }
    renderSizing();
  });

  renderSizing();

  /* فتح الحاسبة من إعلان */
  document.querySelectorAll(".toCalc").forEach(function (link) {
    link.addEventListener("click", function () {
      var key = link.getAttribute("data-type");
      if (SPECIES[key]) { sType.value = key; renderSizing(); }
    });
  });

  /* ============================================================
     فلتر الإعلانات
     ============================================================ */
  var fType = document.getElementById("fType");
  var fCity = document.getElementById("fCity");
  var fPrice = document.getElementById("fPrice");
  var fPriceOut = document.getElementById("fPriceOut");
  var countEl = document.getElementById("count");
  var emptyEl = document.getElementById("empty");
  var ads = Array.prototype.slice.call(document.querySelectorAll("#ads .ad"));

  function applyFilter() {
    var ty = fType.value, ct = fCity.value, max = parseFloat(fPrice.value);
    var hits = 0;
    ads.forEach(function (ad) {
      var ok = (ty === "all" || ad.getAttribute("data-type") === ty) &&
               (ct === "all" || ad.getAttribute("data-city") === ct) &&
               (parseFloat(ad.getAttribute("data-price")) <= max);
      ad.classList.toggle("is-off", !ok);
      if (ok) hits++;
    });
    fPriceOut.textContent = fmt.format(max);
    countEl.innerHTML = hits
      ? "<strong class=\"num\" dir=\"ltr\">" + hits + "</strong> " +
        (hits > 2 ? "إعلانات" : hits === 2 ? "إعلانان" : "إعلان واحد") + " مطابقة"
      : "<strong class=\"num\" dir=\"ltr\">0</strong> إعلان مطابق";
    emptyEl.hidden = hits !== 0;
  }

  [fType, fCity, fPrice].forEach(function (el) { el.addEventListener("input", applyFilter); });

  function resetFilters() {
    fType.value = "all"; fCity.value = "all";
    fPrice.value = fPrice.max;
    applyFilter();
  }
  document.getElementById("clearBtn").addEventListener("click", resetFilters);
  document.getElementById("emptyReset").addEventListener("click", resetFilters);
  applyFilter();

  /* ============================================================
     إضافة فعالية إلى التقويم (ملف ICS محلي)
     ============================================================ */
  function icsEscape(s) { return String(s).replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n"); }

  document.querySelectorAll(".ics").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var d = btn.getAttribute("data-date");
      var y = +d.slice(0, 4), m = +d.slice(4, 6) - 1, day = +d.slice(6, 8);
      var end = new Date(y, m, day + 1);
      var endStr = end.getFullYear() +
        String(end.getMonth() + 1).padStart(2, "0") +
        String(end.getDate()).padStart(2, "0");
      var ics = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//qafas.kw//calendar//AR",
        "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
        "UID:" + d + "-" + Math.random().toString(36).slice(2, 8) + "@qafas.kw",
        "DTSTAMP:" + d + "T090000Z",
        "DTSTART;VALUE=DATE:" + d,
        "DTEND;VALUE=DATE:" + endStr,
        "SUMMARY:" + icsEscape(btn.getAttribute("data-title")),
        "LOCATION:" + icsEscape(btn.getAttribute("data-loc")),
        "DESCRIPTION:" + icsEscape(btn.getAttribute("data-desc")),
        "END:VEVENT", "END:VCALENDAR"
      ].join("\r\n");

      var blob = new Blob(["\ufeff" + ics], { type: "text/calendar;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "qafas-" + d + ".ics";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 4000);

      var old = btn.textContent;
      btn.textContent = "نُزل الملف ✓";
      btn.disabled = true;
      window.setTimeout(function () { btn.textContent = old; btn.disabled = false; }, 2400);
    });
  });
})();
