/* ============================================================
   كراج — karaaj.sy
   Scroll reveal + the search-and-quote calculator + directory filter.
   No network, no storage, no dependencies.
   ============================================================ */
(function () {
  "use strict";

  /* ────────────────────────────────────────────────────────────
     1 · SCROLL REVEAL  (runs first, and cannot be broken by
         anything below it)
     ──────────────────────────────────────────────────────────── */
  var revealNodes = [];

  function collectReveals() {
    revealNodes = [].slice.call(document.querySelectorAll(".rv"));
    // light stagger inside each sibling group so rows cascade
    revealNodes.forEach(function (el) {
      var sibs = [].slice.call(el.parentElement.children).filter(function (c) {
        return c.classList && c.classList.contains("rv");
      });
      var i = sibs.indexOf(el);
      el.style.setProperty("--d", (i < 0 ? 0 : i) * 70 + "ms");
    });
  }

  function revealAll() {
    revealNodes.forEach(function (el) { el.classList.add("is-in"); });
  }

  function revealViewportAndAbove() {
    var cut = window.innerHeight;
    revealNodes.forEach(function (el) {
      if (el.classList.contains("is-in")) return;
      var r = el.getBoundingClientRect();
      if (r.top < cut) el.classList.add("is-in");
    });
  }

  function initReveal() {
    collectReveals();

    var reduce = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { revealAll(); return; }

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
      revealNodes.forEach(function (el) { io.observe(el); });
    } else {
      revealAll();
      return;
    }

    /* Belt-and-braces: a blank first screen is the classic shipped bug.
       1200ms after parse, force-reveal anything already at or above the
       fold; 5s later, reveal absolutely everything still hidden. */
    setTimeout(revealViewportAndAbove, 1200);
    setTimeout(revealViewportAndAbove, 1900);
    setTimeout(revealAll, 5000);
  }

  try { initReveal(); } catch (e) { revealAll(); }

  /* ────────────────────────────────────────────────────────────
     2 · REFERENCE DATA
     Hours and parts prices come from the measured workshops, and are
     written into the HTML inputs (data-h / data-p) so the markup alone
     tells the truth about what is being computed.
     ──────────────────────────────────────────────────────────── */
  var BASE_HOURLY = 45000;     // ساعة يد عاملة مرجعية، ل.س
  var VAT_RATE = 0.10;         // ضريبة المبيعات العامة
  var FX = 12000;              // ل.س لكل دولار — تقديري، مراجَع أسبوعياً
  var FLOOR_AREA = 0.82;       // أقل معامل حي (الشيخ نجار)

  var QUALITY = {
    orig:  { label: "أصلي",         mult: 1.00, note: "قطعة بوكيل أو وكالة: سعرها ثابت تقريباً عبر الأحياء، ولها بضاعة مكتوبة." },
    after: { label: "تجاري",        mult: 0.58, note: "قطعة جديدة من مصنع غيروكيل. أقل كلفة، وغالباً بلا بضاعة مكتوبة — اتفق على الضمان شفهياً وبخطّين." },
    used:  { label: "مستعمل سليم",  mult: 0.35, note: "قطعة مفكّكة من سيارة مشطوبة ومفحوصة. لا تصلح أبداً للفرامل ولا للإطارات ولا لداخل المحرك." }
  };

  var SERVICE_META = {
    oil:    { name: "تغيير زيت وفلاتر" },
    brake:  { name: "بطانات فرامل أمامية" },
    ac:     { name: "صيانة وتبريد المكيف" },
    align:  { name: "ضبط زوايا وترصيص" },
    tyre:   { name: "تغيير 4 إطارات" },
    diag:   { name: "فحص كمبيوتر" },
    elec:   { name: "كهرباء عامة" },
    belt:   { name: "سير الكاتينة" },
    rad:    { name: "رديتر ومضخة ماء" },
    strip:  { name: "فك وتركيب محرك" }
  };

  var AREA_NOTES = {
    najjar:   "المنطقة الصناعية: إيجار أقل وتنافس أعلى وشراء من المستودع مباشرة — أدنى سعر ساعة في حلب، لكنها خارج المدينة.",
    maadi:    "ورش شعبية وأسعار قابلة للنقاش، وقطع بيك أب شام متوفرة في مستودعات الشارع.",
    saleha:   "وسط المدينة: سعر الساعة المرجعي بلا زيادة ولا نقصان، وأغلب الورش تصدر ورقة.",
    firkah:   "ورش سكنية تحت البيوت: زيادة يسيرة على الساعة مقابل قربها وقربها من الأحياء المزدحمة.",
    ashrafia: "ورش تشخيص متخصّصة وإيجار تجاري — أعلى ساعة في الدليل، وأدقّها في الكهرباء."
  };

  var AREA_LABEL = {
    najjar: "الشيخ نجار", maadi: "المعادي", saleha: "صلاح الدين",
    firkah: "الفرقان", ashrafia: "الأشرفية"
  };

  /* ────────────────────────────────────────────────────────────
     3 · HELPERS
     Every money line is rounded to the nearest 100 SYP *before* it is
     summed, so the printed table adds up to the printed total exactly.
     ──────────────────────────────────────────────────────────── */
  function r100(v) { return Math.round(v / 100) * 100; }
  function n(v) { return r100(v).toLocaleString("en-US"); }
  function hrs(v) { return (Math.round(v * 100) / 100).toFixed(2); }
  function usd(v) { return (v / FX).toFixed(2); }
  function el(id) { return document.getElementById(id); }
  function txt(id, s) { var e = el(id); if (e) e.textContent = s; }
  function setHTML(id, s) { var e = el(id); if (e) e.innerHTML = s; }

  var form = el("calcForm");
  var carSel = el("carSelect");
  var kmSel = el("kmSelect");
  var areaSel = el("areaSelect");
  var vatBox = el("vatToggle");

  function selectedCar() { return carSel.options[carSel.selectedIndex]; }
  function selectedArea() { return areaSel.options[areaSel.selectedIndex]; }

  function chosenServices() {
    return [].slice.call(form.querySelectorAll('input[name="service"]:checked'));
  }

  function chosenQuality() {
    var r = form.querySelector('input[name="quality"]:checked');
    return r ? r.value : "orig";
  }

  /* one row of the breakdown, fully deterministic */
  function lineFor(input, car, q, effRate) {
    var hours = parseFloat(input.getAttribute("data-h")) * parseFloat(car.dataset.labour);
    var partsBase = parseFloat(input.getAttribute("data-p"));
    var parts = r100(partsBase * parseFloat(car.dataset.parts) * q.mult);
    var labour = r100(hours * effRate);
    return {
      key: input.value,
      name: SERVICE_META[input.value] ? SERVICE_META[input.value].name : input.value,
      hours: hours, parts: parts, labour: labour, total: parts + labour,
      hasParts: partsBase > 0
    };
  }

  function compute(carKey, areaKey, qKey, kmKey, vatOn, inputs) {
    var car = null, area = null;
    [].forEach.call(carSel.options, function (o) { if (o.value === carKey) car = o; });
    [].forEach.call(areaSel.options, function (o) { if (o.value === areaKey) area = o; });
    if (!car || !area) return null;

    var q = QUALITY[qKey];
    var effRate = BASE_HOURLY * parseFloat(area.dataset.f);
    var lines = inputs.map(function (i) { return lineFor(i, car, q, effRate); });

    var sumH = 0, sumP = 0, sumL = 0;
    lines.forEach(function (l) { sumH += l.hours; sumP += l.parts; sumL += l.labour; });

    var subtotal = sumP + sumL;
    var vat = vatOn ? r100(subtotal * VAT_RATE) : 0;
    var total = subtotal + vat;

    // the same job in the cheapest quarter of the city, on identical assumptions
    var alt = computeAlt(car, q, inputs, vatOn);

    return {
      car: car, area: area, q: q, qKey: qKey, effRate: effRate, lines: lines,
      sumH: sumH, sumP: sumP, sumL: sumL,
      subtotal: subtotal, vat: vat, total: total,
      keys: lines.map(function (l) { return l.key; }),
      alt: alt, vatOn: vatOn, km: kmKey
    };
  }

  function computeAlt(car, q, inputs, vatOn) {
    var eff = BASE_HOURLY * FLOOR_AREA;
    var p = 0, l = 0;
    inputs.forEach(function (i) {
      var one = lineFor(i, car, q, eff);
      p += one.parts; l += one.labour;
    });
    var sub = p + l;
    return sub + (vatOn ? r100(sub * VAT_RATE) : 0);
  }

  /* ────────────────────────────────────────────────────────────
     4 · FLAGS — inline, not alerts. These are the calls a real
         Aleppo mechanic would make about your selection.
     ──────────────────────────────────────────────────────────── */
  function buildFlags(r) {
    var out = [];
    var k = r.keys, km = r.km, qk = r.qKey;
    var carName = r.car.textContent.split(" — ")[0];
    function has(s) { return k.indexOf(s) !== -1; }

    if (!k.length) {
      out.push(["bad", "اختر خدمة واحدة على الأقل — لا يمكن تسعير «صيانة» بلا عمل محدّد."]);
      return out;
    }

    if (km === "gt200" && !has("belt")) {
      out.push(["warn", "هذه السيارة تجاوزت <bdi class=\"num\" dir=\"ltr\">200,000</bdi> كم ولم تختر سير الكاتينة. " +
        "عند هذه المسافة الكاتينة هي ما يقتل المحرك لا الزيت — اطلب فحصها قبل أن تدفع لأي شيء آخر."]);
    }
    if (km === "lt100" && has("belt")) {
      out.push(["warn", "تغيير الكاتينة قبل <bdi class=\"num\" dir=\"ltr\">100,000</bdi> كم نادر أن يكون ضرورياً. " +
        "لا تدفع قبل أن يريك الورشة الشدّاد وهو يرتخي أمامك."]);
    }
    if (has("strip") && !has("belt") && km === "gt200") {
      out.push(["bad", "غير منطقي: فك وتركيب محرك على سيارة ثقيلة دون تغيير الكاتينة يعني فتح المحرك مرتين. " +
        "الكاتينة تُبدَّل أثناء الفك، وفرق السعر هو الشداد فقط."]);
    }
    if (has("strip") && has("oil")) {
      out.push(["warn", "لا تُغيّر الزيت قبل الفك والتركيب ثم بعده. اختر واحداً: الزيت بعد إعادة التجميع."]);
    }
    if (has("strip") && qk === "used") {
      out.push(["bad", "مستعمل سليم على قطع داخل المحرك لا يُقبل: حواجز الزيت وجسم الخانق المفكّك " +
        "يأخذان المحرك إلى حرارة أعلى. على الأقل تجاري."]);
    }
    if (has("tyre") && qk === "used") {
      out.push(["bad", "لا تشترِ إطارات مستعملة بهذا المنطق. الإطار المفكّك يُسعَّر بالسماكة لا بالسلامة، " +
        "والمطر في حلب يكتشفه قبل الفحص."]);
    }
    if (has("brake") && qk === "used") {
      out.push(["bad", "بطانات الفرامل ليست قطعة «مستعملة سليمة». هذا السطر وحده يستحق الانتقال إلى تجاري."]);
    }
    if (r.car.dataset.avail === "محدودة" && qk === "orig") {
      out.push(["warn", "قطع «" + carName + "» الأصلية محدودة التوفر في حلب. السعر محسوب على أساس " +
        "أنها تُستورد بالطلب: أضف <bdi class=\"num\" dir=\"ltr\">3</bdi>–<bdi class=\"num\" dir=\"ltr\">10</bdi> أيام انتظار، " +
        "واطلب صورة الفاتورة قبل التحويل."]);
    }
    if (!r.lines.some(function (l) { return l.hasParts; })) {
      out.push(["info", "كل الخدمات المختارة بلا قطع — الفاتورة كلها يد عاملة. " +
        "هنا يكون الفارق بين الورش هو الزمن لا المادة، وساعة الشيخ نجار " +
        "<bdi class=\"num\" dir=\"ltr\">" + n(BASE_HOURLY * FLOOR_AREA) + "</bdi> ل.س مقابل " +
        "<bdi class=\"num\" dir=\"ltr\">" + n(BASE_HOURLY * 1.14) + "</bdi> في الأشرفية."]);
    }
    if (has("diag") && !has("elec") && !has("belt") && !has("strip")) {
      out.push(["info", "منطق الترتيب: افحص بالكمبيوتر أولاً واقرأ العطل، ثم تعاقد على الإصلاح. " +
        "ورشة تُصلح قبل أن تفحص تبيعك ساعات لا قطع."]);
    }
    if (r.area.value !== "najjar" && r.alt > 0 && r.total - r.alt > 0) {
      out.push(["info", "نفس العمل ونفس القطع في الشيخ نجار: " +
        "<bdi class=\"num\" dir=\"ltr\">" + n(r.alt) + "</bdi> ل.س — أي أقل بـ<bdi class=\"num\" dir=\"ltr\">" +
        n(r.total - r.alt) + "</bdi> ل.س. إن كان مشوارك يوازي الفرق."]
      );
    }
    if (!r.vatOn) {
      out.push(["info", "المجموع دون ضريبة: الورشة لا تصدر ورقة نظامية. " +
        "لا تطالب بضمان مكتوب بلا فاتورة."]
      );
    }
    return out;
  }

  /* ────────────────────────────────────────────────────────────
     5 · PAINT
     ──────────────────────────────────────────────────────────── */
  function paint() {
    if (!carSel || !areaSel || !form) return;

    var inputs = chosenServices();
    var carKey = carSel.value, areaKey = areaSel.value;
    var qKey = chosenQuality(), kmKey = kmSel.value;
    var r = compute(carKey, areaKey, qKey, kmKey, vatBox.checked, inputs);
    if (!r) return;

    /* service row highlight */
    [].forEach.call(form.querySelectorAll('input[name="service"]'), function (i) {
      i.closest(".svc").classList.toggle("is-on", i.checked);
    });

    txt("totalSyp", n(r.total));
    txt("totalUsd", usd(r.total));
    txt("outHours", hrs(r.sumH));
    txt("outParts", n(r.sumP));
    txt("outLabour", n(r.sumL));
    txt("outRate", n(r.effRate));

    /* breakdown */
    var body = el("breakBody");
    if (body) {
      body.textContent = "";
      if (!r.lines.length) {
        var tr0 = document.createElement("tr");
        var td0 = document.createElement("td");
        td0.colSpan = 5;
        td0.className = "break-empty";
        td0.textContent = "لم تُختر أي خدمة — الجدول أعلاه فارغ.";
        tr0.appendChild(td0);
        body.appendChild(tr0);
      } else {
        r.lines.forEach(function (l) {
          var tr = document.createElement("tr");
          tr.className = "split-row";

          var th = document.createElement("th");
          th.scope = "row";
          th.textContent = l.name;

          var cH = document.createElement("td");
          cH.className = "num"; cH.textContent = hrs(l.hours);

          var cP = document.createElement("td");
          cP.className = "num";
          cP.textContent = l.hasParts ? n(l.parts) : "—";

          var cL = document.createElement("td");
          cL.className = "num"; cL.textContent = n(l.labour);

          var cT = document.createElement("td");
          cT.className = "num"; cT.textContent = n(l.total);

          tr.append(th, cH, cP, cL, cT);
          body.appendChild(tr);
        });
      }
    }
    txt("ftHours", hrs(r.sumH));
    txt("ftParts", n(r.sumP));
    txt("ftLabour", n(r.sumL));
    txt("ftSub", n(r.subtotal));

    var vatCell = el("vatCell"), vatCell2 = el("vatCell2");
    var vatLabel = el("vatLabel");
    if (r.vatOn) {
      if (vatLabel) vatLabel.innerHTML = 'ضريبة المبيعات <bdi class="num" dir="ltr">10%</bdi>';
      if (vatCell) vatCell.textContent = n(r.vat);
      if (vatCell2) vatCell2.textContent = n(r.vat);
    } else {
      if (vatLabel) vatLabel.textContent = "ضريبة المبيعات — مُطفأة";
      if (vatCell) vatCell.textContent = "—";
      if (vatCell2) vatCell2.textContent = "—";
    }

    /* flags */
    var fw = el("flags");
    if (fw) {
      fw.textContent = "";
      buildFlags(r).forEach(function (f) {
        var d = document.createElement("div");
        d.className = "flag flag-" + f[0];
        var g = document.createElement("span");
        g.className = "flag-g";
        g.textContent = f[0] === "bad" ? "×" : (f[0] === "warn" ? "!" : "i");
        var s = document.createElement("span");
        s.innerHTML = f[1];
        d.append(g, s);
        fw.appendChild(d);
      });
    }

    /* hints */
    var carName = r.car.textContent.split(" — ")[0];
    setHTML("carHint",
      "فئة " + r.car.dataset.class + " · محرك " + r.car.dataset.eng +
      ' · معامل القطع <bdi class="num" dir="ltr">' + r.car.dataset.parts + "</bdi>" +
      ' · معامل الزمن <bdi class="num" dir="ltr">' + r.car.dataset.labour + "</bdi>" +
      " · قطعها " + r.car.dataset.avail + ". الأشهر عليها: " + r.car.dataset.issue + ".");
    txt("areaHint", AREA_NOTES[r.area.value] || "");
    txt("qualityHint", r.q.note);

    /* make sure a control panel edit never leaves content hidden */
    revealNear();
  }

  function revealNear() {
    var cut = window.innerHeight;
    [].forEach.call(document.querySelectorAll(".rv:not(.is-in)"), function (elx) {
      if (elx.getBoundingClientRect().top < cut) elx.classList.add("is-in");
    });
  }

  if (form) {
    form.addEventListener("input", paint);
    form.addEventListener("change", paint);
  }
  paint();

  /* ────────────────────────────────────────────────────────────
     6 · DIRECTORY FILTER
     ──────────────────────────────────────────────────────────── */
  var dirSearch = el("dirSearch");
  var wsItems = [].slice.call(document.querySelectorAll(".ws"));
  var state = { area: "all", spec: "all", q: "" };

  function norm(s) {
    return s
      .replace(/[ً-ْٰ]/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function chipGroup(wrapId, attr, key) {
    var wrap = el(wrapId);
    if (!wrap) return;
    wrap.addEventListener("click", function (e) {
      var b = e.target.closest("[data-" + attr + "]");
      if (!b || !wrap.contains(b)) return;
      [].forEach.call(wrap.children, function (c) { c.classList.remove("is-on"); });
      b.classList.add("is-on");
      state[key] = b.getAttribute("data-" + attr);
      filterDir();
    });
  }

  function filterDir() {
    var shown = 0;
    var q = norm(state.q);
    wsItems.forEach(function (card) {
      var okArea = state.area === "all" || card.dataset.area === state.area;
      var okSpec = state.spec === "all" ||
        (card.dataset.spec || "").split(" ").indexOf(state.spec) !== -1;
      var hay = norm((card.dataset.name || "") + " " + card.textContent);
      var okQ = !q || hay.indexOf(q) !== -1;
      var ok = okArea && okSpec && okQ;
      card.hidden = !ok;
      if (ok) { shown++; card.classList.add("is-in"); }
    });
    txt("dirCount", String(shown));
    var none = el("dirNone");
    if (none) none.hidden = shown !== 0;
  }

  if (dirSearch) {
    dirSearch.addEventListener("input", function () {
      state.q = dirSearch.value;
      filterDir();
    });
  }
  chipGroup("areaChips", "area", "area");
  chipGroup("specChips", "spec", "spec");
  txt("dirCount", String(wsItems.length));

})();
