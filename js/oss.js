/**
 * oss.js - Open source section interactivity
 * The markup is pre-rendered by scripts/build-sections.mjs; this file only adds:
 *   - featured project tabs (click, arrow keys)
 *   - category chips (filter)
 *   - language legend / bar (hover or focus previews, click pins)
 *   - "show more" for the project grid
 *
 * One rule drives every view: the active language is the hovered one, else the pinned one.
 * Counts, the featured list, the bar and the grid all read from that same value, so they
 * never disagree.
 */
(function () {
  const root = document.querySelector('[data-oss]');
  if (!root) return;

  const GRID_LIMIT = 6;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const tabs     = [...root.querySelectorAll('.oss-tab')];
  const panels   = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
  const chips    = [...root.querySelectorAll('.oss-chip')];
  const legend   = [...root.querySelectorAll('.oss-legend-item')];
  const segments = [...root.querySelectorAll('.oss-bar-seg')];
  const cards    = [...root.querySelectorAll('.oss-card')];
  const summary  = root.querySelector('.oss-summary');
  const note     = root.querySelector('.oss-note');
  const moreBtn  = root.querySelector('.oss-more');

  const projects = [...tabs, ...cards];
  const defaultSummary = summary.innerHTML;

  const state = { cat: '', pinned: null, hover: null, expanded: false };

  // -- Featured tabs --

  function selectTab(index, focus) {
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
    });
    if (focus) tabs[index].focus();
  }

  // Hovering a featured project shows it. A short delay keeps a quick pass across the
  // list from flickering through every panel. Click still works for touch and keyboard.
  let hoverTimer = null;

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(i, false));
    if (canHover) {
      tab.addEventListener('pointerenter', e => {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => selectTab(i, false), 80);
      });
      tab.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
    }
    tab.addEventListener('keydown', e => {
      const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      let next = null;
      if (e.key in keys) next = (i + keys[e.key] + tabs.length) % tabs.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = tabs.length - 1;
      if (next === null) return;
      e.preventDefault();
      selectTab(next, true);
    });
  });

  // -- Filtering --

  const activeLang = () => state.hover ?? state.pinned;
  const inCat = el => !state.cat || el.dataset.cat === state.cat;
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  function render() {
    const lang = activeLang();
    const matchesLang = el => !lang || el.dataset.lang === lang;

    // Legend and bar
    legend.forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.lang === state.pinned));
      b.classList.toggle('is-active', b.dataset.lang === lang);
      b.classList.toggle('is-dim', !!lang && b.dataset.lang !== lang);
    });
    segments.forEach(s => s.classList.toggle('is-dim', !!lang && s.dataset.lang !== lang));
    chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.cat === state.cat)));

    // Featured list: dim anything outside the current category or language
    tabs.forEach(t => t.classList.toggle('is-dim', !(inCat(t) && matchesLang(t))));

    // Grid: category always filters. A pinned language filters; a hovered one only
    // highlights (matches first, the rest dimmed) so a preview never empties the grid.
    const filterLang = state.hover === null && state.pinned !== null;
    const pool = cards.filter(c => inCat(c) && (!filterLang || matchesLang(c)));
    const ordered = lang && !filterLang
      ? [...pool.filter(matchesLang), ...pool.filter(c => !matchesLang(c))]
      : pool;
    const limit = state.expanded ? Infinity : GRID_LIMIT;

    cards.forEach(c => { c.hidden = true; c.style.order = ''; c.classList.remove('is-dim'); });
    ordered.forEach((c, i) => {
      c.style.order = String(i);
      c.hidden = i >= limit;
      c.classList.toggle('is-dim', !!lang && !matchesLang(c));
    });

    const remaining = ordered.length - Math.min(ordered.length, GRID_LIMIT);
    moreBtn.hidden = remaining <= 0;
    moreBtn.textContent = state.expanded ? 'Show less' : `Show ${remaining} more`;
    moreBtn.setAttribute('aria-expanded', String(state.expanded));

    // Summary counts every project (featured + grid) that matches, so it always agrees
    // with what is highlighted on screen.
    const matched = projects.filter(p => inCat(p) && matchesLang(p));
    const featuredMatches = tabs.filter(t => inCat(t) && matchesLang(t));
    const gridMatches = cards.filter(c => inCat(c) && matchesLang(c));

    if (!lang && !state.cat) {
      summary.innerHTML = defaultSummary;
    } else {
      const label = [lang, state.cat].filter(Boolean).join(' · ');
      let text = `Showing ${plural(matched.length, 'project')}`;
      if (label) text += ` in ${label}`;
      if (featuredMatches.length && gridMatches.length) text += ` &middot; ${featuredMatches.length} featured above`;
      summary.innerHTML = text;
    }

    // Explain an empty grid instead of leaving the user staring at dimmed cards
    note.hidden = true;
    note.textContent = '';
    if ((lang || state.cat) && gridMatches.length === 0) {
      note.hidden = false;
      if (featuredMatches.length) {
        note.append('Only in featured: ');
        featuredMatches.forEach((t, i) => {
          if (i) note.append(', ');
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = t.dataset.title;
          b.addEventListener('click', () => {
            selectTab(tabs.indexOf(t), true);
            root.querySelector('.oss-featured').scrollIntoView({ block: 'nearest' });
          });
          note.append(b);
        });
      } else {
        note.textContent = `No ${lang ? lang + ' ' : ''}projects${state.cat ? ' in ' + state.cat : ''} yet.`;
      }
    }
  }

  // After a pin or category change, bring a matching featured project into view
  function showFirstFeaturedMatch() {
    const fits = t => inCat(t) && (!state.pinned || t.dataset.lang === state.pinned);
    const current = tabs.find(t => t.getAttribute('aria-selected') === 'true');
    if (current && fits(current)) return;
    const idx = tabs.findIndex(fits);
    if (idx !== -1) selectTab(idx, false);
  }

  function togglePin(lang) {
    state.pinned = state.pinned === lang ? null : lang;
    state.hover = null;
    state.expanded = false;
    showFirstFeaturedMatch();
    render();
  }

  function preview(lang) {
    if (state.hover === lang) return;
    state.hover = lang;
    render();
  }

  [...legend, ...segments].forEach(el => {
    const lang = el.dataset.lang;
    el.addEventListener('click', () => togglePin(lang));
    if (canHover) {
      el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') preview(lang); });
      el.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') preview(null); });
    }
  });

  // Keyboard users get the same preview on focus as mouse users get on hover
  legend.forEach(b => {
    b.addEventListener('focus', () => { if (b.matches(':focus-visible')) preview(b.dataset.lang); });
    b.addEventListener('blur', () => preview(null));
  });

  chips.forEach(c => c.addEventListener('click', () => {
    state.cat = c.dataset.cat;
    state.expanded = false;
    showFirstFeaturedMatch();
    render();
  }));

  moreBtn.addEventListener('click', () => {
    state.expanded = !state.expanded;
    render();
  });

  render();
})();
