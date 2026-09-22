/**
 * ui.js - Rich UI Renderer for TJ Assistant
 * Renders project cards, skill badges, timeline cards, contact buttons,
 * markdown text, source tags, and all interactive chat elements.
 */

// ----------------------------------------------------------
// Markdown renderer (no external deps)
// ----------------------------------------------------------

/**
 * Very lightweight markdown → HTML renderer.
 * Supports: **bold**, *italic*, `code`, ```code blocks```, bullet lists, numbered lists.
 * @param {string} md
 * @returns {string} HTML string
 */
export function renderMarkdown(md) {
  if (!md) return '';
  let html = md
    // Code blocks (must come before inline code)
    .replace(/```([\s\S]*?)```/g, (_, code) => {
      const escaped = escapeHtml(code.trim());
      return `<div class="tja-code-block"><button class="tja-copy-btn" onclick="tjaCopyCode(this)" title="Copy code">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        Copy</button><pre><code>${escaped}</code></pre></div>`;
    })
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="tja-inline-code">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Bullet lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> items in <ul>
    .replace(/(<li>.*<\/li>(\n|$))+/gs, m => `<ul class="tja-list">${m}</ul>`)
    // Line breaks → <br> (but not inside lists/code blocks)
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return `<p>${html}</p>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Global copy handler (needs to be on window for inline onclick)
window.tjaCopyCode = function (btn) {
  const code = btn.closest('.tja-code-block').querySelector('code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = 'Copied!';
    setTimeout(() => {
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Copy`;
    }, 2000);
  });
};

// ----------------------------------------------------------
// Rich Response Renderers
// ----------------------------------------------------------

/**
 * Render project cards.
 * @param {Array<Object>} projects
 * @returns {HTMLElement}
 */
export function renderProjectCards(projects) {
  const container = document.createElement('div');
  container.className = 'tja-projects-grid';

  for (const proj of projects) {
    const card = document.createElement('div');
    card.className = 'tja-project-card';
    card.innerHTML = `
      <div class="tja-project-emoji">${proj.emoji}</div>
      <div class="tja-project-body">
        <div class="tja-project-category">${proj.category}</div>
        <div class="tja-project-title">${proj.title}</div>
        <div class="tja-project-desc">${proj.description}</div>
        <div class="tja-project-tags">
          ${proj.technologies.map(t => `<span class="tja-tag">${t}</span>`).join('')}
        </div>
      </div>
    `;
    container.appendChild(card);
  }

  return container;
}

/**
 * Render skill badges grouped by category.
 * @param {{ groups: Array<Object>, stats: Object }} skillData
 * @returns {HTMLElement}
 */
export function renderSkillBadges(skillData) {
  const container = document.createElement('div');
  container.className = 'tja-skills-container';

  for (const group of skillData.groups) {
    const section = document.createElement('div');
    section.className = 'tja-skill-group';
    section.innerHTML = `
      <div class="tja-skill-group-title">${group.title}</div>
      <div class="tja-skill-tags">
        ${group.items.map(item => `<span class="tja-tag tja-tag-glow">${item}</span>`).join('')}
      </div>
    `;
    container.appendChild(section);
  }

  // Stats row
  if (skillData.stats) {
    const stats = document.createElement('div');
    stats.className = 'tja-stats-row';
    stats.innerHTML = `
      <div class="tja-stat"><span class="tja-stat-num">${skillData.stats.years_experience}</span><span class="tja-stat-lbl">Years Exp</span></div>
      <div class="tja-stat"><span class="tja-stat-num">${skillData.stats.microservices_shipped}</span><span class="tja-stat-lbl">Microservices</span></div>
      <div class="tja-stat"><span class="tja-stat-num">${skillData.stats.api_speedup}</span><span class="tja-stat-lbl">API Speedup</span></div>
    `;
    container.appendChild(stats);
  }

  return container;
}

/**
 * Render experience timeline cards.
 * @param {Array<Object>} experiences
 * @returns {HTMLElement}
 */
