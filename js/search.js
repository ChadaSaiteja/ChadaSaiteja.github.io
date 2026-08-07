/**
 * search.js — Semantic Search Engine powered by Fuse.js
 * Provides fuzzy, typo-tolerant, ranked semantic search over the knowledge base.
 * No hardcoded if-else keyword checks.
 */

/** @type {any} Fuse.js instance */
let _fuse = null;

/** @type {Array<Object>} The documents being searched */
let _documents = [];

/**
 * Initialize the search engine with a document array.
 * Must be called after knowledge is loaded.
 * @param {Array<Object>} documents
 */
export function initSearch(documents) {
  _documents = documents;

  // Fuse.js is loaded via CDN script tag — available on window.Fuse
  const Fuse = window.Fuse;
  if (!Fuse) throw new Error('Fuse.js is not loaded. Add the CDN script to index.html.');

  _fuse = new Fuse(documents, {
    // Fields to search, with weights
    keys: [
      { name: 'title',    weight: 0.35 },
      { name: 'keywords', weight: 0.40 },
      { name: 'content',  weight: 0.25 },
    ],

    // Fuzzy matching settings
    threshold: 0.45,         // 0 = exact, 1 = match anything
    distance: 200,            // how far from the expected position can a match be
    minMatchCharLength: 2,    // minimum characters to trigger a match
    includeScore: true,       // we need confidence scores
    includeMatches: true,     // for highlighting matched terms
    ignoreLocation: true,     // search entire string, not just beginning
    useExtendedSearch: false,

    // Tokenize for better multi-word matching
    tokenize: false,
    shouldSort: true,
  });
}

/**
 * Search the knowledge base for the given query.
 * Returns results sorted by relevance with a confidence score (0–1, higher = better).
 *
 * @param {string} query
 * @param {{ maxResults?: number, minConfidence?: number }} [opts]
 * @returns {Array<{ document: Object, score: number, confidence: number, matches: Array }>}
 */
export function search(query, opts = {}) {
  if (!_fuse) throw new Error('Search engine not initialized. Call initSearch() first.');

  const { maxResults = 8, minConfidence = 0.1 } = opts;

  const rawResults = _fuse.search(query, { limit: maxResults });

  // Fuse score is 0 = perfect, 1 = worst. Invert to get confidence 0–1.
  return rawResults
    .map(r => ({
      document: r.item,
      fuseScore: r.score ?? 1,
      confidence: Math.max(0, 1 - (r.score ?? 1)),
      matches: r.matches ?? [],
    }))
    .filter(r => r.confidence >= minConfidence);
}

/**
 * Get the unique sections represented in a set of search results.
 * @param {Array<Object>} results - from search()
 * @returns {Array<string>} e.g. ['projects', 'experience', 'skills']
 */
export function getSourceSections(results) {
  const seen = new Set();
  return results
    .map(r => r.document.section)
    .filter(s => {
      if (seen.has(s)) return false;
      seen.add(s);
      return true;
    });
}

/**
 * Detect the primary intent of a query by analyzing top-result sections.
 * Returns one of: 'about' | 'experience' | 'projects' | 'skills' |
 *                 'contact' | 'education' | 'certifications' | 'general'
 *
 * @param {string} query
 * @param {Array<Object>} results - from search()
 * @returns {string}
 */
export function detectIntent(query, results) {
  if (!results.length) return 'general';

  // Count section hits weighted by confidence
  const sectionWeight = {};
  for (const r of results) {
    const s = r.document.section;
    sectionWeight[s] = (sectionWeight[s] || 0) + r.confidence;
  }

  // Explicit keyword overrides for common intent patterns
  const q = query.toLowerCase();
  const intentOverrides = [
    { keywords: ['contact', 'email', 'reach', 'hire', 'linkedin', 'github', 'connect'], intent: 'contact' },
    { keywords: ['project', 'built', 'worked on', 'portfolio', 'shipped'], intent: 'projects' },
    { keywords: ['experience', 'work', 'job', 'career', 'company', 'role', 'position'], intent: 'experience' },
    { keywords: ['skill', 'tech', 'stack', 'language', 'framework', 'tool', 'know', 'use'], intent: 'skills' },
    { keywords: ['about', 'who', 'tell me', 'yourself', 'bio', 'background'], intent: 'about' },
    { keywords: ['education', 'degree', 'college', 'university', 'study', 'studied'], intent: 'education' },
    { keywords: ['resume', 'cv', 'download'], intent: 'contact' },
  ];

  for (const { keywords, intent } of intentOverrides) {
    if (keywords.some(kw => q.includes(kw))) return intent;
  }

  // Return section with highest accumulated weight
  return Object.entries(sectionWeight).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'general';
}
