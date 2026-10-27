#!/usr/bin/env node
/**
 * build-sections.mjs - renders the "Open source" and "Writing" sections into index.html
 *
 * Reads data/projects.json and data/posts.json (both edited by hand, no network calls) and
 * rewrites the HTML between the GENERATED markers in index.html. The output is static HTML,
 * so crawlers and link previews see it without running JavaScript; js/oss.js only adds the
 * filtering.
 *
 * Usage: node scripts/build-sections.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(path.join(root, 'data/projects.json'), 'utf8'));
const indexPath = path.join(root, 'index.html');

// GitHub linguist colors for the languages used here
const LANG_COLORS = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Java: '#b07219',
  Go: '#00ADD8',
};

// Category accents reuse the site's palette variables
const CAT_COLORS = ['var(--accent)', 'var(--purple)', 'var(--blue)', 'var(--orange)'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// -- Helpers --

const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const monthYear = iso => {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

const fullDate = d => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;

const slugOf = url => url.replace(/\/+$/, '').split('/').pop();

function replaceBetween(html, name, content) {
  const start = `<!-- GENERATED:${name}:START -->`;
  const end = `<!-- GENERATED:${name}:END -->`;
  const i = html.indexOf(start);
  const j = html.indexOf(end);
  if (i === -1 || j === -1 || j < i) throw new Error(`Markers for ${name} not found in index.html`);
  const indent = html.slice(html.lastIndexOf('\n', i) + 1, i);
  return html.slice(0, i + start.length) + '\n' + content + '\n' + indent + html.slice(j);
}

const indentBlock = (s, n) => s.split('\n').map(l => (l ? ' '.repeat(n) + l : l)).join('\n');

const ICON_GH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>';
const ICON_BOOK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4h7a3 3 0 013 3v13a2 2 0 00-2-2H2zM22 4h-7a3 3 0 00-3 3v13a2 2 0 012-2h8z"/></svg>';
const ICON_ARROW = '<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clip-rule="evenodd"/></svg>';

// -- Load data --

const repos = config.projects.map(p => ({ ...p, language: p.language || 'Other' }));
const { posts: postList } = JSON.parse(await readFile(path.join(root, 'data/posts.json'), 'utf8'));

const blog = config.blog.replace(/\/+$/, '');
const writeupRepo = new Map(repos.filter(p => p.writeup).map(p => [p.writeup, p]));
const posts = postList.map(post => ({
  ...post,
  date: new Date(`${post.date}T00:00:00Z`),
  tags: post.tags ?? [],
  repo: writeupRepo.get(slugOf(post.url)),
})).sort((a, b) => b.date - a.date);

// -- Render: Open source --

const catColor = cat => CAT_COLORS[Math.max(0, config.categories.indexOf(cat)) % CAT_COLORS.length];
const langColor = lang => LANG_COLORS[lang] || 'var(--text-muted)';
const writeupUrl = p => (p.writeup ? `${blog}/${p.writeup}/` : null);

const featured = repos.filter(p => p.featured);
const rest = repos.filter(p => !p.featured);

const langCounts = {};
for (const p of repos) langCounts[p.language] = (langCounts[p.language] || 0) + 1;
const langs = Object.entries(langCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

const metaLine = p => [
  `<span class="oss-lang-name"><i class="oss-dot" style="background:${langColor(p.language)}"></i>${esc(p.language)}</span>`,
  `<span>Updated ${monthYear(p.updated)}</span>`,
].filter(Boolean).join('\n');

const projectLinks = p => [
  `<a href="${esc(p.url)}" target="_blank" rel="noopener" class="oss-link">${ICON_GH}Code</a>`,
  writeupUrl(p) ? `<a href="${esc(writeupUrl(p))}" class="oss-link oss-link-accent">${ICON_BOOK}Read the write-up</a>` : '',
  p.demo ? `<a href="${esc(p.demo)}" target="_blank" rel="noopener" class="oss-link">${ICON_ARROW}Live demo</a>` : '',
].filter(Boolean).join('\n');

const dataAttrs = p => `data-lang="${esc(p.language)}" data-cat="${esc(p.category)}" data-title="${esc(p.title)}"`;

const tabs = featured.map((p, i) => `<button type="button" role="tab" class="oss-tab" id="oss-tab-${i}" aria-controls="oss-panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" ${dataAttrs(p)} data-featured>
  <span class="oss-tab-num">${String(i + 1).padStart(2, '0')}</span>
  <span class="oss-tab-body">
    <span class="oss-tab-title">${esc(p.title)}</span>
    <span class="oss-tab-sub"><i class="oss-dot" style="background:${langColor(p.language)}"></i>${esc(p.language)} &middot; ${esc(p.category)}</span>
  </span>
</button>`).join('\n');

const panels = featured.map((p, i) => `<div class="oss-panel" role="tabpanel" id="oss-panel-${i}" aria-labelledby="oss-tab-${i}"${i === 0 ? '' : ' hidden'}>
  <div class="oss-term" aria-hidden="true">
    <div class="oss-term-bar"><i></i><i></i><i></i><span>~/${esc(p.repo)}</span></div>
    <div class="oss-term-body">
      <div><span class="oss-term-prompt">$</span> git clone github.com/${esc(config.github)}/${esc(p.repo)}</div>
      <div><span class="oss-term-prompt">$</span> cat README.md</div>
      <div class="oss-term-head"># ${esc(p.terminal?.heading ?? p.blurb)}</div>
${(p.terminal?.points ?? []).map(pt => `      <div><span class="oss-term-arrow">&rarr;</span> ${esc(pt)}</div>`).join('\n')}
    </div>
  </div>
  <div class="oss-panel-body">
    <div class="proj-category" style="color:${catColor(p.category)}">${esc(p.category)}</div>
    <h3 class="oss-panel-title"><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a></h3>
    <p class="proj-desc">${esc(p.blurb)}</p>
    <div class="tags">
${(p.stack ?? []).map(s => `      <span class="tag tag-grey">${esc(s)}</span>`).join('\n')}
    </div>
    <div class="oss-meta">
${indentBlock(metaLine(p), 6)}
    </div>
    <div class="oss-links">
${indentBlock(projectLinks(p), 6)}
    </div>
  </div>
</div>`).join('\n');

const chips = [
  `<button type="button" class="oss-chip" aria-pressed="true" data-cat="">All <span class="oss-count">${repos.length}</span></button>`,
  ...config.categories.map(c => `<button type="button" class="oss-chip" aria-pressed="false" data-cat="${esc(c)}"><i class="oss-dot" style="background:${catColor(c)}"></i>${esc(c)} <span class="oss-count">${repos.filter(p => p.category === c).length}</span></button>`),
].join('\n');

const bar = langs.map(([l, n]) => `<span class="oss-bar-seg" data-lang="${esc(l)}" style="flex-grow:${n};background:${langColor(l)}" title="${esc(l)}: ${n} project${n === 1 ? '' : 's'}"></span>`).join('\n');

const legend = langs.map(([l, n]) => `<button type="button" class="oss-legend-item" aria-pressed="false" data-lang="${esc(l)}"><i class="oss-dot" style="background:${langColor(l)}"></i>${esc(l)} <span class="oss-pct">${Math.round((n / repos.length) * 1000) / 10}%</span></button>`).join('\n');

const cards = rest.map(p => `<article class="oss-card" ${dataAttrs(p)}>
  <div class="oss-card-top">
    <span class="oss-card-cat"><i class="oss-dot" style="background:${catColor(p.category)}"></i>${esc(p.category)}</span>
    <a href="${esc(p.url)}" target="_blank" rel="noopener" class="oss-card-gh" aria-label="${esc(p.title)} on GitHub">${ICON_GH}</a>
  </div>
  <h3 class="oss-card-title"><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a></h3>
  <div class="oss-card-repo">${esc(config.github)}/${esc(p.repo)}</div>
  <p class="oss-card-desc">${esc(p.blurb)}</p>
  <div class="tags">
${(p.stack ?? []).map(s => `    <span class="tag tag-grey">${esc(s)}</span>`).join('\n')}
  </div>
  <div class="oss-card-foot">
    <span class="oss-lang-name"><i class="oss-dot" style="background:${langColor(p.language)}"></i>${esc(p.language)}</span>
    <span class="oss-card-date">${monthYear(p.updated)}</span>
${writeupUrl(p) ? `    <a href="${esc(writeupUrl(p))}" class="oss-link oss-link-accent">${ICON_BOOK}Write-up</a>` : ''}
${p.demo ? `    <a href="${esc(p.demo)}" target="_blank" rel="noopener" class="oss-link">${ICON_ARROW}Demo</a>` : ''}
  </div>
</article>`.replace(/\n\n/g, '\n')).join('\n');

const ossHtml = `<div class="oss" data-oss>
  <div class="oss-featured reveal">
    <div class="oss-tabs" role="tablist" aria-label="Featured projects">
${indentBlock(tabs, 6)}
    </div>
${indentBlock(panels, 4)}
  </div>

  <div class="oss-controls reveal">
    <div class="oss-chips" role="group" aria-label="Filter projects by category">
${indentBlock(chips, 6)}
    </div>
    <div class="oss-lang">
      <div class="oss-lang-head"><span>Languages</span><span>by project count</span></div>
      <div class="oss-bar">
${indentBlock(bar, 8)}
      </div>
      <div class="oss-legend" role="group" aria-label="Filter projects by language">
${indentBlock(legend, 8)}
      </div>
    </div>
    <p class="oss-summary" aria-live="polite">${repos.length} projects across ${langs.length} languages</p>
  </div>

  <div class="oss-grid">
${indentBlock(cards, 4)}
  </div>
  <p class="oss-note" hidden></p>
  <div class="oss-footer">
    <button type="button" class="oss-more" hidden></button>
    <a href="https://github.com/${esc(config.github)}?tab=repositories" target="_blank" rel="noopener" class="oss-all">View all repositories on GitHub ${ICON_ARROW}</a>
  </div>
</div>`;

// -- Render: Writing --

const shown = posts.slice(0, config.postsToShow);
const postCards = shown.map(p => `<article class="post-card reveal">
  <div class="tags">
${p.tags.slice(0, 3).map(t => `    <span class="tag tag-teal">${esc(t)}</span>`).join('\n')}
  </div>
  <h3 class="post-title"><a href="${esc(p.url)}">${esc(p.title)}</a></h3>
  <p class="post-desc">${esc(p.description)}</p>
  <div class="post-meta">
    <time datetime="${p.date.toISOString().slice(0, 10)}">${fullDate(p.date)}</time>
${p.readMinutes ? `    <span>${p.readMinutes} min read</span>` : ''}
${p.repo ? `    <a href="${esc(p.repo.url)}" target="_blank" rel="noopener" class="oss-link">${ICON_GH}Code: ${esc(p.repo.repo)}</a>` : ''}
  </div>
</article>`.replace(/\n\n/g, '\n')).join('\n');

const writingHtml = `<div class="writing-grid">
${indentBlock(postCards, 2)}
</div>
<a href="${esc(blog)}/" class="writing-all">Read all ${posts.length} posts ${ICON_ARROW}</a>`;

// -- Write --

let html = await readFile(indexPath, 'utf8');
const eol = html.includes('\r\n') ? '\r\n' : '\n';
html = html.replace(/\r\n/g, '\n');
html = replaceBetween(html, 'OSS', indentBlock(ossHtml, 8));
html = replaceBetween(html, 'WRITING', indentBlock(writingHtml, 8));
await writeFile(indexPath, html.replace(/\n/g, eol));

console.log(`Rendered ${repos.length} projects (${featured.length} featured) and ${shown.length} of ${posts.length} posts.`);
