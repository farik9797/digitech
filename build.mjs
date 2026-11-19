// Собирает index.html из src/*.html: подставляет иконки Lucide инлайном.
// Запуск: node build.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const icon = (name, cls) => {
  const raw = readFileSync(join(root, 'icons', `${name}.svg`), 'utf8');
  const inner = raw.slice(raw.indexOf('>', raw.indexOf('<svg')) + 1, raw.lastIndexOf('</svg>')).trim().replace(/\s+/g, ' ');
  return `<svg class="icon${cls ? ' ' + cls : ''}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;
};

for (const file of readdirSync(join(root, 'src')).filter((f) => f.endsWith('.html'))) {
  const src = readFileSync(join(root, 'src', file), 'utf8');
  const out = src.replace(/<i data-icon="([a-z-]+)"(?: class="([^"]*)")?><\/i>/g, (_, n, c) => icon(n, c));
  writeFileSync(join(root, file), out);
  console.log('built', file);
}
