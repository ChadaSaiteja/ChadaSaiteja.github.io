/**
 * knowledge.js — Portfolio Knowledge Loader & Indexer
 * Loads knowledge.json and flattens it into a searchable document array.
 */

/** @type {Object|null} Raw knowledge data */
let _raw = null;

/** @type {Array<Object>} Flattened searchable documents */
let _documents = [];

/**
 * Load and initialize the knowledge base.
 * Call once at startup — subsequent calls return cached data.
 * @returns {Promise<{ raw: Object, documents: Array<Object> }>}
 */
export async function loadKnowledge() {
  if (_raw) return { raw: _raw, documents: _documents };

  const res = await fetch('./assets/knowledge.json');
  if (!res.ok) throw new Error(`Failed to load knowledge base: ${res.status}`);
  _raw = await res.json();
  _documents = flattenKnowledge(_raw);
  return { raw: _raw, documents: _documents };
}

/**
 * Returns the already-loaded raw knowledge object.
 * @returns {Object|null}
 */
export function getRawKnowledge() {
  return _raw;
}

/**
 * Flatten the knowledge JSON into searchable documents.
 * Each document has: { id, section, type, title, content, data, keywords }
 * @param {Object} knowledge
 * @returns {Array<Object>}
 */
function flattenKnowledge(k) {
  const docs = [];

  // ── About ──
  docs.push({
    id: 'about',
    section: 'about',
    type: 'about',
    title: 'About Sai Teja',
    content: k.about.content,
    keywords: k.about.keywords.join(' '),
    data: k.about,
  });

  // ── Experience ──
  for (const exp of k.experience) {
    docs.push({
      id: exp.id,
      section: 'experience',
      type: 'experience',
      title: `${exp.role} at ${exp.company}`,
      content: `${exp.description} ${exp.highlights.join('. ')}`,
      keywords: exp.keywords.join(' '),
      data: exp,
    });
  }

  // ── Projects ──
  for (const proj of k.projects) {
    docs.push({
      id: proj.id,
      section: 'projects',
      type: 'project',
      title: proj.title,
      content: `${proj.description} ${proj.impact}`,
      keywords: proj.keywords.join(' '),
      data: proj,
    });
  }

  // ── Skills — one doc per skill group ──
  const skillGroups = ['languages', 'backend', 'databases', 'cloud', 'architecture'];
  for (const group of skillGroups) {
    const sg = k.skills[group];
    docs.push({
      id: `skills-${group}`,
      section: 'skills',
      type: 'skills',
      title: sg.title,
      content: sg.items.join(', '),
      keywords: sg.keywords.join(' '),
      data: { group, ...sg },
    });
  }

  // ── Education ──
  for (const edu of k.education) {
    docs.push({
      id: edu.id,
      section: 'education',
      type: 'education',
      title: `${edu.degree} in ${edu.field}`,
      content: `${edu.degree} in ${edu.field} from ${edu.institution} (${edu.period})`,
      keywords: edu.keywords.join(' '),
      data: edu,
    });
  }

  // ── Contact ──
  docs.push({
    id: 'contact',
    section: 'contact',
    type: 'contact',
    title: 'Contact Sai Teja',
    content: `Email: ${k.contact.email}. GitHub: ${k.contact.github}. LinkedIn: ${k.contact.linkedin}. ${k.contact.availability}`,
    keywords: k.contact.keywords.join(' '),
    data: k.contact,
  });

  // ── Certifications ──
  for (const cert of k.certifications) {
    docs.push({
      id: cert.id,
      section: 'certifications',
      type: 'certification',
      title: cert.title,
      content: `${cert.title} from ${cert.issuer} (${cert.year})`,
      keywords: cert.keywords.join(' '),
      data: cert,
    });
  }

  return docs;
}
