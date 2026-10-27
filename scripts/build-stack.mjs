#!/usr/bin/env node
/**
 * build-stack.mjs - renders the Tech Stack section and its icon sprite
 *
 * Reads data/stack.json and writes:
 *   - assets/icons/stack.svg  one sprite with a <symbol> per icon
 *   - index.html              the markup between the GENERATED:STACK markers
 *
 * Icons already in the sprite are reused, so no network is needed for edits to names,
 * groups or colors. Only a brand icon that is not in the sprite yet is downloaded from
 * simple-icons (CC0) at the pinned version. Items without a brand icon use a small
 * built-in outline icon ("generic"). Each item's "color" sets its icon and glow color.
 * Run it after editing data/stack.json:  node scripts/build-stack.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(path.join(root, 'data/stack.json'), 'utf8'));
const cdn = `https://cdn.jsdelivr.net/npm/simple-icons@${config.simpleIconsVersion}`;

// Outline icons on a 24px grid for items that have no brand mark
const GENERIC = {
  chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  'search-doc': '<path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h5"/><path d="M14 3l5 5h-5z"/><circle cx="16.5" cy="15.5" r="3"/><path d="M18.7 17.7L21 20"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V5M9 13v1M15 13v1M2 13v3M22 13v3"/><circle cx="12" cy="3.5" r="1.5"/>',
  terminal: '<path d="M4 17l6-5-6-5M12 19h8"/>',
  sparkles: '<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/>',
  vector: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  cloud: '<path d="M17.5 19H7a5 5 0 01-.9-9.9A6 6 0 0117.7 8.1 4.5 4.5 0 0117.5 19z"/>',
  workflow: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><path d="M6.5 10v4a3 3 0 003 3H14"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
  boxes: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  zap: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  grid: '<circle cx="5" cy="5" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>',
};

const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Brand colors that are too dark to read on the #0d1117 background get a light fallback
function readable(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 0.06 ? '#c9d1d9' : hex;
}

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status} ${res.statusText}`);
  return res.text();
}

// -- Icons --

const spritePath = path.join(root, 'assets/icons/stack.svg');
const existing = new Map();
try {
  const old = await readFile(spritePath, 'utf8');
  for (const m of old.matchAll(/<symbol id="([^"]+)"[\s\S]*?<\/symbol>/g)) existing.set(m[1], m[0].trim());
} catch {
  // No sprite yet: every brand icon is downloaded
}

const slugs = [...new Set(config.groups.flatMap(g => g.items).filter(i => i.icon).map(i => i.icon))];
let brandList = null;

const symbols = [];
const brandColor = {};
for (const slug of slugs) {
  if (existing.has(slug)) {
    symbols.push(`  ${existing.get(slug)}`);
    continue;
  }
  const svg = await get(`${cdn}/icons/${slug}.svg`);
  const pathD = svg.match(/<path d="([^"]+)"/)?.[1];
  if (!pathD) throw new Error(`No path found in ${slug}.svg`);
  if (!brandList) {
    const data = JSON.parse(await get(`${cdn}/data/simple-icons.json`));
    brandList = Array.isArray(data) ? data : data.icons;
  }
  const entry = brandList.find(b => (b.slug || '') === slug)
    || brandList.find(b => b.title.toLowerCase().replace(/[^a-z0-9]/g, '') === slug.replace('dot', ''));
  brandColor[slug] = readable(`#${entry?.hex ?? 'c9d1d9'}`);
  console.log(`Downloaded ${slug} (suggested color ${brandColor[slug]})`);
  symbols.push(`  <symbol id="${slug}" viewBox="0 0 24 24"><path fill="currentColor" d="${pathD}"/></symbol>`);
}

const generics = [...new Set(config.groups.flatMap(g => g.items).filter(i => i.generic).map(i => i.generic))];
for (const name of generics) {
  if (!GENERIC[name]) throw new Error(`Unknown generic icon "${name}"`);
  symbols.push(`  <symbol id="g-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${GENERIC[name]}</symbol>`);
}

const sprite = `<svg xmlns="http://www.w3.org/2000/svg">
<!-- Brand icons: simple-icons ${config.simpleIconsVersion} (CC0). Generated by scripts/build-stack.mjs -->
${symbols.join('\n')}
</svg>
`;
await mkdir(path.join(root, 'assets/icons'), { recursive: true });
await writeFile(spritePath, sprite);

// -- Markup --

const groups = config.groups.map(g => {
  const items = g.items.map(i => {
    const id = i.icon ? i.icon : `g-${i.generic}`;
    const color = i.color || (i.icon && brandColor[i.icon]) || 'var(--accent)';
    return `    <li class="stack-item" style="--brand:${color}">
      <svg class="stack-icon" aria-hidden="true"><use href="assets/icons/stack.svg#${id}"/></svg>
      <span>${esc(i.name)}</span>
    </li>`;
  }).join('\n');
  return `<div class="stack-group">
  <div class="stack-head">
    <h3 class="stack-title">${esc(g.title)}</h3>
    <span class="stack-count">${String(g.items.length).padStart(2, '0')}</span>
  </div>
  <ul class="stack-items">
${items}
  </ul>
</div>`;
}).join('\n');

const html = `<div class="stack reveal">
${groups}
</div>`;

const indexPath = path.join(root, 'index.html');
let page = await readFile(indexPath, 'utf8');
const eol = page.includes('\r\n') ? '\r\n' : '\n';
page = page.replace(/\r\n/g, '\n');
const start = '<!-- GENERATED:STACK:START -->';
const end = '<!-- GENERATED:STACK:END -->';
const i = page.indexOf(start);
const j = page.indexOf(end);
if (i === -1 || j === -1 || j < i) throw new Error('Markers for STACK not found in index.html');
const indent = page.slice(page.lastIndexOf('\n', i) + 1, i);
const body = html.split('\n').map(l => (l ? indent + l : l)).join('\n');
page = page.slice(0, i + start.length) + '\n' + body + '\n' + indent + page.slice(j);
await writeFile(indexPath, page.replace(/\n/g, eol));

console.log(`Rendered ${config.groups.length} groups, ${slugs.length} brand icons and ${generics.length} generic icons.`);
