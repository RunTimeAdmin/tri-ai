// ============================================================
// DISSENSUS AI — Frontend Debate Controller
// ============================================================
// Handles SSE streaming, real-time UI updates, provider
// selection, and the debate display logic for all 4 phases.
// ============================================================

// --- State ---
let isDebating = false;
let currentPhase = 0;
let eventSource = null;
let availableProviders = []; // Providers with server keys configured
let lastDebateTopic = ''; // For Share Card

const agentPhaseContent = {
  cipher: {},
  nova: {},
  prism: {}
};

const agentContentLength = { cipher: 0, nova: 0, prism: 0 };

// --- Provider/Model Configuration ---
const PROVIDER_CONFIG = {
  deepseek: {
    label: '🔥 DeepSeek',
    placeholder: 'sk-...',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3.2 (~$0.008/debate)' }
    ],
    hint: '💡 <strong>DeepSeek V3.2</strong> — Best value. ~$0.008 per debate. Get API key at <a href="https://platform.deepseek.com/api_keys" target="_blank">platform.deepseek.com</a>'
  },
  gemini: {
    label: '⚡ Google Gemini',
    placeholder: 'AIza...',
    keyUrl: 'https://aistudio.google.com/apikey',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (~$0.03/debate)' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (~$0.006/debate)' },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite (~$0.006/debate)' }
    ],
    hint: '💡 <strong>Google Gemini</strong> — Has a FREE tier! Get API key at <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com</a>'
  },
  openai: {
    label: '🧠 OpenAI',
    placeholder: 'sk-...',
    keyUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o (~$0.15/debate)' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (~$0.01/debate)' }
    ],
    hint: '💡 <strong>OpenAI</strong> — Premium quality. Get API key at <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a>'
  }
};

// --- DOM References ---
const $ = (id) => document.getElementById(id);

// --- Provider/Model Switching ---
function updateModels() {
  const provider = $('providerSelect').value;
  const config = PROVIDER_CONFIG[provider];
  const modelSelect = $('modelSelect');
  const hasServerKey = availableProviders.includes(provider);

  // Update model dropdown
  modelSelect.innerHTML = '';
  config.models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name;
    modelSelect.appendChild(opt);
  });

  // Update hint based on provider
  $('providerHint').innerHTML = hasServerKey
    ? `✓ <strong>Server key active</strong> for ${config.label} — Ready to debate.`
    : `<span style="color: #ff6b6b;">⚠ ${config.label} is not configured. Contact the administrator.</span>`;

  // Restore saved model for this provider
  const savedModel = localStorage.getItem(`dissensus_model_${provider}`);
  if (savedModel) modelSelect.value = savedModel;

  localStorage.setItem('dissensus_provider', provider);
}

// --- Mix Mode ---
function toggleMixMode() {
  const mixMode = document.getElementById('mixModels').checked;
  document.querySelectorAll('.agent-model-select').forEach(el => {
    el.style.display = mixMode ? 'flex' : 'none';
  });
  // Hide global provider/model when mix mode is on
  const globalControls = document.querySelector('.provider-row');
  if (globalControls) globalControls.style.display = mixMode ? 'none' : '';
}

function updateAgentModels(agentId) {
  const providerSelect = document.querySelector(`.agent-provider-select[data-agent="${agentId}"]`);
  const modelSelect = document.querySelector(`.agent-model-dropdown[data-agent="${agentId}"]`);
  const provider = providerSelect.value;
  const config = PROVIDER_CONFIG[provider];

  modelSelect.innerHTML = '';
  if (config && config.models) {
    config.models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      modelSelect.appendChild(opt);
    });
  }
}

// --- Simple Markdown Renderer (with HTML escaping for XSS prevention) ---
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderMarkdown(text) {
  if (!text) return '';
  // Escape HTML first to prevent XSS from LLM output
  let html = escapeHtml(text)
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');
  return `<p>${html}</p>`;
}

