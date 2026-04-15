// ============================================================
// DISSENSUS AI — Metrics & Analytics System
// ============================================================
// In-memory metrics for transparency dashboard.
// Production: persist to DB / time-series store.
// ============================================================

const metrics = {
  totalDebates: 0,
  totalTopics: new Set(),
  debatesToday: 0,
  lastReset: new Date().toDateString(),

  providerUsage: {
    openai: 0,
    deepseek: 0,
    gemini: 0
  },

  recentTopics: [],

  hourlyDebates: new Array(24).fill(0),

  startTime: Date.now(),
  requests: {
    total: 0,
    successful: 0,
    failed: 0
  }
};

function recordDebate(topic, provider, model) {
  resetIfNeeded();

  metrics.totalDebates++;
  metrics.totalTopics.add(topic);
  metrics.debatesToday++;

  const p = ((provider || 'unknown') + '').toLowerCase();
  metrics.providerUsage[p] = (metrics.providerUsage[p] || 0) + 1;

  metrics.recentTopics.unshift({
    topic: (topic || '').substring(0, 100),
    provider: p,
    model: (model || '').toString().substring(0, 80),
    timestamp: new Date().toISOString()
  });
  if (metrics.recentTopics.length > 100) {
    metrics.recentTopics.pop();
  }

  const hour = new Date().getHours();
  metrics.hourlyDebates[hour]++;

  metrics.requests.total++;
  metrics.requests.successful++;
}

function recordError(error) {
  metrics.requests.total++;
  metrics.requests.failed++;
  const msg = error && (error.message || String(error));
  console.error('[Metrics] Error:', msg || error);
}

function resetIfNeeded() {
  const today = new Date().toDateString();
  if (metrics.lastReset !== today) {
    metrics.debatesToday = 0;
    metrics.hourlyDebates = new Array(24).fill(0);
    metrics.lastReset = today;
  }
}



function getPublicMetrics() {
  resetIfNeeded();

  const total = metrics.requests.total;
  const successRate = total > 0
    ? ((metrics.requests.successful / total) * 100).toFixed(2)
    : '100.00';

  return {
    totalDebates: metrics.totalDebates,
    uniqueTopics: metrics.totalTopics.size,
    debatesToday: metrics.debatesToday,

    providerUsage: { ...metrics.providerUsage },

    uptimeSeconds: Math.floor((Date.now() - metrics.startTime) / 1000),
    uptimePercent: successRate,

    debatesLastHour: metrics.hourlyDebates[new Date().getHours()],

    lastUpdated: new Date().toISOString(),
    serverStartTime: new Date(metrics.startTime).toISOString()
  };
}

function getRecentTopics(limit = 10) {
  return metrics.recentTopics.slice(0, Math.min(100, Math.max(1, limit)));
}

module.exports = {
  recordDebate,
  recordError,
  getPublicMetrics,
  getRecentTopics
};
