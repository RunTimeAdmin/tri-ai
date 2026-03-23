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
let serverKeys = {}; // Which providers have server-side API keys
let lastDebateTopic = ''; // For Share Card
let stakingEnforce = false; // Server STAKING_ENFORCE — wallet required for debates

const agentPhaseContent = {
  cipher: {},
  nova: {},
  prism: {}
};

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
  const hasServerKey = serverKeys[provider];
  const apiKeyInput = $('apiKeyInput');
  const apiKeyGroup = apiKeyInput?.closest('.input-group');

  // Update model dropdown
  modelSelect.innerHTML = '';
  config.models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name;
    modelSelect.appendChild(opt);
  });

  // API key: optional when server has key, always allow user override
  if (apiKeyInput) {
    apiKeyInput.placeholder = hasServerKey ? 'Optional: your key (uses server key if empty)' : config.placeholder;
    apiKeyInput.required = !hasServerKey;
    if (apiKeyGroup) {
      apiKeyGroup.classList.toggle('server-key-mode', hasServerKey);
      apiKeyGroup.title = hasServerKey ? 'Enter your own key to use your API quota, or leave empty to use server key' : '';
    }
  }

  // Update hint based on provider
  $('providerHint').innerHTML = hasServerKey
    ? `✓ <strong>Server key active</strong> for ${config.label} — No API key needed. Optional: enter your own to use your quota.`
    : config.hint;

  // Restore saved model for this provider
  const savedModel = localStorage.getItem(`dissensus_model_${provider}`);
  if (savedModel) modelSelect.value = savedModel;

  // Restore saved API key
  const savedKey = localStorage.getItem(`dissensus_apikey_${provider}`) || '';
  if ($('apiKeyInput')) $('apiKeyInput').value = savedKey;

  localStorage.setItem('dissensus_provider', provider);
}

// --- Simple Markdown Renderer ---
function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
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

// --- Start Debate ---
async function startDebate() {
  try {
  const providerSelect = $('providerSelect');
  const modelSelect = $('modelSelect');
  const provider = providerSelect ? providerSelect.value : 'deepseek';
  const model = modelSelect ? modelSelect.value : 'deepseek-chat';
  const apiKeyInput = $('apiKeyInput');
  const apiKey = (apiKeyInput && apiKeyInput.value || '').trim();
  const topicInput = $('topicInput');
  const topic = (topicInput && topicInput.value || '').trim();
  const hasServerKey = serverKeys[provider];

  if (!hasServerKey && !apiKey) {
    const config = PROVIDER_CONFIG[provider];
    alert(`Please enter your ${config.label.replace(/[🔥⚡🧠] /g, '')} API key.`);
    if (apiKeyInput) apiKeyInput.focus();
    return;
  }

  if (stakingEnforce) {
    const w = getStakingWallet();
    if (!w || w.length < 32) {
      alert('This server requires a wallet for debates. Open Simulated staking, paste your pubkey, and click Save.');
      $('stakingPanel')?.setAttribute('open', '');
      $('stakingWalletInput')?.focus();
      return;
    }
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

  // Save settings per provider (don't save API key if using server key)
  if (!hasServerKey) localStorage.setItem(`dissensus_apikey_${provider}`, apiKey);
  localStorage.setItem(`dissensus_model_${provider}`, model);
  localStorage.setItem('dissensus_provider', provider);

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

  setHeaderStatus(true, `Debating via ${PROVIDER_CONFIG[provider].label.replace(/[🔥⚡🧠] /g, '')}...`);

  // Preflight validation (EventSource can't show 400 error messages)
  try {
    const wallet = getStakingWallet();
    const validateBody = { topic, apiKey, provider, model };
    if (wallet.length >= 32) validateBody.wallet = wallet;

    const validateRes = await fetch('/api/debate/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  const params = new URLSearchParams({ topic, provider, model });
  if (apiKey) params.set('apiKey', apiKey);
  const w = getStakingWallet();
  if (w.length >= 32) params.set('wallet', w);
  const streamUrl = `/api/debate/stream?${params.toString()}`;

  const rawText = { cipher: {}, nova: {}, prism: {} };

  try {
    const res = await fetch(streamUrl);
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
          try {
            const parsed = JSON.parse(data);
            handleDebateEvent(parsed, rawText);
          } catch (e) { /* ignore */ }
        }
      }
    }
    debateComplete();
  } catch (e) {
    debateError(e.message || 'Connection failed. Check your API key, or wait a minute if you hit the rate limit (10 debates/min).');
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
      break;
    }

    case 'agent-done': {
      const { agent, phase } = data;
      setAgentSpeaking(agent, false);
      const textEl = getPhaseBlock(agent, phase);
      if (textEl) textEl.classList.remove('cursor-blink');
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
  refreshStakingStatus();
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
    if (col) col.classList.remove('speaking');
  });

  $('verdictPanel').classList.remove('visible');
  $('verdictContent').innerHTML = '';
  currentPhase = 0;
}

