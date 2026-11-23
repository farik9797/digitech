// DIGITECH, оформление заявки: страница checkout.html и форма в окне корзины (как на старом сайте).
// Сводка заказа (только на странице), маска телефона +998 XX XXX XX XX, проверка полей, экран «Заявка принята».
// Каждая форма [data-order] живёт в своём [data-order-root]: там же [data-order-main] (прячется после отправки) и [data-done].
// В макете заявка никуда не отправляется: экран после отправки — образец, и он сам это говорит.
// Подключается на всех страницах после js/cart.js и до site.js.
(() => {
  const cart = window.DTCart;
  if (!cart) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---- Сводка заказа справа (страница оформления)
  const items = $('[data-co-items]');
  if (items) {
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
  }

  // ---- Маска телефона: +998 90 123 45 67
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

  const setError = (input, text) => {
    const err = document.getElementById(input.getAttribute('aria-describedby'));
    input.setAttribute('aria-invalid', String(Boolean(text)));
    if (err) err.textContent = text || '';
  };

  $$('form[data-order]').forEach((form) => {
    const root = form.closest('[data-order-root]');
    const main = $('[data-order-main]', root);
    const done = $('[data-done]', root);
    const help = $('[data-order-help]', form);
    const phone = form.elements.phone;
    const inDialog = root.tagName === 'DIALOG';

    phone.addEventListener('focus', () => { if (!phone.value) phone.value = '+998 '; });
    phone.addEventListener('blur', () => { if (!digits(phone.value)) phone.value = ''; });
    phone.addEventListener('input', () => { phone.value = format(digits(phone.value)); });

    // ---- Проверка
    const checks = [
      [form.elements.name, (el) => (el.value.trim() ? '' : 'Напишите, как к вам обращаться')],
      [phone, (el) => (digits(el.value).length === 9 ? '' : 'Нужен номер целиком: +998 и 9 цифр')],
      [form.elements.consent, (el) => (el.checked ? '' : 'Без согласия мы не сможем обработать заявку')],
    ];
    // Ошибка снимается во время ввода, а не при уходе из поля: иначе текст ошибки исчезает в момент клика
    // по следующему полю, форма прыгает вверх и клик (например, по галочке согласия) проходит мимо.
    checks.forEach(([el, rule]) => el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
      if (el.getAttribute('aria-invalid') === 'true') setError(el, rule(el));
    }));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (form.elements.website.value) return; // ловушка для ботов: людям поле не видно
      let first = null;
      checks.forEach(([el, rule]) => { const msg = rule(el); setError(el, msg); if (msg && !first) first = el; });
      if (first) { help.textContent = 'Проверьте отмеченные поля.'; first.focus(); return; }
      if (!cart.count()) { help.textContent = 'Корзина пуста: добавьте товары из каталога.'; return; }
      help.textContent = '';

      // Номер в формате DT-ГГММДД-NNNNN, как у текущего сайта. В WordPress его выдаёт digitech-core.
      const d = new Date();
      const num = `DT-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-00001`;
      $('[data-done-num]', done).textContent = num;
      main.hidden = true;
      done.hidden = false;
      cart.clear();
      if (inDialog) {
        root.scrollTop = 0;
      } else {
        document.title = `Заявка ${num} принята — DIGITECH`;
        const crumb = $('[data-co-crumbs] span');
        if (crumb) crumb.textContent = 'Заявка принята';
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      $('[tabindex="-1"]', done).focus({ preventScroll: true });
    });

    // Окно закрыли после отправки — в следующий раз оно открывается с пустой формой
    if (inDialog) {
      root.addEventListener('close', () => {
        if (done.hidden) return;
        done.hidden = true;
        main.hidden = false;
        form.reset();
        checks.forEach(([el]) => setError(el, ''));
      });
    }
  });
})();
