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
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.1 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ============================================================
     حاسبة إنتاج توربين رياح — فيزياء معلنة
     ============================================================ */

  /* ثوابت النموذج، مكتوبة في الصفحة ولا تُخفى */
  var RHO = 1.16;      /* kg/m³ — كثافة الهواء عند ~40 °C وسطح البحر */
  var CP = 0.42;       /* معامل القدرة التصميمي (بيتز 0.593 حدا أقصى) */
  var ETA = 0.955;     /* كفاءة المولد + المحوّل + الشبكة الجامعة */
  var VCI = 3.0;       /* m/s بدء التشغيل */
  var VCO = 25.0;      /* m/s إيقاف التشغيل */
  var HOURS = 8760;    /* ساعات السنة */
  var HOUSE_KWH = 6000;/* kWh/أسرة/سنة — افتراض الاستهلاك المنزلي المُعلَن */
  var GRID_EF = 0.40;  /* tCO2/MWh — معامل انبعاث شبكة عُمان الغازية */
  var CF_MAX = 0.65;   /* حدّ معقول لمزرعة برية: ما فوقه خطأ في المدخلات */

  /* مواقع قياس حقيقية البنية (القيم من جدول الموارد أعلاه) */
  var SITES = [
    { v10: 5.8, k: 2.10, a: 0.16 },  /* 0 الدقم — وادي قهوان */
    { v10: 6.1, k: 2.15, a: 0.16 },  /* 1 الدقم — هضبة السوادة */
    { v10: 5.0, k: 2.00, a: 0.16 },  /* 2 صور — رأس الفيل */
    { v10: 6.4, k: 2.35, a: 0.20 },  /* 3 ظلم — هضبة ظفار */
    { v10: 5.3, k: 1.95, a: 0.17 },  /* 4 مصيرة — الهضبة الشمالية */
    { v10: 4.2, k: 1.85, a: 0.18 },  /* 5 خصب — مسندم */
    { v10: 3.1, k: 1.70, a: 0.22 },  /* 6 نزوى — الداخل */
    { v10: null, k: null, a: null }  /* 7 موقع مخصص */
  ];

  /* Lanczos approximation for gamma(1 + 1/k) */
  function gamma(z) {
    var g = [76.18009172947146, -86.50532032941677, 24.01409824083091,
             -1.231739572450155, 0.1208650973866179e-2, -0.5395239385e-8];
    var x = z, y = z, tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    var ser = 1.000000000190015;
    for (var j = 0; j < 6; j++) { y += 1; ser += g[j] / y; }
    return Math.exp(-tmp + Math.log(2.5066282746310005 * ser / x));
  }

  function num(id, lo, hi, dflt) {
    var el = document.getElementById(id);
    var v = parseFloat(el.value);
    if (!isFinite(v)) return dflt;
    return Math.min(Math.max(v, lo), hi);
  }

  var form = document.getElementById("calcForm");
  var out = document.getElementById("calcOut");
  var sel = document.getElementById("site");
  var ids = ["power", "rotor", "hub", "speed", "weibull", "shear", "avail"];
  var els = {};
  ids.forEach(function (id) { els[id] = document.getElementById(id); });

  var fmtInt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  function i(n) { return fmtInt.format(Math.round(n)); }
  function d1(n) { return n.toFixed(1); }
  function d2(n) { return n.toFixed(2); }

  var views = {
    area: document.getElementById("sArea"),
    load: document.getElementById("sLoad"),
    hub: document.getElementById("sHub"),
    scale: document.getElementById("sScale"),
    rated: document.getElementById("sRated"),
    avg: document.getElementById("sAvg"),
    gross: document.getElementById("sGross"),
    net: document.getElementById("sNet"),
    mwh: document.getElementById("oMwh"),
    cf: document.getElementById("oCf"),
    flh: document.getElementById("oFlh"),
    hh: document.getElementById("oHh"),
    co2: document.getElementById("oCo2"),
    note: document.getElementById("oNote"),
    check: document.getElementById("oCheck"),
    availOut: document.getElementById("availOut"),
    curve: document.getElementById("curveGrid")
  };

  /* منحنى قدرة بتقريب مكعّبي بين بدء التشغيل وسرعة التصميم */
  function powerAt(v, rated, nameplate) {
    if (v < VCI || v >= VCO) return 0;
    if (v >= rated) return nameplate;
    return nameplate * (Math.pow(v, 3) - Math.pow(VCI, 3)) / (Math.pow(rated, 3) - Math.pow(VCI, 3));
  }

  function compute() {
    var P = num("power", 300, 20000, 5000);          /* kW اسمية */
    var D = num("rotor", 40, 200, 126);              /* m قطر الدوار */
    var H = num("hub", 60, 180, 120);                /* m ارتفاع المحور */
    var v10 = num("speed", 3.5, 12, 5.8);            /* m/s عند 10 م */
    var k = num("weibull", 1.4, 3.2, 2.1);           /* معامل شكل ويبول */
    var a = num("shear", 0.08, 0.35, 0.16);          /* أس معامل القص */
    var avail = num("avail", 80, 99.5, 96) / 100;    /* توافر الشبكة */

    var area = Math.PI * D * D / 4;                  /* m² */
    var load = P * 1000 / area;                      /* W/m² */
    var vHub = v10 * Math.pow(H / 10, a);            /* m/s عند المحور */
    var scale = vHub / gamma(1 + 1 / k);             /* مقياس ويبول */

    /* سرعة التصميم مشتقة من الحمل النوعي — لا رقم حر */
    var rated = Math.pow((P * 1000) / (0.5 * RHO * CP * ETA * area), 1 / 3);

    var flag = null, flagKind = "";
    if (rated <= VCI + 0.5) {
      /* دوار أضخم من اللازم للقدرة الاسمية: تصل الاسمية قبل بدء التشغيل عمليًا */
      flag = "دوار ضخم جدًا مقابل قدرة اسمية صغيرة: سرعة التصميم المشتقة <bdi class=\"n\">" + d2(rated) +
             "</bdi> <bdi class=\"n\">m/s</bdi> تقع عند حد بدء التشغيل تقريبًا، فيعمل التوربين مُحمَّلًا على الاسمية معظم الوقت. " +
             "قُيِّدت سرعة التصميم إلى <bdi class=\"n\">" + d2(VCI + 0.5) + " m/s</bdi>، والنتيجة عند هذه النقطة مثالية نظريًا لا عملية: " +
             "اختر قدرة اسمية أعلى أو دوارًا أصغر.";
      flagKind = "impossible";
      rated = VCI + 0.5;
    }
    if (rated > 20) {
      flag = "قطر الدوار صغير جدًا مقابل القدرة الاسمية (حمل نوعي <bdi class=\"n\">" + i(load) +
             " W/m²</bdi>)، فتصبح سرعة التصميم المشتقة <bdi class=\"n\">" + d1(rated) +
             " m/s</bdi> أعلى من سرعة الإيقاف عمليًا. لا آلة تجارية بهذا التحميل: وسّع الدوار أو أنقص القدرة.";
      flagKind = "impossible";
      rated = Math.min(rated, VCO - 1);
    }

    /* التكامل العددي على توزيع ويبول — قاعدة نقطة المنتصف، خطوة 0.02 m/s */
    var avgPower = 0, STEP = 0.02;
    for (var v = 0; v < 40; v += STEP) {
      var vm = v + STEP / 2;
      var pdf = (k / scale) * Math.pow(vm / scale, k - 1) * Math.exp(-Math.pow(vm / scale, k));
      avgPower += powerAt(vm, rated, P) * pdf * STEP;
    }

    var grossCF = avgPower / P;
    var netCF = grossCF * avail;
    if (netCF > CF_MAX) {
      var shown = netCF;
      netCF = CF_MAX;
      grossCF = Math.min(grossCF, CF_MAX / avail);
      avgPower = grossCF * P;
      flag = "معامل السعة الناتج <bdi class=\"n\">" + d1(shown * 100) + "%</bdi> يتجاوز الحد المعقول للتطبيقات البرية " +
             "(<bdi class=\"n\">65%</bdi>)، وهو ناتج تركيبة مدخلات غير قابلة للتنفيذ في موقع حقيقي: ريح قوية جدًا مع " +
             "تحميل منخفض، أو توافر مبالغ فيه. جُمِّد الناتج عند <bdi class=\"n\">65%</bdi>. راجع " +
             "<bdi class=\"n\">k</bdi> و<bdi class=\"n\">v10</bdi> من سجل قياس فعلي.";
      flagKind = "impossible";
    }

    var mwh = avgPower * HOURS * avail / 1000;
    var flh = mwh * 1000 / P;
    var households = mwh * 1000 / HOUSE_KWH;
    var co2 = mwh * GRID_EF;

    return {
      P: P, D: D, H: H, v10: v10, k: k, a: a, avail: avail, area: area, load: load,
      vHub: vHub, scale: scale, rated: rated, avgPower: avgPower, grossCF: grossCF,
      netCF: netCF, mwh: mwh, flh: flh, households: households, co2: co2,
      flag: flag, flagKind: flagKind, vHubBelowCutIn: vHub < VCI
    };
  }

  function renderCurve(r) {
    var cells = views.curve.children;
    for (var idx = 0; idx < cells.length; idx++) {
      var label = cells[idx].querySelector("b").textContent;
      var v = label === "12+" ? r.rated : parseFloat(label);
      if (label === "12+") v = Math.max(r.rated, 12);
      var p = powerAt(v, r.rated, r.P) / r.P;
      var pct = Math.round(p * 100);
      cells[idx].querySelector("i").style.setProperty("--h", pct + "%");
      cells[idx].querySelector("span").textContent = pct + "%";
    }
  }

  function render() {
    var r = compute();

    views.availOut.innerHTML = '<bdi class="n">' + d1(r.avail * 100) + '%</bdi>';
    views.area.innerHTML = i(r.area) + " m²";
    views.load.innerHTML = i(r.load) + " W/m²";
    views.hub.innerHTML = d2(r.vHub) + " m/s";
    views.scale.innerHTML = d2(r.scale) + " m/s";
    views.rated.innerHTML = d2(r.rated) + " m/s";
    views.avg.innerHTML = i(r.avgPower) + " kW";
    views.gross.innerHTML = d1(r.grossCF * 100) + "%";
    views.net.innerHTML = d1(r.netCF * 100) + "%";

    views.mwh.innerHTML = i(r.mwh) + " <i>MWh</i>";
    views.cf.innerHTML = d1(r.netCF * 100) + "%";
    views.flh.innerHTML = i(r.flh) + " h";
    views.hh.innerHTML = i(r.households);
    views.co2.innerHTML = i(r.co2) + " t";

    views.check.innerHTML = i(r.avgPower) + " kW × 8,760 h × " + r.avail.toFixed(2) +
                            " ÷ 1,000 = " + i(r.mwh) + " MWh";

    var note;
    if (r.flag) {
      note = r.flag;
    } else if (r.vHubBelowCutIn) {
      note = "متوسط الريح عند المحور <bdi class=\"n\">" + d2(r.vHub) +
             " m/s</bdi> دون سرعة بدء التشغيل <bdi class=\"n\">3.0 m/s</bdi> تقريبًا: لا إنتاج يُذكر. " +
             "الموقع غير صالح لتقنية الرياح مهما كان حجم التوربين.";
    } else if (r.mwh === 0) {
      note = "لم يُنتج النموذج أي طاقة عند هذه المدخلات.";
    } else {
      /* نصيب الساعات فوق سرعة التصميم — قدرة ضائعة بسبب الحصر عند الاسمية */
      var above = Math.exp(-Math.pow(r.rated / r.scale, r.k)) - Math.exp(-Math.pow(VCO / r.scale, r.k));
      note = "لا معامل معايرة مخفيًا: القدرة تُحصر عند الاسمية فوق <bdi class=\"n\">" + d2(r.rated) +
             " m/s</bdi>، أي نحو <bdi class=\"n\">" + Math.round(above * 100) +
             "%</bdi> من ساعات السنة؛ ما فوق الاسمية يضيع في التحميل الزائد — لهذا يرفع المطورون التحميل النوعي في المواقع الغنية بدلًا من توسيع الدوار.";
    }
    views.note.innerHTML = note;
    out.classList.toggle("is-warn", !!r.flag);

    renderCurve(r);

    if (!reduce) {
      out.classList.add("is-flash");
      window.setTimeout(function () { out.classList.remove("is-flash"); }, 260);
    }
  }

  /* presets: تملأ الحقول من جدول القياس */
  sel.addEventListener("change", function () {
    var s = SITES[parseInt(sel.value, 10) || 0];
    if (s.v10 === null) return; /* موقع مخصص: لا تلمس المدخلات */
    els.speed.value = s.v10;
    els.weibull.value = s.k.toFixed(2);
    els.shear.value = s.a.toFixed(2);
    render();
  });

  ids.forEach(function (id) {
    els[id].addEventListener("input", render);
    els[id].addEventListener("change", render);
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    /* بدون خادم: نعيد الحساب فقط ونُبقي التركيز في الأداة */
    render();
  });

  render();
})();