// --- Phase Labels ---
const PHASE_LABELS = {
  1: 'Phase 1 — Analysis',
  2: 'Phase 2 — Opening Arguments',
  3: 'Phase 3 — Cross-Examination',
  4: 'Phase 4 — Final Verdict'
};

// --- Get or Create Phase Block in Agent Column ---
function getPhaseBlock(agentId, phase) {
  const key = `phase-${phase}`;
  if (!agentPhaseContent[agentId][key]) {
    const contentEl = $(`content-${agentId}`);
    const block = document.createElement('div');
    block.className = 'phase-block';
    block.id = `${agentId}-${key}`;

    const label = document.createElement('div');
    label.className = 'phase-label';
    label.textContent = PHASE_LABELS[phase] || `Phase ${phase}`;
    block.appendChild(label);

    const textEl = document.createElement('div');
    textEl.className = 'phase-text';
    block.appendChild(textEl);

    contentEl.appendChild(block);
    agentPhaseContent[agentId][key] = textEl;
  }
  return agentPhaseContent[agentId][key];
}

// --- Update Phase Progress UI ---
function setPhase(phase, state) {
  const el = $(`phase${phase}`);
  if (!el) return;
  el.classList.remove('active', 'done');
  if (state === 'active') el.classList.add('active');
  if (state === 'done') el.classList.add('done');
}

// --- Set Agent Speaking State ---
function setAgentSpeaking(agentId, speaking) {
  const col = $(`col-${agentId}`);
  const status = $(`status-${agentId}`);
  if (!col || !status) return;

  if (speaking) {
    col.classList.add('speaking');
    status.className = 'agent-status speaking-status';
    status.innerHTML = `<span>Speaking</span> <span class="typing-indicator"><span></span><span></span><span></span></span>`;
  } else {
    col.classList.remove('speaking');
    status.className = 'agent-status';
    status.innerHTML = `<span>Done</span>`;
  }
}

function setAgentWaiting(agentId) {
  const status = $(`status-${agentId}`);
  if (!status) return;
  status.className = 'agent-status';
  status.innerHTML = `<span>Waiting</span>`;
}

function setHeaderStatus(active, text) {
  const dot = $('statusDot');
  const txt = $('statusText');
  dot.className = active ? 'status-dot active' : 'status-dot';
  txt.textContent = text || 'Ready';
}

function scrollToBottom(agentId) {
  const el = $(`content-${agentId}`);
  if (el) el.scrollTop = el.scrollHeight;
}

function updateConviction(agentId, chunkLength) {
  agentContentLength[agentId] = (agentContentLength[agentId] || 0) + chunkLength;
  const maxLen = Math.max(...Object.values(agentContentLength), 1);

  for (const [id, len] of Object.entries(agentContentLength)) {
    const fill = document.getElementById(`conviction-${id}`);
    if (fill) {
      fill.style.width = `${Math.min((len / maxLen) * 100, 100)}%`;
    }
  }
}

