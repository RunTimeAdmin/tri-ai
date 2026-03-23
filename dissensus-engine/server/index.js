// ============================================================
// DISSENSUS AI — Server (Express + SSE Streaming)
// Production-ready for VPS deployment
// ============================================================

require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { DebateEngine, PROVIDERS } = require('./debate-engine');
const { generateCard, summarizeVerdictForCard } = require('./card-generator');
const { getDebateOfTheDay } = require('./debate-of-the-day');
const {
  getStakingInfo,
  simulateStake,
  simulateUnstake,
  canDebate,
  recordDebateUsage,
  getAllTiers,
  normalizeWallet
} = require('./staking');
const { recordDebate, recordError, getPublicMetrics, getRecentTopics, syncStakingFromModule } = require('./metrics');
const { fetchDissBalance, getDissMintString } = require('./solana-balance');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';
const STAKING_ENFORCE = /^1|true|yes$/i.test(String(process.env.STAKING_ENFORCE || ''));

// Reverse proxy (nginx, Cloudflare, Hostinger) sends X-Forwarded-For.
// express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR if this is off.
// Set TRUST_PROXY=0 only if Node listens directly on the public internet with no proxy.
if (!/^0|false$/i.test(String(process.env.TRUST_PROXY || '').trim())) {
  const hops = Math.min(32, Math.max(1, parseInt(process.env.TRUST_PROXY_HOPS || '1', 10) || 1));
  app.set('trust proxy', hops);
}

// Server-side API keys (set in .env for VPS - users don't need to provide)
const SERVER_KEYS = {
  openai: process.env.OPENAI_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
  gemini: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
};

// ----------------------------------------------------------
// Middleware
// ----------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: false, // Disable — blocks onclick/onchange and external scripts
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: '50kb' })); // 50kb for card payload (verdict can be long)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Rate limiting - prevent abuse
const debateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isProd ? 10 : 100, // 10 debates/min in prod, 100 in dev
  message: { error: 'Too many debates. Please wait a minute and try again.' },
  standardHeaders: true,
  legacyHeaders: false
});

// ----------------------------------------------------------
// Config - which providers have server-side keys
// ----------------------------------------------------------
app.get('/api/config', (req, res) => {
  const serverKeys = {};
  for (const [provider, key] of Object.entries(SERVER_KEYS)) {
    serverKeys[provider] = !!key;
  }
  res.json({
    serverKeys,
    maxTopicLength: 500,
    stakingEnforce: STAKING_ENFORCE,
    stakingSimulated: true,
    solana: {
      cluster: (process.env.SOLANA_CLUSTER || 'mainnet-beta').trim(),
      dissTokenMint: getDissMintString(),
      balanceCheckUrl: '/api/solana/token-balance'
    }
  });
});

// ----------------------------------------------------------
// Solana — on-chain $DISS balance (server RPC; no keys leaked to client)
// ----------------------------------------------------------
const solanaBalanceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 60 : 120,
  message: { error: 'Too many balance requests.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.get('/api/solana/token-balance', solanaBalanceLimiter, async (req, res) => {
  const wallet = req.query.wallet;
  try {
    const result = await fetchDissBalance(wallet);
    res.json({ ok: true, ...result });
  } catch (e) {
    if (e.code === 'INVALID_WALLET') {
      return res.status(400).json({ error: e.message });
    }
    console.error('Solana balance error:', e.message || e);
    recordError(e);
    res.status(500).json({ error: 'Failed to fetch token balance' });
  }
});

// Placeholder for future stake program integration
app.get('/api/solana/staking-status', (req, res) => {
  res.json({
    programId: process.env.DISS_STAKING_PROGRAM_ID || null,
    onChainStakingLive: !!process.env.DISS_STAKING_PROGRAM_ID,
    message: process.env.DISS_STAKING_PROGRAM_ID
      ? 'Staking program configured — wire instructions in a future release.'
      : 'On-chain stake/unstake: deploy program and set DISS_STAKING_PROGRAM_ID in .env.'
  });
});

// ----------------------------------------------------------
// Health Check
// ----------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'dissensus-engine',
    providers: Object.keys(PROVIDERS).join(', ')
  });
});

// ----------------------------------------------------------
// Get Available Providers & Models
// ----------------------------------------------------------
app.get('/api/providers', (req, res) => {
  const providers = {};
  for (const [key, config] of Object.entries(PROVIDERS)) {
    providers[key] = {
      hasServerKey: !!SERVER_KEYS[key],
      models: Object.entries(config.models).map(([id, info]) => ({
        id,
        name: info.name,
        costPer1kIn: info.costPer1kIn,
        costPer1kOut: info.costPer1kOut
      }))
    };
  }
  res.json(providers);
});

