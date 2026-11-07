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

  /* ---------- payroll calculator ---------- */
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

  /* ---------- pricing cycle ---------- */
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
