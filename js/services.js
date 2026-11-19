// DIGITECH, страница «Услуги» (в WordPress — page-services.php, ТЗ раздел 6: заявка на услуги → обращение dt_request, подменю «Услуги»).
// Кнопки «Обсудить задачу» подставляют услугу в текст заявки и ведут к форме. Поля: организация, телефон*, запрос.
// В макете заявка никуда не отправляется: экран после отправки — образец, и он сам это говорит.
(() => {
  const form = document.querySelector('[data-svc-form]');
  if (!form) return;
  const $ = (s, r = document) => r.querySelector(s);
  const task = $('#sv-task');
  const phone = $('#sv-phone');
  const done = $('[data-svc-done]');
  const smooth = () => (matchMedia('(prefers-reduced-motion: no-preference)').matches ? 'smooth' : 'auto');

  // ---- «Обсудить задачу»: тема в начале текста, пока посетитель не написал своё
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-svc-topic]');
    if (!t) return;
    e.preventDefault();
    if (done.hidden === false) { done.hidden = true; form.hidden = false; }
    const topic = t.dataset.svcTopic;
    if (topic && (!task.value.trim() || task.value === task.dataset.auto)) task.value = task.dataset.auto = `${topic}: `;
    $('#request').scrollIntoView({ behavior: smooth(), block: 'start' });
    (topic ? task : $('#sv-org')).focus({ preventScroll: true });
    if (topic) task.setSelectionRange(task.value.length, task.value.length);
  });

  // ---- Маска телефона +998 90 123 45 67 (та же, что в checkout.js; в теме — общий модуль)
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

  // ---- Проверка: обязательны только телефон и согласие (ТЗ, раздел 6)
  const setError = (input, text) => {
    const err = document.getElementById(input.getAttribute('aria-describedby'));
    input.setAttribute('aria-invalid', String(Boolean(text)));
    if (err) err.textContent = text || '';
  };
  const checks = [
    [phone, (el) => (digits(el.value).length === 9 ? '' : 'Нужен номер целиком: +998 и 9 цифр')],
    [form.elements.consent, (el) => (el.checked ? '' : 'Без согласия мы не сможем обработать заявку')],
  ];
  checks.forEach(([el, rule]) => el.addEventListener(el.type === 'checkbox' ? 'change' : 'blur', () => {
    if (el.getAttribute('aria-invalid') === 'true') setError(el, rule(el));
  }));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const help = $('[data-svc-help]');
    if (form.elements.website.value) return; // ловушка для ботов: людям поле не видно
    let first = null;
    checks.forEach(([el, rule]) => { const msg = rule(el); setError(el, msg); if (msg && !first) first = el; });
    if (first) { help.textContent = 'Проверьте отмеченные поля.'; first.focus(); return; }
    help.textContent = '';

    // Номер в формате DT-ГГММДД-NNNNN. В WordPress его выдаёт digitech-core.
    const d = new Date();
    const num = `DT-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-00001`;
    $('[data-svc-num]').textContent = num;
    form.reset();
    delete task.dataset.auto;
    form.hidden = true;
    done.hidden = false;
    // карточка стала короче формы: показываем её целиком, а не только заголовок
    done.scrollIntoView({ behavior: smooth(), block: 'center' });
    $('#svc-done-title').focus({ preventScroll: true });
  });

  $('[data-svc-again]').addEventListener('click', () => {
    done.hidden = true;
    form.hidden = false;
    $('#sv-org').focus();
  });
})();
