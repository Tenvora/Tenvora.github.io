(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.add("js");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Load choreography — one time only, hero only */
  function goLive() { document.body.classList.add("is-live"); }
  if (reduce) { goLive(); }
  else { requestAnimationFrame(function () { requestAnimationFrame(goLive); }); }

  /* sticky bar */
  var bar = document.getElementById("topbar");
  function barState() { bar.classList.toggle("is-stuck", window.scrollY > 8); }
  window.addEventListener("scroll", barState, { passive: true });
  barState();

  /* mobile nav */
  var menuBtn = document.getElementById("menuBtn");
  var mobileNav = document.getElementById("mobileNav");
  menuBtn.addEventListener("click", function () {
    var open = menuBtn.getAttribute("aria-expanded") === "true";
    menuBtn.setAttribute("aria-expanded", String(!open));
    mobileNav.hidden = open;
  });
  mobileNav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      mobileNav.hidden = true;
      menuBtn.setAttribute("aria-expanded", "false");
    }
  });

  /* Reveals — IntersectionObserver plus a direct geometry scan.
   The scan runs on load and on scroll, so content is never
   stranded invisible if the observer does not fire. */
  var revealables = [].slice.call(document.querySelectorAll("[data-reveal]"));

  function show(el, i) {
    el.style.setProperty("--rd", (Math.min(i, 3) * 70) + "ms");
    el.classList.add("is-in");
  }
  function scan() {
    var h = window.innerHeight || document.documentElement.clientHeight;
    var pending = 0;
    for (var i = 0; i < revealables.length; i++) {
      var el = revealables[i];
      if (el.classList.contains("is-in")) continue;
      var r = el.getBoundingClientRect();
      if (r.top < h * 0.94 && r.bottom > -40) { show(el, pending); pending++; }
    }
  }
  if (reduce || !("IntersectionObserver" in window)) {
    revealables.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (entry.isIntersecting) { show(entry.target, i); io.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });

    var queued = false;
    window.addEventListener("scroll", function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { scan(); queued = false; });
    }, { passive: true });
    window.addEventListener("resize", scan);
    scan();
    window.addEventListener("load", scan);
  }

  /* Season window (Abu Dhabi, 2026–2027) */
  var SEASON_START = new Date(2026, 9, 20);   /* 20 أكتوبر 2026 */
  var SEASON_END   = new Date(2027, 0, 31);   /* 31 يناير 2027 */
  var MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
                "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  function fmtDate(d) {
    return '<bdi dir="ltr">' + d.getDate() + "</bdi> " + MONTHS[d.getMonth()] +
           ' <bdi dir="ltr">' + d.getFullYear() + "</bdi>";
  }
  function parseISO(s) {
    var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    return p ? new Date(+p[1], +p[2] - 1, +p[3]) : null;
  }

  var today = new Date();
  var open = today >= SEASON_START && today <= SEASON_END;
  var seasonLine = document.getElementById("seasonLine");
  var seasonBox = document.querySelector(".season");
  if (open) {
    seasonLine.innerHTML = "الموسم مفتوح — نافذة <bdi dir=\"ltr\">2026–2027</bdi> في إمارة أبوظبي: من <bdi dir=\"ltr\">20</bdi> أكتوبر <bdi dir=\"ltr\">2026</bdi> إلى <bdi dir=\"ltr\">31</bdi> يناير <bdi dir=\"ltr\">2027</bdi>. المعاينات تُجدَّل الآن.";
  } else {
    seasonBox.classList.add("is-closed");
    seasonLine.innerHTML = "الموسم مغلق حاليًا. تُستأنف المعاينات في <bdi dir=\"ltr\">20</bdi> أكتوبر <bdi dir=\"ltr\">2026</bdi>؛ اترك طلبك وسنثبّته في أول يومٍ يُفتح فيه السجل.";
  }

  /* Season catalogue — filter, spec sheet, reservation */
  var table = document.getElementById("birdTable");
  var rows = [].slice.call(table.tBodies[0].rows);
  var chips = [].slice.call(document.querySelectorAll(".chip"));
  var countLine = document.getElementById("countLine");
  var emptyLine = document.getElementById("emptyLine");

  var sheetIdle = document.getElementById("sheetIdle");
  var sheetCard = document.getElementById("sheetCard");
  var enquiry = document.getElementById("enquiry");
  var confirmBox = document.getElementById("confirm");

  var fields = {
    ref: document.getElementById("sRef"), name: document.getElementById("sName"),
    latin: document.getElementById("sLatin"), species: document.getElementById("sSpecies"),
    sex: document.getElementById("sSex"), age: document.getElementById("sAge"),
    weight: document.getElementById("sWeight"), wing: document.getElementById("sWing"),
    state: document.getElementById("sState"), line: document.getElementById("sLine"),
    hatch: document.getElementById("sHatch"), check: document.getElementById("sCheck"),
    ready: document.getElementById("sReady"), price: document.getElementById("sPrice")
  };

  var SPECIES_LABEL = { hurr: "الحُرّ", jayr: "الجير", waqr: "الوَقْر", shaheen: "الشاهين" };
  var active = { species: "all", status: "all" };
  var selected = null;
  var seq = 0;

  /* --- filtering --- */
  function applyFilters() {
    var shown = 0, openShown = 0;
    rows.forEach(function (tr) {
      var ok = (active.species === "all" || tr.dataset.species === active.species) &&
               (active.status === "all" || tr.dataset.status === active.status);
      tr.hidden = !ok;
      if (ok) {
        shown++;
        if (tr.dataset.status === "open") openShown++;
      }
    });
    var total = rows.length;
    countLine.innerHTML = "<b>" + total + "</b> طيرًا في السجل، يُعرض منها <b>" + shown +
      "</b> بحسب هذا الاختيار، و<b>" + openShown + "</b> متاحةٌ للحجز اليوم.";
    emptyLine.hidden = shown !== 0;
    if (selected && selected.hidden) clearSelection(false);
  }

  chips.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var facet = btn.dataset.facet;
      active[facet] = btn.dataset.value;
      chips.forEach(function (b) {
        if (b.dataset.facet !== facet) return;
        var on = b === btn;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", String(on));
      });
      applyFilters();
    });
  });

  document.getElementById("resetFilters").addEventListener("click", function () {
    active = { species: "all", status: "all" };
    chips.forEach(function (b) {
      var on = b.dataset.value === "all";
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });
    applyFilters();
  });

  /* --- spec sheet --- */
  function clearSelection(showIdle) {
    if (selected) {
      selected.classList.remove("is-sel");
      var b = selected.querySelector("[data-bird]");
      if (b) { b.classList.remove("is-active"); b.textContent = "المواصفة"; }
    }
    selected = null;
    enquiry.hidden = true;
    confirmBox.hidden = true;
    sheetCard.hidden = true;
    if (showIdle) sheetIdle.hidden = false;
  }

  function selectBird(tr) {
    if (selected === tr) return;
    if (selected) {
      selected.classList.remove("is-sel");
      var prev = selected.querySelector("[data-bird]");
      if (prev) { prev.classList.remove("is-active"); prev.textContent = "المواصفة"; }
    }
    selected = tr;
    tr.classList.add("is-sel");
    var btn = tr.querySelector("[data-bird]");
    if (btn) { btn.classList.add("is-active"); btn.textContent = "مُختار"; }

    var d = tr.dataset;
    sheetIdle.hidden = true;
    confirmBox.hidden = true;
    enquiry.hidden = true;
    sheetCard.hidden = false;

    fields.ref.textContent = d.ref;
    fields.name.textContent = d.name;
    fields.latin.textContent = d.latin;
    fields.species.textContent = SPECIES_LABEL[d.species] || d.species;
    fields.sex.textContent = d.sex;
    fields.age.textContent = d.age;
    fields.weight.textContent = d.weight;
    fields.wing.textContent = d.wing;
    fields.state.textContent = d.state;
    fields.line.textContent = d.line;
    fields.hatch.textContent = d.hatch;
    fields.check.textContent = d.check;
    fields.ready.textContent = d.ready;
    fields.price.textContent = d.status === "off" ? "غير مُسعَّر" : "عند الطلب";
    document.getElementById("eRef").textContent = d.ref;

    resetErrors();
    if (window.innerWidth <= 1080 && !reduce) {
      document.getElementById("sheet").scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  rows.forEach(function (tr) {
    tr.querySelector("[data-bird]").addEventListener("click", function () { selectBird(tr); });
  });

  /* --- reservation --- */
  var eName = document.getElementById("eName");
  var eClub = document.getElementById("eClub");
  var eMember = document.getElementById("eMember");
  var eDate = document.getElementById("eDate");
  var eNote = document.getElementById("eNote");
  var nameErr = document.getElementById("eNameErr");
  var dateErr = document.getElementById("eDateErr");

  function resetErrors() {
    nameErr.hidden = true; dateErr.hidden = true;
    eName.parentNode.classList.remove("has-err");
    eDate.parentNode.classList.remove("has-err");
  }

  document.getElementById("toForm").addEventListener("click", function () {
    if (!selected) return;
    sheetCard.hidden = false;
    sheetIdle.hidden = true;
    enquiry.hidden = false;
    confirmBox.hidden = true;
    eName.focus();
  });

  document.getElementById("cancelEnquiry").addEventListener("click", function () {
    enquiry.hidden = true;
    resetErrors();
    if (!selected) { sheetCard.hidden = true; sheetIdle.hidden = false; }
  });

  enquiry.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!selected) return;
    resetErrors();

    var bad = null;
    if (eName.value.trim().length < 3) {
      nameErr.hidden = false;
      eName.parentNode.classList.add("has-err");
      bad = bad || eName;
    }
    var picked = parseISO(eDate.value);
    if (!picked || picked < SEASON_START || picked > SEASON_END) {
      dateErr.hidden = false;
      eDate.parentNode.classList.add("has-err");
      bad = bad || eDate;
    }
    if (bad) { bad.focus(); return; }

    seq++;
    var d = selected.dataset;
    document.getElementById("cNo").textContent = d.ref + "-R" + (seq < 10 ? "0" + seq : seq);
    document.getElementById("cBird").textContent = d.name + " · " + d.ref;
    document.getElementById("cDate").innerHTML = fmtDate(picked);
    document.getElementById("cClub").textContent =
      eClub.value + (eMember.value.trim() ? " · عضوية " + eMember.value.trim() : "");

    enquiry.hidden = true;
    sheetCard.hidden = true;
    sheetIdle.hidden = true;
    confirmBox.hidden = false;
    enquiry.reset();
  });

  document.getElementById("againBtn").addEventListener("click", function () {
    confirmBox.hidden = true;
    if (selected) { sheetCard.hidden = false; }
    else { sheetIdle.hidden = false; }
  });

  applyFilters();
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
  var PLANES = {".band__fig": 18, ".hero__fig": 14};
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
