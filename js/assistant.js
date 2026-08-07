/**
 * assistant.js — Answer Engine
 * Converts search results into natural, conversational responses.
 * Never invents information. Falls back gracefully when no results found.
 */

import { search, detectIntent, getSourceSections } from './search.js';
import { getRawKnowledge } from './knowledge.js';

/** Fallback message when no relevant info is found */
const FALLBACK_MESSAGE =
  "I couldn't find that information in Sai Teja's portfolio. Feel free to ask about his projects, experience, skills, or contact information.";

const CORS_WARNING_MESSAGE =
  "⚠️ **CORS Block Detected (file:// protocol)**\n\nIt looks like you opened the portfolio page directly from your local filesystem.\n\nModern browsers block local data loading (`knowledge.json`) over the `file://` protocol for security. To run and test the assistant, you need to use a local HTTP server.\n\n**Quick fix:**\n1. Open your terminal in the portfolio directory.\n2. Run `npx serve` or `python -m http.server 8000`.\n3. Open the link provided (e.g., `http://localhost:3000`).";

/**
 * Generate a natural language answer for a user question.
 * Uses conversation history for context-aware follow-up handling.
 *
 * @param {string} userMessage
 * @param {Array<{role: string, content: string, context?: Object}>} history
 * @returns {{ text: string, sources: string[], richType: string|null, richData: any, confidence: number }}
 */
export function generateAnswer(userMessage, history = []) {
  const raw = getRawKnowledge();
  if (!raw) {
    const isFileProtocol = window.location.protocol === 'file:';
    return {
      text: isFileProtocol ? CORS_WARNING_MESSAGE : FALLBACK_MESSAGE,
      sources: [],
      richType: null,
      richData: null,
      confidence: 0
    };
  }

  // ── Context-aware follow-up resolution ──
  // If the user refers to something like "it", "that", "the project" etc.,
  // inject context from the previous assistant turn.
  const resolvedQuery = resolveFollowUp(userMessage, history);

  // ── Search ──
  const results = search(resolvedQuery, { maxResults: 6, minConfidence: 0.12 });
  const intent  = detectIntent(resolvedQuery, results);
  const sources = getSourceSections(results);

  // ── No results ──
  if (!results.length) {
    return { text: FALLBACK_MESSAGE, sources: [], richType: null, richData: null, confidence: 0 };
  }

  // ── Route to intent-specific generators ──
  const bestConfidence = results[0].confidence;
  const ctx = { results, raw, sources, resolvedQuery, intent, bestConfidence };

  switch (intent) {
    case 'projects':    return generateProjectsAnswer(ctx);
    case 'experience':  return generateExperienceAnswer(ctx);
    case 'skills':      return generateSkillsAnswer(ctx);
    case 'contact':     return generateContactAnswer(ctx);
    case 'about':       return generateAboutAnswer(ctx);
    case 'education':   return generateEducationAnswer(ctx);
    default:            return generateGeneralAnswer(ctx);
  }
}

// ────────────────────────────────────────────────────────────
// Follow-up Resolution
// ────────────────────────────────────────────────────────────

/**
 * Detect pronoun/vague references and expand the query using recent context.
 * @param {string} query
 * @param {Array} history
 * @returns {string} Expanded query
 */
function resolveFollowUp(query, history) {
  const pronouns = /\b(it|that|this|those|them|there|the project|the role|the company|the tech|the stack)\b/i;
  if (!pronouns.test(query) || history.length === 0) return query;

  // Find the last assistant message's context keywords
  const lastCtx = [...history].reverse().find(h => h.role === 'assistant' && h.contextKeywords);
  if (!lastCtx?.contextKeywords?.length) return query;

  // Append context keywords to the query
  return `${query} ${lastCtx.contextKeywords.join(' ')}`;
}

// ────────────────────────────────────────────────────────────
// Intent Generators
// ────────────────────────────────────────────────────────────

function generateProjectsAnswer({ results, raw, sources }) {
  // Collect project documents from results + fallback to all projects
  const projectDocs = results
    .filter(r => r.document.type === 'project')
    .map(r => r.document.data);

  const allProjects = raw.projects;
  const projects = projectDocs.length ? projectDocs : allProjects;
  const topKeywords = extractTopKeywords(results);

  const intro = projects.length > 1
    ? `I've worked on ${projects.length} major projects at Dhan AI, ranging from telecom platforms to enterprise systems:`
    : `Here's a project that matches your query:`;

  return {
    text: intro,
    sources,
    richType: 'projects',
    richData: projects,
    confidence: results[0]?.confidence ?? 0.8,
    contextKeywords: topKeywords,
  };
}

function generateExperienceAnswer({ results, raw, sources }) {
  const expDocs = results
    .filter(r => r.document.type === 'experience')
    .map(r => r.document.data);

  const allExperience = raw.experience;
  const experience = expDocs.length ? expDocs : allExperience;
  const topKeywords = extractTopKeywords(results);

  const current = allExperience.find(e => e.id === 'exp-dhan-ai');
  const intro = experience.length > 1
    ? `Here's Sai Teja's professional experience:`
    : `Here's a relevant experience entry:`;

  // Generate narrative for current role
  let text = intro;
  if (experience.some(e => e.id === 'exp-dhan-ai') && experience.length === 1) {
    const exp = experience[0];
    text = `Sai Teja is currently working as a **${exp.role}** at **${exp.company}** (${exp.period}). He's been building distributed backend systems — including customer portals, internal tooling, and a large-scale multi-tenant CXP platform — using ${exp.technologies.slice(0, 5).join(', ')}, and more.`;
  }

  return {
    text,
    sources,
    richType: 'experience',
    richData: experience,
    confidence: results[0]?.confidence ?? 0.8,
    contextKeywords: topKeywords,
  };
}

