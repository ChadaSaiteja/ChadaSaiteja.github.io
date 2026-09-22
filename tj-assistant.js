/**
 * tj-assistant.js - entry point (classic script)
 * Handles fallback behavior for file:// protocol and boots ES modules for http://
 */
(function bootstrap() {
  const isFileProtocol = window.location.protocol === 'file:';

  // Wire up the open/close events immediately so the button ALWAYS works
  const trigger   = document.getElementById('tj-assistant-trigger');
  const window_   = document.getElementById('tj-assistant-window');
  const closeBtn  = document.getElementById('tj-assistant-close');
  const container = document.getElementById('tj-assistant-container');

  if (!trigger || !window_ || !closeBtn || !container) return;

  function openAssistant() {
    container.classList.add('tja-open');
    trigger.classList.add('tja-trigger-active');
    trigger.setAttribute('aria-expanded', 'true');
    setTimeout(() => {
      const input = document.getElementById('tj-assistant-input');
      if (input) input.focus();
    }, 350);
  }

  function closeAssistant() {
    container.classList.remove('tja-open');
    trigger.classList.remove('tja-trigger-active');
    trigger.setAttribute('aria-expanded', 'false');
  }

  trigger.addEventListener('click', () => {
    const isOpen = container.classList.contains('tja-open');
    if (isOpen) {
      closeAssistant();
    } else {
      openAssistant();
    }
  });

  closeBtn.addEventListener('click', closeAssistant);

  // Keyboard: Escape to close
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && container.classList.contains('tja-open')) {
      closeAssistant();
    }
  });

  // Click outside to close (on mobile)
  document.addEventListener('click', e => {
    if (
      container.classList.contains('tja-open') &&
      !container.contains(e.target)
    ) {
      closeAssistant();
    }
  });

  if (isFileProtocol) {
    // -- File Protocol Mode (CORS warning fallback) --
    const messagesEl = document.getElementById('tj-assistant-messages');
    if (messagesEl) {
      messagesEl.innerHTML = `
        <div class="tja-welcome">
          <div class="tja-welcome-avatar">TJ</div>
          <div class="tja-welcome-greeting">Hello 👋</div>
          <div class="tja-welcome-name">I'm <strong>TJ Assistant</strong></div>
        </div>
        <div class="tja-message tja-bot">
          <div class="tja-avatar">TJ</div>
          <div class="tja-bubble tja-bubble-bot">
            ⚠️ <strong>CORS Block Detected (file:// protocol)</strong><br><br>
            It looks like you opened the portfolio page directly from your local filesystem.<br><br>
            Modern browsers block local data loading (<code>knowledge.json</code>) and ES modules over the <code>file://</code> protocol for security. <br><br>
            <strong>To test the assistant, please run a local web server:</strong><br>
            1. Open terminal in this folder.<br>
            2. Run <code>npx serve</code> or <code>python -m http.server 8000</code>.<br>
            3. Open <code>http://localhost:3000</code> or <code>http://localhost:8000</code>.
          </div>
        </div>
      `;
    }
    // Disable inputs
    const inputEl = document.getElementById('tj-assistant-input');
    const formEl  = document.getElementById('tj-assistant-form');
    if (inputEl) inputEl.disabled = true;
    if (formEl) formEl.style.opacity = '0.5';
  } else {
    // -- HTTP/HTTPS Mode (Load real ES Module Assistant) --
    const moduleScript = document.createElement('script');
    moduleScript.type = 'module';
    moduleScript.textContent = `
      import { loadKnowledge } from './js/knowledge.js';
      import { initSearch }    from './js/search.js';
      import { initChat }      from './js/chat.js';

      async function startModuleAssistant() {
        try {
          const { documents } = await loadKnowledge();
          initSearch(documents);
          initChat();
          console.log('TJ Assistant module loaded successfully.');
        } catch (err) {
          console.error('TJ Assistant module initialization failed:', err);
        }
      }

      startModuleAssistant();
    `;
    document.body.appendChild(moduleScript);
  }
})();