// --- Start Debate ---
async function startDebate() {
  try {
  const mixMode = document.getElementById('mixModels').checked;
  let provider, model;

  const topicInput = $('topicInput');
  const topic = (topicInput && topicInput.value || '').trim();

  if (mixMode) {
    // Check each agent's provider has a server key
    const missing = [];
    for (const agent of ['cipher', 'nova', 'prism']) {
      const prov = document.querySelector(`.agent-provider-select[data-agent="${agent}"]`);
      if (prov && !availableProviders.includes(prov.value)) {
        missing.push(PROVIDER_CONFIG[prov.value].label.replace(/[🔥⚡🧠] /g, ''));
      }
    }
    if (missing.length > 0) {
      alert(`The following providers are not configured: ${missing.join(', ')}`);
      return;
    }
    provider = 'mixed';
    model = 'mixed';
  } else {
    const providerSelect = $('providerSelect');
    const modelSelect = $('modelSelect');
    provider = providerSelect ? providerSelect.value : 'deepseek';
    model = modelSelect ? modelSelect.value : 'deepseek-chat';
    const hasServerKey = availableProviders.includes(provider);

    if (!hasServerKey) {
      const config = PROVIDER_CONFIG[provider];
      alert(`${config.label.replace(/[🔥⚡🧠] /g, '')} is not configured on this server.`);
      return;
    }

    // Save settings per provider
    localStorage.setItem(`dissensus_model_${provider}`, model);
    localStorage.setItem('dissensus_provider', provider);
  }

  if (!topic) {
    alert('Please enter a debate topic.');
    if (topicInput) topicInput.focus();
    return;
  }
  if (topic.length > 500) {
    alert('Topic must be 500 characters or less.');
    return;
  }

  if (isDebating) return;
  isDebating = true;

  // Store topic for Share Card
  lastDebateTopic = topic;

  // Reset UI
  resetDebateUI();

  // Show debate arena
  $('phaseProgress').classList.remove('hidden');
  $('debateArena').classList.add('visible');
  $('verdictPanel').classList.remove('visible');

  // Update button
  $('startBtn').disabled = true;
  $('btnText').textContent = 'Debating...';
  $('btnSpinner').classList.remove('hidden');

  setHeaderStatus(true, mixMode ? 'Debating with mixed models...' : `Debating via ${PROVIDER_CONFIG[provider].label.replace(/[🔥⚡🧠] /g, '')}...`);

  // Preflight validation (EventSource can't show 400 error messages)
  try {
    const validateBody = mixMode ? { topic } : { topic, provider, model };
    if (mixMode) {
      for (const agent of ['cipher', 'nova', 'prism']) {
        const prov = document.querySelector(`.agent-provider-select[data-agent="${agent}"]`);
        const mod = document.querySelector(`.agent-model-dropdown[data-agent="${agent}"]`);
        if (prov && mod) {
          validateBody[`${agent}_provider`] = prov.value;
          validateBody[`${agent}_model`] = mod.value;
        }
      }
    }

    const validateRes = await fetch('/api/debate/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(validateBody)
    });
    if (!validateRes.ok) {
      const err = await validateRes.json().catch(() => ({}));
      throw new Error(err.error || `Validation failed (${validateRes.status})`);
    }
  } catch (e) {
    debateError(e.message);
    return;
  }

  // Connect to SSE stream using fetch (better error handling than EventSource)
  const params = new URLSearchParams(mixMode ? { topic } : { topic, provider, model });
  if (mixMode) {
    ['cipher', 'nova', 'prism'].forEach(agent => {
      const prov = document.querySelector(`.agent-provider-select[data-agent="${agent}"]`);
      const mod = document.querySelector(`.agent-model-dropdown[data-agent="${agent}"]`);
      if (prov && mod) {
        params.set(`${agent}_provider`, prov.value);
        params.set(`${agent}_model`, mod.value);
      }
    });
  }
  const streamUrl = `/api/debate/stream?${params.toString()}`;

  const rawText = { cipher: {}, nova: {}, prism: {} };

  // Abort controller — auto-cancel if debate takes > 10 minutes
  const controller = new AbortController();
  const debateTimeout = setTimeout(() => controller.abort(), 10 * 60 * 1000);

  try {
    const res = await fetch(streamUrl, { signal: controller.signal, headers: authHeaders() });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Server error (${res.status})`);
    }
    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';
      for (const block of lines) {
        if (block.startsWith('data: ')) {
          const data = block.replace(/^data: /, '').trim();
          if (data === '[DONE]') {
            debateComplete();
            return;
          }
          // Handle done event with debateId
          try {
            const parsedDone = JSON.parse(data);
            if (parsedDone.type === 'done' && parsedDone.debateId) {
              debateCompleteWithId(parsedDone.debateId);
              return;
            }
          } catch (e) { /* not a done event */ }
          try {
            const parsed = JSON.parse(data);
            handleDebateEvent(parsed, rawText);
          } catch (e) { /* ignore */ }
        }
      }
    }
    debateComplete();
  } catch (e) {
    const msg = e.name === 'AbortError'
      ? 'Debate timed out (10 min limit). Please try a shorter topic or different provider.'
      : (e.message || 'Connection failed. Check your API key, or wait a minute if you hit the rate limit (10 debates/min).');
    debateError(msg);
  } finally {
    clearTimeout(debateTimeout);
  }
  } catch (err) {
    console.error('startDebate error:', err);
    alert('Error: ' + (err.message || 'Something went wrong. Open DevTools (F12) → Console for details.'));
    isDebating = false;
    if ($('startBtn')) $('startBtn').disabled = false;
    if ($('btnText')) $('btnText').textContent = '⚡ Start Debate';
    if ($('btnSpinner')) $('btnSpinner').classList.add('hidden');
  }
}

// --- Handle Individual Debate Events ---
function handleDebateEvent(data, rawText) {
  switch (data.type) {
    case 'phase-start': {
      const phase = data.phase;
      currentPhase = phase;
      for (let i = 1; i < phase; i++) setPhase(i, 'done');
      setPhase(phase, 'active');
      ['cipher', 'nova', 'prism'].forEach(a => setAgentWaiting(a));
      break;
    }

    case 'phase-done': {
      setPhase(data.phase, 'done');
      ['cipher', 'nova', 'prism'].forEach(a => {
        const col = $(`col-${a}`);
        if (col) col.classList.remove('speaking');
      });
      break;
    }

    case 'agent-start': {
      const { agent, phase } = data;
      setAgentSpeaking(agent, true);
      if (!rawText[agent]) rawText[agent] = {};
      rawText[agent][`phase-${phase}`] = '';
      getPhaseBlock(agent, phase);

      const phaseStatusText = {
        1: 'Analyzing...',
        2: 'Arguing...',
        3: 'Cross-examining...',
        4: 'Delivering verdict...'
      };
      const statusEl = document.getElementById(`status-${data.agent}`);
      if (statusEl) {
        const statusText = phaseStatusText[currentPhase] || 'Speaking...';
        statusEl.innerHTML = `<span>${statusText}</span> <span class="typing-indicator"><span></span><span></span><span></span></span>`;
        statusEl.className = 'agent-status speaking-status ' + ['', 'analyzing', 'arguing', 'cross-examining', 'delivering-verdict'][currentPhase];
      }

      if (currentPhase === 3) {
        const col = document.getElementById(`col-${data.agent}`);
        if (col) col.classList.add('challenging');

        const clashTargets = {
          cipher: ['nova'],
          nova: ['cipher'],
          prism: ['cipher', 'nova']
        };
        const targets = clashTargets[data.agent] || [];
        targets.forEach(target => {
          const targetCol = document.getElementById(`col-${target}`);
          if (targetCol) {
            targetCol.classList.add('clashing');
            setTimeout(() => targetCol.classList.remove('clashing'), 400);
          }
        });

        const vs = document.getElementById('vsIndicator');
        if (vs) vs.classList.add('active');
      }
      break;
    }

    case 'agent-chunk': {
      const { agent, phase, chunk } = data;
      if (!rawText[agent]) rawText[agent] = {};
      const key = `phase-${phase}`;
      if (rawText[agent][key] === undefined) rawText[agent][key] = '';
      rawText[agent][key] += chunk;

      const textEl = getPhaseBlock(agent, phase);
      textEl.innerHTML = renderMarkdown(rawText[agent][key]);
      textEl.classList.add('cursor-blink');
      scrollToBottom(agent);

      updateConviction(agent, chunk.length);
      break;
    }

    case 'agent-done': {
      const { agent, phase } = data;
      setAgentSpeaking(agent, false);
      const textEl = getPhaseBlock(agent, phase);
      if (textEl) textEl.classList.remove('cursor-blink');

      if (currentPhase === 3) {
        const col = document.getElementById(`col-${data.agent}`);
        if (col) col.classList.remove('challenging');
        const vs = document.getElementById('vsIndicator');
        if (vs) vs.classList.remove('active');
      }
      break;
    }

    case 'debate-done': {
      const verdictEl = $('verdictContent');
      const verdictRaw = rawText.prism?.['phase-4'] || '';
      verdictEl.innerHTML = renderMarkdown(verdictRaw);
      $('verdictPanel').classList.add('visible');

      setTimeout(() => {
        $('verdictPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      break;
    }

    case 'error': {
      debateError(data.message || 'An error occurred during the debate.');
      break;
    }
  }
}

function debateComplete() {
  isDebating = false;
  $('startBtn').disabled = false;
  $('btnText').textContent = '⚡ New Debate';
  $('btnSpinner').classList.add('hidden');
  setHeaderStatus(false, 'Debate complete');
  for (let i = 1; i <= 4; i++) setPhase(i, 'done');
}

function debateCompleteWithId(debateId) {
  debateComplete();
  // Update URL with debate ID for sharing
  if (debateId) {
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('debate', debateId);
    window.history.pushState({}, '', newUrl);
    // Show share button
    showShareButton();
  }
}

function showShareButton() {
  const shareBtn = $('shareDebate');
  if (shareBtn) {
    shareBtn.style.display = 'inline-flex';
    shareBtn.onclick = () => {
      navigator.clipboard.writeText(window.location.href);
      shareBtn.textContent = 'Link Copied!';
      setTimeout(() => { shareBtn.textContent = 'Share Debate'; }, 2000);
    };
  }
}

async function loadSavedDebate(debateId) {
  try {
    const res = await fetch(`/api/debate/${encodeURIComponent(debateId)}`);
    if (!res.ok) throw new Error('Debate not found');
    const debate = await res.json();
    
    // Reset UI first
    resetDebateUI();
    
    // Show debate arena
    $('phaseProgress').classList.remove('hidden');
    $('debateArena').classList.add('visible');
    $('verdictPanel').classList.remove('visible');
    
    // Set the topic display
    const topicDisplay = $('debateTopic');
    if (topicDisplay) topicDisplay.textContent = debate.topic;
    
    // Also set the input value
    const topicInput = $('topicInput');
    if (topicInput) topicInput.value = debate.topic;
    
    // Store topic for Share Card
    lastDebateTopic = debate.topic;
    
    // Replay each event to populate the UI
    const rawText = { cipher: {}, nova: {}, prism: {} };
    debate.phases.forEach(event => {
      handleDebateEvent(event, rawText);
    });
    
    // Mark all phases as done
    for (let i = 1; i <= 4; i++) setPhase(i, 'done');
    
    // Show verdict panel if we have phase 4 content
    const hasVerdict = debate.phases.some(e => e.type === 'debate-done');
    if (hasVerdict) {
      $('verdictPanel').classList.add('visible');
    }
    
    // Show share button
    showShareButton();
    
    setHeaderStatus(false, 'Loaded saved debate');
  } catch (err) {
    console.error('Failed to load saved debate:', err);
    alert('Failed to load saved debate: ' + err.message);
  }
}

function debateError(message) {
  isDebating = false;
  $('startBtn').disabled = false;
  $('btnText').textContent = '⚡ Retry Debate';
  $('btnSpinner').classList.add('hidden');
  setHeaderStatus(false, 'Error');
  alert(`Debate Error: ${message}`);
}

function resetDebateUI() {
  for (let i = 1; i <= 4; i++) {
    const el = $(`phase${i}`);
    if (el) el.classList.remove('active', 'done');
  }

  ['cipher', 'nova', 'prism'].forEach(agent => {
    const content = $(`content-${agent}`);
    if (content) content.innerHTML = '';
    agentPhaseContent[agent] = {};
    setAgentWaiting(agent);
    const col = $(`col-${agent}`);
    if (col) col.classList.remove('speaking', 'challenging', 'clashing');
    agentContentLength[agent] = 0;
    const fill = document.getElementById(`conviction-${agent}`);
    if (fill) fill.style.width = '0%';
  });

  const vs = document.getElementById('vsIndicator');
  if (vs) vs.classList.remove('active');

  $('verdictPanel').classList.remove('visible');
  $('verdictContent').innerHTML = '';
  currentPhase = 0;
}

// --- Helpers ---
function setTopic(text) {
  const el = $('topicInput');
  if (el) { el.value = text; el.focus(); }
}

// Debate of the Day
let debateOfTheDayTopic = '';

async function loadDebateOfTheDay() {
  const topicEl = $('dotdTopic');
  const btnEl = $('dotdBtn');
  if (!topicEl || !btnEl) return;
  try {
    const res = await fetch('/api/debate-of-the-day');
    const data = await res.json();
    debateOfTheDayTopic = data.topic || '';
    topicEl.textContent = debateOfTheDayTopic || 'Is Bitcoin a good store of value?';
    btnEl.disabled = !debateOfTheDayTopic;
  } catch (e) {
    topicEl.textContent = 'Is Bitcoin a good store of value?';
    debateOfTheDayTopic = topicEl.textContent;
    btnEl.disabled = false;
  }
}

function useDebateOfTheDay() {
  if (debateOfTheDayTopic) {
    setTopic(debateOfTheDayTopic);
    startDebate();
  }
}

function copyVerdict() {
  const el = $('verdictContent');
  const btn = $('copyVerdictBtn');
  if (!el || !el.textContent.trim()) return;
  navigator.clipboard.writeText(el.innerText).then(() => {
    if (btn) { btn.textContent = '✓ Copied!'; setTimeout(() => btn.textContent = '📋 Copy', 2000); }
  });
}

async function shareCard() {
  const verdictEl = $('verdictContent');
  const btn = $('shareCardBtn');
  if (!verdictEl || !verdictEl.textContent.trim()) return;
  if (!lastDebateTopic) {
    alert('No debate topic stored. Run a new debate first.');
    return;
  }
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Generating...'; }
  try {
    const res = await fetch('/api/card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: lastDebateTopic,
        verdict: verdictEl.innerText
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Card failed (${res.status})`);
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dissensus-debate-card.png';
    a.click();
    URL.revokeObjectURL(a.href);
    if (btn) { btn.textContent = '✓ Downloaded!'; setTimeout(() => { btn.textContent = '🖼️ Share Card'; btn.disabled = false; }, 2000); }
  } catch (e) {
    alert('Failed to generate card: ' + (e.message || 'Unknown error'));
    if (btn) { btn.textContent = '🖼️ Share Card'; btn.disabled = false; }
  }
}

