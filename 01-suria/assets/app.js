/* =============================================================================
   SURIA (سُرعة) — interactions
   Degrades cleanly when GSAP is unavailable: content stays visible, the rail
   stays drawn, and counters show their final value.
   ============================================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduceMotion = motionQuery.matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);

  /* ---------------------------------------------------------------- helpers */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function on(el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt); }

  function fmt(value, decimals) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  /* ------------------------------------------------------- 1. initialisation
     GSAP is only used when the CDN answered and the user does not ask for
     reduced motion. Otherwise nothing is ever put in a hidden state. */
  var animate = hasGsap && !reduceMotion;
  if (hasGsap) { root.classList.add('has-gsap'); }
  if (animate) { window.gsap.registerPlugin(window.ScrollTrigger); }
  if (!hasGsap) { root.classList.add('no-gsap'); }

  /* ------------------------------------------ 2. scroll progress bar
     plus the pinned header state */
  (function scrollIndicator() {
    var header = $('.site-header');
    var fill = $('#scrollRailFill');
    if (!header) { return; }
    var ticking = false;

    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (fill) { fill.style.width = (ratio * 100).toFixed(2) + '%'; }
      header.classList.toggle('is-scrolled', window.scrollY > 12);
      ticking = false;
    }
    function request() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }
    on(window, 'scroll', request, { passive: true });
    on(window, 'resize', request);
    update();
  }());

  /* ------------------------------------ 3. mobile menu: accessible hamburger */
  (function mobileNav() {
    var toggle = $('#navToggle');
    var nav = $('#main-nav');
    if (!toggle || !nav) { return; }
    var mq = window.matchMedia('(max-width: 900px)');

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'أغلق قائمة التنقّل' : 'افتح قائمة التنقّل');
      nav.classList.toggle('is-open', open);
      root.classList.toggle('nav-open', open);
    }

    on(toggle, 'click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    $$('.nav-link', nav).forEach(function (link) {
      on(link, 'click', function () { if (mq.matches) { setOpen(false); } });
    });
    on(document, 'keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    on(document, 'click', function (e) {
      if (toggle.getAttribute('aria-expanded') !== 'true') { return; }
      if (nav.contains(e.target) || toggle.contains(e.target)) { return; }
      setOpen(false);
    });
    function syncWide() { if (!mq.matches) { setOpen(false); } }
    if (mq.addEventListener) { mq.addEventListener('change', syncWide); }
    on(window, 'resize', syncWide);
    setOpen(false);
  }());

  /* ------------------------------------------------------ 4. active nav link */
  (function currentLink() {
    var links = $$('.nav-link');
    if (!links.length || !('IntersectionObserver' in window)) { return; }
    var map = {};
    var targets = [];
    links.forEach(function (link) {
      var id = link.getAttribute('href').replace('#', '');
      var section = document.getElementById(id);
      if (section) { map[id] = link; targets.push(section); }
    });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = map[entry.target.id];
        if (!link) { return; }
        if (entry.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('is-current'); });
          link.classList.add('is-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    targets.forEach(function (t) { observer.observe(t); });
  }());

  /* ------------------------------------------------------- 5. soft reveals
     Elements start visible in CSS. gsap.from() only animates them:
     without GSAP nothing is ever masked. */
  function reveal(selector, offset) {
    if (!animate) { return; }
    $$(selector).forEach(function (el, i) {
      window.gsap.from(el, {
        opacity: 0,
        y: 26,
        duration: 0.85,
        delay: (i % 3) * 0.08,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top ' + (offset || '88%'), once: true }
      });
    });
  }
  reveal('[data-reveal]', '90%');

  if (animate) {
    $$('.section-head, .section-kicker, .trust-title').forEach(function (el) {
      window.gsap.from(el, {
        opacity: 0, y: 18, duration: 0.7, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true }
      });
    });
  }

  /* ========================= 6. THE MONEY PATH (signature animation) ========
     A kufic-style orthogonal line links the three cards; its stroke-dashoffset
     follows the scroll, and every node lights up when the line reaches it. */
  (function moneyPath() {
    var rail = $('#railLive');
    var wrap = $('#money-path');
    var cards = $$('#stepCards .step-card');
    var nodes = $$('.path-node');
    if (!wrap || !rail || !cards.length) { return; }

    var BAR = $('.js-progress-bar');
    if (animate && BAR) {
      window.gsap.fromTo(BAR, { scaleX: 0.18 }, {
        scaleX: 1, duration: 1.9, ease: 'power2.out',
        scrollTrigger: { trigger: BAR, start: 'top 95%', once: true }
      });
    }

    function light(index, on) {
      if (cards[index]) { cards[index].classList.toggle('is-lit', on); }
      if (nodes[index]) { nodes[index].classList.toggle('is-lit', on); }
    }
    function reset() { cards.forEach(function (c, i) { light(i, false); }); }

    if (animate) {
      /* hidden only here: without GSAP the line stays fully drawn */
      window.gsap.set(rail, { strokeDashoffset: 100 });
      window.gsap.to(rail, {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: wrap,
          start: 'top 92%',
          end: 'bottom 52%',
          scrub: 0.5
        }
      });
      cards.forEach(function (card, i) {
        window.ScrollTrigger.create({
          trigger: card,
          start: 'top 70%',
          end: 'bottom 30%',
          onEnter: function () { light(i, true); },
          onEnterBack: function () { light(i, true); },
          onLeaveBack: function () { light(i, false); }
        });
      });
      /* last node stays lit: the destination remains visible */
      window.ScrollTrigger.create({
        trigger: wrap, start: 'top 60%', end: 'bottom bottom',
        onLeave: function () { light(2, true); }
      });
      window.addEventListener('resize', function () { window.ScrollTrigger.refresh(); });
    } else {
      /* no GSAP (or reduced motion): final state, readable right away */
      rail.setAttribute('stroke-dashoffset', '0');
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            var idx = $$('#stepCards .step-card').indexOf(entry.target);
            if (idx > -1) { light(idx, entry.isIntersecting || entry.intersectionRatio > 0.35); }
          });
        }, { threshold: [0, 0.35, 0.6] });
        cards.forEach(function (c) { io.observe(c); });
      } else {
        reset();
        cards.forEach(function (c, i) { light(i, true); });
      }
    }
  }());

  /* ------------------------------------------------------------ 7. counters
     With reduced motion the final value is shown instantly. */
  (function counters() {
    var nums = $$('[data-count]');
    if (!nums.length) { return; }

    nums.forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var suffix = el.getAttribute('data-suffix') || '';
      var finalText = fmt(target, decimals) + suffix;
      el.dataset.final = finalText;
      if (reduceMotion) { el.textContent = finalText; }
    });

    if (reduceMotion || !('IntersectionObserver' in window)) { return; }

    function run(el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var suffix = el.getAttribute('data-suffix') || '';
      var duration = 1500;
      var startTime = null;

      function step(now) {
        if (startTime === null) { startTime = now; }
        var t = Math.min(1, (now - startTime) / duration);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = fmt(target * eased, decimals) + (t === 1 ? suffix : '');
        if (t < 1) { window.requestAnimationFrame(step); }
      }
      window.requestAnimationFrame(step);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    nums.forEach(function (el) { io.observe(el); });
  }());

  /* --------------------------------------------- 8. testimonial carousel
     Static (no autoplay), driven purely client-side. */
  (function carousel() {
    var region = $('#carousel');
    var slides = $$('#carouselTrack .t-slide');
    var dots = $$('#carouselDots .dot');
    var prev = $('#prevBtn');
    var next = $('#nextBtn');
    if (!region || slides.length < 2) { return; }
    var index = 0;

    function show(target, moveFocus) {
      index = (target + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        var active = i === index;
        slide.classList.toggle('is-active', active);
        slide.classList.toggle('is-exit', !active && i < index);
        slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
      dots.forEach(function (dot, i) {
        var active = i === index;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-current', active ? 'true' : 'false');
      });
      if (moveFocus && dots[index]) { dots[index].focus(); }
    }

    on(prev, 'click', function () { show(index - 1); });
    on(next, 'click', function () { show(index + 1); });
    dots.forEach(function (dot) {
      on(dot, 'click', function () { show(parseInt(dot.dataset.index, 10)); });
    });
    on(region, 'keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(index + 1); }      /* RTL: the left arrow moves forward */
      else if (e.key === 'ArrowRight') { e.preventDefault(); show(index - 1); }
      else if (e.key === 'Home') { e.preventDefault(); show(0); }
      else if (e.key === 'End') { e.preventDefault(); show(slides.length - 1); }
    });
    show(0);
  }());

  /* ------------------------------------------------------- 9. faq accordion
     details/summary stay native: mouse and keyboard work without JS.
     Here we only close the others to keep the vertical rhythm tight. */
  (function accordion() {
    var items = $$('.qa');
    if (!items.length) { return; }
    items.forEach(function (item) {
      on($('summary', item), 'click', function () {
        if (!item.open) { return; }
        items.forEach(function (other) { if (other !== item) { other.open = false; } });
      });
    });
  }());

  /* ------------------------------------------------- 10. the only form
     No network request: the confirmation is shown inline. */
  (function newsletter() {
    var form = $('#ctaForm');
    var input = $('#email');
    var status = $('#formStatus');
    if (!form || !input || !status) { return; }

    function say(message, kind) {
      status.textContent = message;
      status.classList.remove('is-ok', 'is-error');
      status.classList.add('is-visible', kind);
      input.setAttribute('aria-invalid', kind === 'is-error' ? 'true' : 'false');
    }

    on(form, 'submit', function (e) {
      e.preventDefault();
      var value = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value)) {
        say('يبدو أن البريد غير مكتمل — راجعه ثم أرسله مجددًا.', 'is-error');
        input.focus();
        return;
      }
      say('تم تسجيل بريدك. نتواصل معك خلال يوم عمل واحد لترتيب جلسة الإعداد.', 'is-ok');
      input.value = '';
      input.removeAttribute('aria-invalid');
    });
    on(input, 'input', function () {
      if (status.classList.contains('is-error')) {
        status.classList.remove('is-visible', 'is-error');
        status.textContent = '';
      }
    });
  }());

  /* ------------------------------------------------------------- 11. year */
  (function year() {
    var el = $('#year');
    if (el) { el.textContent = String(new Date().getFullYear()); }
  }());

  /* --------------------------- 12. refresh once assets are settled */
  function refreshScrollTriggers() {
    if (animate && window.ScrollTrigger) { window.ScrollTrigger.refresh(); }
  }
  if (document.readyState === 'complete') { refreshScrollTriggers(); }
  else { window.addEventListener('load', refreshScrollTriggers); }

  /* live change of the motion preference: snap to the final state */
  function onMotionChange(e) {
    if (e.matches && window.ScrollTrigger) {
      $$('[data-count]').forEach(function (el) {
        if (el.dataset.final) { el.textContent = el.dataset.final; }
      });
      var rail = $('#railLive');
      if (rail) { rail.setAttribute('stroke-dashoffset', '0'); }
    }
  }
  if (motionQuery.addEventListener) { motionQuery.addEventListener('change', onMotionChange); }
  else if (motionQuery.addListener) { motionQuery.addListener(onMotionChange); }
}());
