/* ==========================================================================
   حُلم — منطق الصفحة (بلا أي طلبات شبكة)
   ترويسة لاصقة، قائمة جوال، تصفية المشاريع، منزلق الآراء،
   نموذج استشارة مُعترَض محليًا، وأرقام متحركة.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------------------
     1) الترويسة: زيادة الضبابية عند التمرير
     ---------------------------------------------------------------------- */
  var header = document.getElementById('siteHeader');
  var SCROLL_THRESHOLD = 10;

  function onScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > SCROLL_THRESHOLD);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ----------------------------------------------------------------------
     2) قائمة الجوال (زر برغر)
     ---------------------------------------------------------------------- */
  var menuToggle = document.getElementById('menuToggle');
  var siteMenu = document.getElementById('siteMenu');

  function openMenu() {
    siteMenu.classList.add('is-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'إغلاق القائمة');
  }

  function closeMenu(restoreFocus) {
    if (!siteMenu.classList.contains('is-open')) return;
    siteMenu.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'فتح القائمة');
    if (restoreFocus) menuToggle.focus();
  }

  menuToggle.addEventListener('click', function () {
    if (siteMenu.classList.contains('is-open')) {
      closeMenu(true);
    } else {
      openMenu();
    }
  });

  // إغلاق القائمة عند اختيار رابط أو الضغط على Escape أو تكبير النافذة
  siteMenu.addEventListener('click', function (e) {
    if (e.target.closest('a')) closeMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu(true);
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 768) closeMenu(false);
  });

  /* ----------------------------------------------------------------------
     3) AOS: تهيئة آمنة — لا يبقى أي محتوى مخفيًا أبدًا
     ---------------------------------------------------------------------- */
  function forceRevealAll() {
    doc.classList.add('no-aos');
    var hidden = document.querySelectorAll('[data-aos]');
    for (var i = 0; i < hidden.length; i++) {
      hidden[i].removeAttribute('data-aos');
    }
  }

  window.addEventListener('load', function () {
    if (reducedMotion || typeof window.AOS === 'undefined') {
      // الحركة ممنوعة، أو فشل تحميل المكتبة من الشبكة → أظهر كل شيء فورًا
      forceRevealAll();
      return;
    }
    window.AOS.init({
      once: true,
      duration: 750,
      easing: 'ease-out-cubic',
      offset: 70,
      disable: false
    });
    // شبكة أمان احتياطية: إن لم تُحرَّك العناصر خلال ثانيتين، أظهرها يدويًا
    setTimeout(function () {
      var still = document.querySelectorAll('[data-aos]:not(.aos-animate)');
      for (var i = 0; i < still.length; i++) {
        var box = still[i].getBoundingClientRect();
        if (box.top < window.innerHeight) still[i].classList.add('aos-animate');
      }
    }, 2000);
  });

  /* ----------------------------------------------------------------------
     4) تصفية المشاريع — تعمل بالأزرار واللوحة معًا
     ---------------------------------------------------------------------- */
  var filterButtons = Array.prototype.slice.call(document.querySelectorAll('.filter-chip'));
  var projectCards = Array.prototype.slice.call(document.querySelectorAll('.project-card'));
  var grid = document.getElementById('projectsGrid');
  var filterStatus = document.getElementById('filterStatus');

  var CATEGORY_NAMES = {
    all: 'كل الأنواع',
    residential: 'سكني',
    commercial: 'تجاري',
    hospitality: 'ضيافة'
  };

  function applyFilter(filter) {
    var visible = 0;
    projectCards.forEach(function (card) {
      var match = filter === 'all' || card.getAttribute('data-category') === filter;
      card.classList.toggle('is-hidden', !match);
      if (match) visible++;
    });
    // إعلان عدد النتائج لمن يستخدم قارئ الشاشة
    filterStatus.textContent =
      'عرض ' + visible + ' من ' + projectCards.length + ' مشاريع — تصنيف: ' + CATEGORY_NAMES[filter];
  }

  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var filter = btn.getAttribute('data-filter');
      filterButtons.forEach(function (other) {
        var pressed = other === btn;
        other.setAttribute('aria-pressed', pressed ? 'true' : 'false');
        other.classList.toggle('is-pressed', pressed);
      });
      // وميض خفيف ثم إعادة الترتيب
      grid.classList.add('is-swapping');
      window.setTimeout(function () {
        applyFilter(filter);
        grid.classList.remove('is-swapping');
      }, reducedMotion ? 0 : 180);
    });
  });

  /* ----------------------------------------------------------------------
     5) منزلق الآراء — متوافق مع RTL (السهم التالي إلى اليسار)
     ---------------------------------------------------------------------- */
  var slider = doc.querySelector('.slider');
  var track = document.getElementById('sliderTrack');
  var slides = Array.prototype.slice.call(track.children);
  var dots = Array.prototype.slice.call(document.querySelectorAll('.slider__dot'));
  var prevBtn = document.getElementById('slidePrev');
  var nextBtn = document.getElementById('slideNext');
  var sliderStatus = document.getElementById('sliderStatus');
  var current = 0;
  var isRTL = getComputedStyle(doc).direction === 'rtl';

  function goTo(index, announce) {
    current = (index + slides.length) % slides.length;
    // في RTL يتكدّس المسار نحو اليمين، لذا تكون الإزاحة موجبة
    var offset = isRTL ? current * 100 : -current * 100;
    track.style.transform = 'translateX(' + offset + '%)';

    dots.forEach(function (dot, i) {
      var active = i === current;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    });
    slides.forEach(function (slide, i) {
      slide.setAttribute('aria-hidden', i === current ? 'false' : 'true');
    });
    if (announce !== false) {
      sliderStatus.textContent = 'الرأي ' + (current + 1) + ' من ' + slides.length;
    }
  }

  prevBtn.addEventListener('click', function () { goTo(current - 1); });
  nextBtn.addEventListener('click', function () { goTo(current + 1); });
  dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      goTo(parseInt(dot.getAttribute('data-slide'), 10));
    });
  });

  // أسهم لوحة المفاتيح داخل منطقة المنزلقة (اتجاه فيزيائي: يسار = التالي في RTL)
  slider.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current + (isRTL ? 1 : -1)); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + (isRTL ? -1 : 1)); }
    if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    if (e.key === 'End') { e.preventDefault(); goTo(slides.length - 1); }
  });

  goTo(0, false);

  /* ----------------------------------------------------------------------
     6) نموذج الاستشارة — اعترض الإرسال محليًا، بلا أي طلب شبكة
     ---------------------------------------------------------------------- */
  var form = document.getElementById('consultForm');
  var formError = document.getElementById('formError');
  var successBox = document.getElementById('consultSuccess');
  var resetBtn = document.getElementById('resetConsult');

  form.addEventListener('submit', function (e) {
    e.preventDefault(); // لا إرسال ولا شبكة إطلاقًا

    var missing = false;
    var required = form.querySelectorAll('[required]');
    required.forEach(function (input) {
      var empty = !input.value.trim();
      input.setAttribute('aria-invalid', empty ? 'true' : 'false');
      input.style.borderColor = empty ? '#7E1F2E' : '';
      if (empty && !missing) {
        missing = true;
        input.focus();
      }
    });

    if (missing) {
      formError.hidden = false;
      return;
    }

    formError.hidden = true;
    form.hidden = true;
    successBox.hidden = false;
    successBox.focus(); // نقل البؤرة إلى حالة النجاح لقارئ الشاشة
  });

  // إزالة حالة الخطأ فور تصحيح الحقل
  form.addEventListener('input', function (e) {
    var input = e.target;
    if (input.matches('[required]') && input.value.trim()) {
      input.setAttribute('aria-invalid', 'false');
      input.style.borderColor = '';
    }
  });

  resetBtn.addEventListener('click', function () {
    form.reset();
    form.hidden = false;
    successBox.hidden = true;
    var first = document.getElementById('fName');
    first.focus();
  });

  /* ----------------------------------------------------------------------
     7) عداد الأرقام — يبدأ عند ظهور الشريط، ويتخطى الحركة المقلَّلة
     ---------------------------------------------------------------------- */
  var counters = Array.prototype.slice.call(document.querySelectorAll('.stat__value .num[data-count]'));

  function formatNumber(value) {
    return value.toLocaleString('en-US');
  }

  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (!target || target <= 0) return;
    var duration = 1500;
    var start = null;

    function tick(timestamp) {
      if (start === null) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      el.textContent = formatNumber(Math.round(target * eased));
      if (progress < 1) window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  }

  if (!reducedMotion && 'IntersectionObserver' in window && counters.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { observer.observe(el); });
  }
})();
