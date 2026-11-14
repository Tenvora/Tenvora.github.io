/* بيت الحكمة — hikma.iq
   1) كشف المحتوى عند التمرير + مفتتح زمنى احتياطى (1200ms)
   2) حاسبة الإصدار (كل الحسابات محليًا، بلا شبكة)
   3) قائمة الشريط الثابت على الشاشات الضيقة
*/
(function () {
  "use strict";

  /* reveal */
  var revealables = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  function show(el) {
    if (el && el.classList.contains("is-in") === false) el.classList.add("is-in");
  }

  function showInViewNow(margin) {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    revealables.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * margin && r.bottom > 0) show(el);
    });
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            show(e.target);
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );
    revealables.forEach(function (el) { io.observe(el); });
    /* safety net: never leave the first screen blank */
    showInViewNow(1.05);
    window.setTimeout(function () { showInViewNow(1.4); }, 1200);
  } else {
    revealables.forEach(show);
  }

  /* sticky nav */
  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (ev) {
      if (ev.target && ev.target.tagName === "A") {
        nav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* edition calculator */

  /* بيانات العناوين: عدد الكلمات بعد التحقيق وعدد الصفحات وشهود النص */
  var TITLES = [
    { id: "nafis", ar: "شرح تشريح القانون", author: "ابن النفيس · نحو 687هـ / 1288م",
      pages: 620, words: 118000, witnesses: 5, notes: 1040 },
    { id: "optics", ar: "كتاب المناظر", author: "ابن الهيثم · نحو 414هـ / 1021م",
      pages: 742, words: 141500, witnesses: 4, notes: 1310 },
    { id: "masud", ar: "القانون المسعودي", author: "البيروني · نحو 429هـ / 1037م",
      pages: 655, words: 126800, witnesses: 3, notes: 980 },
    { id: "ikhwan", ar: "رسائل إخوان الصفا", author: "البصرة · القرن العاشر الميلادي",
      pages: 810, words: 154200, witnesses: 6, notes: 1470 },
    { id: "hawami", ar: "الحاوي في الطب", author: "الرازي · نحو 313هـ / 925م",
      pages: 924, words: 168000, witnesses: 4, notes: 1620 }
  ];

  /* أسعار الترجمة الحرفية لكل كلمة مصدرية، وسعر المراجعة المختصة */
  var LANGS = {
    en: { label: "الإنجليزية", rate: 0.220, review: 0.038 },
    fr: { label: "الفرنسية", rate: 0.245, review: 0.042 }
  };

  /* كلفة الطباعة والتجليد للنسخة الواحدة قبل خصم حجم السحب */
  var BINDS = {
    hard: { label: "تجليد صلب", row: "طباعة وتجليد صلب", unit: 11.40 },
    paper: { label: "تجليد ورقي", row: "طباعة وتجليد ورقي", unit: 6.20 }
  };

  var TYPESET_PER_PAGE = 9.50;   /* التنضيد المتقابل مع الحواشي والمفهرسة */
  var LIBRARY_MARKUP = 1.6;      /* سعر المكتبة المقترح من كلفة النسخة */
  var FX = 1310;                 /* دينار عراقي لكل دولار */

  /* شرائح خصم حجم السحب: [الحد الأدنى للنسخ, المعامل] */
  var TIERS = [[2000, 0.74], [1200, 0.80], [800, 0.86], [500, 0.92], [0, 1.00]];

  function tierFactor(run) {
    for (var i = 0; i < TIERS.length; i++) {
      if (run >= TIERS[i][0]) return TIERS[i][1];
    }
    return 1;
  }

  var fInt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  var f2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var f3 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  function usd(n) { return "$" + fInt.format(n); }
  function usd2(n) { return "$" + f2.format(n); }
  function iqd(n) { return fInt.format(n) + " IQD"; }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  var form = document.getElementById("calc-form");
  if (!form) return;

  var selTitle = document.getElementById("c-title");
  var selRun = document.getElementById("c-run");
  var elTitleHint = document.getElementById("c-title-hint");
  var elLangHint = document.getElementById("c-lang-hint");
  var elRunHint = document.getElementById("c-run-hint");
  var elBindHint = document.getElementById("c-bind-hint");
  var sPages = document.getElementById("s-pages");
  var sWords = document.getElementById("s-words");
  var sRate = document.getElementById("s-rate");
  var body = document.getElementById("ledger-body");
  var totUsd = document.getElementById("tot-usd");
  var totNote = document.getElementById("tot-note");
  var keys = document.getElementById("calc-keys");

  TITLES.forEach(function (t, i) {
    var o = document.createElement("option");
    o.value = t.id;
    o.textContent = t.ar + " — " + t.author;
    if (i === 0) o.selected = true;
    selTitle.appendChild(o);
  });

  function pick() {
    var t = TITLES.filter(function (x) { return x.id === selTitle.value; })[0] || TITLES[0];
    var lang = (form.querySelector('input[name="lang"]:checked') || {}).value || "en";
    var bind = (form.querySelector('input[name="bind"]:checked') || {}).value || "hard";
    var run = parseInt(selRun.value, 10) || 300;
    return { title: t, lang: lang, bind: bind, run: run };
  }

  function compute(s) {
    var L = LANGS[s.lang], B = BINDS[s.bind];
    var factor = tierFactor(s.run);
    var discount = Math.round((1 - factor) * 100);

    var translation = Math.round(s.title.words * L.rate);
    var review = Math.round(s.title.words * L.review);
    var typeset = Math.round(s.title.pages * TYPESET_PER_PAGE);
    var unitPrint = Math.round(B.unit * factor * 100) / 100;
    var print = Math.round(unitPrint * s.run);
    var total = translation + review + typeset + print;
    var unitCost = Math.round((total / s.run) * 100) / 100;
    var libPrice = Math.round(unitCost * LIBRARY_MARKUP);

    return {
      translation: translation, review: review, typeset: typeset,
      unitPrint: unitPrint, print: print, total: total, bindRow: B.row,
      unitCost: unitCost, libPrice: libPrice,
      factor: factor, discount: discount,
      rate: L.rate, reviewRate: L.review, langLabel: L.label, bindLabel: B.label
    };
  }

  function row(name, how, amount) {
    return (
      '<tr>' +
        '<th scope="row">' + esc(name) + "</th>" +
        '<td class="how">' + how + "</td>" +
        '<td class="ta-end amt"><bdi dir="ltr">' + amount + "</bdi></td>" +
      "</tr>"
    );
  }

  /* bdi حول كل رقم/رمز لاتيني حتى لا ينكسر الاتجاه داخل النص العربي */
  function n(v) { return '<bdi dir="ltr">' + fInt.format(v) + "</bdi>"; }
  function d2(v) { return '<bdi dir="ltr">$' + f2.format(v) + "</bdi>"; }
  function d3(v) { return '<bdi dir="ltr">$' + f3.format(v) + "</bdi>"; }
  function pc(v) { return '<bdi dir="ltr">' + v + "%</bdi>"; }

  function render() {
    var s = pick();
    var c = compute(s);
    var t = s.title;

    elTitleHint.innerHTML =
      esc(t.author) + " — " + n(t.witnesses) + " شهود خطّية، " + n(t.notes) + " حاشية نقدية";
    elLangHint.innerHTML =
      "ترجمة " + esc(c.langLabel) + " أدبية كاملة، بمسرد مصطلحات موحَّد";
    elRunHint.innerHTML =
      "سحب " + n(s.run) + " نسخة — خصم الطباعة " + pc(c.discount);
    elBindHint.innerHTML =
      esc(c.bindLabel) + " — " + d2(c.unitPrint) + " للنسخة بعد الخصم";

    sPages.textContent = fInt.format(t.pages);
    sWords.textContent = fInt.format(t.words);
    sRate.textContent = "$" + f3.format(c.rate);

    body.innerHTML = [
      row("الترجمة إلى " + c.langLabel,
        n(t.words) + " كلمة × " + d3(c.rate) + " / كلمة",
        usd(c.translation)),
      row("مراجعة مختص في تاريخ العلم",
        n(t.words) + " × " + d3(c.reviewRate) + " / كلمة",
        usd(c.review)),
      row("تنضيد متقابل وحواشي ومفهرسة",
        n(t.pages) + " صفحة × " + d2(TYPESET_PER_PAGE) + " / صفحة",
        usd(c.typeset)),
      row(c.bindRow,
        n(s.run) + " نسخة × " + d2(c.unitPrint) +
          (c.discount ? " (−" + pc(c.discount) + ")" : ""),
        usd(c.print))
    ].join("");

    totUsd.textContent = usd(c.total);
    totNote.innerHTML = '<bdi dir="ltr">' + iqd(Math.round(c.total * FX)) + "</bdi>";

    keys.innerHTML = [
      key("كلفة النسخة الواحدة", usd2(c.unitCost)),
      key("سعر المكتبة المقترح", usd(c.libPrice)),
      key("الإجمالي بالدينار", iqd(Math.round(c.total * FX)))
    ].join("");
  }

  function key(label, value) {
    return '<div class="key"><span>' + esc(label) + '</span><bdi dir="ltr">' + value + "</bdi></div>";
  }

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  render();
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
  var PLANES = {".trust-figs": 16, ".hero-fig": 14};
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
