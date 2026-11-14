(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* sticky bar shadow */
  var bar = document.getElementById("bar");
  function onScroll() { bar.classList.toggle("is-stuck", window.scrollY > 10); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* mobile nav */
  var burger = document.getElementById("burger");
  var mnav = document.getElementById("mnav");
  burger.addEventListener("click", function () {
    var open = burger.getAttribute("aria-expanded") === "true";
    burger.setAttribute("aria-expanded", String(!open));
    mnav.hidden = open;
  });
  mnav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") { mnav.hidden = true; burger.setAttribute("aria-expanded", "false"); }
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
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.1 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* cultivar texture filter */
  var fbtns = document.querySelectorAll(".fbtn");
  var vars = document.querySelectorAll("#vars .var");
  fbtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var tex = btn.getAttribute("data-tex");
      fbtns.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", String(on));
      });
      vars.forEach(function (row) {
        row.hidden = !(tex === "all" || row.getAttribute("data-tex") === tex);
      });
    });
  });

  /* shipment planner
   كل عبوة لها: صافي، وزن التغليف الفارغ، وحجم مشغول.
   الحاوية لها: حمولة صافية وحجم، والحجم القابل للتحميل
   بعد خصم فقد التخزين (15%). */
  var LOSS = 0.15;
  var PACKS = {
    c5:  { net: 5,  tare: 0.55, vol: 0.019, unit: "كرتونة" },
    c10: { net: 10, tare: 0.90, vol: 0.030, unit: "كرتونة" },
    b15: { net: 15, tare: 0.30, vol: 0.018, unit: "كيس" }
  };
  var CONTAINERS = {
    c20: { num: "20", desc: "قدماً جافة",   payload: 21000, volume: 33.2 },
    c40: { num: "40", desc: "قدماً جافة",   payload: 26000, volume: 67.7 },
    r40: { num: "40", desc: "قدماً مبرَّدة", payload: 26000, volume: 60.6 }
  };
  function contName(c) { return bdi(c.num) + " " + c.desc; }

  var form = document.getElementById("planner");
  var lines = [].slice.call(form.querySelectorAll(".line"));
  var contBtns = [].slice.call(form.querySelectorAll("input[name='cont']"));
  var body = document.querySelector("#linesTable tbody");

  var view = {
    net: document.getElementById("tNet"),
    units: document.getElementById("tUnits"),
    tare: document.getElementById("tTare"),
    gross: document.getElementById("tGross"),
    vol: document.getElementById("tVol"),
    volMax: document.getElementById("tVolMax"),
    fill: document.getElementById("gFill"),
    cap: document.getElementById("gCap"),
    mw: document.getElementById("mWeight"),
    mwn: document.getElementById("mWeightN"),
    mv: document.getElementById("mVol"),
    mvn: document.getElementById("mVolN"),
    verdict: document.getElementById("verdict"),
    vTxt: document.getElementById("vTxt"),
    vSub: document.getElementById("vSub")
  };

  var KG = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var INT = new Intl.NumberFormat("en-US");
  function pc(x) { return (Math.round(x * 1000) / 10).toFixed(1) + "%"; }
  function bdi(t) { return '<bdi class="n">' + t + "</bdi>"; }

  function qtyOf(line) {
    var cb = line.querySelector(".cb");
    var q = parseInt(line.querySelector(".qty").value, 10);
    if (!cb.checked || !isFinite(q) || q < 0) q = 0;
    return q;
  }
  function packOf(line) { return PACKS[line.querySelector(".pk").value]; }
  function nameOf(line) { return line.querySelector(".line__pick span").childNodes[0].textContent.trim(); }
  function codeOf(line) { return line.querySelector(".line__pick small").textContent; }
  function usableOf(c) { return Math.round(c.volume * (1 - LOSS) * 10) / 10; }

  function renderTable(rows) {
    if (!rows.length) {
      body.innerHTML = '<tr><td class="empty" colspan="3">لم يُختر أي صنف بعد — علَّم صنفاً واحداً على الأقل.</td></tr>';
      return;
    }
    body.innerHTML = rows.map(function (r) {
      return "<tr><th scope=\"row\">" + r.name + " " + bdi(r.code) + "</th>" +
             "<td class=\"expr\">" + INT.format(r.qty) + " × " + r.net.toFixed(2) + "</td>" +
             "<td class=\"res\">" + KG.format(r.part) + "</td></tr>";
    }).join("");
  }

  function meter(el, numEl, ratio) {
    var capped = Math.max(0, Math.min(ratio, 1));
    el.style.width = (capped * 100).toFixed(1) + "%";
    el.classList.toggle("is-over", ratio > 1);
    el.classList.toggle("is-ok", ratio <= 1);
    numEl.textContent = pc(ratio);
  }

  function render() {
    var c = CONTAINERS[form.querySelector("input[name='cont']:checked").value];
    var usable = usableOf(c);

    var rows = [], net = 0, tare = 0, vol = 0, units = 0;
    lines.forEach(function (line) {
      var q = qtyOf(line);
      line.querySelector(".line__pick").classList.toggle("off", q === 0);
      if (!q) return;
      var p = packOf(line);
      var part = q * p.net;
      net += part;
      tare += q * p.tare;
      vol += q * p.vol;
      units += q;
      rows.push({ name: nameOf(line), code: codeOf(line), qty: q, net: p.net, part: part, unit: p.unit });
    });

    renderTable(rows);

    var gross = net + tare;
    var wRatio = c.payload ? net / c.payload : 0;
    var vRatio = usable ? vol / usable : 0;
    var fill = Math.max(wRatio, vRatio);
    var overW = net - c.payload;
    var overV = vol - usable;
    var need = Math.max(net > 0 ? 1 : 0, Math.ceil(net / c.payload), Math.ceil(vol / usable));

    view.net.textContent = KG.format(net) + " كجم";
    view.units.textContent = INT.format(units);
    view.tare.textContent = KG.format(tare) + " كجم";
    view.gross.textContent = KG.format(gross) + " كجم";
    view.vol.innerHTML = bdi(vol.toFixed(2)) + " م³";
    view.volMax.innerHTML = bdi(usable.toFixed(2)) + " م³";
    view.fill.textContent = pc(fill);
    meter(view.mw, view.mwn, wRatio);
    meter(view.mv, view.mvn, vRatio);

    /* سطر الشرح تحت العامِل المحدَّد */
    var cap;
    if (!net) {
      cap = "لم تُدخل كمية بعد؛ اعلَّم صنفاً وعدِّد الكراتين لتظهر الحسابات.";
    } else if (Math.abs(vRatio - wRatio) < 0.02) {
      cap = "الوزن والحجم متقاربان: " + bdi(KG.format(net)) + " كجم من أصل " + bdi(INT.format(c.payload)) +
            " كجم، و" + bdi(vol.toFixed(2)) + " م³ من أصل " + bdi(usable.toFixed(2)) + " م³.";
    } else if (vRatio > wRatio) {
      cap = "العامل المحدِّد هنا الحجم: الحاوية تمتلئ حجماً قبل أن تبلغ حدّ الوزن — " +
            bdi(pc(vRatio)) + " بالحجم مقابل " + bdi(pc(wRatio)) + " بالوزن.";
    } else {
      cap = "العامل المحدِّد هنا الوزن:بلغت الحمولة " + bdi(pc(wRatio)) +
            " من " + bdi(INT.format(c.payload)) + " كجم، والحجم " + bdi(pc(vRatio)) + ".";
    }
    view.cap.innerHTML = cap;

    /* — الحكم — */
    var txt, sub, over = false;
    if (!net) {
      txt = "اختر صنفاً واحداً على الأقل لبدء تخطيط التحميل.";
      sub = "الحساب: صافي = عدد العبوات × وزن العبوة الصافي، والشحني = الصافي + وزن التغليف.";
    } else if (overW > 0.005 || overV > 0.0005) {
      over = true;
      var parts = [];
      if (overW > 0.005) {
        parts.push("تجاوزت الحمولة الصافية بـ " + bdi(KG.format(overW)) + " كجم" +
                   "، أي ما يعادل " + bdi(INT.format(Math.ceil(overW / 5))) + " كرتونة 5 كجم");
      }
      if (overV > 0.0005) {
        parts.push("تجاوز الحجم المتاح بـ " + bdi(overV.toFixed(2)) + " م³" +
                   " ≈ " + bdi(INT.format(Math.floor(overV / 0.019))) + " كرتونة 5 كجم");
      }
      txt = parts.join("؛ ") + ". وزِّع الزيادة على حاوية ثانية من النوع نفسه.";
      sub = "المطلوب " + bdi(INT.format(need)) + " حاوية " + contName(c) +
            " · الصافي " + bdi(KG.format(net)) + " كجم" + " · الحجم " + bdi(vol.toFixed(2) + " م³") + ".";
    } else {
      var spareW = c.payload - net;
      var spareV = usable - vol;
      var extraC5 = Math.max(0, Math.min(Math.floor(spareW / 5), Math.floor(spareV / 0.019)));
      var extraB15 = Math.max(0, Math.min(Math.floor(spareW / 15), Math.floor(spareV / 0.018)));
      txt = "التحميل مطابق: حاوية " + contName(c) + " واحدة تكفي، ويتّسع لـ " +
            bdi(INT.format(extraC5)) + " كرتونة " + bdi("5") + " كجم أو " +
            bdi(INT.format(extraB15)) + " كيساً " + bdi("15") + " كجم إضافية.";
      sub = "الوزن المتبقي " + bdi(KG.format(spareW)) + " كجم" + " · الحجم المتبقي " +
            bdi(spareV.toFixed(2)) + " م³" + " · تحتاج " + bdi(INT.format(need)) + " حاوية.";
    }
    view.vTxt.innerHTML = txt;
    view.vSub.innerHTML = sub;
    view.verdict.classList.toggle("is-over", over);
  }

  lines.forEach(function (line) {
    line.querySelector(".cb").addEventListener("change", function () {
      var qEl = line.querySelector(".qty");
      if (this.checked && parseInt(qEl.value, 10) === 0) qEl.value = 100;
      render();
    });
    line.querySelector(".qty").addEventListener("input", render);
    line.querySelector(".pk").addEventListener("change", render);
  });
  contBtns.forEach(function (r) {
    r.addEventListener("change", function () {
      contBtns.forEach(function (b) { b.closest(".cont").classList.toggle("is-on", b.checked); });
      render();
    });
  });
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  contBtns.forEach(function (b) { b.closest(".cont").classList.toggle("is-on", b.checked); });
  render();

  /* enquiry form (واجهة فقط) */
  var enq = document.getElementById("enquiry");
  var done = document.getElementById("enqDone");
  enq.addEventListener("submit", function (e) {
    e.preventDefault();
    done.hidden = false;
    if (!reduce) { done.scrollIntoView({ behavior: "smooth", block: "center" }); }
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
  var PLANES = {".band__fig": 20};
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
  var TARGETS = all('.band__stats li > .n');
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
