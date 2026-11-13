/* ══════════════════════════════════════════════════════════════
   رَوِ — rawi.jo
   ١) كوريغرافيا التحميل + الكشف بالتمرير (مع شبكة أمان زمنية)
   ٢) آلة حالات مشغّل الحلقة: idle → playing → paused → ended
   كل شيء محليّ: لا شبكة، لا ملفات صوتية، لا تخزين.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var doc = document;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ────────────────────────────────────────────────────────────
     ١. الحركة: لا شيء فوق الطية ينتظر التمرير
     ──────────────────────────────────────────────────────────── */
  function forceAll() {
    doc.documentElement.classList.add('is-ready');
    var hidden = doc.querySelectorAll('[data-reveal]:not(.is-in),[data-choreo]:not(.is-in)');
    for (var i = 0; i < hidden.length; i++) hidden[i].classList.add('is-in');
  }

  // شبكة الأمان: تُقرأ بعد أي محتوى يُضاف برمجياً، وتُظهر كل ما بقي خفيّاً فوق الطية.
  setTimeout(function () {
    doc.documentElement.classList.add('is-ready');
    var pending = doc.querySelectorAll('[data-reveal]:not(.is-in),[data-choreo]:not(.is-in)');
    for (var i = 0; i < pending.length; i++) {
      var it = pending[i];
      if (reduce || it.getBoundingClientRect().top < window.innerHeight * 1.4) it.classList.add('is-in');
    }
  }, 1200);

  function initReveal() {
    doc.documentElement.classList.add('is-ready');
    var items = doc.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window) || reduce) {
      for (var k = 0; k < items.length; k++) items[k].classList.add('is-in');
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      for (var j = 0; j < entries.length; j++) {
        if (entries[j].isIntersecting) {
          entries[j].target.classList.add('is-in');
          io.unobserve(entries[j].target);
        }
      }
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    for (var i = 0; i < items.length; i++) io.observe(items[i]);
  }

  /* ────────────────────────────────────────────────────────────
     أدوات
     ──────────────────────────────────────────────────────────── */
  function el(tag, cls, txt) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  // كل رقمٍ أو طابعٍ زمني داخل نصٍ عربي يُلفَّ بـ bdi عزلًا للاتجاه.
  function textWithDigits(node, str) {
    var parts = String(str).split(/(\d+(?::\d+)*(?:[.,]\d+)?)/);
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] === '') continue;
      if (/^\d/.test(parts[i])) {
        var b = el('bdi');
        b.setAttribute('dir', 'ltr');
        b.textContent = parts[i];
        node.appendChild(b);
      } else {
        node.appendChild(doc.createTextNode(parts[i]));
      }
    }
    return node;
  }

  function mmss(s) {
    s = Math.max(0, Math.floor(s));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    var p = function (v) { return (v < 10 ? '0' : '') + v; };
    return h > 0 ? h + ':' + p(m) + ':' + p(x) : p(m) + ':' + p(x);
  }

  // مولّد أرقام شبه-عشوائي ثابت البذرة: نفس الحلقة = نفس شكل الموجة.
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function waveShape(seed, n) {
    var rnd = mulberry32(seed * 7919 + 13), out = [];
    for (var i = 0; i < n; i++) {
      var p = i / n;
      var phrase = Math.abs(Math.sin(p * Math.PI * 2.6 + (seed % 5) * 0.9));
      var breath = 0.45 + 0.55 * Math.sin(p * Math.PI);
      var jitter = Math.pow(rnd(), 1.35);
      var h = 0.16 + 0.84 * Math.min(1, Math.max(phrase * breath * 0.95, jitter * 0.62));
      out.push(Math.min(1, Math.max(0.08, h)));
    }
    return out;
  }

  /* ────────────────────────────────────────────────────────────
     ٢. بيانات الموسم
     ──────────────────────────────────────────────────────────── */
  var NODE = doc.getElementById('rawi-data');
  var DATA = JSON.parse(NODE.textContent);
  var EPS = DATA.episodes;

  /* ────────────────────────────────────────────────────────────
     ٣. آلة حالات المشغّل
        idle ─play()→ playing ─pause()→ paused ─play()→ playing
        playing ─بلوغ النهاية→ ended ─play()/seek()→ playing
     ──────────────────────────────────────────────────────────── */
  var S = { ep: 0, built: -1, t: 0, status: 'idle', rate: 1, raf: null, last: 0 };

  var BARS = 72, VW = 720, VH = 96, SLOT = VW / BARS, BARW = SLOT - 3.6;

  var dom = {
    card: doc.getElementById('playerCard'),
    code: doc.getElementById('epCode'),
    title: doc.getElementById('epTitle'),
    meta: doc.getElementById('epMeta'),
    box: doc.getElementById('waveBox'),
    barsIdle: doc.getElementById('barsIdle'),
    barsPlayed: doc.getElementById('barsPlayed'),
    clip: doc.getElementById('playedRect'),
    head: doc.getElementById('waveHead'),
    scrub: doc.getElementById('scrub'),
    now: doc.getElementById('tNow'),
    all: doc.getElementById('tAll'),
    state: doc.getElementById('stateTxt'),
    toggle: doc.getElementById('toggle'),
    back: doc.getElementById('back15'),
    fwd: doc.getElementById('fwd15'),
    chapters: doc.getElementById('chapters'),
    picker: doc.getElementById('picker'),
    eps: doc.getElementById('eps'),
    live: doc.getElementById('live')
  };

  function ep() { return EPS[S.ep]; }

  function drawWave() {
    var shape = waveShape(S.ep + 1, BARS), i;
    dom.barsIdle.textContent = '';
    dom.barsPlayed.textContent = '';
    var fragA = doc.createDocumentFragment(), fragB = doc.createDocumentFragment();
    for (i = 0; i < BARS; i++) {
      var h = 8 + shape[i] * (VH - 14);
      var r = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', (i * SLOT + 1.8).toFixed(2));
      r.setAttribute('y', ((VH - h) / 2).toFixed(2));
      r.setAttribute('width', BARW.toFixed(2));
      r.setAttribute('height', h.toFixed(2));
      fragA.appendChild(r.cloneNode(false));
      fragB.appendChild(r);
    }
    dom.barsIdle.appendChild(fragA);
    dom.barsPlayed.appendChild(fragB);
  }

  function chapterAt() {
    var ch = ep().ch, idx = 0;
    for (var i = 0; i < ch.length; i++) if (S.t >= ch[i].at) idx = i;
    return idx;
  }

  function paint() {
    var d = ep().dur, p = d ? Math.min(1, S.t / d) : 0;
    dom.clip.setAttribute('x', (VW * (1 - p)).toFixed(2));
    dom.clip.setAttribute('width', (VW * p).toFixed(2));
    dom.head.style.insetInlineStart = (p * 100).toFixed(3) + '%';
    dom.scrub.style.setProperty('--p', p.toFixed(5));
    dom.now.textContent = mmss(S.t);
    dom.scrub.setAttribute('aria-valuenow', String(Math.round(S.t)));
    dom.scrub.setAttribute('aria-valuemax', String(d));
    dom.scrub.setAttribute('aria-valuetext', mmss(S.t) + ' من أصل ' + mmss(d));

    var active = chapterAt();
    var kids = dom.chapters.children;
    for (var i = 0; i < kids.length; i++) {
      kids[i].firstElementChild.classList.toggle('is-active', i === active);
    }
    var chips = dom.eps.children[S.ep].querySelectorAll('.chip');
    for (var c = 0; c < chips.length; c++) chips[c].classList.toggle('is-active', c === active);
  }

  var STATE_TXT = { idle: 'متوقف', playing: 'قيد التشغيل', paused: 'موقوف مؤقتاً', ended: 'انتهت الحلقة' };

  function paintState() {
    dom.state.textContent = STATE_TXT[S.status];
    dom.toggle.classList.toggle('is-playing', S.status === 'playing');
    dom.toggle.setAttribute('aria-pressed', S.status === 'playing' ? 'true' : 'false');
    dom.toggle.setAttribute('aria-label', S.status === 'playing' ? 'إيقاف مؤقت' : 'تشغيل');
  }

  function say(msg) { dom.live.textContent = msg; }

  /* ── المؤقّت: وقت حقيقي، لا وهم ── */
  function loop(now) {
    if (S.status !== 'playing') return;
    var dt = (now - S.last) / 1000;
    S.last = now;
    if (dt > 0) S.t += dt * S.rate;
    if (S.t >= ep().dur) { S.t = ep().dur; stop('ended'); say('انتهت الحلقة.'); }
    paint();
    if (S.status === 'playing') S.raf = window.requestAnimationFrame(loop);
  }

  function play() {
    if (S.status === 'ended' || S.t >= ep().dur) S.t = 0;
    S.status = 'playing';
    S.last = window.performance ? performance.now() : Date.now();
    paintState();
    say('تشغيل: ' + ep().title);
    window.cancelAnimationFrame(S.raf);
    S.raf = window.requestAnimationFrame(loop);
  }

  function stop(next) {
    window.cancelAnimationFrame(S.raf);
    S.status = next;
    paintState();
  }

  function pause() { stop('paused'); say('إيقاف مؤقت.'); }

  function toggle() { S.status === 'playing' ? pause() : play(); }

  function seek(to, quiet) {
    var d = ep().dur;
    S.t = Math.max(0, Math.min(d, to));
    if (S.t < d && S.status === 'ended') S.status = 'idle';
    paint();
    if (!quiet) {
      var i = chapterAt();
      say(mmss(S.t) + ' — ' + ep().ch[i].t);
    }
  }

  /* ── تبديل الحلقة: يغيّر البطاقة كاملة ── */
  function loadEp(idx, at, autoplay) {
    if (idx !== S.built) {
      S.ep = idx;
      S.built = idx;
      window.cancelAnimationFrame(S.raf);
      S.status = 'idle';
      S.t = 0;
      var e = ep();
      dom.code.textContent = e.code;
      dom.title.textContent = e.title;
      dom.meta.textContent = '';
      textWithDigits(dom.meta, e.date + ' · ' + e.place + ' · ' + mmss(e.dur) + ' · ' + e.ch.length + ' فصول');
      dom.all.textContent = mmss(e.dur);
      drawWave();
      renderChapters();
      markCurrent();
    }
    paintState();
    if (at != null) S.t = at;
    seek(S.t, true);
    if (autoplay) play(); else paintState();
  }

  function markCurrent() {
    var picks = dom.picker.querySelectorAll('.picker__b');
    for (var i = 0; i < picks.length; i++) {
      picks[i].setAttribute('aria-current', i === S.ep ? 'true' : 'false');
    }
    var rows = dom.eps.querySelectorAll('.ep');
    for (var r = 0; r < rows.length; r++) {
      rows[r].classList.toggle('is-current', Number(rows[r].dataset.ep) === S.ep);
    }
  }

  /* ────────────────────────────────────────────────────────────
     ٤. بناء القوائم
     ──────────────────────────────────────────────────────────── */
  function chapterBtn(e, c, i) {
    var b = el('button', 'chip');
    b.type = 'button';
    b.dataset.ep = String(e.n - 1);
    b.dataset.at = String(c.at);
    var t = el('bdi'); t.setAttribute('dir', 'ltr'); t.className = 'num';
    t.textContent = mmss(c.at);
    b.appendChild(t);
    b.appendChild(el('span', null, c.t));
    b.setAttribute('aria-label', 'الحلقة ' + e.code + ' — انتقل إلى ' + c.t + ' عند ' + mmss(c.at));
    return b;
  }

  function renderChapters() {
    dom.chapters.textContent = '';
    var e = ep();
    for (var i = 0; i < e.ch.length; i++) {
      var li = el('li');
      var b = el('button', 'chapter');
      b.type = 'button';
      b.dataset.at = String(e.ch[i].at);
      b.appendChild(el('span', 'chapter__d'));
      var tm = el('bdi', 'chapter__t'); tm.setAttribute('dir', 'ltr');
      tm.textContent = mmss(e.ch[i].at);
      b.appendChild(tm);
      b.appendChild(el('span', 'chapter__n', e.ch[i].t));
      b.setAttribute('aria-label', 'انتقل إلى ' + e.ch[i].t + ' عند ' + mmss(e.ch[i].at));
      li.appendChild(b);
      dom.chapters.appendChild(li);
    }
  }

  function renderPicker() {
    dom.picker.textContent = '';
    for (var i = 0; i < EPS.length; i++) {
      var b = el('button', 'picker__b');
      b.type = 'button';
      b.dataset.ep = String(i);
      var t = el('bdi', 'picker__n'); t.setAttribute('dir', 'ltr');
      t.textContent = 'E' + EPS[i].n;
      b.appendChild(t);
      var d = el('bdi', 'picker__d'); d.setAttribute('dir', 'ltr');
      d.textContent = mmss(EPS[i].dur);
      b.appendChild(d);
      b.setAttribute('aria-label', 'الحلقة ' + EPS[i].code + ' — ' + EPS[i].title + ' — ' + mmss(EPS[i].dur));
      b.setAttribute('aria-current', i === S.ep ? 'true' : 'false');
      dom.picker.appendChild(b);
    }
  }

  function renderEps() {
    dom.eps.textContent = '';
    for (var i = 0; i < EPS.length; i++) {
      var e = EPS[i];
      var art = el('article', 'ep card');
      art.dataset.ep = String(i);

      var main = el('div');
      var n = el('p', 'ep__n');
      var nb = el('bdi'); nb.setAttribute('dir', 'ltr');
      nb.textContent = e.code + ' · ' + mmss(e.dur);
      n.appendChild(nb);
      main.appendChild(n);

      var h = el('h3', 'ep__t', e.title);
      main.appendChild(h);
      main.appendChild(el('p', 'ep__d', e.blurb));

      var meta = el('p', 'ep__meta');
      var dSpan = el('span'); textWithDigits(dSpan, e.date); meta.appendChild(dSpan);
      meta.appendChild(el('span', null, e.place));
      meta.appendChild(el('span', null, e.ch.length + ' فصول'));
      main.appendChild(meta);
      art.appendChild(main);

      var side = el('div', 'ep__r');
      var play = el('button', 'ep__play');
      play.type = 'button';
      play.dataset.play = String(i);
      var svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '14'); svg.setAttribute('height', '14');
      svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
      var g = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('fill', 'currentColor');
      var path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M8 5.6v12.8c0 .8.9 1.3 1.6.9l10-6.4c.6-.4.6-1.3 0-1.7l-10-6.4c-.7-.5-1.6 0-1.6.8z');
      g.appendChild(path); svg.appendChild(g);
      play.appendChild(svg);
      play.appendChild(el('span', null, 'شغّل في الأعلى'));
      play.setAttribute('aria-label', 'شغّل الحلقة ' + e.code + ': ' + e.title);
      side.appendChild(play);
      art.appendChild(side);

      var chs = el('div', 'ep__ch');
      for (var c = 0; c < e.ch.length; c++) chs.appendChild(chapterBtn(e, e.ch[c], c));
      art.appendChild(chs);

      dom.eps.appendChild(art);
    }
  }

  /* ────────────────────────────────────────────────────────────
     ٥. الأحداث
     ──────────────────────────────────────────────────────────── */
  function ratioFromClientX(node, x) {
    var r = node.getBoundingClientRect();
    // اتجاه الصفحة rtl: نقطة البداية عند الحرف القبليّ (اليمين).
    return Math.max(0, Math.min(1, (r.right - x) / r.width));
  }

  function bindScrub(node) {
    node.addEventListener('click', function (ev) {
      if (ev.detail === 0) return;
      seek(ratioFromClientX(node, ev.clientX) * ep().dur);
    });
  }

  function bindKeys() {
    dom.scrub.addEventListener('keydown', function (ev) {
      var step = 10, d = ep().dur, k = ev.key;
      var act = {
        ArrowLeft: function () { seek(S.t + step); },
        ArrowRight: function () { seek(S.t - step); },
        PageUp: function () { seek(S.t + 60); },
        PageDown: function () { seek(S.t - 60); },
        Home: function () { seek(0); },
        End: function () { seek(d - 1); }
      }[k];
      if (!act) return;
      ev.preventDefault();
      act();
    });

    dom.card.addEventListener('keydown', function (ev) {
      if (ev.target === dom.scrub && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) return;
      var k = ev.key;
      if (k === ' ' || k === 'Spacebar' || k === 'k' || k === 'K') {
        if (ev.target.tagName === 'BUTTON') return;
        ev.preventDefault(); toggle();
      } else if (k === 'j' || k === 'J') { ev.preventDefault(); seek(S.t - 15); }
      else if (k === 'l' || k === 'L') { ev.preventDefault(); seek(S.t + 15); }
    });
  }

  function bindControls() {
    dom.toggle.addEventListener('click', toggle);
    dom.back.addEventListener('click', function () { seek(S.t - 15); });
    dom.fwd.addEventListener('click', function () { seek(S.t + 15); });

    var speeds = doc.querySelectorAll('.speed__b');
    for (var i = 0; i < speeds.length; i++) {
      speeds[i].addEventListener('click', function () {
        S.rate = parseFloat(this.dataset.rate);
        for (var j = 0; j < speeds.length; j++) {
          speeds[j].classList.remove('is-on');
          speeds[j].setAttribute('aria-pressed', 'false');
        }
        this.classList.add('is-on');
        this.setAttribute('aria-pressed', 'true');
        say('سرعة التشغيل ' + S.rate + ' ضعف.');
      });
    }

    dom.chapters.addEventListener('click', function (ev) {
      var b = ev.target.closest('.chapter');
      if (b) seek(Number(b.dataset.at));
    });

    dom.picker.addEventListener('click', function (ev) {
      var b = ev.target.closest('.picker__b');
      if (b) loadEp(Number(b.dataset.ep), 0, false);
    });

    doc.body.addEventListener('click', function (ev) {
      var chip = ev.target.closest('.chip');
      if (chip) {
        loadEp(Number(chip.dataset.ep), Number(chip.dataset.at), true);
        scrollToPlayer();
        return;
      }
      var pb = ev.target.closest('[data-play]');
      if (pb) { loadEp(Number(pb.dataset.play), 0, true); scrollToPlayer(); return; }
      var first = ev.target.closest('[data-play-first]');
      if (first) { loadEp(0, 0, true); scrollToPlayer(); }
    });
  }

  function scrollToPlayer() {
    doc.getElementById('player').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  /* ────────────────────────────────────────────────────────────
     ٦. الإقلاع
     ──────────────────────────────────────────────────────────── */
  function boot() {
    doc.documentElement.classList.add('booted');
    renderEps();
    renderPicker();
    loadEp(0, 0, false);
    markCurrent();
    bindScrub(dom.box);
    bindScrub(dom.scrub);
    bindControls();
    bindKeys();
    initReveal();
  }

  try {
    boot();
  } catch (err) {
    forceAll();
    if (window.console && console.error) console.error('[rawi] ' + err.message, err);
  }
})();
