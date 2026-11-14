(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* sticky bar */
  var bar = document.getElementById("topbar");
  var onScroll = function () { bar.classList.toggle("is-stuck", window.scrollY > 8); };
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
        var el = entry.target;
        el.style.transitionDelay = Math.min(i * 70, 210) + "ms";
        el.classList.add("is-in");
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* payroll calculator */
  var WAGE_CAP = 45000;
  var EMP_RATE = 0.0975;   /* اشتراك الموظف: 9.5% معاشات + 0.25% ساند */
  var EST_RATE = 0.1275;   /* اشتراك المنشأة: 11.5% + 1.25% ساند */
  var HAZARD_RATE = 0.02;  /* غير السعوديين: أخطار مهنية على المنشأة فقط */

  var form = document.getElementById("calcForm");
  var out = document.getElementById("calcOut");
  var fields = ["basic", "housing", "transport", "other", "deduct"].map(function (id) { return document.getElementById(id); });
  var gosi = document.getElementById("gosi");
  var money = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  var views = {
    total: document.getElementById("oTotal"),
    insured: document.getElementById("oInsured"),
    employee: document.getElementById("oEmployee"),
    net: document.getElementById("oNet"),
    employer: document.getElementById("oEmployer"),
    bar: document.getElementById("oBar"),
    cap: document.getElementById("oCap")
  };

  function value(el) {
    var n = parseFloat(el.value);
    return isFinite(n) && n > 0 ? n : 0;
  }

  function render() {
    var total = value(fields[0]) + value(fields[1]) + value(fields[2]) + value(fields[3]);
    var deduct = value(fields[4]);
    var insured = Math.min(total, WAGE_CAP);
    var registered = gosi.checked;

    var employee = registered ? insured * EMP_RATE : 0;
    var employer = registered ? insured * EST_RATE : insured * HAZARD_RATE;
    var net = Math.max(total - employee - deduct, 0);

    views.total.textContent = money.format(total) + " SAR";
    views.insured.textContent = money.format(insured) + " SAR";
    views.employee.textContent = (employee ? money.format(employee) : "—") + (employee ? " SAR" : "");
    views.net.textContent = money.format(net) + " SAR";
    views.employer.textContent = money.format(employer) + " SAR";
    views.bar.style.inlineSize = (total ? Math.round((net / total) * 100) : 0) + "%";

    var note;
    if (!total) {
      note = "أدخل الراتب الأساسي لبدء الاحتساب.";
    } else if (!registered) {
      note = "غير المسجَّلين في التأمينات: لا يُخصم من راتبهم اشتراك، وتتحمل المنشأة اشتراك الأخطار المهنية فقط بنسبة <bdi>2%</bdi>.";
    } else if (total > WAGE_CAP) {
      note = "الأجر الشامل تجاوز سقف الأجر الخاضع <bdi>(45,000 ريال)</bdi>، فتم احتساب الاشتراك على السقف فقط.";
    } else {
      note = "صافي الراتب = الأجر الشامل − اشتراك الموظف <bdi>(9.75%)</bdi> − خصومات الدورة.";
    }
    views.cap.innerHTML = note;

    if (!reduce) {
      out.classList.add("is-flash");
      window.setTimeout(function () { out.classList.remove("is-flash"); }, 260);
    }
  }

  fields.forEach(function (el) { el.addEventListener("input", render); });
  gosi.addEventListener("change", render);
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  render();

  /* pricing cycle */
  var cycleBtns = document.querySelectorAll(".toggle__btn");
  var prices = document.querySelectorAll(".plan__price b[data-m]");
  var unit = document.querySelectorAll(".plan__price span");
  cycleBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var cycle = btn.getAttribute("data-cycle");
      cycleBtns.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", String(on));
      });
      prices.forEach(function (p) { p.textContent = p.getAttribute("data-" + cycle); });
      unit.forEach(function (u) { u.textContent = cycle === "y" ? "ريال / شهريًا تُدفع سنويًا" : "ريال / شهريًا"; });
    });
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
  var PLANES = {".band__fig": 18};
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
  var TARGETS = all('.kpi strong');
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
