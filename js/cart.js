// DIGITECH, корзина макета. Хранится в localStorage 'dt-cart' как { id товара: количество } и переживает перезагрузку.
// В WordPress это сессия WooCommerce: добавление по AJAX, счётчик в шапке, выдвижная панель и страница /cart/ (ТЗ, раздел 5).
// Подключается на всех страницах после js/products-data.js и до site.js.
(() => {
  const data = window.DT_PRODUCTS || [];
  const byId = Object.fromEntries(data.map((p) => [p.id, p]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const KEY = 'dt-cart';
  const clamp = (n) => Math.min(999, Math.max(1, parseInt(n, 10) || 1));
  const money = (n) => `${Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ')} сум`;
  const plural = (n, one, few, many) => (n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many);

  // Старый формат макета — массив id; переводим в { id: 1 }. Неизвестные товары и цену 0 отбрасываем.
  const load = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      const pairs = Array.isArray(raw) ? raw.map((id) => [id, 1]) : Object.entries(raw);
      return Object.fromEntries(pairs.filter(([id]) => byId[id] && byId[id].price > 0).map(([id, n]) => [id, clamp(n)]));
    } catch (e) { return {}; }
  };
  let cart = load();
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) { /* хранилище недоступно: корзина живёт до перезагрузки */ }
    render();
    document.dispatchEvent(new CustomEvent('dt:cart'));
  };

  const api = {
    items: () => Object.entries(cart).map(([id, qty]) => ({ ...byId[id], qty })),
    has: (id) => Boolean(cart[id]),
    qty: (id) => cart[id] || 0,
    count: () => Object.keys(cart).length,
    total: () => api.items().reduce((s, i) => s + i.price * i.qty, 0),
    add: (id, qty = 1) => { if (byId[id]) { cart[id] = clamp((cart[id] || 0) + qty); save(); } },
    set: (id, qty) => { if (cart[id]) { cart[id] = clamp(qty); save(); } },
    remove: (id) => { delete cart[id]; save(); },
    clear: () => { cart = {}; save(); },
    money,
    goods: (n) => `${n} ${plural(n, 'товар', 'товара', 'товаров')}`,
  };
  window.DTCart = api;

  // ---- Строка товара: общая для панели и страницы корзины
  const tpl = $('#tpl-cart-item');
  const row = (item) => {
    const li = tpl.content.firstElementChild.cloneNode(true);
    li.dataset.id = item.id;
    const img = $('img', li);
    if (item.img[0]) { img.src = item.img[0]; $('.cart-item__noimg', li).remove(); } else img.remove();
    const name = $('.cart-item__name', li);
    name.textContent = item.name;
    name.href = `product.html?m=${item.slug}`;
    $('.cart-item__model', li).textContent = item.model;
    $('.cart-item__price', li).textContent = `${money(item.price)} за шт.`;
    const input = $('input', li);
    input.value = String(item.qty);
    input.id = `qty-${item.id}-${Math.random().toString(36).slice(2, 7)}`;
    $('label', li).htmlFor = input.id;
    $('label', li).textContent = `Количество: ${item.name}`;
    $('[data-cart-step="-1"]', li).disabled = item.qty <= 1;
    $('.cart-item__sum', li).textContent = money(item.price * item.qty);
    $('.cart-item__remove', li).setAttribute('aria-label', `Удалить из корзины: ${item.name}`);
    return li;
  };

  // ---- Отрисовка всего, что зависит от корзины, на любой странице
  function render() {
    const items = api.items();
    const n = items.length;
    $$('[data-cart-count]').forEach((el) => { el.textContent = String(n); });
    $$('[data-cart-n]').forEach((el) => { el.textContent = n ? api.goods(n) : ''; });
    $$('[data-cart-total]').forEach((el) => { el.textContent = money(api.total()); });
    $$('[data-cart-empty]').forEach((el) => { el.hidden = n > 0; });
    $$('[data-cart-has]').forEach((el) => { el.hidden = n === 0; });
    $$('[data-cart-list]').forEach((list) => {
      // фокус после перерисовки возвращаем на то же поле, чтобы клавиатура не теряла место
      const active = document.activeElement;
      const keep = active && list.contains(active) ? { id: active.closest('[data-id]')?.dataset.id, sel: active.matches('input') ? 'input' : active.dataset.cartStep ? `[data-cart-step="${active.dataset.cartStep}"]` : null } : null;
      list.replaceChildren(...items.map(row));
      if (keep && keep.id && keep.sel) $(`[data-id="${keep.id}"] ${keep.sel}`, list)?.focus();
      else if (keep) list.closest('dialog, main')?.querySelector('h1, h2')?.focus?.();
    });
    $$('[data-add]').forEach((b) => {
      const on = api.has(b.dataset.add);
      b.setAttribute('aria-pressed', String(on));
      const label = $('span', b);
      if (label) label.textContent = on ? 'В корзине' : 'В корзину';
    });
  }

  // ---- Панель корзины
  const drawer = $('#cart-drawer');
  const page = document.body.dataset.page;
  const openDrawer = () => {
    if (!drawer || typeof drawer.showModal !== 'function') { location.href = 'cart.html'; return; }
    $$('dialog[open]').forEach((d) => d.close());
    drawer.showModal();
  };
  $$('[data-cart-open]').forEach((a) => a.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || page === 'cart' || page === 'checkout') return;
    e.preventDefault();
    openDrawer();
  }));

  // ---- Кнопки «В корзину»: первый клик кладёт товар, повторный («В корзине») открывает панель
  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) {
      const id = add.dataset.add;
      if (api.has(id)) { openDrawer(); return; }
      const qtyInput = add.hasAttribute('data-p-add') ? $('#qty') : null;
      api.add(id, qtyInput ? clamp(qtyInput.value) : 1);
      return;
    }
    const step = e.target.closest('[data-cart-step]');
    if (step) { const id = step.closest('[data-id]').dataset.id; api.set(id, api.qty(id) + Number(step.dataset.cartStep)); return; }
    const del = e.target.closest('.cart-item__remove');
    if (del) api.remove(del.closest('[data-id]').dataset.id);
  });
  document.addEventListener('change', (e) => {
    const input = e.target.closest('.cart-item input');
    if (input) api.set(input.closest('[data-id]').dataset.id, input.value);
  });

  // ---- Страница товара: количество в карточке и в корзине — одно и то же число
  const pAdd = $('[data-p-add]');
  const pQty = $('#qty');
  if (pAdd && pQty && api.has(pAdd.dataset.add)) {
    pQty.value = String(api.qty(pAdd.dataset.add));
    pQty.dispatchEvent(new Event('change'));
  }

  // Корзина в другой вкладке поменялась — подтягиваем
  window.addEventListener('storage', (e) => { if (e.key === KEY) { cart = load(); render(); document.dispatchEvent(new CustomEvent('dt:cart')); } });

  render();
})();
