(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NS = "http://www.w3.org/2000/svg";

  /* ============================================================
     shared helpers
     ============================================================ */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.setAttribute("class", cls);
    if (text != null) n.textContent = text;
    return n;
  }
  function num(parent, cls, value) {          /* digits go in <bdi> */
    var b = el("bdi", cls, value);
    parent.appendChild(b);
    return b;
  }
  function clock(sec) {
    var m = Math.floor(sec / 60), s = Math.round(sec % 60);
    return m + ":" + (s < 10 ? "0" + s : s);
  }
  function g(grams) { return grams.toFixed(2); }
  function ml(v) { return Math.round(v).toLocaleString("en-US"); }
  function money(v) { return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  /* ============================================================
     sticky bar + mobile nav
     ============================================================ */
  var bar = $("topbar");
  function onScroll() { bar.classList.toggle("is-stuck", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var menuBtn = $("menuBtn"), mobileNav = $("mobileNav");
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
    for (var i = 0; i < items.length; i++) items[i].classList.add("is-in");
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, k) {
        if (!entry.isIntersecting) return;
        entry.target.style.transitionDelay = Math.min(k * 70, 210) + "ms";
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.1 });
    for (var j = 0; j < items.length; j++) io.observe(items[j]);
  }

  /* ============================================================
     roast data — the real schedule used on the 15 kg drum
     charge 205°C · turning point 92°C @ 01:35 · first crack 196°C
     ============================================================ */
  var CHARGE = 205, TP_T = 95, TP_TEMP = 92, FC_TEMP = 196, BATCH_IN = 12;

  var PROFILES = {
    light: {
      name: "تحميص فاتح",
      fc: 490, total: 570, drop: 204, agtron: 74, loss: 13.6,
      lede: "نُنزل الحبة بعد الفرقعة الأولى بدقيقة وعشرين ثانية: لاكرملية محدودة، فالحمض والروائح الطيّارة تبقى كاملة تقريبًا.",
      notes: ["ياسمين", "خوخ أبيض", "ليمون صقلي", "شاي أسود"],
      bars: { "الحموضة": 9, "القوام": 4, "الحلاوة": 7, "المرارة": 1 },
      use: "الملف الذي نحمّصه للدلّة وللمرشّحات: الفنجان نظيف ويُشرب باردًا دون أن ينعطف.",
      cap: "منحنى حرارة الحبة مقابل الزمن · ملف فاتح — إسقاط مبكر بعد الفرقعة الأولى"
    },
    medium: {
      name: "تحميص متوسط",
      fc: 530, total: 660, drop: 212, agtron: 58, loss: 15.8,
      lede: "نُنزل الحبة بعد الفرقعة الأولى بدقيقة وعشر ثوانٍ: السكر يبدأ الكراملية دون أن يضيع حمض الفاكهة.",
      notes: ["عسل سدر", "برتقال دموي", "لوز محمّص", "تمر مجنون"],
      bars: { "الحموضة": 6, "القوام": 7, "الحلاوة": 8, "المرارة": 3 },
      use: "بن البار اليوم، وصالح للمرشَّح وللباش معًا دون تغيير كبير في الوصفة.",
      cap: "منحنى حرارة الحبة مقابل الزمن · ملف متوسط — هذا ما نحمّصه لبار الطائف"
    },
    dark: {
      name: "تحميص غامق",
      fc: 570, total: 760, drop: 221, agtron: 42, loss: 17.9,
      lede: "ثلاث دقائق وعشر ثوانٍ تطوير بعد الفرقعة الأولى وثماني: الكراملية تذهب إلى السكر المحروق وتظهر زيوت السطح.",
      notes: ["كاكاو مرّ", "تمر حلاب", "خشب محفوظ", "دبس"],
      bars: { "الحموضة": 3, "القوام": 9, "الحلاوة": 6, "المرارة": 7 },
      use: "نطرحه للإسبريسو بالحليب في أيام البرد فقط؛ على المرشَّح يُطبغ على الأصل.",
      cap: "منحنى حرارة الحبة مقابل الزمن · ملف غامق — تطوير طويل ودرجة إسقاط أعلى"
    }
  };

  /* ============================================================
     SVG roast curve (signature): time on X, bean temp on Y
     ============================================================ */
  function curvePoints(p) {
    var pts = [[0, CHARGE], [TP_T, TP_TEMP]];
    var span = p.total - TP_T, k = 3.2, denom = 1 - Math.exp(-k);
    for (var t = TP_T + 15; t <= p.total; t += 15) {
      var u = (t - TP_T) / span;
      pts.push([t, TP_TEMP + (p.drop - TP_TEMP) * (1 - Math.exp(-k * u)) / denom]);
    }
    pts.push([p.total, p.drop]);
    return pts;
  }

  function shape(svg, p) {
    var vb = svg.getAttribute("viewBox").split(" ");
    var W = parseFloat(vb[2]), H = parseFloat(vb[3]);
    var padS = 46, padE = 14, padT = 20, padB = 30;
    var X0 = padS, X1 = W - padE, Y0 = H - padB, Y1 = padT;
    var tMax = 840, tMin = 60, tMaxDeg = 240;

    function px(t) { return X0 + (X1 - X0) * (t / tMax); }
    function py(T) { return Y0 - (Y0 - Y1) * ((T - tMin) / (tMaxDeg - tMin)); }

    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    function node(tag, attrs) {
      var n = document.createElementNS(NS, tag);
      for (var a in attrs) if (attrs.hasOwnProperty(a)) n.setAttribute(a, attrs[a]);
      svg.appendChild(n);
      return n;
    }

    /* horizontal grid + temperature axis labels */
    var temps = [100, 150, 200];
    temps.forEach(function (T) {
      node("line", { x1: X0, y1: py(T), x2: X1, y2: py(T), "class": "cv-grid", fill: "none", stroke: "#E0D6C4" });
      var lb = node("text", { x: X0 - 8, y: py(T) + 4, "text-anchor": "end", "class": "cv-lbl", fill: "#7C6B5B", direction: "ltr" });
      lb.textContent = String(T);
    });
    node("line", { x1: X0, y1: Y0, x2: X1, y2: Y0, "class": "cv-axis", fill: "none", stroke: "#C9BCA4" });

    /* vertical grid + time axis labels */
    [0, 180, 360, 540, 720].forEach(function (t) {
      node("line", { x1: px(t), y1: Y1, x2: px(t), y2: Y0, "class": "cv-grid", fill: "none", stroke: "#E0D6C4" });
      var lb = node("text", { x: px(t), y: Y0 + 18, "text-anchor": "middle", "class": "cv-lbl", fill: "#7C6B5B", direction: "ltr" });
      lb.textContent = t === 0 ? "0" : clock(t);
    });

    var pts = curvePoints(p);
    var d = pts.map(function (q, k) { return (k ? "L" : "M") + px(q[0]).toFixed(1) + " " + py(q[1]).toFixed(1); }).join(" ");

    node("path", { d: d + " L" + px(p.total).toFixed(1) + " " + Y0 + " L" + px(0).toFixed(1) + " " + Y0 + " Z", "class": "cv-area", fill: "#F1E4D4" });
    node("path", { d: d, "class": "cv-line", fill: "none", stroke: "#A2571F" });

    /* turning point, first crack, drop */
    node("line", { x1: px(p.fc), y1: py(FC_TEMP), x2: px(p.fc), y2: Y0, "class": "cv-mark", fill: "none", stroke: "#C9BCA4" });
    node("line", { x1: px(p.total), y1: py(p.drop), x2: px(p.total), y2: Y0, "class": "cv-mark", fill: "none", stroke: "#C9BCA4" });

    node("circle", { cx: px(TP_T).toFixed(1), cy: py(TP_TEMP).toFixed(1), r: 3.4, "class": "cv-dot--tp", fill: "#FBF8F2", stroke: "#7C6B5B", "stroke-width": 1.4 });
    node("circle", { cx: px(p.fc).toFixed(1), cy: py(FC_TEMP).toFixed(1), r: 4.4, "class": "cv-dot--fc", fill: "#FBF8F2", stroke: "#4C3D31", "stroke-width": 1.6 });
    node("circle", { cx: px(p.total).toFixed(1), cy: py(p.drop).toFixed(1), r: 5.4, "class": "cv-dot", fill: "#FBF8F2", stroke: "#A2571F", "stroke-width": 2.2 });

    function ev(x, y, anchor, txt, cls) {
      var t = node("text", { x: x, y: y, "text-anchor": anchor, "class": cls || "cv-ev", fill: "#4C3D31", direction: "ltr" });
      t.textContent = txt;
    }
    ev(px(p.total) - 6, py(p.drop) - 10, "end", "الإسقاط " + p.drop + "°", "cv-ev");
    ev(px(p.fc) + 6, py(FC_TEMP) - 10, "start", "الفرقعة الأولى 196° · " + clock(p.fc), "cv-ev");
    ev(px(TP_T) + 6, py(TP_TEMP) - 8, "start", "نقطة التحوّل " + clock(TP_T), "cv-ev");
  }

  /* ============================================================
     demo 1 — roast profile selector
     ============================================================ */
  var profBtns = document.querySelectorAll(".prof__btn");
  var profNotes = $("profNotes"), profBars = $("profBars"), profSpec = $("profSpec");
  var heroCurve = $("heroCurve"), profCurve = $("profCurve");
  var current = "medium";

  function applyProfile(key) {
    var p = PROFILES[key];
    current = key;
    shape(profCurve, p);
    $("profName").textContent = p.name;
    $("profLede").textContent = p.lede;
    $("profCurveCap").textContent = p.cap;
    $("beansCap").textContent = "حبّ محمّص على طاولة التبريد · أجاترون " + p.agtron + " للدفعة " + (key === "medium" ? "12.00 كغ" : g(BATCH_IN * (1 - p.loss / 100)) + " كغ ناتج");

    profNotes.textContent = "";
    p.notes.forEach(function (n) { profNotes.appendChild(el("li", null, n)); });

    profBars.textContent = "";
    Object.keys(p.bars).forEach(function (label) {
      var v = p.bars[label];
      var row = el("div", "bar");
      row.appendChild(el("span", null, label));
      var track = el("div", "bar__track");
      var fill = el("i");
      fill.style.inlineSize = (v * 10) + "%";
      track.appendChild(fill);
      row.appendChild(track);
      num(row, null, String(v) + "/10");
      profBars.appendChild(row);
    });

    var out = BATCH_IN * (1 - p.loss / 100);
    var dev = p.total - p.fc;
    $("beansCap").textContent = "حبّ من دفعة اليوم على طاولة التبريد · أجاترون " + p.agtron + " · الناتج " + g(out) + " كغ من " + g(BATCH_IN) + " كغ أخضر";
    var spec = [
      ["درجة الإسقاط", p.drop + " °C", ""],
      ["زمن التحميص الكلي", clock(p.total), ""],
      ["الفرقعة الأولى", clock(p.fc) + " · " + FC_TEMP + " °C", ""],
      ["زمن التطوير", clock(dev) + " · " + (dev / p.total * 100).toFixed(1) + "%", ""],
      ["أجاترون (حبوب كاملة)", String(p.agtron), ""],
      ["فقد الوزن", p.loss.toFixed(1) + "%", ""],
      ["ناتج دفعة <bdi>12.00</bdi> كغ", g(out), "كغ"],
      ["أكياس <bdi>250</bdi> غ", String(Math.floor(out * 1000 / 250)), "كيسًا"]
    ];
    profSpec.textContent = "";
    spec.forEach(function (row) {
      var wrapEl = el("div");
      var dtEl = el("dt");
      dtEl.innerHTML = row[0];
      wrapEl.appendChild(dtEl);
      var dd = el("dd");
      num(dd, null, row[1]);
      if (row[2]) dd.appendChild(document.createTextNode(" " + row[2]));
      wrapEl.appendChild(dd);
      profSpec.appendChild(wrapEl);
    });

    $("profUse").textContent = p.use;
    for (var k = 0; k < profBtns.length; k++) {
      var on = profBtns[k].getAttribute("data-profile") === key;
      profBtns[k].classList.toggle("is-on", on);
      profBtns[k].setAttribute("aria-pressed", String(on));
    }
  }

  profBtns.forEach(function (b) {
    b.addEventListener("click", function () { applyProfile(b.getAttribute("data-profile")); });
  });

  /* hero record + demo both start on today's roast (medium) */
  shape(heroCurve, PROFILES.medium);
  applyProfile("medium");

  /* ============================================================
     demo 2 — brew ratio calculator
     water = dose × ratio · served = water × (1 − simmer loss) − dose × absorption
     ============================================================ */
  var METHODS = {
    v60: {
      ratios: [15, 16, 18], ratio: 16, dose: 20, water: 320,
      grind: 700, grindName: "متوسط ناعم", temp: 94, tempNote: "غليان الطائف يكفيها",
      time: "3:00", timeNote: "من أول صبّة إلى آخر قطرة",
      cup: 240, absorb: 2, simmer: 0,
      note: "نسبة <bdi>1:16</bdi> هي نقطة البداية. إن غلبت الحموضة اجعل الطحن أنعم، وإن غلبت المرارة اجعله أخشن — لا تغيّر النسبة أولًا.",
      steps: function (dose, water, served) {
        return [
          "اشطف الورقة بماء مغلي وتخلّص من ماء الشطف، وسخّن الدلة بها.",
          "أزهر القهوة بـ<bdi>" + ml(dose * 3) + "</bdi> مل (<bdi>3</bdi> أضعاف وزن البن) لمدة <bdi>40</bdi> ثانية.",
          "صُبّ حلزونيًا حتى <bdi>" + ml(water * 0.62) + "</bdi> مل، واترك المستوى يهبط قليلًا.",
          "أكمِل إلى <bdi>" + ml(water) + "</bdi> مل قبل أن يجفّ سطح القهوة في الورقة.",
          "اهزّ الدلة اهتزازة واحدة، وأكمِل حتى <bdi>3:00</bdi>؛ الناتج في الكوب <bdi>" + ml(served) + "</bdi> مل."
        ];
      }
    },
    dallah: {
      ratios: [12, 15, 18], ratio: 15, dose: 60, water: 900,
      grind: 1200, grindName: "خشن جدًا", temp: 92, tempNote: "بعد أول غليان، على تهدئة",
      time: "25:00", timeNote: "<bdi>20</bdi> تهدئة + <bdi>5</bdi> راحة",
      cup: 60, absorb: 2, simmer: 12,
      note: "الدلّة لا تُضبط بدقة المرشَّح: هذا الحساب يعطي نفس قوة الفنجان الذي نقدّمه في البار، على غليان <bdi>93.5°C</bdi> وبلا ضغط.",
      steps: function (dose, water, served, cardamom) {
        return [
          "أغلِ <bdi>" + ml(water) + "</bdi> مل من الماء في الدلة النحاسية.",
          "اطحن <bdi>" + dose.toFixed(1) + "</bdi> غ طحنًا خشنًا جدًا مع <bdi>" + cardamom + "</bdi> غ هيل مُكسّر لا مطحون.",
          "أضف البن والهيل، ثم أعدْ الحرارة إلى <bdi>92°C</bdi> واتركها <bdi>20</bdi> دقيقة على نار هادئة دون غليان قوي.",
          "ارفع الدلة ودعها <bdi>5</bdi> دقائق لترسيب الطحن، ثم صفِّ في دلّة التقديم.",
          "تُقدَّم سادة: <bdi>" + ml(served) + "</bdi> مل = <bdi>" + (served / 60).toFixed(1) + "</bdi> فنجانًا، ويُحلى بالتمر لا بالسكّر."
        ];
      }
    },
    press: {
      ratios: [12, 15, 18], ratio: 15, dose: 30, water: 450,
      grind: 1000, grindName: "خشن", temp: 94, tempNote: "من الغلاية مباشرة",
      time: "5:30", timeNote: "<bdi>4:00</bdi> نقع + <bdi>1:30</bdi> الكبس",
      cup: 180, absorb: 2, simmer: 0,
      note: "الطحن يبقى في الماء كل الزمن؛ تجاوز <bdi>6:00</bdi> دقائق يعني مرارة لا تصلحها إضافات. اسكب كل الكمية في الفنجان.",
      steps: function (dose, water, served) {
        return [
          "سخّن الفرنكس بماء مغلي ثم تخلّص من ماء التسخين.",
          "ضع <bdi>" + dose.toFixed(1) + "</bdi> غ من الطحن الخشن وأضف <bdi>" + ml(water) + "</bdi> مل على <bdi>94°C</bdi>.",
          "اتركها <bdi>4:00</bdi> دقائق، ثم اكسر القشرة بملعقة وازِل الرغوة والحبوب الطافية.",
          "أغلق المكبس ببطء عند <bdi>5:00</bdi>، ولا تكمل الضغط حتى آخره.",
          "اسكب فورًا: في الكوب <bdi>" + ml(served) + "</bdi> مل (<bdi>" + (served / 180).toFixed(1) + "</bdi> كوبًا)."
        ];
      }
    }
  };

  var brew = { m: "v60", src: "dose" };
  var doseIn = $("dose"), waterIn = $("yieldWater"), ratiosBox = $("ratios");
  var outPanel = $("brewOut"), brewSteps = $("brewSteps");

  function fmtRatio(r) { return "1:" + (Math.round(r * 10) / 10).toFixed(1); }

  function renderRatios() {
    var cfg = METHODS[brew.m];
    ratiosBox.textContent = "";
    cfg.ratios.forEach(function (r) {
      var b = el("button", "ratio" + (r === cfg.ratio ? " is-on" : ""), null);
      b.type = "button";
      b.setAttribute("aria-pressed", String(r === cfg.ratio));
      num(b, null, fmtRatio(r));
      b.addEventListener("click", function () {
        cfg.ratio = r;
        brew.src = "dose";
        waterIn.value = Math.round(cfg.dose * r);
        renderRatios();
        calcBrew();
      });
      ratiosBox.appendChild(b);
    });
  }

  function calcBrew() {
    var cfg = METHODS[brew.m];
    var dose, water;
    if (brew.src === "dose") {
      dose = parseFloat(doseIn.value);
      if (!isFinite(dose) || dose <= 0) dose = cfg.dose;
      water = Math.round(dose * cfg.ratio);
      waterIn.value = water;
    } else {
      water = parseFloat(waterIn.value);
      if (!isFinite(water) || water <= 0) water = cfg.water;
      dose = Math.round(water / cfg.ratio * 10) / 10;
      doseIn.value = dose.toFixed(1);
    }
    cfg.dose = dose; cfg.water = water;

    var served = water * (1 - cfg.simmer / 100) - dose * cfg.absorb;
    if (served < 0) served = 0;
    var cardamom = Math.round(dose * 0.25);

    $("oWater").textContent = ml(water);
    $("oDose").textContent = dose.toFixed(1);
    $("oRatio").textContent = fmtRatio(water / dose);
    $("oServed").textContent = ml(served);
    $("oCups").textContent = (served / cfg.cup).toFixed(1);
    $("oCupsUnit").textContent = cfg.cup <= 60 ? "فنجانًا" : "كوبًا";
    $("oGrind").textContent = ml(cfg.grind);
    $("oGrindName").textContent = cfg.grindName;
    $("oTemp").textContent = String(cfg.temp);
    $("oTempNote").textContent = cfg.tempNote;
    $("oTime").textContent = cfg.time;
    $("oTimeNote").innerHTML = cfg.timeNote;
    $("brewNote").innerHTML = cfg.note;

    brewSteps.textContent = "";
    cfg.steps(dose, water, served, cardamom).forEach(function (s) {
      var li = el("li");
      li.innerHTML = s;
      brewSteps.appendChild(li);
    });

    if (!reduce) {
      outPanel.classList.add("is-flash");
      window.setTimeout(function () { outPanel.classList.remove("is-flash"); }, 240);
    }
  }

  doseIn.addEventListener("input", function () { brew.src = "dose"; calcBrew(); });
  waterIn.addEventListener("input", function () { brew.src = "water"; calcBrew(); });

  document.querySelectorAll(".meth").forEach(function (b) {
    b.addEventListener("click", function () {
      brew.m = b.getAttribute("data-m");
      brew.src = "dose";
      var cfg = METHODS[brew.m];
      doseIn.value = cfg.dose.toFixed(1);
      waterIn.value = Math.round(cfg.dose * cfg.ratio);
      document.querySelectorAll(".meth").forEach(function (o) {
        var on = o === b;
        o.classList.toggle("is-on", on);
        o.setAttribute("aria-pressed", String(on));
      });
      renderRatios();
      calcBrew();
    });
  });

  renderRatios();
  calcBrew();

  /* ============================================================
     demo 3 — seasonal menu board + in-page bill (15% VAT)
     ============================================================ */
  var CATS = [
    { id: "filter", title: "مرشَّح" },
    { id: "espresso", title: "إسبريسو وحليب" },
    { id: "dallah", title: "دلّة وبلدي" },
    { id: "cold", title: "بارد وموسمي" },
    { id: "bakery", title: "مخبوزات" }
  ];
  var MENU = [
    { n: "V60 — بن اليوم", d: "إثيوبيا · غوجي · تحميص متوسط · <bdi>240</bdi> مل", p: 22, c: "filter" },
    { n: "V60 — ضيف الموسم", d: "كينيا · نييري · تحميص فاتح · <bdi>240</bdi> مل", p: 28, c: "filter" },
    { n: "كميكس لفصلين", d: "<bdi>600</bdi> مل · نفس اللوت · يُحضر أمامك", p: 46, c: "filter" },
    { n: "دلوة التنقيط", d: "تنقيط بارد <bdi>4</bdi> ساعات · <bdi>300</bdi> مل", p: 32, c: "filter" },
    { n: "إسبريسو مزدوج", d: "<bdi>18</bdi> غ وزن · <bdi>36</bdi> غ ناتج · <bdi>28</bdi> ثانية", p: 16, c: "espresso" },
    { n: "كورتادو", d: "<bdi>150</bdi> مل · حليب مطهو على <bdi>60°C</bdi>", p: 18, c: "espresso" },
    { n: "فلات وايت", d: "<bdi>200</bdi> مل · طبقة ميكرو رقيقة", p: 22, c: "espresso" },
    { n: "كابتشينو", d: "<bdi>220</bdi> مل · رغوة أكثف", p: 20, c: "espresso" },
    { n: "دلّة دكّاية (فنجان)", d: "تحميص فاتح · هيل وزعفران · <bdi>60</bdi> مل", p: 12, c: "dallah" },
    { n: "دلّة صغيرة", d: "<bdi>4</bdi> فناجين · تُقدَّم مع تمر عقيلي", p: 42, c: "dallah" },
    { n: "دلّة كبيرة للجلسات", d: "<bdi>8</bdi> فناجين · صينية كاملة", p: 78, c: "dallah" },
    { n: "سحلب بالمكسرات", d: "موسم البرد · لوز وفستق حلبي", p: 24, c: "dallah" },
    { n: "تمر عقيلي بالقرفة", d: "حشوة قشطة · <bdi>3</bdi> حبات", p: 18, c: "dallah" },
    { n: "كولد برو", d: "<bdi>24</bdi> ساعة تبريد · <bdi>300</bdi> مل · مركز <bdi>1:8</bdi>", p: 24, c: "cold" },
    { n: "مثلّج الورد الطائف", d: "موسمي · ماء ورد من مزرعة المخواة · <bdi>350</bdi> مل", p: 28, c: "cold" },
    { n: "مثلّج عسل السدر", d: "لاتيه مثلّج محلّى بعسل السدر · <bdi>350</bdi> مل", p: 26, c: "cold" },
    { n: "كرواسون بالزبدة", d: "يُخبز صباحًا · <bdi>125</bdi> غ", p: 14, c: "bakery" },
    { n: "كيك الجزر والجوز", d: "شريحة · بقرفة الطائف", p: 18, c: "bakery" },
    { n: "بسبوسة بالفستق", d: "قطعة · بالسمن البلدي", p: 12, c: "bakery" },
    { n: "كوكي الشوكولاتة", d: "قطعتان · بحبة ملح", p: 10, c: "bakery" }
  ];
  var VAT = 0.15;
  var qty = {};
  var boardList = $("boardList");
  var shownCat = "all";

  function buildBoard() {
    boardList.textContent = "";
    var any = false;
    CATS.forEach(function (cat) {
      if (shownCat !== "all" && shownCat !== cat.id) return;
      any = true;
      boardList.appendChild(el("li", "board__group", cat.title));
      MENU.filter(function (m) { return m.c === cat.id; }).forEach(function (m) {
        var idx = MENU.indexOf(m);
        var b = el("button", "item");
        b.type = "button";
        b.setAttribute("data-idx", String(idx));
        var q = el("span", "item__qty");
        q.setAttribute("aria-hidden", "true");
        b.appendChild(q);
        var name = el("span", "item__name");
        name.appendChild(document.createTextNode(m.n));
        var small = el("small");
        small.innerHTML = m.d;
        name.appendChild(small);
        b.appendChild(name);
        b.appendChild(el("span", "item__lead"));
        var price = el("span", "item__price");
        num(price, null, String(m.p));
        price.appendChild(document.createTextNode(" ريال"));
        b.appendChild(price);
        boardList.appendChild(b);
        paintItem(idx);
      });
    });
    if (!any) boardList.appendChild(el("li", "board__empty", "لا أصناف في هذه الفئة هذا الموسم."));
  }

  function paintItem(idx) {
    var b = boardList.querySelector('.item[data-idx="' + idx + '"]');
    if (!b) return;
    var n = qty[idx] || 0;
    b.querySelector(".item__qty").textContent = n ? "×" + n : "";
    b.classList.toggle("is-in", n > 0);
  }

  function renderOrder() {
    var rows = $("orderRows");
    rows.textContent = "";
    var sub = 0, count = 0;
    MENU.forEach(function (m, idx) {
      var n = qty[idx] || 0;
      if (!n) return;
      count += n;
      var line = m.p * n;
      sub += line;
      var li = el("li");
      li.appendChild(el("span", null, m.n));
      var ctl = el("div", "order__qty");
      var minus = el("button", "qbtn", "−"); minus.type = "button";
      minus.setAttribute("aria-label", "أنقص " + m.n);
      minus.addEventListener("click", function () { setQty(idx, n - 1); });
      var val = el("span", "qval");
      num(val, null, String(n));
      var plus = el("button", "qbtn", "+"); plus.type = "button";
      plus.setAttribute("aria-label", "زد " + m.n);
      plus.addEventListener("click", function () { setQty(idx, n + 1); });
      ctl.appendChild(minus); ctl.appendChild(val); ctl.appendChild(plus);
      li.appendChild(ctl);
      var amt = el("span", "amt");
      num(amt, null, money(line));
      li.appendChild(amt);
      rows.appendChild(li);
    });
    var vat = sub * VAT;
    $("tSub").textContent = money(sub);
    $("tVat").textContent = money(vat);
    $("tTotal").textContent = money(sub + vat);
    $("orderCount").textContent = count ? " · " + count + (count === 1 ? " صنف" : " أصناف") : " فارغ";
    $("orderEmpty").hidden = count > 0;
    rows.hidden = count === 0;
    MENU.forEach(function (m, idx) { paintItem(idx); });
  }

  function setQty(idx, n) {
    if (n <= 0) delete qty[idx]; else qty[idx] = n;
    paintItem(idx);
    renderOrder();
  }

  boardList.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".item") : null;
    if (!b) return;
    var idx = parseInt(b.getAttribute("data-idx"), 10);
    setQty(idx, (qty[idx] || 0) + 1);
  });

  document.querySelectorAll(".cat").forEach(function (btn) {
    btn.addEventListener("click", function () {
      shownCat = btn.getAttribute("data-cat");
      document.querySelectorAll(".cat").forEach(function (o) {
        var on = o === btn;
        o.classList.toggle("is-on", on);
        o.setAttribute("aria-pressed", String(on));
      });
      buildBoard();
    });
  });

  $("orderClear").addEventListener("click", function () { qty = {}; renderOrder(); });

  buildBoard();
  renderOrder();
})();
