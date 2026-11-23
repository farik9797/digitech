// Собирает страницы src/*.html в корень html/:
// 1) <!-- @include header current="catalog" --> → src/partials/header.html (пункт меню data-nav="catalog" получает aria-current="page");
// 2) <i data-icon="search"></i> → SVG из icons/search.svg (Lucide; telegram.svg из Simple Icons).
// Общие части потом становятся header.php и footer.php темы WordPress.
// Запуск: node build.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const icon = (name, cls) => {
  const raw = readFileSync(join(root, 'icons', `${name}.svg`), 'utf8');
  const inner = raw
    .slice(raw.indexOf('>', raw.indexOf('<svg')) + 1, raw.lastIndexOf('</svg>'))
    .replace(/<title>.*?<\/title>/s, '')
    .trim()
    .replace(/\s+/g, ' ');
  const filled = !/fill="none"/.test(raw);
  const paint = filled
    ? 'fill="currentColor"'
    : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  return `<svg class="icon${cls ? ' ' + cls : ''}" width="20" height="20" viewBox="0 0 24 24" ${paint} aria-hidden="true" focusable="false">${inner}</svg>`;
};
const include = (name, current) => {
  let part = readFileSync(join(root, 'src', 'partials', `${name}.html`), 'utf8');
  if (current) part = part.replace(`data-nav="${current}"`, `data-nav="${current}" aria-current="page"`);
  return part;
};

for (const file of readdirSync(join(root, 'src')).filter((f) => f.endsWith('.html'))) {
  const src = readFileSync(join(root, 'src', file), 'utf8');
  const out = src
    .replace(/<!-- @include ([a-z-]+)(?: current="([a-z-]+)")? -->\n?/g, (_, n, c) => include(n, c))
    .replace(/<i data-icon="([a-z0-9-]+)"(?: class="([^"]*)")?><\/i>/g, (_, n, c) => icon(n, c));
  writeFileSync(join(root, file), out);
  console.log('built', file);
}