export function renderExperienceCards(experiences) {
  const container = document.createElement('div');
  container.className = 'tja-experience-list';

  for (const exp of experiences) {
    const card = document.createElement('div');
    card.className = 'tja-exp-card';
    card.innerHTML = `
      <div class="tja-exp-dot"></div>
      <div class="tja-exp-body">
        <div class="tja-exp-period">${exp.period}</div>
        <div class="tja-exp-role">${exp.role}</div>
        <div class="tja-exp-company">${exp.company}</div>
        <div class="tja-exp-desc">${exp.description}</div>
        ${exp.technologies?.length
          ? `<div class="tja-exp-tags">${exp.technologies.slice(0, 6).map(t => `<span class="tja-tag">${t}</span>`).join('')}</div>`
          : ''}
      </div>
    `;
    container.appendChild(card);
  }

  return container;
}

/**
 * Render contact action buttons.
 * @param {Object} contact
 * @returns {HTMLElement}
 */
export function renderContactButtons(contact) {
  const container = document.createElement('div');
  container.className = 'tja-contact-grid';

  const buttons = [
    {
      label: 'Send Email',
      href: `mailto:${contact.email}`,
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9 6 9-6M3 8v10a2 2 0 002 2h14a2 2 0 002-2V8M3 8l9-4 9 4"/></svg>`,
      sub: contact.email,
    },
    {
      label: 'GitHub',
      href: contact.github,
      target: '_blank',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>`,
      sub: 'ChadaSaiteja',
    },
    {
      label: 'LinkedIn',
      href: contact.linkedin,
      target: '_blank',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
      sub: 'chada-saiteja',
    },
  ];

  for (const btn of buttons) {
    const a = document.createElement('a');
    a.className = 'tja-contact-btn';
    a.href = btn.href;
    if (btn.target) a.target = btn.target;
    if (btn.target) a.rel = 'noopener';
    a.innerHTML = `
      <span class="tja-contact-btn-icon">${btn.icon}</span>
      <span class="tja-contact-btn-body">
        <span class="tja-contact-btn-label">${btn.label}</span>
        <span class="tja-contact-btn-sub">${btn.sub}</span>
      </span>
    `;
    container.appendChild(a);
  }

  return container;
}

// ----------------------------------------------------------
// Source Tags
// ----------------------------------------------------------

/**
 * Render source tags that scroll to portfolio sections on click.
 * @param {string[]} sections
 * @returns {HTMLElement}
 */
export function renderSources(sections) {
  if (!sections?.length) return null;

  const container = document.createElement('div');
  container.className = 'tja-sources';

  const label = document.createElement('span');
  label.className = 'tja-sources-label';
  label.textContent = 'Source:';
  container.appendChild(label);

  const sectionLabels = {
    about: 'About',
    experience: 'Experience',
    projects: 'Projects',
    skills: 'Skills',
    contact: 'Contact',
    education: 'Education',
    certifications: 'Certifications',
  };

  for (const section of sections) {
    const tag = document.createElement('button');
    tag.className = 'tja-source-tag';
    tag.textContent = `✓ ${sectionLabels[section] || section}`;
    tag.setAttribute('data-section', section);
    tag.addEventListener('click', () => {
      const el = document.getElementById(section);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    container.appendChild(tag);
  }

  return container;
}

// ----------------------------------------------------------
// Timestamp
// ----------------------------------------------------------

/**
 * Get a formatted timestamp string for messages.
 * @returns {string} e.g. "11:23 PM"
 */
export function getTimestamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ----------------------------------------------------------
// Suggestion Chips
// ----------------------------------------------------------

/**
 * Render quick action suggestion chips.
 * @param {string[]} suggestions
 * @param {Function} onSelect - called with the selected suggestion string
 * @returns {HTMLElement}
 */
export function renderSuggestions(suggestions, onSelect) {
  const container = document.createElement('div');
  container.className = 'tja-suggestions';

  for (const text of suggestions) {
    const chip = document.createElement('button');
    chip.className = 'tja-suggestion-chip';
    chip.textContent = text;
    chip.addEventListener('click', () => onSelect(text));
    container.appendChild(chip);
  }

  return container;
}
