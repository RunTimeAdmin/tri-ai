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

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

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
app.use(express.json({ limit: '10kb' }));
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
    maxTopicLength: 500
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
  const { topic, apiKey, provider, model } = req.body || {};
  const topicTrimmed = (topic || '').toString().trim();
  const providerName = ((provider || 'deepseek') + '').toLowerCase();
  const modelId = model || (providerName === 'deepseek' ? 'deepseek-chat' : providerName === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o');

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
  const { topic, apiKey, provider, model } = req.query;

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

    if (!aborted) {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error) {
    console.error('Debate error:', error.message);
    if (!aborted) {
      sendEvent('error', { message: error.message });
      res.end();
    }
  }
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