// --- Helpers ---
function setTopic(text) {
  const el = $('topicInput');
  if (el) { el.value = text; el.focus(); }
}

// --- Simulated staking ---
function getStakingWallet() {
  const inp = $('stakingWalletInput');
  const v = (inp && inp.value || localStorage.getItem('dissensus_wallet') || '').trim();
  return v;
}

function saveStakingWallet() {
  const inp = $('stakingWalletInput');
  const v = (inp && inp.value || '').trim();
  if (v.length >= 32 && v.length <= 48) {
    localStorage.setItem('dissensus_wallet', v);
    refreshStakingStatus();
  } else {
    alert('Paste a valid Solana wallet address (32–48 characters).');
  }
}

async function refreshStakingStatus() {
  const statusEl = $('stakingStatusText');
  const badge = $('stakingTierBadge');
  const w = getStakingWallet();
  if (!w || w.length < 32) {
    if (badge) badge.textContent = '—';
    if (statusEl) statusEl.textContent = 'Enter wallet and click Refresh.';
    return;
  }
  try {
    const res = await fetch(`/api/staking/status?wallet=${encodeURIComponent(w)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.status);
    if (badge) badge.textContent = data.tier || 'FREE';
    const rem = data.debatesRemaining;
    const remStr = rem === 'unlimited' ? 'unlimited' : rem;
    if (statusEl) {
      statusEl.innerHTML = `Tier <strong>${data.tier}</strong> · Staked (sim): <strong>${(data.staked || 0).toLocaleString()}</strong> $DISS<br>Debates today: ${data.debatesUsedToday || 0} · Remaining: <strong>${remStr}</strong>`;
    }
  } catch (e) {
    if (statusEl) statusEl.textContent = 'Could not load status: ' + (e.message || 'error');
    if (badge) badge.textContent = '?';
  }
}

async function doSimulateStake() {
  const w = getStakingWallet();
  if (!w || w.length < 32) {
    alert('Save a wallet address first.');
    return;
  }
  const amt = $('stakingAmountInput') && $('stakingAmountInput').value;
  const n = amt === '' || amt == null ? 0 : Number(amt);
  try {
    const res = await fetch('/api/staking/stake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: w, amount: n })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Stake failed');
    await refreshStakingStatus();
  } catch (e) {
    alert(e.message || 'Stake failed');
  }
}

async function doSimulateUnstake() {
  const w = getStakingWallet();
  if (!w || w.length < 32) return;
  try {
    const res = await fetch('/api/staking/unstake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: w })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unstake failed');
    await refreshStakingStatus();
  } catch (e) {
    alert(e.message || 'Unstake failed');
  }
}

async function loadStakingTiers() {
  const ul = $('stakingTiersList');
  if (!ul) return;
  try {
    const res = await fetch('/api/staking/tiers');
    const data = await res.json();
    ul.innerHTML = (data.tiers || []).map(t =>
      `<li><strong>${t.name}</strong> — min ${Number(t.minStake).toLocaleString()} $DISS · ${t.debatesPerDay} debates/day · ${(t.features || []).join(', ')}</li>`
    ).join('');
  } catch (e) {
    ul.innerHTML = '<li>Could not load tiers.</li>';
  }
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

// --- On Load ---
document.addEventListener('DOMContentLoaded', async () => {
  // Fetch server config (which providers have server-side keys)
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const cfg = await res.json();
      serverKeys = cfg.serverKeys || {};
      stakingEnforce = !!cfg.stakingEnforce;
      const enforceMsg = $('stakingEnforceMsg');
      if (enforceMsg) enforceMsg.classList.toggle('hidden', !stakingEnforce);
    }
  } catch (e) {
    console.warn('Could not fetch /api/config:', e);
  }

  const savedWallet = localStorage.getItem('dissensus_wallet') || '';
  if ($('stakingWalletInput') && savedWallet) $('stakingWalletInput').value = savedWallet;
  loadStakingTiers();
  refreshStakingStatus();

  // Restore saved provider
  const savedProvider = localStorage.getItem('dissensus_provider') || 'deepseek';
  $('providerSelect').value = savedProvider;
  updateModels();

  // Enter key to start
  $('topicInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !isDebating) startDebate();
  });

  // Debate of the Day
  loadDebateOfTheDay();
});