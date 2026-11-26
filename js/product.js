// DIGITECH, страница товара: product.html?m=<slug> (в WordPress — /product/<slug>/, single-product.php).
// Подставляет товар из js/products-data.js, считает количество, собирает сопутствующие (вкладка) и похожие товары.
// Вкладки переключает site.js: здесь только прячем пустые (нет описания, нет сопутствующих).
// Подключается до site.js: site.js потом навешивает корзину и окна на готовые кнопки.
(() => {
  const page = document.querySelector('[data-product-page]');
  const data = window.DT_PRODUCTS;
  if (!page || !Array.isArray(data)) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const CATS = {
    video: { crumb: 'Видеонаблюдение', title: 'Камеры видеонаблюдения' },
    ups: { crumb: 'ИБП', title: 'ИБП (UPS), блоки питания и аккумуляторы' },
    net: { crumb: 'Сетевое оборудование', title: 'Сетевое оборудование' },
    turn: { crumb: 'Турникеты', title: 'Контроль доступа и турникеты' },
    barrier: { crumb: 'Шлагбаумы и болларды', title: 'Шлагбаумы и болларды' },
    vent: { crumb: 'Вентиляция', title: 'Вентиляция' },
  };
  // Родственные разделы для «Похожих товаров», как на текущем сайте (categoryAffinity в site/app/product/[slug]/page.tsx)
  const NEAR = { video: ['net', 'ups'], turn: ['barrier', 'ups', 'net'], ups: ['net', 'video'], net: ['video', 'ups'], barrier: ['turn'], vent: [] };
  const STOCK = { in: ['В наличии', 'ok'], order: ['Под поставку', 'wait'], request: ['По запросу', 'wait'], out: ['Нет в наличии', 'wait'] };
  const money = (n) => `${n.toLocaleString('ru-RU').replace(/ /g, ' ')} сум`;
  const full = (p) => `${p.name} ${p.model}`;

  const slug = new URLSearchParams(location.search).get('m') || 'elt-811-two-pass-kit';
  const p = data.find((x) => x.slug === slug);

  if (!p) {
    $$('[data-p-found]').forEach((el) => { el.hidden = true; });
    $('[data-p-missing]').hidden = false;
    $('[data-p-cat]').closest('li').hidden = true;
    $('[data-p-crumb]').textContent = 'Товар не найден';
    document.title = 'Товар не найден — DIGITECH';
    return;
  }

  // ---- Заголовки, крошки, мета
  const cat = CATS[p.cat];
  // «Купить турникет…», но «Купить ИБП…» и «Купить IP-камеру…» не трогаем: строчная только у обычного русского слова
  const lower = (s) => (/^[А-ЯЁ][а-яё]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s)
    // «Купить IP-камеру»: шаблон ТЗ «Купить {название}» ставит название в именительный, камеру склоняем
    .replace(/^(\S*?)камера/, '$1камеру');
  document.title = `Купить ${lower(full(p))} в Ташкенте — DIGITECH`;
  $('meta[name="description"]').setAttribute('content', `${full(p)}: цена в сумах, наличие и характеристики. Доставка по Узбекистану, монтаж и настройка DIGITECH.`);
  $('[data-p-cat]').textContent = cat.crumb;
  $('[data-p-cat]').href = `catalog.html?cat=${p.cat}`;
  $('[data-p-crumb]').textContent = p.name;
  $('[data-p-name]').textContent = p.name;
  $('[data-p-model]').textContent = p.model;
  const brand = $('[data-p-brand]');
  brand.textContent = p.brand;
  brand.hidden = !p.brand;
  const [stockText, stockTone] = STOCK[p.stock] || STOCK.in;
  const stock = $('[data-p-stock]');
  stock.textContent = p.stock === 'order' && p.lead ? `${stockText}, ${p.lead}` : stockText;
  stock.className = `status status--${stockTone}`;
  const specs = $('[data-p-specs]');
  specs.replaceChildren(...p.specs.map((s) => Object.assign(document.createElement('li'), { textContent: s })));
  specs.hidden = !p.specs.length;

  // ---- Галерея: до 5 фото, миниатюры только если фото больше одного
  const main = $('[data-p-main]');
  const showImg = (src) => {
    main.replaceChildren();
    if (!src) {
      const ph = $('#tpl-card').content.querySelector('.product__noimg').cloneNode(true);
      ph.hidden = false;
      main.append(ph);
      return;
    }
    const img = new Image(800, 600);
    img.src = src; img.alt = full(p); img.decoding = 'async';
    main.append(img);
  };
  showImg(p.img[0]);
  const thumbs = $('[data-p-thumbs]');
  if (p.img.length > 1) {
    thumbs.hidden = false;
    p.img.slice(0, 5).forEach((src, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Фото ${i + 1}`);
      b.setAttribute('aria-current', String(i === 0));
      b.append(Object.assign(new Image(160, 120), { src, alt: '' }));
      b.addEventListener('click', () => {
        showImg(src);
        $$('button', thumbs).forEach((t) => t.setAttribute('aria-current', String(t === b)));
      });
      thumbs.append(b);
    });
  }

  // ---- Цена и покупка
  const priceEl = $('[data-p-price]');
  const add = $('[data-p-add]');
  const ask = $('[data-p-ask]');
  const qtyBox = $('[data-p-qty]');
  const consult = $('[data-p-consult]');
  consult.dataset.topic = `Консультация по товару ${p.model}`;
  if (p.price > 0) {
    priceEl.textContent = money(p.price);
    add.dataset.add = p.id;
  } else {
    priceEl.textContent = 'Цена по запросу';
    priceEl.classList.add('pp__price--ask');
    add.hidden = true;
    qtyBox.hidden = true;
    ask.hidden = false;
    ask.dataset.topic = `Цена: ${full(p)}`;
  }

  // Количество 1–999. Если товар уже в корзине, число в корзине меняется вместе с ним (js/cart.js)
  const qty = $('#qty');
  const syncQty = () => {
    const n = Math.min(999, Math.max(1, parseInt(qty.value, 10) || 1));
    qty.value = String(n);
    $('[data-qty="-1"]').disabled = n <= 1;
    $('[data-qty="1"]').disabled = n >= 999;
    if (window.DTCart && window.DTCart.has(p.id) && window.DTCart.qty(p.id) !== n) window.DTCart.set(p.id, n);
  };
  $$('[data-qty]').forEach((b) => b.addEventListener('click', () => { qty.value = String((parseInt(qty.value, 10) || 1) + Number(b.dataset.qty)); syncQty(); }));
  qty.addEventListener('change', syncQty);
  syncQty();

  // ---- Характеристики и описание
  const table = $('[data-p-table]');
  const tbody = $('tbody', table);
  tbody.replaceChildren(...p.table.map(([k, v]) => {
    const tr = document.createElement('tr');
    const th = Object.assign(document.createElement('th'), { scope: 'row', textContent: k });
    tr.append(th, Object.assign(document.createElement('td'), { textContent: v }));
    return tr;
  }));
  table.hidden = !p.table.length;
  const noTable = $('[data-p-notable]');
  noTable.hidden = !!p.table.length;
  $('[data-p-specask]').dataset.topic = `Характеристики: ${full(p)}`;
  // вкладка «Описание» есть всегда: в ней ещё кнопка «Скачать описание (PDF)» (в макете — образец)
  $('[data-p-text]').textContent = p.text;
  $('[data-p-text]').hidden = !p.text;
  // pdf: [адрес, размер] — настоящий файл производителя; без него кнопка остаётся образцом
  const pdfBtn = $('[data-mock-pdf]');
  if (p.pdf) {
    pdfBtn.href = p.pdf[0];
    pdfBtn.setAttribute('download', '');
    pdfBtn.removeAttribute('data-mock-pdf');
    pdfBtn.lastChild.textContent = `Скачать описание (PDF, ${p.pdf[1]})`;
    if (pdfBtn.nextElementSibling) pdfBtn.nextElementSibling.remove();
  } else {
    pdfBtn.addEventListener('click', (e) => e.preventDefault());
  }

  // ---- Карточки: сопутствующие — из родственных разделов (камере — сеть и ИБП), похожие — из того же раздела; по 4.
  // Родственные разделы как на текущем сайте (categoryAffinity). В WordPress сопутствующие можно задать вручную у товара.
  const tpl = $('#tpl-card');
  const card = (x) => {
    const li = tpl.content.firstElementChild.cloneNode(true);
    const img = $('img', li);
    if (x.img[0]) { img.src = x.img[0]; img.alt = full(x); $('.product__noimg', li).remove(); } else { img.remove(); $('.product__noimg', li).hidden = false; }
    const [st, tone] = STOCK[x.stock] || STOCK.in;
    const status = $('.status', li); status.textContent = st; status.className = `status status--${tone}`;
    const br = $('.product__brand', li); if (x.brand) br.textContent = x.brand; else br.remove();
    const link = $('.product__link', li); link.textContent = x.name; link.href = `product.html?m=${x.slug}`;
    $('.product__model', li).textContent = x.model;
    const sp = $('.product__specs', li);
    if (x.specs.length) x.specs.forEach((s) => sp.append(Object.assign(document.createElement('li'), { textContent: s }))); else sp.remove();
    const pr = $('.product__price', li);
    const [cartBtn, askBtn] = $$('.product__foot .btn', li);
    if (x.price > 0) { pr.textContent = money(x.price); cartBtn.dataset.add = x.id; askBtn.remove(); }
    else { pr.textContent = 'Цена по запросу'; pr.classList.add('product__price--ask'); cartBtn.remove(); askBtn.hidden = false; askBtn.dataset.topic = `Цена: ${full(x)}`; }
    return li;
  };
  const near = NEAR[p.cat] || [];
  const acc = data.filter((x) => near.includes(x.cat)).sort((a, b) => near.indexOf(a.cat) - near.indexOf(b.cat)).slice(0, 4);
  $('[data-p-acclist]').replaceChildren(...acc.map(card));
  $$('[data-p-acc]').forEach((el) => { el.hidden = !acc.length; });

  const similar = data.filter((x) => x.slug !== p.slug && x.cat === p.cat).slice(0, 4);
  $('[data-p-list]').replaceChildren(...similar.map(card));
  $('[data-p-catlink]').href = `catalog.html?cat=${p.cat}`;
  $('[data-p-related]').hidden = !similar.length;
})();
