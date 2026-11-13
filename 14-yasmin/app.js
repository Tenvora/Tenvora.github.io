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

  /* ---------- tour (hotspots swap photo + caption) ---------- */
  var corners = {
    yafa: {
      title: "اليافا — قلب البيت",
      cap: "مبلّطةٌ بحجرٍ كلسي يبلّله الماء كل فجر. إيوانان متقابلان ومدرّجاتٌ ثلاثٌ حول البحرة؛ هنا يُقدَّم الفطور، وهنا تُغلق الأبواب بعد العاشرة.",
      meta: "في وسط الدار — كل غرفة تفتح عليها",
      img: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Traditional_courtyard_caf%C3%A9_surrounded_by_olive_trees_in_Old_Damascus%2C_Syria.jpg/1920px-Traditional_courtyard_caf%C3%A9_surrounded_by_olive_trees_in_Old_Damascus%2C_Syria.jpg",
      alt: "باحة دمشقية تقليدية تحيط بها أشجار الزيتون"
    },
    qaa: {
      title: "القاعة — إيوانان وسقفٌ مرسوم",
      cap: "الألواح العجمية على الجدران رمِّمت عام ٢٠١٩ دون تغيير ألوانها الأصلية: لآلئُ خشبية صغيرة تلصق واحدةً واحدة. السقف خشبٌ مدهون، وفي الإيوان مدفأةٌ رخامية لا توقد إلا في كانون.",
      meta: "تفتح على اليافا بإيوانين — وفيها يفطر النزلاء إن مطر",
      img: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Damascus_Azem_Palace_ceiling_in_exhibits_room_5096.jpg/1920px-Damascus_Azem_Palace_ceiling_in_exhibits_room_5096.jpg",
      alt: "سقف خشبي وزخرفة عجمية في قاعة دمشقية"
    },
    bahra: {
      title: "البحرة — رخامٌ وماءٌ جارٍ",
      cap: "حوضٌ من قطعة رخامٍ واحدة، يعلوه صنبورٌ نحاسي لا يُغلق: الماء جارٍ فجرًا وبمنتصف الليل على السواء. يتفرع منه ثلاث سواقيَ صغيرة تروي أصص الريحان حول اليافا، ثم يصب في صهريج الدار. في آب تنخفض حرارته ست درجات عمن هو فوق السطوح.",
      meta: "في منتصف اليافا — صوتها يسمع من الغرف الثلاث",
      img: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Damascus_Azem_Palace_water_work_5148.jpg/1920px-Damascus_Azem_Palace_water_work_5148.jpg",
      alt: "سقاية رخام وماء في قصر دمشقي"
    },
    shade: {
      title: "مظلة الليمون — ركن الظل",
      cap: "شبكةٌ خشبية تتسلق عليها ليمونتانحامضتان وياسمينٌ على الجدار. تحتها ثلاث طاولات شايٍ على الجمر، وحين المغرب ينتقل إليها السمر لأن القاعة تُحمى واليافا تبرد.",
      meta: "زاوية اليافا الشمالية — أبرد موضع في الدار بعد الخامسة",
      img: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Damascus_National_Museum_Damascene_house_7766.jpg/1920px-Damascus_National_Museum_Damascene_house_7766.jpg",
      alt: "نموذج بيت دمشقي من متحف دمشق الوطني"
    }
  };
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tour__tab"));
  var tourImg = document.getElementById("tourImg");
  var tourTitle = document.getElementById("tourTitle");
  var tourCap = document.getElementById("tourCap");
  var tourMeta = document.getElementById("tourMeta");
  function showCorner(key) {
    var c = corners[key];
    if (!c) return;
    tabs.forEach(function (t) {
      var on = t.getAttribute("data-corner") === key;
      t.classList.toggle("is-on", on);
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    if (!reduce) tourImg.style.opacity = "0";
    window.setTimeout(function () {
      tourImg.src = c.img; tourImg.alt = c.alt;
      if (!reduce) tourImg.style.opacity = "1";
    }, reduce ? 0 : 200);
    tourTitle.textContent = c.title;
    tourCap.textContent = c.cap;
    tourMeta.textContent = c.meta;
    var active = tabs.filter(function (t) { return t.getAttribute("data-corner") === key; })[0];
    if (active) document.getElementById("pane-house").setAttribute("aria-labelledby", active.id);
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { showCorner(t.getAttribute("data-corner")); });
    t.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowLeft" ? 1 : e.key === "ArrowRight" ? -1 : 0; /* RTL: left = next */
      if (!d) return;
      e.preventDefault();
      var next = tabs[(i + d + tabs.length) % tabs.length];
      next.focus();
      showCorner(next.getAttribute("data-corner"));
    });
  });
  /* quiet preload so the swap never flashes */
  window.addEventListener("load", function () {
    Object.keys(corners).forEach(function (k) { var im = new Image(); im.src = corners[k].img; });
  });

  /* ---------- booking demo ---------- */
  function ar(n){ return String(n).replace(/[0-9]/g, function(x){ return "٠١٢٣٤٥٦٧٨٩"[+x]; }); }

  var MONTH = { y: 2026, m: 10 }; /* تشرين الثاني 2026 — 1 Nov = Sunday */
  var MONTH_NAME = "تشرين الثاني";
  var DAYS_IN_MONTH = 30;
  var WEEKDAYS = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

  var ROOMS = {
    yafa:       { name: "جناح اليافا",    usd: 70, syp: 980000,  guests: 2, booked: [[8, 12]] },
    yasmin:     { name: "قاعة الياسمين",  usd: 45, syp: 630000,  guests: 3, booked: [[15, 18]] },
    babsharqi:  { name: "غرفة باب شرقي",  usd: 32, syp: 448000,  guests: 2, booked: [[21, 23]] }
  };
  var state = { room: "yafa", guests: 2, checkin: null, checkout: null };

  function isBooked(d) {
    return ROOMS[state.room].booked.some(function (r) { return d >= r[0] && d < r[1]; });
  }
  function rangeClear(a, b) { /* nights [a, b) must avoid booked nights */
    if (b - a > 14) return "too-long";
    for (var d = a; d < b; d++) {
      for (var k = 0; k < ROOMS[state.room].booked.length; k++) {
        var r = ROOMS[state.room].booked[k];
        if (d >= r[0] && d < r[1]) return "booked";
      }
    }
    return "ok";
  }

  var grid = document.getElementById("calGrid");
  var fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

  var views = {
    room: document.getElementById("sRoom"),
    inD: document.getElementById("sIn"),
    outD: document.getElementById("sOut"),
    calc: document.getElementById("sCalc"),
    total: document.getElementById("sTotal"),
    syp: document.getElementById("sSyp"),
    cap: document.getElementById("sCap"),
    btn: document.getElementById("bookBtn"),
    ref: document.getElementById("sRef"),
    guests: document.getElementById("guests")
  };

  function buildCalendar() {
    grid.innerHTML = "";
    WEEKDAYS.forEach(function (w) {
      var el = document.createElement("span");
      el.className = "cal__wd";
      el.textContent = w;
      grid.appendChild(el);
    });
    var first = new Date(MONTH.y, MONTH.m, 1).getDay();
    for (var e = 0; e < first; e++) {
      var blank = document.createElement("span");
      blank.className = "cal__d is-empty";
      grid.appendChild(blank);
    }
    for (var d = 1; d <= DAYS_IN_MONTH; d++) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "cal__d";
      b.textContent = ar(d);
      b.setAttribute("data-d", d);
      if (isBooked(d)) {
        b.classList.add("is-booked");
        b.disabled = true;
        b.setAttribute("aria-label", ar(d) + " " + MONTH_NAME + " — محجوز");
      } else {
        b.setAttribute("aria-label", ar(d) + " " + MONTH_NAME);
      }
      grid.appendChild(b);
    }
    paintSelection();
  }

  function paintSelection() {
    var cells = grid.querySelectorAll(".cal__d:not(.is-empty)");
    cells.forEach(function (c) {
      c.classList.remove("is-in", "is-out", "is-mid");
    });
    if (!state.checkin) return;
    cells.forEach(function (c) {
      var d = +c.getAttribute("data-d");
      if (d === state.checkin) c.classList.add("is-in");
      if (state.checkout) {
        if (d === state.checkout) { c.classList.add("is-out"); c.classList.remove("is-in"); }
        else if (d > state.checkin && d < state.checkout) c.classList.add("is-mid");
      }
    });
  }

  function render() {
    var r = ROOMS[state.room];
    views.room.textContent = r.name;
    var nights = state.checkout && state.checkin !== null ? state.checkout - state.checkin : null;
    if (state.checkin !== null && !state.checkout) {
      views.inD.textContent = ar(state.checkin) + " " + MONTH_NAME;
      views.outD.textContent = "—";
    } else if (nights) {
      views.inD.textContent = ar(state.checkin) + " " + MONTH_NAME;
      views.outD.textContent = ar(state.checkout) + " " + MONTH_NAME;
    } else {
      views.inD.textContent = "—";
      views.outD.textContent = "—";
    }
    if (nights) {
      views.calc.textContent = ar(nights) + " × $" + r.usd;
      views.total.textContent = "$" + fmt.format(nights * r.usd);
      views.syp.textContent = ar(fmt.format(nights * r.syp)) + " ل.س";
      views.cap.textContent = "الطلب جاهز للتثبيت — الدفع نقدًا عند الوصول، دولار أو ليرة بسعر يوم الوصول.";
      views.btn.disabled = false;
    } else if (state.checkin !== null) {
      views.calc.textContent = "—";
      views.total.textContent = "$—";
      views.syp.textContent = "—";
      views.cap.textContent = "اختر الآن تاريخ المغادرة.";
      views.btn.disabled = true;
    } else {
      views.calc.textContent = "—";
      views.total.textContent = "$—";
      views.syp.textContent = "—";
      views.cap.textContent = "انقر تاريخ وصولٍ ثم تاريخ مغادرة في التقويم.";
      views.btn.disabled = true;
    }
    paintSelection();
  }

  grid.addEventListener("click", function (e) {
    var cell = e.target.closest(".cal__d");
    if (!cell || cell.disabled || cell.classList.contains("is-empty")) return;
    var d = +cell.getAttribute("data-d");
    views.ref.hidden = true;
    if (state.checkin === null || (state.checkin !== null && state.checkout !== null)) {
      state.checkin = d; state.checkout = null;
      views.cap.textContent = "اختر الآن تاريخ المغادرة.";
    } else if (d <= state.checkin) {
      state.checkin = d; state.checkout = null;
      views.cap.textContent = "بدأنا وصولًا جديدًا — اختر تاريخ المغادرة.";
    } else {
      var verdict = rangeClear(state.checkin, d);
      if (verdict === "booked") {
        views.cap.textContent = "تتداخل هذه الفترة مع ليلة محجوزة — بدأنا اختيارًا جديدًا من " + ar(d) + " " + MONTH_NAME + ".";
        state.checkin = d; state.checkout = null;
      } else if (verdict === "too-long") {
        views.cap.textContent = "أقصى مدة للحجز المباشر أربعة عشر ليلة — اختر تاريخًا أقرب.";
      } else {
        state.checkout = d;
      }
    }
    render();
  });

  /* room radios */
  var radios = document.querySelectorAll("input[name='room']");
  radios.forEach(function (radio) {
    radio.addEventListener("change", function () {
      state.room = radio.value;
      var max = ROOMS[state.room].guests;
      Array.prototype.forEach.call(views.guests.options, function (op) {
        op.disabled = +op.value > max;
      });
      if (+views.guests.value > max) { views.guests.value = String(max); state.guests = max; }
      if (state.checkin !== null) {
        var end = state.checkout || (state.checkin + 1);
        if (rangeClear(state.checkin, end) !== "ok" && state.checkout) {
          state.checkin = null; state.checkout = null;
          views.cap.textContent = "تغيّرت الإتاحة لهذه الغرفة — أعد اختيار التواريخ.";
        }
      }
      buildCalendar();
      render();
    });
  });
  views.guests.addEventListener("change", function () {
    state.guests = +views.guests.value;
  });

  views.btn.addEventListener("click", function () {
    if (!state.checkout) return;
    var code = "YS-" + state.checkin + "" + state.checkout;
    views.ref.hidden = false;
    views.ref.textContent = "رمز طلبك " + code + " — سنتصل بك خلال ساعة لتثبيته، وسنرسل مفتاح المدخل مع رسالة الوصول.";
  });

  /* optional prefill for shared links: ?room=yafa&checkin=8&checkout=11 */
  function prefill() {
    var q = new URLSearchParams(window.location.search);
    var room = q.get("room");
    var ci = parseInt(q.get("checkin"), 10);
    var co = parseInt(q.get("checkout"), 10);
    if (room && ROOMS[room]) {
      state.room = room;
      var radio = document.querySelector("input[name='room'][value='" + room + "']");
      if (radio) radio.checked = true;
    }
    if (ci >= 1 && ci <= DAYS_IN_MONTH && !isBooked(ci)) {
      state.checkin = ci;
      if (co > ci && co <= DAYS_IN_MONTH && rangeClear(ci, co) === "ok") state.checkout = co;
    }
  }

  prefill();
  buildCalendar();
  Array.prototype.forEach.call(views.guests.options, function (op) {
    op.disabled = +op.value > ROOMS[state.room].guests;
  });
  render();
})();
