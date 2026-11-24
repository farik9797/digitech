// DIGITECH, страница каталога. Раздел, бренд, наличие, поиск, сортировка и страница живут в адресе
// (ссылкой можно поделиться, «назад» работает), 12 товаров на страницу, шторка фильтров на телефоне.
// В WordPress то же самое делает archive-product.php на сервере; здесь макет фильтрует готовые карточки.
(() => {
  const page = document.querySelector('[data-catalog-page]');
  if (!page) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const PER_PAGE = 12;

  const CATS = {
    '': { title: 'Каталог оборудования' },
    video: { title: 'Камеры видеонаблюдения', crumb: 'Видеонаблюдение' },
    ups: { title: 'ИБП (UPS), блоки питания и аккумуляторы', crumb: 'ИБП' },
    net: { title: 'Сетевое оборудование', crumb: 'Сетевое оборудование' },
    turn: { title: 'Контроль доступа и турникеты', crumb: 'Турникеты' },
    barrier: { title: 'Шлагбаумы и болларды', crumb: 'Шлагбаумы и болларды' },
    vent: { title: 'Вентиляция', crumb: 'Вентиляция' },
  };
  // Подразделы (просьба клиента). В WordPress это дочерние рубрики товаров.
  const SUBS = {
    video: [['kamery', 'Камеры'], ['registratory', 'Регистраторы'], ['monitory', 'Мониторы'],
      ['kamery-opredeleniya-lic', 'Камеры определения лиц'], ['kamery-opredeleniya-mashin', 'Камеры определения машин'],
      ['videodomofony', 'Видеодомофоны'], ['videostena', 'Видеостена'], ['terminaly-face-id', 'Терминал доступа FACE ID']],
    ups: [['interaktivnye', 'Интерактивные'], ['onlajn', 'Онлайн']],
  };
  const subTitle = (cat, sub) => ((SUBS[cat] || []).find(([slug]) => slug === sub) || [])[1] || '';
  const BRANDS = { hikvision: 'Hikvision', dahua: 'Dahua', 'tp-link': 'TP-Link', panasonic: 'Panasonic', marsriva: 'MarsRiva', 'hol-top': 'HOL-TOP', none: 'Без бренда' };
  const STOCK = { in: 'В наличии', order: 'Под поставку', request: 'По запросу', out: 'Нет в наличии' };
  // Синонимы поиска из ТЗ (раздел 9)
  const SYN = [['ибп', 'ups', 'юпс', 'источник бесперебойного питания'], ['видеорегистратор', 'регистратор']];
  const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
  const words = (q) => { const n = norm(q); const g = SYN.find((list) => list.some((w) => n.includes(w))); return g || [n]; };
  const plural = (n, one, few, many) => (n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many);
  const goods = (n) => `${n} ${plural(n, 'товар', 'товара', 'товаров')}`;

  const list = $('[data-list]');
  const items = $$('.product', list);
  const form = $('[data-filters]');
  const filters = $('#filters');
  const backdrop = $('.filters-backdrop');
  const openBtn = $('[data-filters-open]');
  const sortSel = $('[data-sort]');
  const xIcon = $('.filters__close svg');
  const headerSearch = $('#q');

  // ---- Состояние ⇄ адрес
  const read = () => {
    const u = new URLSearchParams(location.search);
    const cat = u.get('cat') || '';
    const sub = u.get('sub') || '';
    return {
      cat: CATS[cat] ? cat : '',
      sub: subTitle(cat, sub) ? sub : '',
      brand: u.getAll('brand').filter(Boolean),
      stock: u.getAll('stock').filter((s) => STOCK[s]),
      q: (u.get('q') || '').trim(),
      sort: ['price-asc', 'price-desc'].includes(u.get('sort')) ? u.get('sort') : '',
      page: Math.max(1, parseInt(u.get('page'), 10) || 1),
    };
  };
  let state = read();
  const url = (s) => {
    const u = new URLSearchParams();
    if (s.cat) u.set('cat', s.cat);
    if (s.sub) u.set('sub', s.sub);
    s.brand.forEach((b) => u.append('brand', b));
    s.stock.forEach((v) => u.append('stock', v));
    if (s.q) u.set('q', s.q);
    if (s.sort) u.set('sort', s.sort);
    if (s.page > 1) u.set('page', String(s.page));
    const qs = u.toString();
    return location.pathname + (qs ? `?${qs}` : '');
  };
  const go = (patch, opts = {}) => {
    state = { ...state, page: 1, ...patch };
    history.pushState(null, '', url(state));
    render();
    if (opts.scroll) $('.cat-head').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  window.addEventListener('popstate', () => { state = read(); render(); });

  // ---- Отбор: skip — какой фильтр не учитывать (для счётчиков у вариантов этого же фильтра)
  const match = (el, s, skip) => {
    if (skip !== 'cat' && s.cat && el.dataset.cat !== s.cat) return false;
    if (skip !== 'cat' && skip !== 'sub' && s.sub && el.dataset.sub !== s.sub) return false;
    if (skip !== 'brand' && s.brand.length && !s.brand.includes(el.dataset.brand)) return false;
    if (skip !== 'stock' && s.stock.length && !s.stock.includes(el.dataset.stock)) return false;
    if (s.q) {
      const hay = norm(`${el.dataset.name} ${el.dataset.search} ${BRANDS[el.dataset.brand] || ''}`);
      if (!words(s.q).some((w) => hay.includes(w))) return false;
    }
    return true;
  };
  const price = (el) => Number(el.dataset.price) || 0;
  const byName = (a, b) => a.dataset.name.localeCompare(b.dataset.name, 'ru');
  const sorters = {
    '': byName,
    // «Цена по запросу» всегда в конце
    'price-asc': (a, b) => (price(a) || Infinity) - (price(b) || Infinity) || byName(a, b),
    'price-desc': (a, b) => (price(b) || -1) - (price(a) || -1) || byName(a, b),
  };

  // ---- Отрисовка
  const chip = (label, onRemove, cls) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    if (cls) b.className = cls;
    b.append(label);
    if (!cls && xIcon) b.append(xIcon.cloneNode(true));
    b.setAttribute('aria-label', cls ? label : `Убрать фильтр: ${label}`);
    b.addEventListener('click', onRemove);
    li.append(b);
    return li;
  };

  const render = () => {
    const s = state;
    const meta = CATS[s.cat];
    const sub = subTitle(s.cat, s.sub);
    const title = sub || meta.title;

    // заголовок, крошки, <title>
    $('[data-cat-title]').textContent = title;
    document.title = s.cat ? `${title} — купить в Ташкенте | DIGITECH` : 'Каталог оборудования для систем безопасности — DIGITECH';
    const root = $('[data-crumb-root]');
    const crumb = $('[data-crumb-cat]');
    root.replaceChildren();
    if (s.cat) {
      const a = document.createElement('a'); a.href = 'catalog.html'; a.textContent = 'Каталог'; root.append(a);
      crumb.hidden = false;
      crumb.replaceChildren();
      if (sub) {
        const a = document.createElement('a'); a.href = `catalog.html?cat=${s.cat}`; a.textContent = meta.crumb; a.dataset.crumbCatLink = '';
        crumb.append(a);
      } else {
        const span = document.createElement('span'); span.setAttribute('aria-current', 'page'); span.textContent = meta.crumb; crumb.append(span);
      }
    } else {
      const span = document.createElement('span'); span.setAttribute('aria-current', 'page'); span.textContent = 'Каталог'; root.append(span);
      crumb.hidden = true;
    }
    const crumbSub = $('[data-crumb-sub]');
    crumbSub.hidden = !sub;
    $('span', crumbSub).textContent = sub;

    // подразделы выбранного раздела: «Все» и каждый подраздел со счётчиком
    const subNav = $('[data-subcats]');
    const subs = SUBS[s.cat] || [];
    subNav.hidden = !subs.length;
    $('ul', subNav).replaceChildren(...[['', 'Все']].concat(subs).map(([slug, name]) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `catalog.html?cat=${s.cat}${slug ? `&sub=${slug}` : ''}`;
      const n = items.filter((el) => match(el, { ...s, sub: slug })).length;
      a.append(name, Object.assign(document.createElement('span'), { textContent: String(n) }));
      if (slug === s.sub) a.setAttribute('aria-current', 'page');
      a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        go({ sub: slug });
      });
      li.append(a);
      return li;
    }));

    // разделы и счётчики
    $$('[data-cat-link]').forEach((a) => {
      const c = a.dataset.catLink;
      if (c === s.cat) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      $('span', a).textContent = String(items.filter((el) => match(el, { ...s, cat: c }, c ? undefined : 'cat')).length);
    });

    // варианты фильтров: отмечены, число товаров, пустые недоступны
    $$('input[name="brand"], input[name="stock"]', form).forEach((input) => {
      const key = input.name;
      input.checked = s[key].includes(input.value);
      const n = items.filter((el) => match(el, s, key) && el.dataset[key] === input.value).length;
      $('[data-n]', input.closest('.opt')).textContent = String(n);
      input.disabled = n === 0 && !input.checked;
    });
    $('[data-cat-input]', form).value = s.cat;
    $('[data-sub-input]', form).value = s.sub;
    sortSel.value = s.sort;
    if (headerSearch && document.activeElement !== headerSearch) headerSearch.value = s.q;

    // выбранные фильтры над списком
    const active = $('[data-active]');
    active.replaceChildren();
    if (s.q) active.append(chip(`«${s.q}»`, () => go({ q: '' })));
    s.brand.forEach((b) => active.append(chip(BRANDS[b] || b, () => go({ brand: state.brand.filter((x) => x !== b) }))));
    s.stock.forEach((v) => active.append(chip(STOCK[v], () => go({ stock: state.stock.filter((x) => x !== v) }))));
    const nFilters = s.brand.length + s.stock.length + (s.q ? 1 : 0);
    if (nFilters > 1) active.append(chip('Сбросить все', () => go({ brand: [], stock: [], q: '' }), 'active-filters__reset'));
    const badge = $('[data-filter-count]');
    badge.textContent = String(s.brand.length + s.stock.length);
    badge.hidden = !(s.brand.length + s.stock.length);

    // список: отбор, сортировка, страница
    const found = items.filter((el) => match(el, s)).sort(sorters[s.sort]);
    const pages = Math.max(1, Math.ceil(found.length / PER_PAGE));
    if (s.page > pages) s.page = pages;
    const visible = found.slice((s.page - 1) * PER_PAGE, s.page * PER_PAGE);
    items.forEach((el) => { el.hidden = !visible.includes(el); });
    list.append(...found, ...items.filter((el) => !found.includes(el)));
    list.hidden = !found.length;

    $('[data-count]').textContent = s.q ? `По запросу «${s.q}»: ${goods(found.length)}` : goods(found.length);
    $('[data-filters-apply]').textContent = found.length ? `Показать ${goods(found.length)}` : 'Ничего не найдено';

    // пусто: честно говорим, что делать дальше
    const empty = $('[data-empty]');
    empty.hidden = !!found.length;
    if (!found.length) {
      const bare = !nFilters && s.cat;
      $('[data-empty-title]').textContent = bare ? 'В этом разделе пока нет товаров на сайте' : 'Ничего не нашлось';
      $('[data-empty-text]').textContent = bare
        ? 'Модели ещё не выложены. Напишите задачу, инженер подберёт оборудование и пришлёт расчёт.'
        : 'Уберите часть фильтров или напишите, что нужно: инженер подберёт модель под объект.';
      $('[data-empty-help]').dataset.topic = `Помочь с подбором${s.q ? `: ${s.q}` : s.cat ? `: ${sub || meta.crumb}` : ''}`;
      $$('[data-reset]', empty).forEach((a) => { a.hidden = bare; });
    }

    // пагинация
    const pager = $('[data-pager]');
    pager.replaceChildren();
    pager.hidden = pages < 2;
    for (let i = 1; i <= pages && pages > 1; i += 1) {
      if (i === s.page) {
        const span = document.createElement('span'); span.setAttribute('aria-current', 'page'); span.textContent = String(i); pager.append(span);
      } else {
        const a = document.createElement('a'); a.href = url({ ...s, page: i }); a.textContent = String(i);
        a.setAttribute('aria-label', `Страница ${i}`);
        a.addEventListener('click', (e) => { e.preventDefault(); go({ page: i }, { scroll: true }); });
        pager.append(a);
      }
    }

    // текст раздела
    $$('[data-seo]').forEach((p) => { p.hidden = p.dataset.seo !== s.cat; });
  };

  // ---- События
  form.addEventListener('change', (e) => {
    if (!e.target.name) return;
    const fd = new FormData(form);
    go({ brand: fd.getAll('brand'), stock: fd.getAll('stock') });
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); closeFilters(); });
  sortSel.addEventListener('change', () => go({ sort: sortSel.value }));
  $$('[data-cat-link]').forEach((a) => a.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    go({ cat: a.dataset.catLink, sub: '', brand: [], stock: [], q: '' });
  }));
  $$('[data-reset]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); go({ brand: [], stock: [], q: '' }); }));
  $$('.crumbs').forEach((nav) => nav.addEventListener('click', (e) => {
    const a = e.target.closest('a[href="catalog.html"], a[data-crumb-cat-link]');
    if (!a) return;
    e.preventDefault();
    if ('crumbCatLink' in a.dataset) go({ sub: '' });
    else go({ cat: '', sub: '', brand: [], stock: [], q: '' });
  }));

  // ---- Шторка фильтров (до 960 px)
  const mobile = matchMedia('(max-width: 960px)');
  function closeFilters() {
    if (!filters.hasAttribute('data-open')) return;
    filters.removeAttribute('data-open');
    backdrop.hidden = true;
    document.documentElement.classList.remove('filters-open');
    openBtn.setAttribute('aria-expanded', 'false');
    openBtn.focus();
  }
  openBtn.addEventListener('click', () => {
    filters.setAttribute('data-open', '');
    backdrop.hidden = false;
    document.documentElement.classList.add('filters-open');
    openBtn.setAttribute('aria-expanded', 'true');
    // панель становится видимой со следующим кадром, раньше фокус в неё не встанет
    requestAnimationFrame(() => requestAnimationFrame(() => $('.filters__close', filters).focus()));
  });
  $$('[data-filters-close]').forEach((b) => b.addEventListener('click', closeFilters));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFilters(); });
  mobile.addEventListener('change', () => { if (!mobile.matches) closeFilters(); });

  render();

  // На телефоне плитки разделов листаются: выбранный раздел сразу виден, а не за краем экрана
  const tile = $('.cat-tile[aria-current]');
  const track = tile && tile.parentElement;
  if (track && track.scrollWidth > track.clientWidth) {
    track.scrollLeft += tile.getBoundingClientRect().left - track.getBoundingClientRect().left - (track.clientWidth - tile.offsetWidth) / 2;
  }
})();
