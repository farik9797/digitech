// DIGITECH, статический макет. Меню, корзина-счётчик, калькуляторы, форма без отправки.
(() => {
  // ---- Меню на телефоне
  const slab = document.querySelector('[data-slab]');
  const menu = document.querySelector('[data-menu]');
  if (slab && menu) {
    menu.addEventListener('click', () => {
      const open = slab.toggleAttribute('data-open');
      menu.setAttribute('aria-expanded', String(open));
    });
    slab.querySelectorAll('.slab__links a').forEach((a) => a.addEventListener('click', () => {
      slab.removeAttribute('data-open');
      menu.setAttribute('aria-expanded', 'false');
    }));
  }

  // ---- Вкладки калькулятора (без скрипта видны обе панели)
  const tablist = document.querySelector('[data-tabs]');
  if (tablist) {
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t, false));
      t.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        select(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true);
      });
    });
    select(tabs[0], false);
  }

  // ---- Расчёты: формулы перенесены из текущего сайта (site/app/storefront.tsx)
  const num = (form, name) => Number(form.elements[name].value) || 0;
  const nb = (s) => s.replace(/ /g, ' ');
  const ups = document.querySelector('[data-calc="ups"]');
  const upsOut = document.querySelector('[data-out="ups"]');
  const calcUps = () => {
    const usable = Math.max(0, num(ups, 'ah') * (1 - (num(ups, 'depth') + num(ups, 'wear')) / 100));
    const effRaw = num(ups, 'eff');
    const eff = Math.max(0, Math.min(1, effRaw > 1 ? effRaw / 100 : effRaw));
    const ideal = (usable * num(ups, 'voltage') * eff) / Math.max(1, num(ups, 'power'));
    const corr = Math.max(30, Math.min(100, 51.437 * Math.pow(Math.max(0, ideal), 0.28))) / 100;
    const minutes = Math.max(0, Math.round(ideal * corr * 60));
    const h = Math.floor(minutes / 60), m = minutes % 60;
    upsOut.textContent = nb(h ? `≈ ${h} ч ${String(m).padStart(2, '0')} мин` : `≈ ${m} мин`);
  };
  if (ups && upsOut) { ups.addEventListener('input', calcUps); calcUps(); }

  const arc = document.querySelector('[data-calc="arc"]');
  const arcOut = document.querySelector('[data-out="arc"]');
  const rateOut = document.querySelector('[data-out="bitrate"]');
  const calcArc = () => {
    const kbps = 4096 * (num(arc, 'res') / 2.0736) * (num(arc, 'fps') / 25) * num(arc, 'codec');
    const hours = Math.min(24, Math.max(1, num(arc, 'hours')));
    const days = Math.max(1, Math.floor((num(arc, 'hdd') * 1e12 * 8) / (Math.max(1, num(arc, 'cams')) * kbps * 1000 * 86400 * (hours / 24))));
    const word = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'день' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'дня' : 'дней');
    arcOut.textContent = nb(`≈ ${days} ${word(days)}`);
    rateOut.textContent = nb(`${Math.round(kbps)} Кбит/с на камеру`);
  };
  if (arc && arcOut) { arc.addEventListener('input', calcArc); calcArc(); }

  // ---- Корзина: только счётчик в макете
  const countEl = document.querySelector('[data-cart-count]');
  let picked = new Set();
  try { picked = new Set(JSON.parse(localStorage.getItem('dt-cart') || '[]')); } catch (e) { /* хранилище недоступно */ }
  const render = () => {
    if (countEl) countEl.textContent = String(picked.size);
    document.querySelectorAll('[data-add]').forEach((b) => {
      const on = picked.has(b.dataset.add);
      b.setAttribute('aria-pressed', String(on));
      b.textContent = on ? 'В корзине' : 'В корзину';
    });
  };
  document.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.add;
    if (picked.has(id)) picked.delete(id); else picked.add(id);
    try { localStorage.setItem('dt-cart', JSON.stringify([...picked])); } catch (e) { /* хранилище недоступно */ }
    render();
  }));
  render();

  // ---- Форма заявки: адрес отправки пока не задан, успех не печатаем
  document.querySelectorAll('form[data-endpoint]').forEach((form) => {
    const help = form.querySelector('[aria-live]');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fields = [...form.querySelectorAll('[required]')];
      const bad = fields.find((f) => !(f.type === 'checkbox' ? f.checked : f.value.trim()));
      fields.forEach((f) => f.setAttribute('aria-invalid', String(f === bad)));
      if (bad) {
        help.textContent = bad.type === 'checkbox' ? 'Отметьте согласие на обработку контактных данных.' : 'Заполните имя и телефон, чтобы инженер мог перезвонить.';
        bad.focus();
        return;
      }
      if (!form.dataset.endpoint) { help.textContent = 'Ничего не отправлено: форма пока не подключена.'; return; }
      fetch(form.dataset.endpoint, { method: 'POST', body: new FormData(form) })
        .then((r) => { help.textContent = r.ok ? 'Заявка принята, инженер перезвонит в рабочее время.' : 'Заявка не ушла. Попробуйте ещё раз через минуту.'; })
        .catch(() => { help.textContent = 'Заявка не ушла. Попробуйте ещё раз через минуту.'; });
    });
  });
})();
