// DIGITECH, макет главной: шапка, слайдер, каталог, меню, карусели, фильтр, корзина, окна, калькуляторы, 3D при скролле.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const smooth = () => (reduce.matches ? 'auto' : 'smooth');

  // ---- Высота липкой шапки → отступ для якорей
  const header = $('[data-header]');
  if (header && 'ResizeObserver' in window) {
    new ResizeObserver(() => document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px')).observe(header);
  }

  // ---- Слайдер: без автопрокрутки, кроссфейд в CSS
  const slider = $('[data-slider]');
  if (slider) {
    const slides = $$('.slide', slider);
    const dots = $$('.dots button', slider);
    let current = 0;
    const show = (i) => {
      current = (i + slides.length) % slides.length;
      slides.forEach((s, k) => { s.hidden = k !== current; });
      dots.forEach((d, k) => d.setAttribute('aria-current', String(k === current)));
      slider.dataset.slide = String(current + 1);
    };
    $('[data-prev]', slider).addEventListener('click', () => show(current - 1));
    $('[data-next]', slider).addEventListener('click', () => show(current + 1));
    dots.forEach((d, k) => d.addEventListener('click', () => show(k)));
    slider.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
  }

  // ---- Каталог в шапке: клик, клик мимо, Esc, уход фокуса
  const catalog = $('[data-catalog]');
  if (catalog) {
    const btn = $('.catalog__toggle', catalog);
    const panel = $('#mega');
    const set = (open) => { btn.setAttribute('aria-expanded', String(open)); panel.hidden = !open; };
    btn.addEventListener('click', () => set(panel.hidden));
    document.addEventListener('click', (e) => { if (!catalog.contains(e.target)) set(false); });
    catalog.addEventListener('focusout', (e) => { if (!catalog.contains(e.relatedTarget)) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { set(false); btn.focus(); } });
    $$('a', panel).forEach((a) => a.addEventListener('click', () => set(false)));
  }

  // ---- Меню на телефоне: кнопка, Esc, клик по пункту
  const nav = $('#nav');
  const menu = $('[data-menu]');
  if (nav && menu) {
    const set = (open) => { nav.toggleAttribute('data-open', open); menu.setAttribute('aria-expanded', String(open)); };
    menu.addEventListener('click', () => set(!nav.hasAttribute('data-open')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.hasAttribute('data-open')) { set(false); menu.focus(); } });
    $$('a', nav).forEach((a) => a.addEventListener('click', () => set(false)));
  }

  // ---- Карусели: стрелки прячутся, если всё помещается
  $$('[data-carousel]').forEach((c) => {
    const track = $('.carousel__track', c);
    const btns = $$('[data-scroll]', c);
    const sync = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      c.classList.toggle('is-static', max <= 0);
      btns.forEach((b) => { b.disabled = b.dataset.scroll < 0 ? track.scrollLeft <= 2 : track.scrollLeft >= max; });
    };
    btns.forEach((b) => b.addEventListener('click', () => track.scrollBy({ left: Number(b.dataset.scroll) * track.clientWidth * 0.8, behavior: smooth() })));
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  });

  // ---- Фильтр товаров
  const tabs = $('[data-tabs]');
  const filter = (cat) => {
    if (!tabs) return;
    $$('button', tabs).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === cat)));
    $$('.product').forEach((p) => { p.hidden = cat !== 'all' && p.dataset.cat !== cat; });
  };
  if (tabs) $$('button', tabs).forEach((b) => b.addEventListener('click', () => filter(b.dataset.filter)));
  $$('[data-tab-link]').forEach((a) => a.addEventListener('click', () => filter(a.dataset.tabLink)));

  // ---- Корзина: в макете только счётчик
  const countEl = $('[data-cart-count]');
  let picked = new Set();
  try { picked = new Set(JSON.parse(localStorage.getItem('dt-cart') || '[]')); } catch (e) { /* хранилище недоступно */ }
  const renderCart = () => {
    if (countEl) countEl.textContent = String(picked.size);
    $$('[data-add]').forEach((b) => {
      const on = picked.has(b.dataset.add);
      b.setAttribute('aria-pressed', String(on));
      $('span', b).textContent = on ? 'В корзине' : 'В корзину';
    });
  };
  $$('[data-add]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.add;
    if (picked.has(id)) picked.delete(id); else picked.add(id);
    try { localStorage.setItem('dt-cart', JSON.stringify([...picked])); } catch (e) { /* хранилище недоступно */ }
    renderCart();
  }));
  renderCart();

  // ---- Окна: заявка и калькуляторы; тема заявки обновляется, пока её не правили руками
  $$('[data-open-dialog]').forEach((t) => t.addEventListener('click', (e) => {
    const dlg = document.getElementById(t.dataset.openDialog);
    if (!dlg || typeof dlg.showModal !== 'function') return;
    e.preventDefault();
    const field = $('[data-topic-field]', dlg);
    if (field && t.dataset.topic && (!field.value.trim() || field.value === field.dataset.auto)) {
      field.value = field.dataset.auto = t.dataset.topic + ': ';
    }
    $$('dialog[open]').forEach((d) => d.close());
    dlg.showModal();
  }));
  $$('dialog').forEach((d) => {
    $$('[data-close]', d).forEach((b) => b.addEventListener('click', () => d.close()));
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  });

  // ---- Калькуляторы: формулы с текущего сайта (site/app/storefront.tsx)
  const nb = (s) => s.replace(/ /g, ' ');
  const val = (f, n) => Number(f.elements[n].value);
  const ups = $('[data-calc="ups"]');
  const upsOut = $('[data-out="ups"]');
  const calcUps = () => {
    const power = val(ups, 'power'), ah = val(ups, 'ah'), volt = val(ups, 'voltage');
    if (!(power > 0) || !(ah > 0) || !(volt > 0)) { upsOut.textContent = 'Укажите мощность и АКБ'; return; }
    const usable = Math.max(0, ah * (1 - ((val(ups, 'depth') || 0) + (val(ups, 'wear') || 0)) / 100));
    const effRaw = val(ups, 'eff') || 0;
    const eff = Math.max(0, Math.min(1, effRaw > 1 ? effRaw / 100 : effRaw));
    const ideal = (usable * volt * eff) / power;
    const corr = Math.max(30, Math.min(100, 51.437 * Math.pow(Math.max(0, ideal), 0.28))) / 100;
    const minutes = Math.max(0, Math.round(ideal * corr * 60));
    const h = Math.floor(minutes / 60), m = minutes % 60;
    upsOut.textContent = nb(h ? `≈ ${h} ч ${String(m).padStart(2, '0')} мин` : `≈ ${m} мин`);
  };
  if (ups && upsOut) { ups.addEventListener('input', calcUps); calcUps(); }

  const arc = $('[data-calc="arc"]');
  const arcOut = $('[data-out="arc"]');
  const rateOut = $('[data-out="bitrate"]');
  const calcArc = () => {
    const cams = val(arc, 'cams');
    if (!(cams > 0)) { arcOut.textContent = 'Укажите число камер'; return; }
    const kbps = 4096 * (val(arc, 'res') / 2.0736) * (val(arc, 'fps') / 25) * val(arc, 'codec');
    const hours = Math.min(24, Math.max(1, val(arc, 'hours') || 24));
    const days = Math.max(1, Math.floor((val(arc, 'hdd') * 1e12 * 8) / (cams * kbps * 1000 * 86400 * (hours / 24))));
    const word = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'день' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'дня' : 'дней');
    arcOut.textContent = nb(`≈ ${days} ${word(days)}`);
    rateOut.textContent = nb(`Битрейт ${Math.round(kbps)} Кбит/с на камеру`);
  };
  if (arc && arcOut) { arc.addEventListener('input', calcArc); calcArc(); }

  // ---- Форма заявки: адреса отправки нет, успех не показываем
  $$('form[data-endpoint]').forEach((form) => {
    const help = $('[aria-live]', form);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fields = $$('[required]', form);
      const okPhone = (v) => /^\+?[\d\s()-]{9,}$/.test(v.trim());
      const bad = fields.find((f) => (f.type === 'checkbox' ? !f.checked : f.type === 'tel' ? !okPhone(f.value) : !f.value.trim()));
      fields.forEach((f) => f.setAttribute('aria-invalid', String(f === bad)));
      if (bad) {
        help.textContent = bad.type === 'checkbox' ? 'Отметьте согласие на обработку контактных данных.'
          : bad.type === 'tel' ? 'Проверьте телефон: нужен номер вида +998 90 123 45 67.'
          : 'Укажите имя, чтобы инженер знал, как к вам обращаться.';
        bad.focus();
        return;
      }
      if (!form.dataset.endpoint) { help.textContent = 'Ничего не отправлено: форма пока не подключена.'; return; }
      fetch(form.dataset.endpoint, { method: 'POST', body: new FormData(form) })
        .then((r) => { help.textContent = r.ok ? 'Заявка принята, инженер перезвонит в рабочее время.' : 'Заявка не ушла. Попробуйте ещё раз через минуту.'; })
        .catch(() => { help.textContent = 'Заявка не ушла. Попробуйте ещё раз через минуту.'; });
    });
  });

  // ---- Кнопка «Наверх»: видна, когда первый экран ушёл
  const top = $('[data-to-top]');
  if (top && slider && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { top.hidden = e.isIntersecting; }).observe(slider);
    top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: smooth() }));
  }

  // ---- 3D при скролле (GSAP + ScrollTrigger). При reduced-motion ничего не создаётся.
  const start3d = () => {
    if (!window.gsap || !window.ScrollTrigger) return;
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    const mm = gsap.matchMedia();
    mm.add({ desktop: '(min-width: 961px) and (prefers-reduced-motion: no-preference)', mobile: '(max-width: 960px) and (prefers-reduced-motion: no-preference)' }, (ctx) => {
      const { desktop } = ctx.conditions;

      // 1. Первый экран «уходит вглубь»: фото наклоняется и отдаляется, текст обгоняет его
      gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 } })
        .to('.hero__bg img', desktop ? { rotateX: 8, z: -80, scale: 1.06, yPercent: 8, transformPerspective: 1400, ease: 'none' } : { scale: 1.08, yPercent: 6, ease: 'none' }, 0)
        .to('.hero .slide__text', { y: desktop ? -40 : -24, opacity: 0.4, ease: 'none' }, 0);

      // 2. Фото монтажника «встаёт» из наклона, как в Container Scroll (21st.dev)
      if (document.querySelector('.services__pic')) {
        gsap.fromTo('.services__pic', desktop ? { rotateX: 18, scale: 0.92, y: 40 } : { scale: 0.96, y: 24 }, {
          rotateX: 0, scale: 1, y: 0, ease: 'none',
          scrollTrigger: { trigger: '.services', start: 'top 85%', end: 'center 55%', scrub: 0.6 },
        });
        gsap.from('.services__cards li', {
          y: 40, z: -60, rotateX: desktop ? 25 : 0, transformPerspective: 1000, duration: 0.7, ease: 'power3.out', stagger: 0.08,
          scrollTrigger: { trigger: '.services__cards', start: 'top 90%', once: true },
        });
      }

      // 3. Промо: камеры поворачиваются к зрителю, плашка «%» летит в своей плоскости
      gsap.fromTo('.promo__pic img', { rotateY: desktop ? -12 : -5, x: 24 }, {
        rotateY: desktop ? 4 : 2, x: -12, transformPerspective: 1000, ease: 'none',
        scrollTrigger: { trigger: '.promo__in', start: 'top bottom', end: 'bottom top', scrub: 0.8 },
      });
      gsap.fromTo('.promo__badge', { y: 40, rotate: -8 }, {
        y: -40, rotate: 6, ease: 'none',
        scrollTrigger: { trigger: '.promo__in', start: 'top bottom', end: 'bottom top', scrub: 0.8 },
      });

      // 4. Карточки товаров «ложатся на стол» при появлении (один раз). Без opacity: товары видны и до срабатывания триггера
      gsap.from('.product:not([hidden])', {
        rotateX: desktop ? 14 : 0, y: desktop ? 40 : 24, z: desktop ? -40 : 0, transformPerspective: 1200,
        duration: 0.7, ease: 'power3.out', stagger: desktop ? 0.06 : 0.04,
        scrollTrigger: { trigger: '.products', start: 'top 85%', once: true },
      });

      // 5. Склад в блоке «О компании» разворачивается к зрителю
      gsap.fromTo('.about__pic', desktop ? { rotateY: 12, z: -60 } : { y: 24, scale: 0.97 }, {
        rotateY: 0, z: 0, y: 0, scale: 1, ease: 'none',
        scrollTrigger: { trigger: '.about', start: 'top 85%', end: 'center 55%', scrub: 0.6 },
      });

      // 6. Регистратор и ИБП в карточках калькуляторов «встают на место» (только там, где видны)
      if (desktop && matchMedia('(min-width: 1241px)').matches) {
        const imgs = $$('.calc-card img');
        if (imgs[0]) gsap.fromTo(imgs[0], { rotateX: 22, y: 20 }, { rotateX: 0, y: 0, transformPerspective: 900, ease: 'none', scrollTrigger: { trigger: '.calcs', start: 'top 90%', end: 'top 55%', scrub: 0.5 } });
        if (imgs[1]) gsap.fromTo(imgs[1], { rotateY: -14, x: 16 }, { rotateY: 0, x: 0, transformPerspective: 900, ease: 'none', scrollTrigger: { trigger: '.calcs', start: 'top 90%', end: 'top 55%', scrub: 0.5 } });
      }
    });
  };
  if (document.readyState === 'complete') start3d(); else window.addEventListener('load', start3d);
})();
