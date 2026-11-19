// DIGITECH, макет главной: слайдер, каталог, меню, карусели, фильтр, корзина, окна, калькуляторы.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---- Слайдер: без автопрокрутки, стрелки и точки
  const slider = $('[data-slider]');
  if (slider) {
    const slides = $$('.slide', slider);
    const dots = $$('.dots button', slider);
    let current = 0;
    const show = (i) => {
      current = (i + slides.length) % slides.length;
      slides.forEach((s, k) => { s.hidden = k !== current; });
      dots.forEach((d, k) => d.setAttribute('aria-current', String(k === current)));
    };
    $('[data-prev]', slider).addEventListener('click', () => show(current - 1));
    $('[data-next]', slider).addEventListener('click', () => show(current + 1));
    dots.forEach((d, k) => d.addEventListener('click', () => show(k)));
    slider.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
    show(0);
  }

  // ---- Каталог в шапке
  const catalog = $('[data-catalog]');
  if (catalog) {
    const btn = $('.catalog__toggle', catalog);
    const panel = $('#mega');
    const set = (open) => { btn.setAttribute('aria-expanded', String(open)); panel.hidden = !open; };
    btn.addEventListener('click', () => set(panel.hidden));
    document.addEventListener('click', (e) => { if (!catalog.contains(e.target)) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { set(false); btn.focus(); } });
    $$('a', panel).forEach((a) => a.addEventListener('click', () => set(false)));
  }

  // ---- Меню на телефоне
  const header = $('[data-header]');
  const menu = $('[data-menu]');
  if (header && menu) {
    menu.addEventListener('click', () => {
      const open = header.toggleAttribute('data-open');
      menu.setAttribute('aria-expanded', String(open));
    });
    $$('.nav a', header).forEach((a) => a.addEventListener('click', () => {
      header.removeAttribute('data-open');
      menu.setAttribute('aria-expanded', 'false');
    }));
  }

  // ---- Карусели: стрелки прокручивают на ширину видимой части
  $$('[data-carousel]').forEach((c) => {
    const track = $('.carousel__track', c);
    const btns = $$('[data-scroll]', c);
    const sync = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      btns.forEach((b) => { b.disabled = b.dataset.scroll < 0 ? track.scrollLeft <= 2 : track.scrollLeft >= max; });
    };
    btns.forEach((b) => b.addEventListener('click', () => track.scrollBy({ left: Number(b.dataset.scroll) * track.clientWidth * 0.8, behavior: 'smooth' })));
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  });

  // ---- Фильтр товаров по разделам
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

  // ---- Окна: заявка и калькуляторы
  $$('[data-open-dialog]').forEach((t) => t.addEventListener('click', (e) => {
    const dlg = document.getElementById(t.dataset.openDialog);
    if (!dlg || typeof dlg.showModal !== 'function') return;
    e.preventDefault();
    const field = $('[data-topic-field]', dlg);
    if (field && t.dataset.topic && !field.value.trim()) field.value = t.dataset.topic + ': ';
    $$('dialog[open]').forEach((d) => d.close());
    dlg.showModal();
  }));
  $$('dialog').forEach((d) => {
    $$('[data-close]', d).forEach((b) => b.addEventListener('click', () => d.close()));
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  });

  // ---- Калькуляторы: формулы перенесены с текущего сайта (site/app/storefront.tsx)
  const nb = (s) => s.replace(/ /g, ' ');
  const val = (f, n) => Number(f.elements[n].value) || 0;
  const ups = $('[data-calc="ups"]');
  const upsOut = $('[data-out="ups"]');
  const calcUps = () => {
    const usable = Math.max(0, val(ups, 'ah') * (1 - (val(ups, 'depth') + val(ups, 'wear')) / 100));
    const effRaw = val(ups, 'eff');
    const eff = Math.max(0, Math.min(1, effRaw > 1 ? effRaw / 100 : effRaw));
    const ideal = (usable * val(ups, 'voltage') * eff) / Math.max(1, val(ups, 'power'));
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
    const kbps = 4096 * (val(arc, 'res') / 2.0736) * (val(arc, 'fps') / 25) * val(arc, 'codec');
    const hours = Math.min(24, Math.max(1, val(arc, 'hours')));
    const days = Math.max(1, Math.floor((val(arc, 'hdd') * 1e12 * 8) / (Math.max(1, val(arc, 'cams')) * kbps * 1000 * 86400 * (hours / 24))));
    const word = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'день' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'дня' : 'дней');
    arcOut.textContent = nb(`≈ ${days} ${word(days)}`);
    rateOut.textContent = nb(`Битрейт ${Math.round(kbps)} Кбит/с на камеру`);
  };
  if (arc && arcOut) { arc.addEventListener('input', calcArc); calcArc(); }

  // ---- Форма заявки: адрес отправки пока не задан, успех не показываем
  $$('form[data-endpoint]').forEach((form) => {
    const help = $('[aria-live]', form);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fields = $$('[required]', form);
      const bad = fields.find((f) => !(f.type === 'checkbox' ? f.checked : f.value.trim()));
      fields.forEach((f) => f.setAttribute('aria-invalid', String(f === bad)));
      if (bad) {
        help.textContent = bad.type === 'checkbox' ? 'Отметьте согласие на обработку контактных данных.' : 'Укажите имя и телефон, чтобы инженер мог перезвонить.';
        bad.focus();
        return;
      }
      if (!form.dataset.endpoint) { help.textContent = 'Ничего не отправлено: форма пока не подключена.'; return; }
      fetch(form.dataset.endpoint, { method: 'POST', body: new FormData(form) })
        .then((r) => { help.textContent = r.ok ? 'Заявка принята, инженер перезвонит в рабочее время.' : 'Заявка не ушла. Попробуйте ещё раз через минуту.'; })
        .catch(() => { help.textContent = 'Заявка не ушла. Попробуйте ещё раз через минуту.'; });
    });
  });

  // ---- Кнопка «Наверх»
  const top = $('[data-to-top]');
  if (top) {
    const onScroll = () => { top.hidden = window.scrollY < 800; };
    window.addEventListener('scroll', onScroll, { passive: true });
    top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    onScroll();
  }
})();
