/* ============================================================
   حِبر — app.js
   Vanilla DOM uniquement : aucun appel réseau, aucune librairie.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ----------------------------------------------------------
     1. Révélation au défilement (une seule, budget respecté)
     ---------------------------------------------------------- */
  var REVEAL_SEL = [
    '.toc-main .sec-head', '.tbl-wrap', '.plate', '.side-block',
    '.sec-head--row', '.filters', '.issue', '.shelf__item',
    '.band__cap', '.sub__intro', '.sub__side', '.sub__facts',
    '.about__col', '.colophon', '.about__contact'
  ].join(',');

  var revealables = $$(REVEAL_SEL);
  revealables.forEach(function (el) { el.classList.add('will-reveal'); });

  function reveal(el) { el.classList.add('is-revealed'); }

  function revealInViewport() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    revealables.forEach(function (el) {
      if (el.classList.contains('is-revealed')) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) reveal(el);
    });
  }

  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          reveal(en.target);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(reveal);
  }

  /* garde-fou : tout ce qui est dans le premier viewport apparaît,
     même si IntersectionObserver ne s'est jamais déclenché */
  window.addEventListener('load', revealInViewport);
  setTimeout(revealInViewport, 300);
  setTimeout(function () {
    revealInViewport();
    if (!io) revealables.forEach(reveal);
  }, 1200);

  /* ----------------------------------------------------------
     2. Menu mobile
     ---------------------------------------------------------- */
  var menuBtn = $('#menuBtn');
  var mobileNav = $('#mobileNav');

  function setMenu(open) {
    if (!menuBtn || !mobileNav) return;
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'أغلق القائمة' : 'افتح القائمة');
    if (open) mobileNav.removeAttribute('hidden');
    else mobileNav.setAttribute('hidden', '');
  }
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    $$('a', mobileNav).forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 820) setMenu(false);
    });
  }

  /* ----------------------------------------------------------
     3. Ouverture de l'éditorial : révélation ligne à ligne
     ---------------------------------------------------------- */
  var leadEl = $('.lead[data-lines]');
  var leadOriginal = leadEl ? leadEl.innerHTML : null;

  function buildLines() {
    if (!leadEl || reduceMotion.matches) return;
    /* restaurer le contenu d'origine avant re-mesure (redimensionnement) */
    if (leadEl.hasAttribute('data-lines-built')) {
      leadEl.innerHTML = leadOriginal;
      leadEl.removeAttribute('data-lines-built');
    }
    var drop = $('.dc', leadEl);
    var walker = document.createTreeWalker(leadEl, NodeFilter.SHOW_TEXT, null);
    var raw = [];
    var node;
    while ((node = walker.nextNode())) {
      node.nodeValue.split(/(\s+)/).forEach(function (p) {
        if (p) raw.push(p);
      });
    }
    /* pass 1 : reposer chaque mot dans un <span> pour mesurer sa ligne */
    while (leadEl.firstChild) leadEl.removeChild(leadEl.firstChild);
    if (drop) leadEl.appendChild(drop);
    var words = raw.filter(function (p) { return !/^\s+$/.test(p); }).map(function (w) {
      var s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      leadEl.appendChild(document.createTextNode(' '));
      leadEl.appendChild(s);
      return s;
    });
    var lines = [];
    var lastTop = null;
    words.forEach(function (s) {
      var r = s.getClientRects();
      var top = r.length ? Math.round(r[0].top) : 0;
      if (lastTop === null || Math.abs(top - lastTop) > 6) {
        lines.push([]);
        lastTop = top;
      }
      lines[lines.length - 1].push(s);
    });
    /* pass 2 : chaque ligne dans un <span class="ln"> */
    while (leadEl.firstChild) leadEl.removeChild(leadEl.firstChild);
    if (drop) leadEl.appendChild(drop);
    lines.forEach(function (line, i) {
      var ln = document.createElement('span');
      ln.className = 'ln';
      ln.style.setProperty('--d', (i * 70) + 'ms');
      line.forEach(function (s, j) {
        if (j > 0) ln.appendChild(document.createTextNode(' '));
        ln.appendChild(s);
      });
      leadEl.appendChild(ln);
    });
    leadEl.setAttribute('data-lines-built', '');
    function showLines() {
      $$('.ln', leadEl).forEach(function (ln) { ln.classList.add('is-on'); });
    }
    if ('IntersectionObserver' in window) {
      var lio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { showLines(); lio.disconnect(); }
        });
      }, { threshold: 0.15 });
      lio.observe(leadEl);
      setTimeout(function () {
        var r = leadEl.getBoundingClientRect();
        if (r.top < (window.innerHeight || 0) && r.bottom > 0) {
          showLines();
          lio.disconnect();
        }
      }, 1200);
    } else {
      showLines();
    }
  }

  function afterFonts(fn) {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fn).catch(fn);
    } else {
      window.addEventListener('load', fn);
    }
  }
  afterFonts(buildLines);

  var rsT;
  var lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    clearTimeout(rsT);
    rsT = setTimeout(function () {
      if (Math.abs(window.innerWidth - lastW) > 24) {
        lastW = window.innerWidth;
        buildLines();
      }
    }, 260);
  });
  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener('change', function () {
      if (leadEl && leadOriginal !== null) {
        leadEl.innerHTML = leadOriginal;
        leadEl.removeAttribute('data-lines-built');
      }
    });
  }

  /* ----------------------------------------------------------
     4. Lecteur « وضع القراءة » : panneaux, outils, progression
     ---------------------------------------------------------- */
  var reader = $('#reader');
  var readerScroll = $('#readerScroll');
  var readerRule = $('#readerRule');
  var readerTitle = $('#readerTitle');
  var readerBab = $('#readerBab');
  var readerIssue = $('#readerIssue');
  var readerPage = $('#readerPage');
  var pieces = $$('.piece', reader || document);
  var closeBtn = $('#readerClose');
  var lastFocus = null;

  var FS_MIN = 16, FS_MAX = 25, fs = 19;
  var LH_STEPS = [1.6, 1.7, 1.8, 1.9, 2.05, 2.2], lhIdx = 3;
  var fsVal = $('#fsVal'), lhVal = $('#lhVal');
  var fsDown = $('#fsDown'), fsUp = $('#fsUp');
  var lhDown = $('#lhDown'), lhUp = $('#lhUp');

  function syncTools() {
    if (reader) {
      reader.style.setProperty('--rd-fs', fs + 'px');
      reader.style.setProperty('--rd-lh', String(LH_STEPS[lhIdx]));
    }
    if (fsVal) fsVal.textContent = String(fs);
    if (lhVal) lhVal.textContent = LH_STEPS[lhIdx].toFixed(2);
    if (fsDown) fsDown.disabled = fs <= FS_MIN;
    if (fsUp) fsUp.disabled = fs >= FS_MAX;
    if (lhDown) lhDown.disabled = lhIdx <= 0;
    if (lhUp) lhUp.disabled = lhIdx >= LH_STEPS.length - 1;
  }

  function showPiece(piece) {
    pieces.forEach(function (p) {
      p.classList.toggle('is-active', p === piece);
    });
    if (readerTitle) readerTitle.textContent = piece.getAttribute('data-title') || '';
    if (readerBab) readerBab.textContent = piece.getAttribute('data-bab') || '';
    if (readerIssue) readerIssue.textContent = piece.getAttribute('data-issue') || '';
    if (readerPage) readerPage.textContent = piece.getAttribute('data-page') || '';
    if (readerScroll) readerScroll.scrollTop = 0;
    updateRule();
  }

  function updateRule() {
    if (!readerScroll || !readerRule) return;
    var max = readerScroll.scrollHeight - readerScroll.clientHeight;
    var pct = max > 4 ? (readerScroll.scrollTop / max) * 100 : 0;
    readerRule.style.width = Math.min(100, Math.max(0, pct)) + '%';
  }
  if (readerScroll) readerScroll.addEventListener('scroll', updateRule, { passive: true });

  function focusables() {
    return $$('button:not([disabled]),a[href],select,input,[tabindex]:not([tabindex="-1"])', reader)
      .filter(function (el) { return el.offsetParent !== null; });
  }

  function openReader(piece) {
    if (!reader || !piece) return;
    lastFocus = document.activeElement;
    showPiece(piece);
    reader.classList.add('is-open');
    root.style.overflow = 'hidden';
    /* retirer l'arrière-plan de l'arbre d'accessibilité */
    ['#topbar', '#main', '.footer'].forEach(function (sel) {
      var el = $(sel);
      if (el) el.setAttribute('aria-hidden', 'true');
    });
    if (!reader.hasAttribute('tabindex')) reader.setAttribute('tabindex', '-1');
    reader.focus();
  }

  function closeReader() {
    if (!reader || !reader.classList.contains('is-open')) return;
    reader.classList.remove('is-open');
    root.style.overflow = '';
    ['#topbar', '#main', '.footer'].forEach(function (sel) {
      var el = $(sel);
      if (el) el.removeAttribute('aria-hidden');
    });
    if (location.hash && /^#p-/.test(location.hash)) {
      history.replaceState(null, '', location.pathname + location.search);
    }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* tous les .opener pointant vers un panneau */
  $$('.opener').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('data-piece') ||
        (a.getAttribute('href') || '').replace(/^#/, '');
      var piece = id && document.getElementById(id);
      if (piece && reader) {
        e.preventDefault();
        openReader(piece);
        history.replaceState(null, '', '#' + id);
      }
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeReader);

  document.addEventListener('keydown', function (e) {
    if (!reader || !reader.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeReader(); return; }
    if (e.key === 'Tab') {
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === reader)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  });

  if (fsDown) fsDown.addEventListener('click', function () { fs = Math.max(FS_MIN, fs - 1); syncTools(); });
  if (fsUp) fsUp.addEventListener('click', function () { fs = Math.min(FS_MAX, fs + 1); syncTools(); });
  if (lhDown) lhDown.addEventListener('click', function () { lhIdx = Math.max(0, lhIdx - 1); syncTools(); });
  if (lhUp) lhUp.addEventListener('click', function () { lhIdx = Math.min(LH_STEPS.length - 1, lhIdx + 1); syncTools(); });
  syncTools();

  /* lien profond : /#p-story ouvre directement le texte */
  afterFonts(function () {
    var h = (location.hash || '').replace(/^#/, '');
    if (/^p-/.test(h)) {
      var piece = document.getElementById(h);
      if (piece && reader) openReader(piece);
    }
  });

  /* ----------------------------------------------------------
     5. Filtres de l'archive
     ---------------------------------------------------------- */
  var form = $('#filters');
  var issuesList = $('#issues');
  var issues = $$('.issue', issuesList || document);
  var countEl = $('#archCount');
  var emptyEl = $('#archEmpty');
  var resetBtn = $('#archReset');
  var chips = $$('.chip');
  var numFrom = $('#numFrom');
  var numTo = $('#numTo');
  var sortSel = $('#sortSel');
  var N_MIN = 9, N_MAX = 24;
  var msgTimer = null;

  function state() {
    var bab = 'all';
    chips.forEach(function (c) { if (c.classList.contains('is-on')) bab = c.getAttribute('data-bab') || 'all'; });
    var from = parseInt(numFrom && numFrom.value, 10);
    var to = parseInt(numTo && numTo.value, 10);
    if (isNaN(from)) from = N_MIN;
    if (isNaN(to)) to = N_MAX;
    return { bab: bab, from: from, to: to, sort: sortSel ? sortSel.value : 'new' };
  }

  function showCount(text, isMsg) {
    if (!countEl) return;
    countEl.textContent = text;
    countEl.classList.toggle('is-msg', !!isMsg);
  }

  function applyFilters() {
    if (!issuesList) return;
    var st = state();
    var clamped = false;
    if (st.from > st.to) { var t = st.from; st.from = st.to; st.to = t; clamped = true; }
    if (st.from < N_MIN || st.to > N_MAX) clamped = true;
    st.from = Math.max(N_MIN, Math.min(N_MAX, st.from));
    st.to = Math.max(N_MIN, Math.min(N_MAX, st.to));
    if (numFrom) numFrom.value = String(st.from);
    if (numTo) numTo.value = String(st.to);

    var visible = 0;
    issues.forEach(function (li) {
      var n = parseInt(li.getAttribute('data-n'), 10) || 0;
      var babs = (li.getAttribute('data-babs') || '').split(/\s+/);
      var ok = n >= st.from && n <= st.to && (st.bab === 'all' || babs.indexOf(st.bab) !== -1);
      li.classList.toggle('is-hidden', !ok);
      if (ok) visible++;
    });

    var sorted = issues.slice().sort(function (a, b) {
      var na = +a.getAttribute('data-n'), nb = +b.getAttribute('data-n');
      var pa = +a.getAttribute('data-pages'), pb = +b.getAttribute('data-pages');
      if (st.sort === 'old') return na - nb;
      if (st.sort === 'pages') return pb - pa || nb - na;
      return nb - na;
    });
    sorted.forEach(function (li) { issuesList.appendChild(li); });

    if (emptyEl) emptyEl.hidden = visible !== 0;
    var isDefault = st.bab === 'all' && st.from === N_MIN && st.to === N_MAX;
    if (clamped) {
      showCount('المدى المسموح ' + N_MIN + ' — ' + N_MAX + '، صُحِّح تلقائيًّا', true);
      clearTimeout(msgTimer);
      msgTimer = setTimeout(applyCountLabel, 2600);
    } else {
      clearTimeout(msgTimer);
      applyCountLabel();
    }
    function applyCountLabel() {
      if (isDefault && visible === issues.length) showCount('كل الأعداد (' + visible + ')');
      else showCount(visible + ' عددًا');
    }
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) {
        var on = c === chip;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      applyFilters();
    });
  });
  [numFrom, numTo, sortSel].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', applyFilters);
    el.addEventListener('change', applyFilters);
  });
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); applyFilters(); });
  if (resetBtn) resetBtn.addEventListener('click', function () {
    chips.forEach(function (c) {
      var on = c.getAttribute('data-bab') === 'all';
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (numFrom) numFrom.value = String(N_MIN);
    if (numTo) numTo.value = String(N_MAX);
    if (sortSel) sortSel.value = 'new';
    applyFilters();
  });
  applyFilters();
})();
