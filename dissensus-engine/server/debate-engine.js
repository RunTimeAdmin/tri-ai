// ============================================================
// DISSENSUS AI — Debate Engine (4-Phase Dialectical Process)
// ============================================================
// Orchestrates the structured debate between CIPHER, NOVA, and
// PRISM through four distinct phases, streaming results in
// real-time via Server-Sent Events.
//
// Supports: OpenAI, DeepSeek, Google Gemini
// ============================================================

const { AGENTS } = require('./agents');

// Provider configurations
const PROVIDERS = {
  openai: {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    models: {
      'gpt-4o': { name: 'GPT-4o', costPer1kIn: 0.0025, costPer1kOut: 0.01 },
      'gpt-4o-mini': { name: 'GPT-4o Mini', costPer1kIn: 0.00015, costPer1kOut: 0.0006 }
    },
    authHeader: (key) => `Bearer ${key}`
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    models: {
      'deepseek-chat': { name: 'DeepSeek V3.2', costPer1kIn: 0.00028, costPer1kOut: 0.00042 }
    },
    authHeader: (key) => `Bearer ${key}`
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    models: {
      'gemini-2.5-flash': { name: 'Gemini 2.5 Flash', costPer1kIn: 0.0003, costPer1kOut: 0.0025 },
      'gemini-2.0-flash': { name: 'Gemini 2.0 Flash', costPer1kIn: 0.0001, costPer1kOut: 0.0004 },
      'gemini-2.5-flash-lite': { name: 'Gemini 2.5 Flash-Lite', costPer1kIn: 0.0001, costPer1kOut: 0.0004 }
    },
    authHeader: (key) => `Bearer ${key}`
  }
};

class DebateEngine {
  constructor(apiKey, provider = 'openai', model = 'gpt-4o') {
    this.apiKey = apiKey;
    this.provider = PROVIDERS[provider];
    this.providerName = provider;
    this.model = model;

    if (!this.provider) {
      throw new Error(`Unknown provider: ${provider}. Supported: openai, deepseek, gemini`);
    }

    this.baseUrl = this.provider.baseUrl;
  }

  // ----------------------------------------------------------
  // Core AI Call — Streams response chunks via callback
  // ----------------------------------------------------------
  async callAgent(agentId, messages, onChunk) {
    const agent = AGENTS[agentId];
    if (!agent) throw new Error(`Unknown agent: ${agentId}`);

    const fullMessages = [
      { role: 'system', content: agent.systemPrompt },
      ...messages
    ];

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.provider.authHeader(this.apiKey)
      },
      body: JSON.stringify({
        model: this.model,
        messages: fullMessages,
        stream: true,
        temperature: 0.8,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`${this.providerName} API error (${response.status}): ${err}`);
    }

