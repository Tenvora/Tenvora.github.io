/* ═══════════════════════════════════════════════════════════
   زيتون — reveal choreography + حاسبة المعصرة
   No network, no storage, no libraries.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. load timeline + one scroll reveal ─────────────── */
  function showAll() {
    [].slice.call(doc.querySelectorAll('[data-load], [data-reveal]'))
      .forEach(function (el) { el.classList.add('is-in'); });
  }

  function start() {
    doc.classList.add('is-loaded');

    if (reduce) { showAll(); return; }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });
      [].slice.call(doc.querySelectorAll('[data-reveal]')).forEach(function (el) { io.observe(el); });
    } else {
      showAll();
    }

    /* Above-the-fold never waits on a scroll event: the load choreography
       fires now, and this timer force-reveals anything still hidden. */
    window.setTimeout(showAll, 1200);
  }

  /* ── 2. حاسبة المعصرة ─────────────────────────────────── */
  var POMACE_PRICE = 1.50;   // ₪/كغ — price contracted with the soap factories
  var FX = 3.60;             // ₪ per $1, indicative
  var BALA_PRICE = 4;        // ₪/كغ — what the roadside buyer pays
  var CRATE_L = 30;          // صندوق = 6 خلّات
  var JAWD_L = 12.5;         // جود

  var CULTIVARS = {
    nabali:  { name: 'نابلي بلدي',     ratio: 0.150, hint: 'الاستخلاص النموذجي <bdi dir="ltr">15%</bdi> وزنًا.' },
    souri:   { name: 'سوري',           ratio: 0.160, hint: 'الأغزر في الموسم: حولي <bdi dir="ltr">16%</bdi> وزنًا.' },
    kanaani: { name: 'كنعاني',         ratio: 0.130, hint: 'صنف مستحدث — <bdi dir="ltr">13%</bdi> فقط، أقل من النبالي.' },
    mix:     { name: 'خليط المشايات',  ratio: 0.140, hint: 'متوسط مشايات بعلية: حولي <bdi dir="ltr">14%</bdi>.' }
  };

  var METHODS = {
    first:  { name: 'عصرة أولى على البارد', mult: 1.00, price: 65, pomace: 0.62, fee: 15 },
    second: { name: 'عصرة ثانية بالماء الساخن', mult: 0.55, price: 48, pomace: 0.55, fee: 12 },
    third:  { name: 'عصرة ثالثة — رتبة الصابون', mult: 0.22, price: 34, pomace: 0.48, fee: 10 }
  };

  var form = document.getElementById('calcForm');
  if (!form) { boot(); return; }

  var el = {
    kilos: document.getElementById('kilos'),
    cultivar: document.getElementById('cultivar'),
    method: document.getElementById('method'),
    fee: document.getElementById('fee'),
    rate: document.getElementById('rate'),
    hint: document.getElementById('cultivarHint'),
    chips: [].slice.call(doc.querySelectorAll('.chip')),
    fOil: document.getElementById('f-oil'),   vOil: document.getElementById('v-oil'),   mOil: document.getElementById('m-oil'),
    fFee: document.getElementById('f-fee'),   vFee: document.getElementById('v-fee'),   mFee: document.getElementById('m-fee'),
    fNet: document.getElementById('f-net'),   vNet: document.getElementById('v-net'),   mNet: document.getElementById('m-net'),
    fPom: document.getElementById('f-pomace'), vPom: document.getElementById('v-pomace'), mPom: document.getElementById('m-pomace'),
    fPack: document.getElementById('f-pack'), vPack: document.getElementById('v-pack'),
    tLitres: document.getElementById('t-litres'),
    tValue: document.getElementById('t-value'),
    tUsd: document.getElementById('t-usd'),
    usdNote: document.getElementById('usd-note'),
    explain: document.getElementById('explain')
  };

  function nf(value, dp) {
    if (!isFinite(value)) { value = 0; }
    var parts = Math.abs(value).toFixed(dp).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (value < 0 ? '-' : '') + parts.join('.');
  }
  function B(text) { return '<bdi dir="ltr">' + text + '</bdi>'; }
  function pct(v) { return B(nf(v, 1) + '%'); }
  function money(v) { return B(nf(v, 2)) + ' شيقل'; }
  function litres(v) { return B(nf(v, 2)) + ' لتراً'; }
  function kg(v) { return B(nf(v, 0)) + ' كغ'; }

  function readNum(input, min, max, fallback) {
    var v = parseFloat(input.value);
    if (!isFinite(v) || v <= 0) { return fallback; }
    return Math.min(max, Math.max(min, v));
  }

  function compute() {
    var cult = CULTIVARS[el.cultivar.value] || CULTIVARS.nabali;
    var meth = METHODS[el.method.value] || METHODS.first;

    /* rate and fee follow the pressing method unless the farmer edited them */
    if (el.rate.dataset.touched !== '1') { el.rate.value = meth.price; }
    if (el.fee.dataset.touched !== '1') { el.fee.value = meth.fee; }

    var weight = readNum(el.kilos, 20, 20000, 500);
    var feePct = readNum(el.fee, 0, 60, meth.fee) / 100;
    var rate = readNum(el.rate, 1, 400, meth.price);

    var ratio = cult.ratio * meth.mult;      // extraction by weight
    var oil = weight * ratio;                // crude litres
    var feeL = oil * feePct;                 // co-op takes oil, not cash
    var net = oil - feeL;
    var pomKg = weight * meth.pomace;
    var pomVal = pomKg * POMACE_PRICE;
    var grossVal = oil * rate;
    var feeVal = feeL * rate;
    var netVal = net * rate;
    var total = netVal + pomVal;

    el.fOil.innerHTML = kg(weight) + ' × ' + pct(ratio * 100);
    el.vOil.innerHTML = litres(oil);
    el.mOil.innerHTML = money(grossVal);

    el.fFee.innerHTML = litres(oil) + ' × ' + pct(feePct * 100);
    el.vFee.innerHTML = litres(feeL);
    el.mFee.innerHTML = money(feeVal);

    el.fNet.innerHTML = B(nf(oil, 2) + ' − ' + nf(feeL, 2)) + ' لتراً';
    el.vNet.innerHTML = litres(net);
    el.mNet.innerHTML = money(netVal);

    el.fPom.innerHTML = kg(weight) + ' × ' + pct(meth.pomace * 100) + ' × ' + B('1.50') + ' شيقل';
    el.vPom.innerHTML = kg(pomKg);
    el.mPom.innerHTML = money(pomVal);

    var crates = Math.floor(net / CRATE_L);
    var rest = net - crates * CRATE_L;
    var pack = [];
    if (crates > 0) { pack.push(B(nf(crates, 0)) + ' صندوقاً'); }
    if (rest > 0.004) { pack.push(B(nf(rest, 2)) + ' لتراً سايح'); }
    if (!pack.length) { pack.push(B('0.00') + ' لتراً'); }
    pack.push(B(nf(net / JAWD_L, 1)) + ' جوداً');
    el.vPack.innerHTML = pack.join(' · ');

    el.tLitres.innerHTML = litres(net);
    el.tValue.innerHTML = money(total);
    el.tUsd.innerHTML = B('$' + nf(total / FX, 2));
    el.usdNote.innerHTML = 'بسعر صرف ' + B('3.60') + ' شيقل لكل دولار';

    var bala = weight * BALA_PRICE;
    var diff = total - bala;
    el.explain.innerHTML =
      kg(weight) + ' ' + cult.name + '، ' + meth.name + ': ' +
      B(nf(weight, 0)) + ' × ' + pct(ratio * 100) + ' = ' + litres(oil) + ' زيت خام. ' +
      'المعصرة تاخد رسمها عيني — ' + pct(feePct * 100) + ' أي ' + litres(feeL) +
      ' — فيصير صافي المزارع ' + litres(net) + '. على ' + B(nf(rate, 0)) + ' شيقل للتر ' +
      'هذا يساوي ' + money(netVal) + '، ومعاها المركة ' + kg(pomKg) + ' بقيمة ' +
      money(pomVal) + ' لأنها تروح لمعامل الصابون النابلسي — فالإجمالي ' + money(total) +
      ' أي ' + B('$' + nf(total / FX, 2)) + '. ' +
      'البيع على البالة بأربعة شواقل للكيلو كان يوقف عند ' + money(bala) + '، ' +
      (diff >= 0
        ? 'فالفرق لصالح المزارع ' + money(diff) + '.'
        : 'وهو أعلى من هذا الحساب بـ ' + money(-diff) + '، لأن العصرات المتأخرة تنزل الرتبة والسعر أكثر مما تنزل الكمية.');

    el.hint.innerHTML = cult.hint;

    el.chips.forEach(function (chip) {
      chip.setAttribute('aria-pressed', String(parseFloat(chip.dataset.kilos) === weight));
    });
  }

  form.addEventListener('input', function (e) {
    if (e.target === el.rate) { el.rate.dataset.touched = '1'; }
    if (e.target === el.fee) { el.fee.dataset.touched = '1'; }
    compute();
  });

  form.addEventListener('change', function (e) {
    if (e.target === el.method) {
      delete el.rate.dataset.touched;
      delete el.fee.dataset.touched;
    }
    compute();
  });

  el.chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      el.kilos.value = chip.dataset.kilos;
      compute();
    });
  });

  compute();

  function boot() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      requestAnimationFrame(start);
    }
  }
  boot();
})();
