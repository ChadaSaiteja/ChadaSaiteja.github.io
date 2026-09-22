/**
 * chat.js - Chat Controller
 * Manages conversation history, message rendering, typewriter streaming,
 * typing indicator, and all chat interaction lifecycle events.
 */

import { generateAnswer } from './assistant.js';
import {
  renderMarkdown,
  renderProjectCards,
  renderSkillBadges,
  renderExperienceCards,
  renderContactButtons,
  renderSources,
  renderSuggestions,
  getTimestamp,
} from './ui.js';

// ----------------------------------------------------------
// State
// ----------------------------------------------------------

/** Conversation history (session only, no persistence) */
const _history = [];

/** Whether the assistant is currently processing */
let _busy = false;

/** Recent questions store (for quick-access display) */
const _recentQuestions = [];
const MAX_RECENT = 5;

// DOM refs (set during init)
let _messagesEl   = null;
let _inputEl      = null;
let _formEl       = null;
let _clearBtn     = null;

// ----------------------------------------------------------
// Public API
// ----------------------------------------------------------

/**
 * Initialize the chat controller. Must be called once after DOM is ready.
 */
export function initChat() {
  _messagesEl = document.getElementById('tj-assistant-messages');
  _inputEl    = document.getElementById('tj-assistant-input');
  _formEl     = document.getElementById('tj-assistant-form');
  _clearBtn   = document.getElementById('tj-assistant-clear');

  if (!_messagesEl || !_inputEl || !_formEl) {
    console.error('TJ Assistant: Required DOM elements not found.');
    return;
  }

  // Form submit
  _formEl.addEventListener('submit', e => {
    e.preventDefault();
    const text = _inputEl.value.trim();
    if (text && !_busy) handleUserMessage(text);
  });

  // Shift+Enter for newline; Enter to send (textarea only; input ignores shift)
  _inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = _inputEl.value.trim();
      if (text && !_busy) handleUserMessage(text);
    }
  });

  // Clear chat
  _clearBtn?.addEventListener('click', clearChat);

  // Show welcome message
  _showWelcome();
}

/**
 * Handle a user's message - can also be called programmatically
 * (e.g., when a suggestion chip is clicked).
 * @param {string} text
 */
export function sendMessage(text) {
  if (!text.trim() || _busy) return;
  handleUserMessage(text.trim());
}

// ----------------------------------------------------------
// Core Chat Flow
// ----------------------------------------------------------

async function handleUserMessage(text) {
  _busy = true;
  _inputEl.value = '';
  _inputEl.disabled = true;

  // Track recent questions
  if (!_recentQuestions.includes(text)) {
    _recentQuestions.unshift(text);
    if (_recentQuestions.length > MAX_RECENT) _recentQuestions.pop();
  }

  // Render user bubble
  appendUserMessage(text);

  // Show typing indicator
  const typingEl = appendTypingIndicator();

  // Small delay for realism
  await delay(600 + Math.random() * 400);

  // Generate answer
  const response = generateAnswer(text, _history);

  // Store in history
  _history.push({ role: 'user', content: text });
  _history.push({
    role: 'assistant',
    content: response.text,
    contextKeywords: response.contextKeywords ?? [],
  });

  // Remove typing indicator
  typingEl.remove();

  // Render assistant response
  await appendAssistantMessage(response);

  _busy = false;
  _inputEl.disabled = false;
  _inputEl.focus();
}

// ----------------------------------------------------------
// Message Rendering
// ----------------------------------------------------------

function appendUserMessage(text) {
  const msg = document.createElement('div');
  msg.className = 'tja-message tja-user';
  msg.innerHTML = `
    <div class="tja-bubble tja-bubble-user">${escapeHtml(text)}</div>
    <div class="tja-timestamp">${getTimestamp()}</div>
  `;
  _messagesEl.appendChild(msg);
  scrollToBottom();
}

function appendTypingIndicator() {
  const el = document.createElement('div');
  el.className = 'tja-message tja-bot';
  el.innerHTML = `
    <div class="tja-avatar">TJ</div>
    <div class="tja-typing-indicator">
      <span></span><span></span><span></span>
      <span class="tja-thinking-text">TJ is thinking...</span>
    </div>
  `;
  _messagesEl.appendChild(el);
  scrollToBottom();
  return el;
}