function exportJSON() {
    const params = new URLSearchParams(window.location.search);
    const debateId = params.get('debate');
    if (!debateId) return alert('No debate to export. Complete a debate first.');
    window.open(`/api/debate/${debateId}/export/json`, '_blank');
}

function exportPDF() {
    const params = new URLSearchParams(window.location.search);
    const debateId = params.get('debate');
    if (!debateId) return alert('No debate to export. Complete a debate first.');
    window.open(`/api/debate/${debateId}/export/pdf`, '_blank');
}

// --- On Load ---
document.addEventListener('DOMContentLoaded', async () => {
  // Fetch server config (which providers have server-side keys)
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const cfg = await res.json();
      availableProviders = cfg.availableProviders || [];
    }
  } catch (e) {
    console.warn('Could not fetch /api/config:', e);
  }

  // Restore saved provider
  const savedProvider = localStorage.getItem('dissensus_provider') || 'deepseek';
  $('providerSelect').value = savedProvider;
  updateModels();

  // Initialize per-agent model dropdowns
  ['cipher', 'nova', 'prism'].forEach(agent => updateAgentModels(agent));

  // Filter per-agent provider options based on available providers
  document.querySelectorAll('.agent-provider-select option').forEach(opt => {
    if (!availableProviders.includes(opt.value)) {
      opt.disabled = true;
      opt.style.display = 'none';
    }
  });

  // Enter key to start
  $('topicInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !isDebating) startDebate();
  });

  // Debate of the Day
  loadDebateOfTheDay();

  // Check for saved debate permalink
  const params = new URLSearchParams(window.location.search);
  const debateId = params.get('debate');
  if (debateId) loadSavedDebate(debateId);
});