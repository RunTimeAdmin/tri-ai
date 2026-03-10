/* ============================================
   AI TRIAD FORUM — Engine v3
   Research-Powered AI Debate System
   Calls backend API for real web research + reasoning
   ============================================ */

// API is served from the same origin (unified server)
const API_URL = '';

// ---- Example Topics ----
const EXAMPLES = [
  "What cryptocurrency is most likely to rival or replace Bitcoin's dominance in the next decade?",
  "Is Solana a better long-term investment than Ethereum? Rank the top 5 Layer 1 blockchains.",
  "Is fully remote work sustainable long-term, or will hybrid models win? Give a specific recommendation.",
  "What are the top 3 real-world use cases for blockchain that will drive mainstream adoption?",
  "Should the world prioritize nuclear energy over solar and wind for climate change? Give a ranked energy strategy."
];

function setExample(idx) {
  document.getElementById('topicInput').value = EXAMPLES[idx];
  document.getElementById('topicInput').focus();
}

// ============================================
// UI CONTROLLER
// ============================================

let isRunning = false;

async function startDiscussion() {
  const topic = document.getElementById('topicInput').value.trim();
  if (!topic || isRunning) return;

  isRunning = true;

  const btn = document.getElementById('launchBtn');
  btn.classList.add('loading');
  btn.disabled = true;

  document.getElementById('progressBar').classList.add('visible');
  document.getElementById('discussionArea').classList.add('visible');
  document.getElementById('discussionArea').innerHTML = '';
  document.getElementById('resetBtn').classList.remove('visible');

  const area = document.getElementById('discussionArea');

  // Topic banner
  const topicBanner = document.createElement('div');
  topicBanner.className = 'consensus-section';
  topicBanner.style.marginTop = '0';
  topicBanner.innerHTML = `
    <div class="consensus-title">📋 Topic Under Discussion</div>
    <div class="consensus-body"><p><strong>${escapeHtml(topic)}</strong></p></div>
  `;
  area.appendChild(topicBanner);

  updateProgress(5, 'Researching topic...');
  setAgentStatus('cipher', 'thinking');
  setAgentStatus('nova', 'thinking');
  setAgentStatus('prism', 'thinking');

  try {
    // Call backend API
    updateProgress(10, 'Agents researching the web...');
    
    const response = await fetch(`${API_URL}/api/discuss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic })
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const discussion = await response.json();

    if (discussion.error) {
      throw new Error(discussion.error);
    }

    updateProgress(20, 'Research complete. Starting debate...');

    // Show research facts if available
    if (discussion.research_facts && discussion.research_facts.length > 0) {
      const researchBlock = document.createElement('div');
      researchBlock.className = 'consensus-section fade-in';
      researchBlock.style.marginTop = '1rem';
      researchBlock.style.borderLeftColor = '#f59e0b';
      researchBlock.innerHTML = `
        <div class="consensus-title" style="color: #f59e0b;">🔍 Research Findings</div>
        <div class="consensus-body" style="font-size: 0.85rem;">
          <p>The agents researched the web and gathered the following evidence before debating:</p>
          ${discussion.research_facts.map(f => `<p style="margin-bottom:0.4rem;">• ${escapeHtml(f).substring(0, 200)}${f.length > 200 ? '...' : ''}</p>`).join('')}
        </div>
      `;
      area.appendChild(researchBlock);
      await delay(800);
    }

    // ---- PHASE 1: Opening Statements ----
    updateProgress(25, 'Phase 1: Opening Statements');
    area.appendChild(createPhaseHeader(1, 'Opening Statements', 'Each agent presents their research-backed perspective'));

    await delay(600);
    setAgentStatus('cipher', 'active');
    setAgentStatus('nova', 'thinking');
    setAgentStatus('prism', 'thinking');
    area.appendChild(createMessage('cipher', 'CIPHER', '🔴', 'Opening Statement', discussion.openingStatements.cipher));
    updateProgress(32, 'Phase 1: CIPHER complete');

    await delay(1000);
    setAgentStatus('nova', 'active');
    setAgentStatus('prism', 'thinking');
    area.appendChild(createMessage('nova', 'NOVA', '🟢', 'Opening Statement', discussion.openingStatements.nova));
    updateProgress(40, 'Phase 1: NOVA complete');

    await delay(1000);
    setAgentStatus('prism', 'active');
    area.appendChild(createMessage('prism', 'PRISM', '🔵', 'Opening Statement', discussion.openingStatements.prism));
    updateProgress(48, 'Phase 1: Complete');
    markPhaseComplete(1);

    // ---- PHASE 2: Cross-Examination ----
    await delay(800);
    updateProgress(50, 'Phase 2: Cross-Examination');
    area.appendChild(createPhaseHeader(2, 'Cross-Examination', 'Agents challenge each other\'s evidence and reasoning'));

    await delay(600);
    setAgentStatus('cipher', 'active');
    area.appendChild(createMessage('cipher', 'CIPHER', '🔴', 'Challenges NOVA', discussion.crossExamination.cipherToNova));
    updateProgress(56, 'Phase 2: CIPHER challenges NOVA');

    await delay(1000);
    setAgentStatus('nova', 'active');
    area.appendChild(createMessage('nova', 'NOVA', '🟢', 'Challenges CIPHER', discussion.crossExamination.novaToCipher));
    updateProgress(62, 'Phase 2: NOVA challenges CIPHER');

    await delay(1000);
    setAgentStatus('prism', 'active');
    area.appendChild(createMessage('prism', 'PRISM', '🔵', 'Challenges Both', discussion.crossExamination.prismToBoth));
    updateProgress(68, 'Phase 2: Complete');
    markPhaseComplete(2);

    // ---- PHASE 3: Rebuttals ----
    await delay(800);
    updateProgress(70, 'Phase 3: Rebuttals & Position Updates');
    area.appendChild(createPhaseHeader(3, 'Rebuttals & Position Updates', 'Agents refine positions based on challenges'));

    await delay(600);
    setAgentStatus('cipher', 'active');
    area.appendChild(createMessage('cipher', 'CIPHER', '🔴', 'Updated Position', discussion.rebuttals.cipher));
    updateProgress(76, 'Phase 3: CIPHER rebuttal');

    await delay(1000);
    setAgentStatus('nova', 'active');
    area.appendChild(createMessage('nova', 'NOVA', '🟢', 'Updated Position', discussion.rebuttals.nova));
    updateProgress(82, 'Phase 3: NOVA rebuttal');

    await delay(1000);
    setAgentStatus('prism', 'active');
    area.appendChild(createMessage('prism', 'PRISM', '🔵', 'Convergence Analysis', discussion.rebuttals.prism));
    updateProgress(88, 'Phase 3: Complete');
    markPhaseComplete(3);

    // ---- PHASE 4: Synthesis ----
    await delay(800);
    updateProgress(90, 'Phase 4: Final Consensus');
    area.appendChild(createPhaseHeader(4, 'Synthesis & Ranked Consensus', 'Agents converge on specific, ranked conclusions'));

    await delay(800);
    setAgentStatus('cipher', 'thinking');
    setAgentStatus('nova', 'thinking');
    setAgentStatus('prism', 'thinking');
    await delay(1000);
    setAgentStatus('cipher', 'active');
    setAgentStatus('nova', 'active');
    setAgentStatus('prism', 'active');

    // Consensus block
    const consensusBlock = document.createElement('div');
    consensusBlock.className = 'consensus-section fade-in';
    let consensusHTML = `
      <div class="consensus-title">🤝 Synthesized Consensus</div>
      <div class="consensus-body">${discussion.synthesis.consensus}</div>
    `;

    if (discussion.synthesis.disagreements && discussion.synthesis.disagreements.length > 0) {
      consensusHTML += `
        <div class="disagreements">
          <div class="disagreements-title">⚡ Remaining Disagreements</div>
          ${discussion.synthesis.disagreements.map(d => `<div class="disagreement-item">${d}</div>`).join('')}
        </div>
      `;
    }

    consensusBlock.innerHTML = consensusHTML;
    area.appendChild(consensusBlock);

    updateProgress(100, 'Discussion Complete');
    markPhaseComplete(4);

  } catch (error) {
    console.error('Discussion error:', error);
    
    const errorBlock = document.createElement('div');
    errorBlock.className = 'consensus-section fade-in';
    errorBlock.style.borderLeftColor = '#ef4444';
    errorBlock.innerHTML = `
      <div class="consensus-title" style="color: #ef4444;">⚠️ Error</div>
      <div class="consensus-body">
        <p><strong>Failed to generate discussion:</strong> ${escapeHtml(error.message)}</p>
        <p>Make sure the backend server is running on port 5000. Run: <code>python server.py</code></p>
      </div>
    `;
    area.appendChild(errorBlock);
    updateProgress(100, 'Error occurred');
  }

  // Done
  await delay(500);
  btn.classList.remove('loading');
  btn.disabled = false;
  document.getElementById('resetBtn').classList.add('visible');
  isRunning = false;
}

// ---- UI Helpers ----

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function createPhaseHeader(num, title, desc) {
  const div = document.createElement('div');
  div.className = 'phase-header active';
  div.id = `phase-${num}`;
  div.innerHTML = `
    <div class="phase-number">${num}</div>
    <div class="phase-info">
      <h3>${title}</h3>
      <p>${desc}</p>
    </div>
  `;
  return div;
}

function markPhaseComplete(num) {
  const el = document.getElementById(`phase-${num}`);
  if (el) {
    el.classList.remove('active');
    el.classList.add('complete');
  }
}

function createMessage(agentClass, name, emoji, tag, content) {
  const div = document.createElement('div');
  div.className = `message ${agentClass} fade-in`;
  div.innerHTML = `
    <div class="message-avatar">${emoji}</div>
    <div class="message-content">
      <div class="message-header">
        <span class="message-sender">${name}</span>
        <span class="message-tag">${tag}</span>
      </div>
      <div class="message-body">${content}</div>
    </div>
  `;
  setTimeout(() => {
    div.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 100);
  return div;
}

function setAgentStatus(agent, status) {
  const el = document.getElementById(`status-${agent}`);
  if (el) {
    el.className = 'agent-status';
    if (status) el.classList.add(status);
  }
}

function updateProgress(percent, label) {
  document.getElementById('progressFill').style.width = `${percent}%`;
  document.getElementById('progressPercent').textContent = `${percent}%`;
  document.getElementById('progressPhase').textContent = label;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function resetForum() {
  isRunning = false;

  document.getElementById('discussionArea').innerHTML = '';
  document.getElementById('discussionArea').classList.remove('visible');
  document.getElementById('progressBar').classList.remove('visible');
  document.getElementById('resetBtn').classList.remove('visible');
  document.getElementById('progressFill').style.width = '0%';

  const btn = document.getElementById('launchBtn');
  btn.classList.remove('loading');
  btn.disabled = false;

  setAgentStatus('cipher', '');
  setAgentStatus('nova', '');
  setAgentStatus('prism', '');

  document.getElementById('topicInput').value = '';
  document.getElementById('topicInput').focus();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    startDiscussion();
  }
});