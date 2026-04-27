// ============================================================
// DISSENSUS — Debate of the Day
// Trend-based: CoinGecko trending coins, cached per day
// Server timezone configurable via DEBATE_OF_THE_DAY_TZ
// ============================================================

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/search/trending';
const FALLBACK_TOPICS = [
  'Is Bitcoin a good store of value in 2025?',
  'Ethereum vs Solana: which will dominate?',
  'Should AI be regulated by governments?',
  'Is crypto a legitimate asset class?',
  'DeFi vs CeFi: where is finance heading?',
  'Are NFTs more than JPEGs?',
  'Is Layer 2 the future of Ethereum?'
];

let cache = { topic: null, dateKey: null };

function getDateKey() {
  const tz = process.env.DEBATE_OF_THE_DAY_TZ || 'UTC';
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  } catch (e) {
    return new Date().toISOString().slice(0, 10);
  }
}

async function fetchTrending() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
        const res = await fetch(COINGECKO_URL, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Dissensus-Engine/1.0' }
        });
        clearTimeout(timeout);

        const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
        if (contentLength > 102400) return null;

        const json = await res.json();
        const coins = json.coins || [];
        const top = coins[0]?.item;
        if (top?.name && top?.symbol) {
            return `Is ${top.name} (${top.symbol}) worth buying right now? — Trending #1 on CoinGecko`;
        }
        return null;
    } catch {
        clearTimeout(timeout);
        return null;
    }
}

function getFallbackTopic() {
  const dateKey = getDateKey();
  const dayOfYear = Math.floor((new Date(dateKey) - new Date(dateKey.slice(0, 4) + '-01-01')) / 86400000);
  return FALLBACK_TOPICS[dayOfYear % FALLBACK_TOPICS.length];
}

async function getDebateOfTheDay() {
  const dateKey = getDateKey();
  if (cache.topic && cache.dateKey === dateKey) {
    return cache.topic;
  }

  const trending = await fetchTrending();
  const topic = trending || getFallbackTopic();

  cache = { topic, dateKey };
  return topic;
}

module.exports = { getDebateOfTheDay };
