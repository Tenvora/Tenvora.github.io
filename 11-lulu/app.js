(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============================================================
     1. DATA — the house's current vault, and the pricing rules
     ============================================================ */

  /* reference price per carat by size band — same numbers as the grading table */
  var BANDS = [
    { min: 8.0, rate: 4200 },
    { min: 6.5, rate: 1850 },
    { min: 5.5, rate: 780 },
    { min: 4.5, rate: 340 },
    { min: 0.0, rate: 145 }
  ];
  /* each grade row sets a ceiling: a strand bead never sells above its own row */
  var GRADE_CEIL = { extra: 4200, first: 1850, second: 780, baroque: 145 };
  var LUSTER_FACTOR = { AAA: 1.35, AA: 1.00, A: 0.55 };
  var NACRE_FACTOR = { pure: 1.15, good: 1.00, fair: 0.70 };

  var SHAPE_AR = { round: "كروي", semi: "شبه كروي", oval: "بيضوي", drop: "دمعة", baroque: "غير منتظم" };
  var GRADE_AR = { extra: "استثنائية", first: "أولى", second: "ثانية", baroque: "غير منتظمة" };
  var LUSTER_AR = { AAA: "مرآئية", AA: "عالية", A: "متوسطة" };
  var NACRE_AR = { pure: "نقية", good: "جيدة", fair: "مقبولة" };

  /* a spherical pearl: volume x density 2.74 g/cm3, 1 ct = 0.2 g */
  function carats(mm) { return 0.00717 * mm * mm * mm; }

  function ratePerCarat(mm, grade) {
    if (grade === "baroque") return GRADE_CEIL.baroque;
    var band = BANDS[BANDS.length - 1].rate;
    for (var i = 0; i < BANDS.length; i++) {
      if (mm >= BANDS[i].min) { band = BANDS[i].rate; break; }
    }
    return Math.min(band, GRADE_CEIL[grade]);
  }

  /* lot = one loose natural pearl in the vault */
  var LOTS = [
    { cert: "LUL-2024-118", mm: 9.4,  luster: "AAA", nacre: "pure", surface: 95, shape: "round",   grade: "extra",   origin: "الخليج العربي · سِني", season: 2023, date: "2024-11-08", added: 14 },
    { cert: "LUL-2025-007", mm: 8.1,  luster: "AAA", nacre: "pure", surface: 92, shape: "round",   grade: "extra",   origin: "الخليج العربي · جُلفار", season: 2024, date: "2025-01-22", added: 21 },
    { cert: "LUL-2025-014", mm: 7.4,  luster: "AA",  nacre: "pure", surface: 88, shape: "semi",    grade: "first",   origin: "الخليج العربي · دَبيد", season: 2024, date: "2025-02-14", added: 9 },
    { cert: "LUL-2024-096", mm: 6.9,  luster: "AA",  nacre: "good", surface: 85, shape: "round",   grade: "first",   origin: "بحر عمان · خَورفَكَّان", season: 2023, date: "2024-09-30", added: 4 },
    { cert: "LUL-2024-072", mm: 6.6,  luster: "AA",  nacre: "good", surface: 82, shape: "drop",    grade: "first",   origin: "الخليج العربي · سِني", season: 2023, date: "2024-07-11", added: 17 },
    { cert: "LUL-2023-091", mm: 6.1,  luster: "AA",  nacre: "good", surface: 79, shape: "oval",    grade: "first",   origin: "البحرين", season: 2022, date: "2023-12-05", added: 2 },
    { cert: "LUL-2024-038", mm: 5.8,  luster: "AA",  nacre: "good", surface: 76, shape: "semi",    grade: "second",  origin: "الخليج العربي · أُمّ النخيل", season: 2023, date: "2024-05-19", added: 25 },
    { cert: "LUL-2025-021", mm: 5.4,  luster: "A",   nacre: "good", surface: 71, shape: "round",   grade: "second",  origin: "سري لانكا · مانّار", season: 2024, date: "2025-03-06", added: 7 },
    { cert: "LUL-2024-055", mm: 4.9,  luster: "AA",  nacre: "fair", surface: 68, shape: "oval",    grade: "second",  origin: "الخليج العربي · سِني", season: 2022, date: "2024-06-27", added: 12 },
    { cert: "LUL-2025-032", mm: 4.5,  luster: "A",   nacre: "fair", surface: 64, shape: "semi",    grade: "second",  origin: "البحرين", season: 2024, date: "2025-04-15", added: 19 },
    { cert: "LUL-2023-047", mm: 11.2, luster: "AA",  nacre: "pure", surface: 74, shape: "baroque", grade: "baroque", origin: "الخليج العربي · جُلفار", season: 2021, date: "2023-08-02", added: 30 },
    { cert: "LUL-2024-083", mm: 8.6,  luster: "A",   nacre: "good", surface: 61, shape: "baroque", grade: "baroque", origin: "سري لانكا · مانّار", season: 2023, date: "2024-08-21", added: 27 },
    { cert: "LUL-2022-064", mm: 6.3,  luster: "AA",  nacre: "fair", surface: 66, shape: "baroque", grade: "baroque", origin: "الخليج العربي · دَبيد", season: 2020, date: "2022-10-14", added: 1 },
    { cert: "LUL-2025-044", mm: 4.2,  luster: "A",   nacre: "fair", surface: 58, shape: "baroque", grade: "baroque", origin: "الخليج العربي · أُمّ النخيل", season: 2024, date: "2025-05-09", added: 11 }
  ];

  /* certificates for pieces that already left the vault */
  var ARCHIVED = [
    { cert: "LUL-2021-003", mm: 10.3, luster: "AAA", nacre: "pure", surface: 94, shape: "round", grade: "extra", origin: "الخليج العربي · سِني", season: 2019, date: "2021-02-17", sold: "مارس 2022" },
    { cert: "LUL-2019-027", mm: 7.8,  luster: "AA",  nacre: "good", surface: 87, shape: "semi",  grade: "first", origin: "البحرين", season: 2017, date: "2019-04-11", sold: "نوفمبر 2020" },
    { cert: "LUL-2022-090", mm: 5.6,  luster: "A",   nacre: "fair", surface: 72, shape: "oval",  grade: "second", origin: "بحر عمان · خَورفَكَّان", season: 2021, date: "2022-09-27", sold: "أغسطس 2023" }
  ];

  function priceOf(rec) {
    var ct = carats(rec.mm);
    var ppc = ratePerCarat(rec.mm, rec.grade) * LUSTER_FACTOR[rec.luster] * NACRE_FACTOR[rec.nacre];
    return { ct: ct, ppc: ppc, total: Math.round(ct * ppc / 50) * 50 };
  }

  /* nacre decides the overtone of a pearl — one rule, used by every demo */
  function toneOf(rec) {
    if (rec.nacre === "pure") return { cls: "", ov: "rgba(14,74,69,.22)" };
    if (rec.nacre === "fair") return { cls: " pearl--warm", ov: "rgba(196,150,120,.26)" };
    return { cls: " pearl--warm", ov: "rgba(196,150,120,.14)" };
  }

  var nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  var nf2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var nf1 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  /* ============================================================
     2. shell — sticky bar, mobile nav, scroll reveal
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

  var io = null;
  if (!reduce && "IntersectionObserver" in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.style.transitionDelay = Math.min(i * 70, 210) + "ms";
        el.classList.add("is-in");
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    document.querySelectorAll("[data-reveal]").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll("[data-reveal]").forEach(function (el) { el.classList.add("is-in"); });
  }
  function reveal(scope, first) {
    var nodes = scope.querySelectorAll("[data-reveal]:not(.is-in)");
    if (io && first) { nodes.forEach(function (el) { io.observe(el); }); }
    else { nodes.forEach(function (el) { el.classList.add("is-in"); }); }
  }

  /* ============================================================
     3. hero grading card — written by the same pricing code
     ============================================================ */
  (function heroCard() {
    var rec = LOTS[0];
    var p = priceOf(rec);
    var card = document.querySelector(".lotcard");
    if (!card) return;
    card.querySelector(".lotcard__id").textContent = rec.cert;
    var dd = card.querySelectorAll(".spec dd");
    dd[1].innerHTML = '<bdi dir="ltr">' + nf1.format(rec.mm) + " mm</bdi>";
    dd[2].innerHTML = '<bdi dir="ltr">' + nf2.format(p.ct) + ' ct</bdi> · <bdi dir="ltr">' + nf1.format(p.ct * 4) + " gr</bdi>";
    dd[6].innerHTML = rec.origin + ' · موسم <bdi dir="ltr">' + rec.season + "</bdi>";
    var foot = card.querySelectorAll(".lotcard__foot strong");
    foot[0].textContent = nf.format(Math.round(p.ppc / 10) * 10) + " AED";
    foot[1].textContent = nf.format(p.total) + " AED";
    var pearl = card.querySelector(".lotcard__stage .pearl");
    pearl.style.setProperty("--size", Math.round(48 + rec.mm * 7) + "px");
    var tone = toneOf(rec);
    pearl.className = "pearl" + tone.cls;
    pearl.style.setProperty("--ov", tone.ov);
  })();

  /* ============================================================
     4. DEMO 1 — catalogue filter (grade / shape / size / price)
     ============================================================ */
  var fGrade = document.getElementById("fGrade");
  var fShape = document.getElementById("fShape");
  var fMin = document.getElementById("fMin");
  var fMax = document.getElementById("fMax");
  var fSort = document.getElementById("fSort");
  var fMinOut = document.getElementById("fMinOut");
  var fMaxOut = document.getElementById("fMaxOut");
  var catReset = document.getElementById("catReset");
  var lotsEl = document.getElementById("lots");
  var metaEl = document.getElementById("catMeta");
  var emptyEl = document.getElementById("catEmpty");
  var MAX_PRICE = 120000;
  var firstRender = true;

  function matches(rec, minMm, maxPrice) {
    if (fGrade.value !== "all" && rec.grade !== fGrade.value) return false;
    if (fShape.value !== "all" && rec.shape !== fShape.value) return false;
    if (rec.mm < minMm) return false;
    return priceOf(rec).total <= maxPrice;
  }

  function lotMarkup(rec) {
    var p = priceOf(rec);
    var tone = toneOf(rec);
    var px = Math.max(30, Math.min(72, 18 + rec.mm * 5));
    return '<article class="lot" data-reveal>' +
      '<div class="lot__stage">' +
        '<span class="lot__id"><bdi dir="ltr">' + rec.cert + "</bdi></span>" +
        '<span class="lot__grade">' + GRADE_AR[rec.grade] + "</span>" +
        '<span class="pearl' + tone.cls + (rec.luster === "A" ? " pearl--flat" : "") +
          '" style="--size:' + px.toFixed(0) + "px;" + "--ov:" + tone.ov + '" aria-hidden="true"></span>' +
      "</div>" +
      "<h3>" + SHAPE_AR[rec.shape] + " · لمعة " + LUSTER_AR[rec.luster] + "</h3>" +
      '<div class="lot__specs">' +
        "<div><span>المقاس</span><span class=\"num\">" + nf1.format(rec.mm) + " mm</span></div>" +
        "<div><span>الوزن</span><span class=\"num\">" + nf2.format(p.ct) + " ct</span></div>" +
        "<div><span>السطح</span><span class=\"num\">" + rec.surface + '%</span></div>' +
        "<div><span>الطبقة الصدفية</span><span>" + NACRE_AR[rec.nacre] + "</span></div>" +
        "<div><span>رقم الشهادة</span><span class=\"num\">" + rec.cert + "</span></div>" +
      "</div>" +
      '<div class="lot__price"><span>بالدرهم الإماراتي</span><strong>' + nf.format(p.total) + " AED</strong></div>" +
      "</article>";
  }

  function renderCatalogue() {
    var minMm = parseFloat(fMin.value);
    var maxPrice = parseFloat(fMax.value);
    fMinOut.textContent = nf1.format(minMm);
    fMaxOut.textContent = nf.format(maxPrice);

    var out = LOTS.filter(function (r) { return matches(r, minMm, maxPrice); });
    var key = fSort.value;
    out.sort(function (a, b) {
      if (key === "size-desc") return b.mm - a.mm;
      if (key === "size-asc") return a.mm - b.mm;
      if (key === "price-asc") return priceOf(a).total - priceOf(b).total;
      if (key === "price-desc") return priceOf(b).total - priceOf(a).total;
      return b.added - a.added;
    });

    lotsEl.innerHTML = out.map(lotMarkup).join("");
    lotsEl.querySelectorAll(".lot__specs .num,.lot__price strong").forEach(function (el) {
      el.setAttribute("dir", "ltr");
    });
    emptyEl.hidden = out.length !== 0;

    var value = out.reduce(function (s, r) { return s + priceOf(r).total; }, 0);
    metaEl.innerHTML = "عرض <bdi>" + out.length + "</bdi> من <bdi>" + LOTS.length + "</bdi> قطعة في الخزنة · " +
      'القيمة المعروضة <bdi dir="ltr">' + nf.format(value) + " AED</bdi> · متوسط <bdi dir=\"ltr\">" +
      (out.length ? nf.format(Math.round(value / out.length)) : "0") + " AED</bdi> للقطعة.";
    reveal(lotsEl, firstRender);
    firstRender = false;
  }

  [fGrade, fShape, fMin, fMax, fSort].forEach(function (el) {
    el.addEventListener("input", renderCatalogue);
    el.addEventListener("change", renderCatalogue);
  });
  catReset.addEventListener("click", function () {
    fGrade.value = "all"; fShape.value = "all"; fMin.value = "4"; fMax.value = String(MAX_PRICE); fSort.value = "new";
    renderCatalogue();
  });
  renderCatalogue();

  /* ============================================================
     5. DEMO 2 — strand configurator (graduated 45 cm strand)
     ============================================================ */
  var STRAND_MM = 450;
  var TAPER = 0.55;
  var FITTING_FEE = 680;

  var strForm = document.getElementById("strandForm");
  var strMm = document.getElementById("sMm");
  var strNacre = document.getElementById("sNacre");
  var sMmOut = document.getElementById("sMmOut");
  var stageEl = document.getElementById("strandStage");
  var dotsEl = document.getElementById("strandDots");
  var outEl = document.getElementById("strandOut");
  var oCount = document.getElementById("oCount");
  var oRange = document.getElementById("oRange");
  var oWeight = document.getElementById("oWeight");
  var oCt = document.getElementById("oCt");
  var oPrice = document.getElementById("oPrice");
  var oCap = document.getElementById("oCap");

  function lusterValue() {
    var checked = strForm.querySelector('input[name="luster"]:checked');
    return checked ? checked.value : "AA";
  }

  /* the middle bead carries the chosen size, the ends taper to 55% of it */
  function buildStrand(dmax) {
    var dmin = dmax * TAPER;
    var mean = dmin + (dmax - dmin) * (2 / Math.PI);
    var n = Math.max(14, Math.round(STRAND_MM / mean));
    var beads = [];
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1);
      beads.push(dmin + (dmax - dmin) * Math.sin(Math.PI * t));
    }
    return beads;
  }

  function strandCost(beads, luster, nacre) {
    var ct = 0, price = 0;
    for (var i = 0; i < beads.length; i++) {
      var c = carats(beads[i]);
      /* a matched strand bead never sells above the "أولى" row */
      price += c * ratePerCarat(beads[i], "first") * LUSTER_FACTOR[luster] * NACRE_FACTOR[nacre];
      ct += c;
    }
    return { ct: ct, price: Math.round(price / 100) * 100 };
  }

  function drawStrand(beads, nacre, luster) {
    var w = dotsEl.clientWidth || stageEl.clientWidth - 24 || 520;
    var h = dotsEl.clientHeight || 150;
    var dmax = Math.max.apply(null, beads);
    var sum = beads.reduce(function (s, d) { return s + d; }, 0);
    var pxPerMm = Math.min((h * 0.30) / dmax, (w * 0.95) / sum);
    var ov = nacre === "pure"
      ? "rgba(14,74,69," + (luster === "A" ? "0.12" : "0.24") + ")"
      : "rgba(196,150,120," + (nacre === "fair" ? "0.28" : "0.16") + ")";
    var x = (w - sum * pxPerMm) / 2;
    var cls = (nacre === "pure" ? "" : " pearl--warm") + (luster === "A" ? " pearl--flat" : "");
    var html = "";
    for (var i = 0; i < beads.length; i++) {
      var d = beads[i] * pxPerMm;
      var t = i / (beads.length - 1);
      var sag = (h - dmax * pxPerMm) * (1 - Math.pow(2 * t - 1, 2));
      html += '<span class="pearl' + cls + '" style="--size:' + d.toFixed(2) + "px;" + "--ov:" + ov +
        ";inset-inline-start:" + x.toFixed(2) + "px;inset-block-start:" + sag.toFixed(2) + 'px"></span>';
      x += d;
    }
    dotsEl.innerHTML = html;
    stageEl.setAttribute("aria-label", "معاينة الخيط: " + beads.length + " لؤلؤة متدرّجة من " +
      nf1.format(beads[0]) + " إلى " + nf1.format(dmax) + " مليمتر");
  }

  function renderStrand() {
    var dmax = parseFloat(strMm.value);
    var luster = lusterValue();
    var nacre = strNacre.value;
    var beads = buildStrand(dmax);
    var cost = strandCost(beads, luster, nacre);

    sMmOut.textContent = nf1.format(dmax);
    oCount.textContent = nf.format(beads.length);
    oRange.textContent = nf1.format(dmax * TAPER) + "–" + nf1.format(dmax) + " mm";
    oWeight.textContent = nf2.format(cost.ct) + " ct";
    oCt.textContent = nf.format(Math.round(cost.price / cost.ct)) + " AED/ct";
    oPrice.textContent = nf.format(cost.price) + " AED";

    var note;
    if (dmax >= 11) {
      note = 'مقاس نادر: لؤلؤة طبيعية فوق <bdi dir="ltr">11 mm</bdi> لا تأتي بها كل المزادات. قد تستغرق مطابقة الخيط موسمين كاملين، ويُعرض على كبار العملاء قبل طرحه.';
    } else if (nacre === "fair") {
      note = 'طبقة صدفية مقبولة تعني لمعة سطحية: تُسقط الدار <bdi dir="ltr">30%</bdi> من سعر الشريحة، ولا ننصح بخيط كامل منها للاستعمال اليومي.';
    } else if (luster === "AAA") {
      note = "لمعة مرآئية: تُصفّى اللؤلؤ يدويًا تحت ضوء النهار الشمالي، وقد تُستبدل لؤلؤة أو لؤلؤتان قبل التسليم لتساوى الانعكاسات.";
    } else {
      note = 'السعر يشمل اللؤلؤ وخيط الحرير المعقود، ولا يشمل المشبك أو خدمة التركيب <bdi dir="ltr">680 AED</bdi>.';
    }
    oCap.innerHTML = note;

    drawStrand(beads, nacre, luster);

    if (!reduce) {
      outEl.classList.add("is-flash");
      window.setTimeout(function () { outEl.classList.remove("is-flash"); }, 260);
    }
  }

  strForm.addEventListener("submit", function (e) { e.preventDefault(); });
  strForm.addEventListener("input", renderStrand);
  strForm.addEventListener("change", renderStrand);

  var reflow;
  window.addEventListener("resize", function () {
    window.clearTimeout(reflow);
    reflow = window.setTimeout(function () {
      drawStrand(buildStrand(parseFloat(strMm.value)), strNacre.value, lusterValue());
    }, 180);
  });
  renderStrand();

  /* ============================================================
     6. DEMO 3 — certificate checker against the house register
     ============================================================ */
  var certForm = document.getElementById("certForm");
  var certId = document.getElementById("certId");
  var certMsg = document.getElementById("certMsg");
  var certBox = document.getElementById("certResult");
  var C = {
    title: document.getElementById("certTitle"),
    pearl: document.getElementById("certPearl"),
    status: document.getElementById("certStatus"),
    grade: document.getElementById("certGrade"),
    shape: document.getElementById("certShape"),
    mm: document.getElementById("certMm"),
    ct: document.getElementById("certCt"),
    luster: document.getElementById("certLuster"),
    surface: document.getElementById("certSurface"),
    origin: document.getElementById("certOrigin"),
    date: document.getElementById("certDate"),
    value: document.getElementById("certValue")
  };

  var REGISTRY = {};
  LOTS.forEach(function (r) { REGISTRY[r.cert.toLowerCase()] = { rec: r, state: "available" }; });
  ARCHIVED.forEach(function (r) { REGISTRY[r.cert.toLowerCase()] = { rec: r, state: "sold" }; });

  document.querySelectorAll(".chipbtn").forEach(function (b) {
    b.addEventListener("click", function () {
      certId.value = b.getAttribute("data-id");
      lookup();
      certId.focus();
    });
  });

  function lookup() {
    var raw = certId.value.trim();
    if (!raw) {
      certBox.hidden = true;
      certMsg.className = "cert__msg";
      certMsg.innerHTML = 'اكتب رقم الشهادة كما هو مطبوع على البطاقة، بصيغة <bdi dir="ltr">LUL-YYYY-NNN</bdi>. مثال: <bdi dir="ltr">LUL-2024-118</bdi>.';
      return;
    }
    var found = REGISTRY[raw.toLowerCase()];
    if (!found) {
      certBox.hidden = true;
      certMsg.className = "cert__msg";
      certMsg.innerHTML = 'لم يجد هذا الرقم في سجلّ الدار. راجع الصيغة <bdi dir="ltr">LUL-YYYY-NNN</bdi>، أو اطلب مطابقة يدوية في خزنة الشارقة.';
      return;
    }

    var r = found.rec;
    var p = priceOf(r);
    var tone = toneOf(r);
    certBox.hidden = false;
    C.title.textContent = r.cert;
    C.status.textContent = found.state === "available" ? "متاحة في الخزنة" : "مبيعة · " + r.sold;
    C.grade.textContent = GRADE_AR[r.grade];
    C.shape.textContent = SHAPE_AR[r.shape];
    C.mm.innerHTML = '<bdi dir="ltr">' + nf1.format(r.mm) + " mm</bdi>";
    C.ct.innerHTML = '<bdi dir="ltr">' + nf2.format(p.ct) + ' ct</bdi> · <bdi dir="ltr">' + nf1.format(p.ct * 4) + " gr</bdi>";
    C.luster.innerHTML = LUSTER_AR[r.luster] + ' <bdi dir="ltr">' + r.luster + "</bdi>";
    C.surface.innerHTML = '<bdi dir="ltr">' + r.surface + '%</bdi> تحت تكبير <bdi dir="ltr">10×</bdi>';
    C.origin.innerHTML = r.origin + ' · موسم <bdi dir="ltr">' + r.season + "</bdi>";
    C.date.innerHTML = '<bdi dir="ltr">' + r.date + "</bdi>";
    C.value.textContent = nf.format(p.total) + " AED";
    C.pearl.className = "pearl" + tone.cls + (r.luster === "A" ? " pearl--flat" : "");
    C.pearl.style.setProperty("--size", Math.round(30 + r.mm * 2.6) + "px");
    C.pearl.style.setProperty("--ov", tone.ov);

    certMsg.className = "cert__msg cert__msg--ok";
    certMsg.textContent = "رقم الشهادة مطابق لسجلّ الدار، والبطاقة أعلاه هي المحفوظة باسمه.";
  }

  certForm.addEventListener("submit", function (e) { e.preventDefault(); lookup(); });
  certId.addEventListener("input", function () { if (certId.value.trim()) lookup(); });
  lookup();
})();
