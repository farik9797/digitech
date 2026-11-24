// DIGITECH, макет главной: шапка, слайдер с видео, каталог, меню, карусели, фильтр, корзина, окна, калькуляторы, 3D и блики при скролле.
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

  // ---- Слайдер: кроссфейд в CSS, автопрокрутка ниже
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
    // Один слайд (в WordPress так бывает, если в «Баннере» один пункт): без стрелок, точек и автопрокрутки
    $('[data-prev]', slider)?.addEventListener('click', () => show(current - 1));
    $('[data-next]', slider)?.addEventListener('click', () => show(current + 1));
    dots.forEach((d, k) => d.addEventListener('click', () => show(k)));
    slider.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });

    // ---- Автопрокрутка, 5 с на слайд. Таймер — CSS-анимация полоски на активной точке:
    // её пауза (наведение, фокус с клавиатуры, hero вне экрана) останавливает и листание.
    // При «уменьшить движение» анимации нет, значит, нет и автопрокрутки.
    if (!reduce.matches && slides.length > 1) {
      slider.setAttribute('data-autoplay', '');
      slider.addEventListener('animationend', (e) => { if (e.animationName === 'dot-progress') show(current + 1); });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([e]) => slider.toggleAttribute('data-offscreen', !e.isIntersecting)).observe(slider);
      }
    }

    // ---- Видео на фоне слайдов: грузится и играет только у активного слайда и только пока hero на экране.
    // При «уменьшить движение» и режиме экономии трафика остаётся фото.
    const vids = $$('.hero__media video[data-src]', slider);
    const saveData = navigator.connection && navigator.connection.saveData;
    if (vids.length && !reduce.matches && !saveData) {
      let onScreen = true;
      const sync = () => vids.forEach((v) => {
        const active = v.closest('[data-media]').dataset.media === slider.dataset.slide;
        if (active && onScreen) {
          if (!v.getAttribute('src')) v.src = v.dataset.src;
          const p = v.play(); if (p) p.catch(() => {});
        } else v.pause();
      });
      vids.forEach((v) => v.addEventListener('playing', () => v.classList.add('is-playing'), { once: true }));
      new MutationObserver(sync).observe(slider, { attributes: true, attributeFilter: ['data-slide'] });
      if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }).observe(slider);
      sync();
    }
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

  // ---- Вкладки страницы товара: без JS видны все блоки подряд с заголовками, с JS — по одному.
  // Пустые вкладки прячет product.js (макет) или не выводит шаблон (WordPress).
  $$('[data-tabset]').forEach((set) => {
    const list = $('[role="tablist"]', set);
    const all = $$('[role="tab"]', list).filter((t) => !t.hidden);
    if (!all.length) return;
    const select = (tab, focus) => {
      all.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    };
    all.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: all.length - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        select(all[(to + all.length) % all.length], true);
      });
    });
    set.classList.add('is-tabs');
    list.hidden = false;
    // #reviews в адресе (возврат после отправки отзыва) открывает свою вкладку
    const fromHash = all.find((t) => `#${t.getAttribute('aria-controls')}` === location.hash);
    select(fromHash || all[0]);
    if (fromHash) document.getElementById(fromHash.getAttribute('aria-controls')).scrollIntoView({ block: 'start' });
  });

  // ---- Форма отзыва (вкладка «Отзывы»). В WordPress уходит обычной отправкой в wp-comments-post.php
  // и ждёт проверки в админке; в макете (data-mock) никуда не уходит.
  $$('form[data-review]').forEach((form) => {
    const f = form.elements;
    const help = $('[data-review-help]', form);
    const checks = [
      [$('input[name="rating"]', form), 'rv-rating-err', () => (f.rating.value ? '' : 'Поставьте оценку: от 1 до 5 звёзд')],
      [f.author, 'rv-name-err', () => (f.author.value.trim() ? '' : 'Напишите имя: оно будет видно над отзывом')],
      [f.email, 'rv-email-err', () => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim()) ? '' : 'Нужен e-mail вида name@mail.uz')],
      [f.comment, 'rv-text-err', () => (f.comment.value.trim().length >= 10 ? '' : 'Напишите хотя бы пару предложений о товаре')],
      [f.dt_consent, 'rv-consent-err', () => (f.dt_consent.checked ? '' : 'Без согласия мы не сможем принять отзыв')],
    ];
    const show = ([input, id, rule]) => {
      const msg = rule();
      input.setAttribute('aria-invalid', String(Boolean(msg)));
      document.getElementById(id).textContent = msg;
      return msg;
    };
    // ошибка снимается во время ввода, чтобы форма не прыгала в момент клика по следующему полю
    form.addEventListener('input', (e) => {
      const c = checks.find(([input]) => input.name === e.target.name);
      if (c && c[0].getAttribute('aria-invalid') === 'true') show(c);
    });
    form.addEventListener('submit', (e) => {
      if (f.dt_website.value) { e.preventDefault(); return; } // ловушка для ботов
      const bad = checks.filter((c) => show(c));
      if (bad.length) { e.preventDefault(); help.textContent = 'Проверьте отмеченные поля.'; bad[0][0].focus(); return; }
      if ('mock' in form.dataset) {
        e.preventDefault();
        help.textContent = 'Образец: в макете отзыв никуда не уходит. На сайте он попадёт на проверку в админку.';
      }
    });
  });

  // ---- Корзина: js/cart.js (подключается раньше этого файла)

  // ---- Окна: заявка и калькуляторы; тема заявки обновляется, пока её не правили руками
  $$('[data-open-dialog]').forEach((t) => t.addEventListener('click', (e) => {
    const dlg = document.getElementById(t.dataset.openDialog);
    if (!dlg || typeof dlg.showModal !== 'function') return;
    e.preventDefault();
    const field = $('[data-topic-field]', dlg);
    if (field && t.dataset.topic && (!field.value.trim() || field.value === field.dataset.auto)) {
      field.value = field.dataset.auto = t.dataset.topic.endsWith('\n') ? t.dataset.topic : `${t.dataset.topic}: `;
    }
    $$('dialog[open]').forEach((d) => d.close());
    dlg.showModal();
  }));
  $$('dialog').forEach((d) => {
    $$('[data-close]', d).forEach((b) => b.addEventListener('click', () => d.close()));
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  });

  // ---- Калькуляторы: js/calc.js

  // ---- Форма заявки (окно консультации). В макете адреса отправки нет — успех не показываем.
  // В WordPress адрес — digitech/v1/request: ответ несёт номер обращения или текст отказа (лимит, устаревшая страница)
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
      const send = $('[type="submit"]', form);
      send.disabled = true;
      fetch(form.dataset.endpoint, { method: 'POST', credentials: 'same-origin', body: new FormData(form) })
        .then(async (r) => {
          const data = await r.json().catch(() => ({}));
          if (!r.ok) { help.textContent = data.error || 'Заявка не ушла. Попробуйте ещё раз через минуту.'; return; }
          help.textContent = `Заявка${data.number ? ` ${data.number}` : ''} принята, инженер перезвонит в рабочее время.`;
          $$('input:not([type="hidden"]), textarea', form).forEach((f) => { if (f.type === 'checkbox') f.checked = false; else f.value = ''; });
        })
        .catch(() => { help.textContent = 'Заявка не ушла. Попробуйте ещё раз через минуту.'; })
        .finally(() => { send.disabled = false; });
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
      // Блоки 1, 3 и 5 есть только на главной: на других страницах пропускаем, чтобы GSAP не искал пустые цели.
      if ($('.hero')) {
        gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 } })
          .to('.hero__media', desktop ? { rotateX: 8, z: -80, scale: 1.06, yPercent: 8, transformPerspective: 1400, ease: 'none' } : { scale: 1.08, yPercent: 6, ease: 'none' }, 0)
          .to('.hero .slide__text', { y: desktop ? -40 : -24, opacity: 0.4, ease: 'none' }, 0);
      }

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
      if ($('.promo__in')) {
        gsap.fromTo('.promo__pic img', { rotateY: desktop ? -12 : -5, x: 24 }, {
          rotateY: desktop ? 4 : 2, x: -12, transformPerspective: 1000, ease: 'none',
          scrollTrigger: { trigger: '.promo__in', start: 'top bottom', end: 'bottom top', scrub: 0.8 },
        });
        gsap.fromTo('.promo__badge', { y: 40, rotate: -8 }, {
          y: -40, rotate: 6, ease: 'none',
          scrollTrigger: { trigger: '.promo__in', start: 'top bottom', end: 'bottom top', scrub: 0.8 },
        });
      }

      // 4. Карточки товаров «ложатся на стол» при появлении (один раз). Без opacity: товары видны и до срабатывания триггера.
      // В каталоге не анимируем: там список меняется от фильтров, и карточки должны стоять сразу (просьба Farrukh 19.11)
      if ($('.product:not([hidden])') && !$('[data-catalog-page]')) {
        gsap.from('.product:not([hidden])', {
          rotateX: desktop ? 14 : 0, y: desktop ? 40 : 24, z: desktop ? -40 : 0, transformPerspective: 1200,
          duration: 0.7, ease: 'power3.out', stagger: desktop ? 0.06 : 0.04,
          scrollTrigger: { trigger: '.products', start: 'top 85%', once: true },
        });
      }

      // 5. Склад в блоке «О компании» разворачивается к зрителю
      if ($('.about__pic')) {
        gsap.fromTo('.about__pic', desktop ? { rotateY: 12, z: -60 } : { y: 24, scale: 0.97 }, {
          rotateY: 0, z: 0, y: 0, scale: 1, ease: 'none',
          scrollTrigger: { trigger: '.about', start: 'top 85%', end: 'center 55%', scrub: 0.6 },
        });
      }

      // 6. Регистратор и ИБП в карточках калькуляторов «встают на место» (только там, где видны)
      if (desktop && matchMedia('(min-width: 1241px)').matches) {
        const imgs = $$('.calc-card img');
        if (imgs[0]) gsap.fromTo(imgs[0], { rotateX: 22, y: 20 }, { rotateX: 0, y: 0, transformPerspective: 900, ease: 'none', scrollTrigger: { trigger: '.calcs', start: 'top 90%', end: 'top 55%', scrub: 0.5 } });
        if (imgs[1]) gsap.fromTo(imgs[1], { rotateY: -14, x: 16 }, { rotateY: 0, x: 0, transformPerspective: 900, ease: 'none', scrollTrigger: { trigger: '.calcs', start: 'top 90%', end: 'top 55%', scrub: 0.5 } });
      }

      // 6б. Страница услуг: карточки услуг «ложатся на стол», как товары. Без opacity: видны и до триггера
      if ($('.svc-card')) {
        gsap.from('.svc-card', {
          rotateX: desktop ? 14 : 0, y: desktop ? 40 : 24, z: desktop ? -40 : 0, transformPerspective: 1200,
          duration: 0.7, ease: 'power3.out', stagger: desktop ? 0.06 : 0.04,
          scrollTrigger: { trigger: '.svc-grid', start: 'top 85%', once: true },
        });
      }

      // 7. Блики: полоса света проходит по карточкам, фото и баннерам в такт прокрутке.
      // В ряду карточек блик идёт слева направо с небольшим сдвигом между ними.
      const glareOf = (el) => {
        let g = el.querySelector(':scope > .glare');
        if (!g) { g = document.createElement('span'); g.className = 'glare'; g.setAttribute('aria-hidden', 'true'); el.appendChild(g); }
        return g;
      };
      const sweep = (els, trigger) => {
        if (!els.length || !trigger) return;
        const tl = gsap.timeline({ scrollTrigger: { trigger, start: 'top bottom', end: 'bottom top', scrub: 0.5 } });
        els.forEach((el, i) => tl.fromTo(glareOf(el), { x: 0, xPercent: -200, skewX: -16 }, { x: 0, xPercent: 380, skewX: -16, ease: 'none', duration: 1 }, i * 0.12));
      };
      sweep($$('.cat'), $('.cats'));
      sweep($$('.services__pic'), $('.services__pic'));
      sweep($$('.promo__in'), $('.promo__in'));
      sweep($$('.calc-card'), $('.calcs'));
      sweep($$('.about__pic'), $('.about__pic'));
      sweep($$('.consult__in'), $('.consult__in'));
      sweep($$('.svc-hero__pic'), $('.svc-hero'));
    });
  };
  if (document.readyState === 'complete') start3d(); else window.addEventListener('load', start3d);
})();