// ----------------------------------------------------------
// Validate model exists for provider
// ----------------------------------------------------------
function getEffectiveApiKey(provider, userApiKey) {
  const trimmed = (userApiKey || '').trim();
  if (trimmed) return trimmed; // User's own key takes precedence
  const serverKey = SERVER_KEYS[provider];
  if (serverKey) return serverKey;
  return null;
}

function validateModel(provider, model) {
  const config = PROVIDERS[provider];
  if (!config) return { valid: false, error: `Unknown provider: ${provider}` };
  if (!config.models[model]) {
    return { valid: false, error: `Invalid model "${model}" for ${provider}. Valid: ${Object.keys(config.models).join(', ')}` };
  }
  return { valid: true };
}

// ----------------------------------------------------------
// Validate debate params (preflight - EventSource can't show 400 errors)
// ----------------------------------------------------------
app.post('/api/debate/validate', async (req, res) => {
  const { topic, apiKey, provider, model, wallet } = req.body || {};
  const topicTrimmed = (topic || '').toString().trim();
  const providerName = ((provider || 'deepseek') + '').toLowerCase();
  const modelId = model || (providerName === 'deepseek' ? 'deepseek-chat' : providerName === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o');
  const walletNorm = normalizeWallet(wallet);

  if (STAKING_ENFORCE && !walletNorm) {
    return res.status(400).json({ error: 'Wallet address required (staking limits enabled). Paste your Solana wallet in Staking.' });
  }
  if (walletNorm) {
    const gate = canDebate(walletNorm);
    if (!gate.allowed) {
      return res.status(403).json({ error: gate.reason || 'Debate limit reached for today.' });
    }
  }

  if (!topicTrimmed) {
    return res.status(400).json({ error: 'Missing topic' });
  }
  if (topicTrimmed.length < 3) {
    return res.status(400).json({ error: 'Topic must be at least 3 characters' });
  }
  if (topicTrimmed.length > 500) {
    return res.status(400).json({ error: 'Topic must be 500 characters or less' });
  }

  const modelCheck = validateModel(providerName, modelId);
  if (!modelCheck.valid) {
    return res.status(400).json({ error: modelCheck.error });
  }

  const effectiveKey = getEffectiveApiKey(providerName, (apiKey || '').trim());
  if (!effectiveKey) {
    return res.status(400).json({ error: `API key required. Set ${providerName.toUpperCase()}_API_KEY in .env or enter your key.` });
  }

  res.json({ ok: true });
});

// ----------------------------------------------------------
// Start Debate — SSE Streaming Endpoint
// ----------------------------------------------------------
app.get('/api/debate/stream', debateLimiter, async (req, res) => {
  const { topic, apiKey, provider, model, wallet } = req.query;
  const walletNorm = normalizeWallet(wallet);

  if (STAKING_ENFORCE && !walletNorm) {
    res.status(400).json({ error: 'Wallet address required (staking limits enabled).' });
    return;
  }
  if (walletNorm) {
    const gate = canDebate(walletNorm);
    if (!gate.allowed) {
      res.status(403).json({ error: gate.reason || 'Debate limit reached for today.' });
      return;
    }
  }

  // Input validation
  if (!topic || typeof topic !== 'string') {
    res.status(400).json({ error: 'Missing or invalid topic' });
    return;
  }

  const topicTrimmed = topic.trim();
  if (topicTrimmed.length < 3) {
    res.status(400).json({ error: 'Topic must be at least 3 characters' });
    return;
  }
  if (topicTrimmed.length > 500) {
    res.status(400).json({ error: 'Topic must be 500 characters or less' });
    return;
  }

  const providerName = (provider || 'deepseek').toLowerCase();
  const modelId = model || (providerName === 'deepseek' ? 'deepseek-chat' : providerName === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o');

  const modelCheck = validateModel(providerName, modelId);
  if (!modelCheck.valid) {
    res.status(400).json({ error: modelCheck.error });
    return;
  }

  const effectiveKey = getEffectiveApiKey(providerName, apiKey?.trim());
  if (!effectiveKey) {
    const serverHas = SERVER_KEYS[providerName] ? 'Server has a key configured' : 'Server has no key';
    res.status(400).json({
      error: `API key required. Please enter your ${providerName} API key, or set ${providerName.toUpperCase()}_API_KEY in server .env`
    });
    return;
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const sendEvent = (type, data) => {
    try {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    } catch (e) {
      // Client disconnected
    }
  };

  let aborted = false;
  req.on('close', () => { aborted = true; });

  try {
    const engine = new DebateEngine(effectiveKey, providerName, modelId);
    await engine.runDebate(topicTrimmed, (type, data) => {
      if (!aborted) sendEvent(type, data);
    });

    if (!aborted && walletNorm) {
      recordDebateUsage(walletNorm);
    }

    if (!aborted) {
      recordDebate(topicTrimmed, providerName, modelId);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error) {
    console.error('Debate error:', error.message);
    recordError(error);
    if (!aborted) {
      sendEvent('error', { message: error.message });
      res.end();
    }
  }
});

// ----------------------------------------------------------
// Simulated staking — tiers, stake/unstake, status
// ----------------------------------------------------------
const stakingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 60 : 200,
  message: { error: 'Too many staking requests.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.get('/api/staking/tiers', (req, res) => {
  res.json({ tiers: getAllTiers(), simulated: true, enforce: STAKING_ENFORCE });
});

app.get('/api/staking/status', stakingLimiter, (req, res) => {
  const walletNorm = normalizeWallet(req.query.wallet);
  if (!walletNorm) {
    return res.status(400).json({ error: 'Missing or invalid wallet query param' });
  }
  res.json({ ...getStakingInfo(walletNorm), wallet: walletNorm });
});

app.post('/api/staking/stake', stakingLimiter, (req, res) => {
  try {
    const walletNorm = normalizeWallet(req.body?.wallet);
    const amount = req.body?.amount;
    if (!walletNorm) return res.status(400).json({ error: 'Invalid wallet' });
    const info = simulateStake(walletNorm, amount);
    syncStakingFromModule();
    res.json({ ok: true, ...info, wallet: walletNorm });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Stake failed' });
  }
});

app.post('/api/staking/unstake', stakingLimiter, (req, res) => {
  const walletNorm = normalizeWallet(req.body?.wallet);
  if (!walletNorm) return res.status(400).json({ error: 'Invalid wallet' });
  const info = simulateUnstake(walletNorm);
  syncStakingFromModule();
  res.json({ ok: true, ...info, wallet: walletNorm });
});

// ----------------------------------------------------------
// Debate of the Day — trend-based topic from CoinGecko
// ----------------------------------------------------------
app.get('/api/debate-of-the-day', async (req, res) => {
  try {
    const topic = await getDebateOfTheDay();
    res.json({ topic });
  } catch (e) {
    console.error('Debate of the day error:', e);
    recordError(e);
    res.status(500).json({ topic: 'Is Bitcoin a good store of value?' });
  }
});

// ----------------------------------------------------------
// Shareable Debate Card — generates PNG for Twitter
// ----------------------------------------------------------
const cardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 20 : 100,
  message: { error: 'Too many card requests. Please wait a minute.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.post('/api/card', cardLimiter, async (req, res) => {
  try {
    const { topic, verdict } = req.body || {};
    const topicTrimmed = (topic || '').toString().trim();
    const verdictStr = (verdict || '').toString();

    if (!topicTrimmed) {
      return res.status(400).json({ error: 'Missing topic' });
    }
    if (topicTrimmed.length > 200) {
      return res.status(400).json({ error: 'Topic too long for card' });
    }

    // Summarize verdict when server keys available — ensures the answer fits on the card
    let summarized = null;
    const keysForCard = {
      deepseek: process.env.DEEPSEEK_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      gemini: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
    };
    if (verdictStr.length > 500) {
      summarized = await summarizeVerdictForCard(verdictStr, topicTrimmed, keysForCard);
    }

    const pngBuffer = await generateCard(topicTrimmed, verdictStr, summarized);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'attachment; filename="dissensus-debate-card.png"');
    res.setHeader('Cache-Control', 'no-store');
    res.send(pngBuffer);
  } catch (err) {
    console.error('Card generation error:', err);
    recordError(err);
    res.status(500).json({ error: 'Failed to generate card' });
  }
});

// ----------------------------------------------------------
// Public metrics API + dashboard (Phase 4 transparency)
// ----------------------------------------------------------
const metricsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 120 : 300,
  message: { error: 'Too many metrics requests.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.get('/api/metrics', metricsLimiter, (req, res) => {
  const n = Math.min(50, Math.max(0, parseInt(req.query.recent, 10) || 12));
  res.json({
    ...getPublicMetrics(),
    recentTopics: n > 0 ? getRecentTopics(n) : []
  });
});

// Recent topics only (for dashboards that split requests)
app.get('/api/metrics/topics', metricsLimiter, (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  res.json(getRecentTopics(limit));
});

app.get('/metrics', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'metrics.html'));
});

// ----------------------------------------------------------
// Fallback — serve index.html
// ----------------------------------------------------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ----------------------------------------------------------
// Start Server with Graceful Shutdown
// ----------------------------------------------------------
const server = app.listen(PORT, () => {
  console.log(`⚡ DISSENSUS Engine running on http://localhost:${PORT}`);
  console.log(`🧠 Providers: OpenAI, DeepSeek, Google Gemini`);
  const hasKeys = Object.entries(SERVER_KEYS).filter(([, k]) => k).map(([p]) => p);
  if (hasKeys.length) {
    console.log(`🔑 Server-side keys configured for: ${hasKeys.join(', ')}`);
  }
  console.log(`🔥 Ready to debate.`);
});

function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