    let fullText = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            if (onChunk) onChunk(content);
          }
        } catch (e) {
          // Skip malformed chunks
        }
      }
    }

    return fullText;
  }

  // ----------------------------------------------------------
  // Run Full 4-Phase Debate
  // ----------------------------------------------------------
  async runDebate(topic, sendEvent) {
    const debateContext = {
      topic,
      phase1: {},
      phase2: {},
      phase3: {},
      phase4: {}
    };

    const emit = (type, data) => {
      if (sendEvent) sendEvent(type, data);
    };

    emit('debate-start', { topic, provider: this.providerName, model: this.model });

    // ========================================================
    // PHASE 1: INDEPENDENT ANALYSIS
    // ========================================================
    emit('phase-start', { phase: 1, title: 'Independent Analysis', description: 'Each agent independently analyzes the topic...' });

    const phase1Prompt = [
      {
        role: 'user',
        content: `TOPIC FOR DEBATE: "${topic}"

You are in Phase 1: Independent Analysis. Analyze this topic from your unique perspective. Provide your initial assessment in 2-3 focused paragraphs. Identify the key questions, risks, or opportunities you see. This is your private analysis before the debate begins.

Be specific and substantive. Reference real-world data, trends, or precedents where relevant.`
      }
    ];

    // Run all 3 agents in parallel for Phase 1
    const phase1Results = await Promise.all(
      ['cipher', 'nova', 'prism'].map(async (agentId) => {
        emit('agent-start', { phase: 1, agent: agentId });
        const result = await this.callAgent(agentId, phase1Prompt, (chunk) => {
          emit('agent-chunk', { phase: 1, agent: agentId, chunk });
        });
        emit('agent-done', { phase: 1, agent: agentId });
        return { agentId, result };
      })
    );

    for (const { agentId, result } of phase1Results) {
      debateContext.phase1[agentId] = result;
    }

    emit('phase-done', { phase: 1 });

    // ========================================================
    // PHASE 2: OPENING ARGUMENTS
    // ========================================================
    emit('phase-start', { phase: 2, title: 'Opening Arguments', description: 'Each agent presents their formal position...' });

    for (const agentId of ['cipher', 'nova', 'prism']) {
      emit('agent-start', { phase: 2, agent: agentId });

      const phase2Prompt = [
        {
          role: 'user',
          content: `TOPIC FOR DEBATE: "${topic}"

Your independent analysis was:
${debateContext.phase1[agentId]}

You are now in Phase 2: Opening Arguments. Present your formal position on this topic. Structure your argument clearly with:
- A strong thesis statement
- 3-5 key supporting points with evidence
- A clear conclusion

This is your opening statement to the tribunal. Make it compelling, specific, and well-structured. The other agents will challenge you in the next phase.`
        }
      ];

      const result = await this.callAgent(agentId, phase2Prompt, (chunk) => {
        emit('agent-chunk', { phase: 2, agent: agentId, chunk });
      });

      debateContext.phase2[agentId] = result;
      emit('agent-done', { phase: 2, agent: agentId });
    }

    emit('phase-done', { phase: 2 });

    // ========================================================
    // PHASE 3: CROSS-EXAMINATION
    // ========================================================
    emit('phase-start', { phase: 3, title: 'Cross-Examination', description: 'Agents challenge each other\'s arguments...' });

    // CIPHER challenges NOVA
    emit('agent-start', { phase: 3, agent: 'cipher' });
    const cipherCross = await this.callAgent('cipher', [
      {
        role: 'user',
        content: `TOPIC: "${topic}"

NOVA's Opening Argument (The Bull Case):
${debateContext.phase2.nova}

You are in Phase 3: Cross-Examination. You've heard NOVA's bull case. Now tear it apart. Challenge their strongest points with specific counterarguments. Identify logical weaknesses, missing evidence, or overly optimistic assumptions. Be direct and ruthless — but fair.

Structure: Address NOVA's top 2-3 points directly, then present your strongest rebuttal.`
      }
    ], (chunk) => {
      emit('agent-chunk', { phase: 3, agent: 'cipher', chunk });
    });
    debateContext.phase3.cipher = cipherCross;
    emit('agent-done', { phase: 3, agent: 'cipher' });

    // NOVA counters CIPHER
    emit('agent-start', { phase: 3, agent: 'nova' });
    const novaCross = await this.callAgent('nova', [
      {
        role: 'user',
        content: `TOPIC: "${topic}"

CIPHER's Opening Argument (The Bear Case):
${debateContext.phase2.cipher}

CIPHER's Cross-Examination of your bull case:
${cipherCross}

You are in Phase 3: Cross-Examination. CIPHER has attacked your position. Now defend it and counter-attack. Address their strongest criticisms head-on. Show why the risks are manageable, overstated, or already priced in. Then challenge the weakest parts of CIPHER's bear case.

Structure: Defend your top 2-3 points, then counter-attack CIPHER's weakest arguments.`
      }
    ], (chunk) => {
      emit('agent-chunk', { phase: 3, agent: 'nova', chunk });
    });
    debateContext.phase3.nova = novaCross;
    emit('agent-done', { phase: 3, agent: 'nova' });

    // PRISM challenges both
    emit('agent-start', { phase: 3, agent: 'prism' });
    const prismCross = await this.callAgent('prism', [
      {
        role: 'user',
        content: `TOPIC: "${topic}"

CIPHER's Bear Case:
${debateContext.phase2.cipher}

NOVA's Bull Case:
${debateContext.phase2.nova}

CIPHER's Cross-Examination of NOVA:
${cipherCross}

NOVA's Counter to CIPHER:
${novaCross}

You are in Phase 3: Cross-Examination. You've observed the full exchange. Now challenge BOTH sides. Identify:
1. Where each side's argument is strongest and weakest
2. Any logical fallacies or unsupported claims from either side
3. Key evidence that neither side adequately addressed
4. The questions that remain genuinely unresolved

Be the impartial referee. Push both sides to be better.`
      }
    ], (chunk) => {
      emit('agent-chunk', { phase: 3, agent: 'prism', chunk });
    });
    debateContext.phase3.prism = prismCross;
    emit('agent-done', { phase: 3, agent: 'prism' });

    emit('phase-done', { phase: 3 });

    // ========================================================
    // PHASE 4: FINAL VERDICT
    // ========================================================
    emit('phase-start', { phase: 4, title: 'Final Verdict', description: 'PRISM delivers the definitive consensus...' });

    // CIPHER final statement
    emit('agent-start', { phase: 4, agent: 'cipher' });
    const cipherFinal = await this.callAgent('cipher', [
      {
        role: 'user',
        content: `TOPIC: "${topic}"

The full debate has concluded. Here's what happened:

Your Opening Argument: ${debateContext.phase2.cipher}
NOVA's Opening Argument: ${debateContext.phase2.nova}
Your Cross-Examination: ${cipherCross}
NOVA's Counter: ${novaCross}
PRISM's Analysis: ${prismCross}

Deliver your FINAL STATEMENT in 1-2 paragraphs. Have any of your views changed based on the debate? What is your final position? Be honest — if NOVA made valid points, acknowledge them. But hold firm on your strongest convictions.`
      }
    ], (chunk) => {
      emit('agent-chunk', { phase: 4, agent: 'cipher', chunk });
    });
    debateContext.phase4.cipher = cipherFinal;
    emit('agent-done', { phase: 4, agent: 'cipher' });

    // NOVA final statement
    emit('agent-start', { phase: 4, agent: 'nova' });
    const novaFinal = await this.callAgent('nova', [
      {
        role: 'user',
        content: `TOPIC: "${topic}"

The full debate has concluded. Here's what happened:

Your Opening Argument: ${debateContext.phase2.nova}
CIPHER's Opening Argument: ${debateContext.phase2.cipher}
CIPHER's Cross-Examination: ${cipherCross}
Your Counter: ${novaCross}
PRISM's Analysis: ${prismCross}

Deliver your FINAL STATEMENT in 1-2 paragraphs. Have any of your views changed based on the debate? What is your final position? Be honest — if CIPHER made valid points, acknowledge them. But hold firm on your strongest convictions.`
      }
    ], (chunk) => {
      emit('agent-chunk', { phase: 4, agent: 'nova', chunk });
    });
    debateContext.phase4.nova = novaFinal;
    emit('agent-done', { phase: 4, agent: 'nova' });

    // PRISM delivers the FINAL VERDICT
    emit('agent-start', { phase: 4, agent: 'prism' });
    const verdict = await this.callAgent('prism', [
      {
        role: 'user',
        content: `TOPIC: "${topic}"

THE COMPLETE DEBATE RECORD:

=== PHASE 2: OPENING ARGUMENTS ===
CIPHER (Bear Case): ${debateContext.phase2.cipher}
NOVA (Bull Case): ${debateContext.phase2.nova}
Your Initial Assessment: ${debateContext.phase2.prism}

=== PHASE 3: CROSS-EXAMINATION ===
CIPHER challenges NOVA: ${cipherCross}
NOVA counters CIPHER: ${novaCross}
Your Analysis of Both: ${prismCross}

=== PHASE 4: FINAL STATEMENTS ===
CIPHER's Final Position: ${cipherFinal}
NOVA's Final Position: ${novaFinal}

You are now delivering the FINAL VERDICT. This is the definitive output of the Dissensus debate system. Synthesize everything into your verdict format:

1. Overall Assessment (1 paragraph)
2. Ranked Conclusions with confidence scores (1-10)
3. Where the Agents Agreed
4. Unresolved Tensions
5. Final Score (Bull Case Strength, Bear Case Strength, Overall Conviction)

Be definitive. Be specific. This is the moment of truth.`
      }
    ], (chunk) => {
      emit('agent-chunk', { phase: 4, agent: 'prism', chunk });
    });
    debateContext.phase4.prism = verdict;
    emit('agent-done', { phase: 4, agent: 'prism' });

    emit('phase-done', { phase: 4 });
    emit('debate-done', { topic, verdict });

    return debateContext;
  }
}

module.exports = { DebateEngine, PROVIDERS };