// DIGITECH, оформление заявки (в WordPress — /checkout/ на шаблонах WooCommerce, ТЗ раздел 5).
// Сводка заказа из корзины, маска телефона +998 XX XXX XX XX, проверка полей, экран «Заявка принята».
// В макете заявка никуда не отправляется: экран после отправки — образец, и он сам это говорит.
(() => {
  const form = document.querySelector('[data-order]');
  const cart = window.DTCart;
  if (!form || !cart) return;
  const $ = (s, r = document) => r.querySelector(s);

  // ---- Сводка заказа справа
  const items = $('[data-co-items]');
  const renderSummary = () => {
    items.replaceChildren(...cart.items().map((i) => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'co-items__name';
      name.textContent = i.name;
      const model = document.createElement('span');
      model.className = 'co-items__meta';
      model.textContent = i.model;
      const qty = document.createElement('span');
      qty.className = 'co-items__meta';
      qty.textContent = `${i.qty} × ${cart.money(i.price)}`;
      const sum = document.createElement('b');
      sum.textContent = cart.money(i.price * i.qty);
      li.append(name, model, qty, sum);
      return li;
    }));
  };
  document.addEventListener('dt:cart', renderSummary);
  renderSummary();

  // ---- Маска телефона: +998 90 123 45 67
  const phone = $('#co-phone');
  // цифры берём только после «+998»: так код страны, набранный или вставленный поверх префикса, не задваивается
  const digits = (v) => {
    let d = (v.startsWith('+998') ? v.slice(4) : v).replace(/\D/g, '');
    if (d.length > 9 && d.startsWith('998')) d = d.slice(3);
    return d.slice(0, 9);
  };
  const format = (d) => {
    const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
    return `+998${parts.length ? ` ${parts.join(' ')}` : ' '}`;
  };
  phone.addEventListener('focus', () => { if (!phone.value) phone.value = '+998 '; });
  phone.addEventListener('blur', () => { if (!digits(phone.value)) phone.value = ''; });
  phone.addEventListener('input', () => { phone.value = format(digits(phone.value)); });

  // ---- Проверка
  const setError = (input, text) => {
    const err = document.getElementById(input.getAttribute('aria-describedby'));
    input.setAttribute('aria-invalid', String(Boolean(text)));
    if (err) err.textContent = text || '';
  };
  const checks = [
    [$('#co-name'), (el) => (el.value.trim() ? '' : 'Напишите, как к вам обращаться')],
    [phone, (el) => (digits(el.value).length === 9 ? '' : 'Нужен номер целиком: +998 и 9 цифр')],
    [form.elements.consent, (el) => (el.checked ? '' : 'Без согласия мы не сможем обработать заявку')],
  ];
  checks.forEach(([el, rule]) => el.addEventListener(el.type === 'checkbox' ? 'change' : 'blur', () => {
    if (el.getAttribute('aria-invalid') === 'true') setError(el, rule(el));
  }));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const help = $('[data-order-help]');
    if (form.elements.website.value) return; // ловушка для ботов: людям поле не видно
    let first = null;
    checks.forEach(([el, rule]) => { const msg = rule(el); setError(el, msg); if (msg && !first) first = el; });
    if (first) { help.textContent = 'Проверьте отмеченные поля.'; first.focus(); return; }
    if (!cart.count()) { help.textContent = 'Корзина пуста: добавьте товары из каталога.'; return; }
    help.textContent = '';

    // Номер в формате DT-ГГММДД-NNNNN, как у текущего сайта. В WordPress его выдаёт digitech-core.
    const d = new Date();
    const num = `DT-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-00001`;
    $('[data-done-num]').textContent = num;
    document.title = `Заявка ${num} принята — DIGITECH`;
    $('[data-co-main]').hidden = true;
    $('[data-co-crumbs] span').textContent = 'Заявка принята';
    const done = $('[data-done]');
    done.hidden = false;
    cart.clear();
    window.scrollTo({ top: 0, behavior: 'instant' });
    $('#done-title').focus({ preventScroll: true });
  });
})();
