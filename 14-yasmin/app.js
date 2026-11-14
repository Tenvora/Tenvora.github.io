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

  /* tour (hotspots swap photo + caption) */
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

  /* booking */
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
  var PLANES = {".place__fig": 20, ".tour__fig": 14};
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
  var TARGETS = all('.num');
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
