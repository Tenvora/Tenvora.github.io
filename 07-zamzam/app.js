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

  /* ---------- program finder ---------- */
  var form = document.getElementById("finderForm");
  var selects = Array.prototype.slice.call(form.querySelectorAll("select"));
  var results = Array.prototype.slice.call(document.querySelectorAll(".res"));
  var countEl = document.getElementById("finderCount");
  var emptyEl = document.getElementById("finderEmpty");
  var resetBtn = document.getElementById("finderReset");

  var ACTIVE = { all: "", health: "صحي", admin: "إداري", bach: "بكالوريوس", dipl: "دبلوم", short: "دورة قصيرة", madinah: "المدينة المنورة", jeddah: "جدة", riyadh: "الرياض", onsite: "حضوري", blend: "مدمج" };

  function apply() {
    var track = document.getElementById("fTrack").value;
    var type = document.getElementById("fType").value;
    var city = document.getElementById("fCity").value;
    var mode = document.getElementById("fMode").value;

    var shown = 0;
    results.forEach(function (row) {
      var ok = (track === "all" || row.dataset.track === track) &&
               (type === "all" || row.dataset.type === type) &&
               (city === "all" || row.dataset.city === city) &&
               (mode === "all" || row.dataset.mode === mode);
      row.classList.toggle("is-hidden", !ok);
      if (ok) shown++;
    });

    var filters = [track, type, city, mode].filter(function (v) { return v !== "all"; })
      .map(function (v) { return ACTIVE[v]; });

    if (shown === 0) {
      countEl.hidden = true;
      emptyEl.hidden = false;
    } else {
      emptyEl.hidden = true;
      countEl.hidden = false;
      countEl.innerHTML = "<bdi class=\"num\">" + shown + "</bdi> " +
        (shown === 1 ? "برنامج مطابق" : (shown === 2 ? "برنامجان مطابقان" : (shown <= 10 ? "برامج مطابقة" : "برنامجًا مطابق"))) +
        (filters.length ? " — الفلاتر: " + filters.join(" · ") : " — تُعرض جميع البرامج، حدّد الفلاتر لتضييق النتائج.");
    }
  }

  selects.forEach(function (s) { s.addEventListener("change", apply); });
  resetBtn.addEventListener("click", function () {
    selects.forEach(function (s) { s.value = "all"; });
    apply();
  });
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  apply();
})();