async function appendAssistantMessage(response) {
  const msg = document.createElement('div');
  msg.className = 'tja-message tja-bot';

  const avatar = document.createElement('div');
  avatar.className = 'tja-avatar';
  avatar.textContent = 'TJ';

  const body = document.createElement('div');
  body.className = 'tja-bot-body';

  const bubble = document.createElement('div');
  bubble.className = 'tja-bubble tja-bubble-bot';

  const timestamp = document.createElement('div');
  timestamp.className = 'tja-timestamp';
  timestamp.textContent = getTimestamp();

  msg.appendChild(avatar);
  body.appendChild(bubble);
  msg.appendChild(body);
  _messagesEl.appendChild(msg);
  scrollToBottom();

  // Typewriter streaming effect for text
  await typewriterEffect(bubble, response.text);

  // Render rich content below text
  if (response.richType && response.richData) {
    const richContainer = document.createElement('div');
    richContainer.className = 'tja-rich-content tja-rich-appear';

    let richEl = null;
    switch (response.richType) {
      case 'projects':    richEl = renderProjectCards(response.richData);       break;
      case 'skills':      richEl = renderSkillBadges(response.richData);        break;
      case 'experience':  richEl = renderExperienceCards(response.richData);    break;
      case 'contact':     richEl = renderContactButtons(response.richData);     break;
    }

    if (richEl) {
      richContainer.appendChild(richEl);
      bubble.appendChild(richContainer);
      scrollToBottom();
    }
  }

  // Render source tags
  if (response.sources?.length) {
    const sourcesEl = renderSources(response.sources);
    if (sourcesEl) {
      body.appendChild(sourcesEl);
    }
  }

  // Timestamp
  body.appendChild(timestamp);

  scrollToBottom();
}

// ----------------------------------------------------------
// Welcome Message
// ----------------------------------------------------------

function _showWelcome() {
  // Clear existing content
  _messagesEl.innerHTML = '';

  const welcome = document.createElement('div');
  welcome.className = 'tja-welcome';
  welcome.innerHTML = `
    <div class="tja-welcome-avatar">TJ</div>
    <div class="tja-welcome-greeting">Hello 👋</div>
    <div class="tja-welcome-name">I'm <strong>TJ Assistant</strong></div>
    <div class="tja-welcome-sub">Ask me anything about <em>Sai Teja</em></div>
  `;

  const suggestions = renderSuggestions(
    ['Projects', 'Experience', 'Skills', 'Contact', 'About'],
    text => sendMessage(text)
  );

  _messagesEl.appendChild(welcome);
  _messagesEl.appendChild(suggestions);
}

// ----------------------------------------------------------
// Clear Chat
// ----------------------------------------------------------

function clearChat() {
  _history.length = 0;
  _showWelcome();
}

// ----------------------------------------------------------
// Typewriter Effect
// ----------------------------------------------------------

/**
 * Stream text into an element character by character.
 * Renders markdown formatting after streaming completes.
 * @param {HTMLElement} el
 * @param {string} text
 */
async function typewriterEffect(el, text) {
  // For short text, speed up; for long text, use faster base speed
  const baseDelay = text.length > 200 ? 8 : 14;
  const chars = [...text]; // Unicode-safe split

  el.innerHTML = '';
  const textNode = document.createElement('div');
  textNode.className = 'tja-streaming-text';
  el.appendChild(textNode);

  let raw = '';
  for (let i = 0; i < chars.length; i++) {
    raw += chars[i];
    textNode.textContent = raw + '▋'; // cursor
    scrollToBottom();
    // Vary speed slightly for natural feel
    const jitter = Math.random() * 6 - 3;
    await delay(Math.max(2, baseDelay + jitter));
  }

  // Remove cursor, render full markdown
  el.innerHTML = renderMarkdown(text);
}

// ----------------------------------------------------------
// Utilities
// ----------------------------------------------------------

function scrollToBottom() {
  if (_messagesEl) {
    _messagesEl.scrollTop = _messagesEl.scrollHeight;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