function generateSkillsAnswer({ results, raw, sources }) {
  const skills = raw.skills;
  const topKeywords = extractTopKeywords(results);

  // Find which skill groups are most relevant
  const relevantGroups = results
    .filter(r => r.document.type === 'skills')
    .map(r => r.document.data.group)
    .filter(Boolean);

  const allGroups = ['languages', 'backend', 'databases', 'cloud', 'architecture'];
  const groupsToShow = relevantGroups.length ? [...new Set(relevantGroups)] : allGroups;

  const skillItems = groupsToShow
    .map(g => skills[g])
    .filter(Boolean)
    .map(g => g.items);

  const flatSkills = [...new Set(skillItems.flat())];

  let text;
  if (groupsToShow.length === 1) {
    const g = skills[groupsToShow[0]];
    text = `Sai Teja's ${g.title.toLowerCase()} include: **${g.items.join(', ')}**.`;
  } else {
    text = `Sai Teja's core technical skills span multiple areas — from backend engineering to cloud infrastructure:`;
  }

  return {
    text,
    sources,
    richType: 'skills',
    richData: { groups: groupsToShow.map(g => ({ key: g, ...skills[g] })), stats: skills.stats },
    confidence: results[0]?.confidence ?? 0.8,
    contextKeywords: topKeywords,
  };
}

function generateContactAnswer({ results, raw, sources }) {
  const contact = raw.contact;
  const text = `You can reach Sai Teja through any of the channels below. He's open to collaboration, new roles, and engineering conversations.`;

  return {
    text,
    sources: ['contact'],
    richType: 'contact',
    richData: contact,
    confidence: results[0]?.confidence ?? 0.9,
    contextKeywords: ['contact', 'email', 'linkedin', 'github'],
  };
}

function generateAboutAnswer({ results, raw, sources }) {
  const about = raw.about;
  const topKeywords = extractTopKeywords(results);

  const text = `I'm **Sai Teja** — a backend-focused engineer with **3+ years** building distributed systems and enterprise-grade platforms.

Currently at **Dhan AI**, I've shipped across customer portals, internal operations tooling, and a large-scale multi-tenant CXP platform. I'm drawn to hard problems — event-driven architectures, microservice coordination, and systems that need to be resilient at scale.

Outside of work, I'm deep into **Generative AI** and **AI Agents**, tracking open source, and solving problems on LeetCode.`;

  return {
    text,
    sources: ['about'],
    richType: null,
    richData: null,
    confidence: results[0]?.confidence ?? 0.9,
    contextKeywords: topKeywords,
  };
}

function generateEducationAnswer({ results, raw, sources }) {
  const edu = raw.education[0];
  const text = `Sai Teja holds a **${edu.degree}** in **${edu.field}** from **${edu.institution}** (${edu.period}). He complemented his formal education with intensive DSA training at Smart Interviews (Oct 2021 – Jul 2022).`;

  return {
    text,
    sources: ['education'],
    richType: null,
    richData: null,
    confidence: results[0]?.confidence ?? 0.75,
    contextKeywords: ['education', 'degree', 'college'],
  };
}

function generateGeneralAnswer({ results, raw, sources, resolvedQuery }) {
  // Best-effort general answer from top results
  const topDoc = results[0]?.document;
  if (!topDoc) {
    return { text: FALLBACK_MESSAGE, sources: [], richType: null, richData: null, confidence: 0 };
  }

  const topKeywords = extractTopKeywords(results);

  // Delegate to specific generator based on best result type
  switch (topDoc.type) {
    case 'project':     return generateProjectsAnswer({ results, raw, sources, resolvedQuery });
    case 'experience':  return generateExperienceAnswer({ results, raw, sources, resolvedQuery });
    case 'skills':      return generateSkillsAnswer({ results, raw, sources, resolvedQuery });
    case 'contact':     return generateContactAnswer({ results, raw, sources, resolvedQuery });
    case 'about':       return generateAboutAnswer({ results, raw, sources, resolvedQuery });
    case 'education':   return generateEducationAnswer({ results, raw, sources, resolvedQuery });
    default: {
      // Generic text answer
      const text = topDoc.content.slice(0, 300) + (topDoc.content.length > 300 ? '...' : '');
      return {
        text,
        sources,
        richType: null,
        richData: null,
        confidence: results[0].confidence,
        contextKeywords: topKeywords,
      };
    }
  }
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

/**
 * Extract the most common meaningful keywords from search result titles.
 * Used for follow-up context injection.
 * @param {Array} results
 * @returns {string[]}
 */
function extractTopKeywords(results) {
  const words = results
    .flatMap(r => r.document.keywords?.split(' ') ?? [])
    .filter(w => w.length > 2);
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w);
}
