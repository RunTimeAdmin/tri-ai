// ============================================================
// DISSENSUS AI — Server (Express + SSE Streaming)
// Production-ready for VPS deployment
// ============================================================

require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { DebateEngine, PROVIDERS } = require('./debate-engine');
const { generateCard, summarizeVerdictForCard } = require('./card-generator');
const { getDebateOfTheDay } = require('./debate-of-the-day');
const { recordDebate, recordError, getPublicMetrics, getRecentTopics } = require('./metrics');
const { saveDebate, getDebate, listRecent, setDebateVisibility, generateShareToken, getDebateMeta } = require('./debate-store');
const { formatDebateJSON, generateDebatePDF } = require('./debate-export');
const { registerUser, loginUser, getUser, authMiddleware, optionalAuth, csrfProtection } = require('./auth');
const { createWorkspace, getWorkspace, getUserWorkspaces } = require('./workspace');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

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

/**
 * Sanitize and validate debate topic.
 * Prevents prompt injection and strips control characters.
 */
function sanitizeTopic(topic) {
    if (!topic || typeof topic !== 'string') throw new Error('Invalid topic');
    let sanitized = topic.replace(/[\x00-\x1F\x7F]/g, '').trim();
    if (sanitized.length < 3) throw new Error('Topic too short (min 3 chars)');
    if (sanitized.length > 500) throw new Error('Topic too long (max 500 chars)');
    // Strip sequences that could manipulate LLM system prompts
    sanitized = sanitized.replace(/\b(system|assistant|user)\s*:/gi, '')
                         .replace(/```/g, '')
                         .replace(/<\|.*?\|>/g, '')
                         .trim();
    if (!sanitized) throw new Error('Topic cannot be empty after sanitization');
    return sanitized;
}

// ----------------------------------------------------------
// Middleware
// ----------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(cookieParser());
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

const authLoginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { error: 'Too many login attempts. Please wait a minute.' },
    standardHeaders: true,
    legacyHeaders: false
});

const authRegisterLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { error: 'Too many registration attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// ----------------------------------------------------------
// Config - which providers have server-side keys
// ----------------------------------------------------------
app.get('/api/config', (req, res) => {
  // Return list of available providers (those with server keys configured)
  const availableProviders = Object.entries(SERVER_KEYS)
    .filter(([, key]) => !!key)
    .map(([provider]) => provider);
  res.json({
    availableProviders,
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

// ── API Key Security ──────────────────────────────────────────
// API keys are ALWAYS loaded from server-side environment variables.
// Client requests NEVER provide or influence API key selection.
// Keys: DEEPSEEK_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY in .env
function getEffectiveApiKey(provider) {
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

function buildAgentConfigs(query) {
  const agents = ['cipher', 'nova', 'prism'];
  const globalProvider = (query.provider || 'deepseek').toLowerCase();
  const globalModel = query.model || '';

  const configs = {};
  for (const agent of agents) {
    const providerName = (query[`${agent}_provider`] || globalProvider).toLowerCase();
    const modelId = query[`${agent}_model`] || globalModel;
    const providerDef = PROVIDERS[providerName];

    if (!providerDef) continue;

    const apiKey = getEffectiveApiKey(providerName);
    if (!apiKey) continue;

    configs[agent] = {
      providerName,
      model: modelId || Object.keys(providerDef.models)[0],
      apiKey,
      baseUrl: providerDef.baseUrl,
      authHeader: providerDef.authHeader
    };
  }
  return configs;
}

// ----------------------------------------------------------
// Validate debate params (preflight - EventSource can't show 400 errors)
// ----------------------------------------------------------
app.post('/api/debate/validate', async (req, res) => {
  const { topic, provider, model } = req.body || {};

  let topicTrimmed;
  try {
    topicTrimmed = sanitizeTopic(topic);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const hasPerAgentParams = ['cipher', 'nova', 'prism'].some(agent =>
    req.body[`${agent}_provider`] || req.body[`${agent}_model`]
  );

  if (hasPerAgentParams) {
    const agentConfigs = buildAgentConfigs(req.body);
    const configuredAgents = Object.keys(agentConfigs);

    if (configuredAgents.length === 0) {
      return res.status(400).json({ error: 'No valid agent configurations found. Check provider and API key settings.' });
    }

    for (const [agent, cfg] of Object.entries(agentConfigs)) {
      const modelCheck = validateModel(cfg.providerName, cfg.model);
      if (!modelCheck.valid) {
        return res.status(400).json({ error: `${agent}: ${modelCheck.error}` });
      }
    }

    return res.json({ ok: true });
  }

  const providerName = ((provider || 'deepseek') + '').toLowerCase();
  const modelId = model || (providerName === 'deepseek' ? 'deepseek-chat' : providerName === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o');

  const modelCheck = validateModel(providerName, modelId);
  if (!modelCheck.valid) {
    return res.status(400).json({ error: modelCheck.error });
  }

  const effectiveKey = getEffectiveApiKey(providerName);
  if (!effectiveKey) {
    return res.status(400).json({ error: `API key required. Set ${providerName.toUpperCase()}_API_KEY in server .env.` });
  }

  res.json({ ok: true });
});

// ── Auth Routes ───────────────────────────────────────────────
function setAuthCookies(res, token, csrfToken) {
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.cookie('csrf_token', csrfToken, {
        httpOnly: false, // JS needs to read this
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
}

app.post('/api/auth/register', authRegisterLimiter, async (req, res) => {
    const { email, password, name } = req.body;
    const result = await registerUser(email, password, name);
    if (result.error) return res.status(400).json({ error: result.error });
    setAuthCookies(res, result.token, result.csrfToken);
    res.status(201).json({ ok: true, user: result.user, csrfToken: result.csrfToken });
});

app.post('/api/auth/login', authLoginLimiter, async (req, res) => {
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    if (result.error) return res.status(401).json({ error: result.error });
    setAuthCookies(res, result.token, result.csrfToken);
    res.json({ user: result.user, csrfToken: result.csrfToken });
});

app.post('/api/auth/logout', csrfProtection, (req, res) => {
    res.clearCookie('token', { path: '/' });
    res.clearCookie('csrf_token', { path: '/' });
    res.json({ ok: true });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
    const user = getUser(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Refresh cookies on activity
    const token = req.cookies?.token;
    const csrfToken = req.cookies?.csrf_token;
    if (token && csrfToken) {
        setAuthCookies(res, token, csrfToken);
    }
    res.json({ user });
});

// ── Workspace Routes ──────────────────────────────────────────
app.get('/api/workspaces', authMiddleware, (req, res) => {
    const workspaces = getUserWorkspaces(req.user.id);
    res.json(workspaces);
});

app.post('/api/workspaces', authMiddleware, csrfProtection, (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'Workspace name required' });
        const workspace = createWorkspace(name, req.user.id);
        res.status(201).json(workspace);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/workspaces/:id/debates', authMiddleware, (req, res) => {
    const ws = getWorkspace(req.params.id);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });
    if (!ws.members.some(m => m.userId === req.user.id)) {
        return res.status(403).json({ error: 'Not a member of this workspace' });
    }
    // List debates for this workspace from the debate store
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const allRecent = listRecent(limit * 5); // Get more to filter
    const wsDebates = allRecent.filter(d => d.workspaceId === req.params.id).slice(0, limit);
    res.json(wsDebates);
});

// ----------------------------------------------------------
// Start Debate — SSE Streaming Endpoint
// ----------------------------------------------------------
app.get('/api/debate/stream', debateLimiter, optionalAuth, async (req, res) => {
  const { topic, provider, model } = req.query;

  // Input validation with sanitization
  let topicTrimmed;
  try {
    topicTrimmed = sanitizeTopic(topic);
  } catch (err) {
    res.status(400).json({ error: err.message });
    return;
  }

  const hasPerAgentParams = ['cipher', 'nova', 'prism'].some(agent =>
    req.query[`${agent}_provider`] || req.query[`${agent}_model`]
  );

  let engine;
  let providerName;
  let modelId;
  let agentConfigs;

  if (hasPerAgentParams) {
    agentConfigs = buildAgentConfigs(req.query);
    const configuredAgents = Object.keys(agentConfigs);

    if (configuredAgents.length === 0) {
      res.status(400).json({ error: 'No valid agent configurations found. Check provider and API key settings.' });
      return;
    }

    engine = new DebateEngine(agentConfigs);
    providerName = engine.providerName;
    modelId = 'mixed';
  } else {
    providerName = (provider || 'deepseek').toLowerCase();
    modelId = model || (providerName === 'deepseek' ? 'deepseek-chat' : providerName === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o');

    const modelCheck = validateModel(providerName, modelId);
    if (!modelCheck.valid) {
      res.status(400).json({ error: modelCheck.error });
      return;
    }

    const effectiveKey = getEffectiveApiKey(providerName);
    if (!effectiveKey) {
      res.status(400).json({
        error: `API key required. Set ${providerName.toUpperCase()}_API_KEY in server .env.`
      });
      return;
    }

    engine = new DebateEngine(effectiveKey, providerName, modelId);
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const debateRecord = { topic: topicTrimmed, provider: providerName, model: modelId, phases: [], timestamp: new Date().toISOString() };

  if (req.user) {
    debateRecord.userId = req.user.id;
    debateRecord.workspaceId = req.user.workspaceId;
  }

  if (hasPerAgentParams && agentConfigs) {
    debateRecord.agentModels = {};
    for (const [agent, cfg] of Object.entries(agentConfigs)) {
      debateRecord.agentModels[agent] = { provider: cfg.providerName, model: cfg.model };
    }
  }
  
  const PERSIST_EVENTS = new Set(['phase-start', 'agent-done', 'phase-done', 'debate-done']);
  const sendEvent = (type, data) => {
    if (PERSIST_EVENTS.has(type)) {
      debateRecord.phases.push({ type, ...data });
    }
    try {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    } catch (e) {
      // Client disconnected
    }
  };

  let aborted = false;
  const disconnectController = new AbortController();
  req.on('close', () => { aborted = true; disconnectController.abort(); });

  try {
    await engine.runDebate(topicTrimmed, (type, data) => {
      if (!aborted) sendEvent(type, data);
    }, disconnectController.signal);

    if (!aborted) {
      recordDebate(topicTrimmed, providerName, modelId);
      const debateId = saveDebate(debateRecord);
      res.write(`data: ${JSON.stringify({ type: 'done', debateId })}\n\n`);
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

const recentLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: isProd ? 30 : 100,
    message: { error: 'Too many requests. Please wait.' },
    standardHeaders: true,
    legacyHeaders: false
});

app.get('/api/debates/recent', recentLimiter, (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    res.json(listRecent(limit));
});

// ── Debate Persistence Endpoints ──────────────────────────────
app.get('/api/debate/:id', optionalAuth, (req, res) => {
    const debate = getDebate(req.params.id);
    if (!debate) return res.status(404).json({ error: 'Debate not found' });
    
    const meta = getDebateMeta(req.params.id);
    if (meta) {
        const isOwner = req.user && meta.userId === req.user.id;
        const isShared = meta.visibility === 'shared' && req.query.share === meta.shareToken;
        const isPublic = meta.visibility === 'public';
        if (!isOwner && !isShared && !isPublic) {
            return res.status(403).json({ error: 'Access denied' });
        }
    }
    // If no meta entry (legacy debate), allow access
    
    res.json(debate);
});

// Structured JSON export
app.get('/api/debate/:id/export/json', optionalAuth, (req, res) => {
    const debate = getDebate(req.params.id);
    if (!debate) return res.status(404).json({ error: 'Debate not found' });
    
    const meta = getDebateMeta(req.params.id);
    if (meta) {
        const isOwner = req.user && meta.userId === req.user.id;
        const isShared = meta.visibility === 'shared' && req.query.share === meta.shareToken;
        const isPublic = meta.visibility === 'public';
        if (!isOwner && !isShared && !isPublic) {
            return res.status(403).json({ error: 'Access denied' });
        }
    }
    
    const structured = formatDebateJSON(debate);
    res.setHeader('Content-Disposition', `attachment; filename="dissensus-${req.params.id.substring(0,8)}.json"`);
    res.json(structured);
});

// PDF export
app.get('/api/debate/:id/export/pdf', optionalAuth, (req, res) => {
    const debate = getDebate(req.params.id);
    if (!debate) return res.status(404).json({ error: 'Debate not found' });
    
    const meta = getDebateMeta(req.params.id);
    if (meta) {
        const isOwner = req.user && meta.userId === req.user.id;
        const isShared = meta.visibility === 'shared' && req.query.share === meta.shareToken;
        const isPublic = meta.visibility === 'public';
        if (!isOwner && !isShared && !isPublic) {
            return res.status(403).json({ error: 'Access denied' });
        }
    }
    
    try {
        const doc = generateDebatePDF(debate);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="dissensus-${req.params.id.substring(0,8)}.pdf"`);
        doc.pipe(res);
        doc.end();
    } catch (err) {
        console.error('PDF generation error:', err);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// Toggle debate visibility
app.post('/api/debate/:id/visibility', authMiddleware, csrfProtection, (req, res) => {
    const { visibility } = req.body; // 'private' or 'public'
    if (!['private', 'public'].includes(visibility)) {
        return res.status(400).json({ error: 'Invalid visibility' });
    }
    const ok = setDebateVisibility(req.params.id, visibility, req.user.id);
    if (!ok) return res.status(403).json({ error: 'Not authorized' });
    res.json({ ok: true, visibility });
});

// Generate share link
app.post('/api/debate/:id/share', authMiddleware, csrfProtection, (req, res) => {
    const token = generateShareToken(req.params.id, req.user.id);
    if (!token) return res.status(403).json({ error: 'Not authorized' });
    res.json({ shareToken: token });
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
