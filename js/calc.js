// DIGITECH, калькуляторы ИБП и архива видеонаблюдения (ТЗ, раздел 9).
// Формулы 1:1 с текущего сайта: site/app/storefront.tsx и site/app/calculators/calculator-page.tsx.
// Работает с любой формой [data-calc]: окна на главной и страницы calc-ups.html / calc-archive.html.
// Кнопка [data-calc-ask] получает в data-topic параметры и результат: окно консультации подставит их в текст заявки.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const nb = (s) => s.replace(/ /g, ' ');
  const val = (f, n) => Number(f.elements[n].value);
  const dec = (n) => String(n).replace('.', ',');
  const label = (f, n) => f.elements[n].selectedOptions[0].textContent.trim();
  const plural = (n, one, few, many) => (n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many);
  const ask = (box, text) => {
    const btn = $('[data-calc-ask]', box);
    if (!btn) return;
    btn.dataset.base ??= btn.dataset.topic;
    btn.dataset.topic = text ? `${btn.dataset.base}\n${text}\n` : btn.dataset.base;
  };

  // ---- Время работы ИБП
  const ups = (form, box) => {
    const out = $('[data-out="ups"]', box);
    const power = val(form, 'power'), ah = val(form, 'ah'), volt = val(form, 'voltage');
    if (!(power > 0) || !(ah > 0) || !(volt > 0)) { out.textContent = 'Укажите мощность и АКБ'; ask(box, ''); return; }
    const depth = val(form, 'depth') || 0, wear = val(form, 'wear') || 0;
    const usable = Math.max(0, ah * (1 - (depth + wear) / 100));
    const effRaw = val(form, 'eff') || 0;
    const eff = Math.max(0, Math.min(1, effRaw > 1 ? effRaw / 100 : effRaw));
    const ideal = (usable * volt * eff) / power;
    const corr = Math.max(30, Math.min(100, 51.437 * Math.pow(Math.max(0, ideal), 0.28))) / 100;
    const minutes = Math.max(0, Math.round(ideal * corr * 60));
    const h = Math.floor(minutes / 60), m = minutes % 60;
    const result = nb(h ? `≈ ${h} ч ${String(m).padStart(2, '0')} мин` : `≈ ${m} мин`);
    out.textContent = result;
    ask(box, nb(`Нагрузка ${power} Вт, аккумуляторы ${dec(ah)} А·ч × ${volt} В, КПД ${dec(effRaw)}, остаток заряда ${depth} %, износ ${wear} %.\nРезультат расчёта: ${result}.`));
  };

  // ---- Глубина архива видеонаблюдения
  const arc = (form, box) => {
    const out = $('[data-out="arc"]', box);
    const rate = $('[data-out="bitrate"]', box);
    const cams = val(form, 'cams');
    if (!(cams > 0)) { out.textContent = 'Укажите число камер'; ask(box, ''); return; }
    const kbps = 4096 * (val(form, 'res') / 2.0736) * (val(form, 'fps') / 25) * val(form, 'codec');
    const hours = Math.min(24, Math.max(1, val(form, 'hours') || 24));
    const days = Math.max(1, Math.floor((val(form, 'hdd') * 1e12 * 8) / (cams * kbps * 1000 * 86400 * (hours / 24))));
    const result = nb(`≈ ${days} ${plural(days, 'день', 'дня', 'дней')}`);
    const bitrate = nb(`${Math.round(kbps).toLocaleString('ru-RU')} Кбит/с`);
    out.textContent = result;
    if (rate) rate.textContent = `Битрейт ${bitrate} на камеру`;
    ask(box, nb(`${cams} ${plural(cams, 'камера', 'камеры', 'камер')}, ${label(form, 'res')}, ${label(form, 'fps')} к/с, ${label(form, 'codec')}, запись ${hours} ч в сутки, диски ${label(form, 'hdd')} ТБ.\nРезультат расчёта: ${result}, битрейт ${bitrate} на камеру.`));
  };

  const calcs = { ups, arc };
  $$('form[data-calc]').forEach((form) => {
    const run = calcs[form.dataset.calc];
    if (!run) return;
    const box = form.closest('[data-calc-box]') || form.parentElement;
    form.addEventListener('submit', (e) => e.preventDefault());
    form.addEventListener('input', () => run(form, box));
    run(form, box);
  });
})();
