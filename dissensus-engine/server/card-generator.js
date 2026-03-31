// ============================================================
// DISSENSUS — Shareable Debate Card Generator
// Uses Satori (HTML→SVG) + Resvg (SVG→PNG)
// Twitter-optimized 1200×630
// ============================================================

const satori = require('satori').default;
const { Resvg } = require('@resvg/resvg-js');
const https = require('https');

const WIDTH = 1200;
const HEIGHT = 630;

// Crypto keywords — if topic contains these, add NFA disclaimer
const CRYPTO_KEYWORDS = [
  'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'crypto', 'token',
  'defi', 'nft', 'altcoin', 'blockchain', 'web3', 'token', 'coin', 'hold',
  'investment', 'invest', 'portfolio', 'dollars', '$', 'market cap'
];

function isCryptoTopic(topic) {
  const lower = (topic || '').toLowerCase();
  return CRYPTO_KEYWORDS.some(kw => lower.includes(kw));
}

function truncateText(text, maxLen = 450) {
  if (!text || text.length <= maxLen) return text || '';
  return text.slice(0, maxLen - 3).trim() + '…';
}

// Truncate list item for card (fit on one line)
function truncateItem(text, maxLen = 90) {
  if (!text || text.length <= maxLen) return text || '';
  return text.slice(0, maxLen - 3).trim() + '…';
}

// Max list items to show on card (avoids cut-off)
const MAX_LIST_ITEMS = 8;

// Optional LLM summarization — returns short "answer block" when keys available
async function summarizeVerdictForCard(verdict, topic, serverKeys) {
  if (!verdict || verdict.length < 100) return null;
  const provider = serverKeys?.deepseek ? 'deepseek' : serverKeys?.openai ? 'openai' : serverKeys?.gemini ? 'gemini' : null;
  if (!provider) return null;

  const PROVIDERS = {
    deepseek: { baseUrl: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat', key: serverKeys.deepseek },
    openai: { baseUrl: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', key: serverKeys.openai },
    gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-2.0-flash', key: serverKeys.gemini }
  };
  const config = PROVIDERS[provider];
  if (!config?.key) return null;

  const authHeader = provider === 'gemini' ? null : `Bearer ${config.key}`;
  const url = provider === 'gemini' ? `${config.baseUrl}?key=${config.key}` : config.baseUrl;

  const prompt = `Summarize this debate verdict in 3-4 sentences. Focus on the ACTUAL ANSWER/DECISION — what did the agents conclude? If there's a ranked list or recommendations, include the top 5-7 as a brief numbered list. Be definitive and specific. Output format: first 2-3 sentences with the core conclusion, then "Top picks:" followed by numbered items if applicable. Max 700 characters total. No preamble.

VERDICT:
${verdict.slice(0, 4000)}

Summarize the answer:`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader })
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0.3
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const summarized = data.choices?.[0]?.message?.content?.trim();
    return summarized && summarized.length > 50 ? summarized : null;
  } catch (e) {
    return null;
  }
}

// Extract the TOP ANSWER: Recommended List first, else Ranked Conclusions, else summary
function extractCardContent(verdict, summarizedAnswer = null) {
  if (!verdict && !summarizedAnswer) return { listItems: [], summary: '', conviction: '' };
  const stripped = (verdict || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');

  let listItems = [];
  let summary = '';

  // If we have LLM summary, parse it for list + core answer
  if (summarizedAnswer) {
    const lines = summarizedAnswer.split(/\n/);
    const topPicksIdx = lines.findIndex(l => /top picks?:/i.test(l));
    if (topPicksIdx >= 0) {
      const pickLines = lines.slice(topPicksIdx + 1).map(l => l.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(l => l.length > 2);
      listItems = pickLines.slice(0, MAX_LIST_ITEMS).map(t => truncateItem(t, 55));
    }
    const paraLines = lines.slice(0, topPicksIdx >= 0 ? topPicksIdx : lines.length).join(' ').trim();
    summary = truncateText(paraLines || summarizedAnswer, 280);
  }

  if (listItems.length === 0 || !summary) {
    // 1. Recommended List / Ranked Picks
    const listMatch = stripped.match(/(?:Recommended List|Ranked Picks|Top Picks?)[\s\/:]*\n([\s\S]*?)(?=\n###|\n##\s|Ranked Conclusions|Where the Agents|Unresolved|Final Score|Overall Assessment|$)/i);
    if (listMatch) {
      const block = listMatch[1].trim();
      listItems = block.split(/\n/).map(line => line.replace(/^\s*[-*\d.)]+\s*/, '').trim()).filter(Boolean)
        .slice(0, MAX_LIST_ITEMS).map(t => truncateItem(t, 55));
    }
  }

  if (listItems.length === 0) {
    const conclMatch = stripped.match(/(?:Ranked Conclusions?[:\s]*\n)([\s\S]*?)(?=\n###|\n##\s|Where the Agents|Unresolved|Final Score|$)/i);
    if (conclMatch) {
      const block = conclMatch[1].trim();
      listItems = block.split(/\n/).map(line => {
        const clean = line.replace(/^\s*[-*\d.)]+\s*/, '').replace(/\s*—\s*Confidence[^\n]*/i, '').trim();
        return clean;
      }).filter(l => l.length > 5).slice(0, MAX_LIST_ITEMS).map(t => truncateItem(t, 55));
    }
  }

  if (!summary) {
    const assessMatch = stripped.match(/(?:Overall Assessment|### Overall Assessment)\s*\n([\s\S]*?)(?=\n###|\n##\s|$)/i);
    if (assessMatch) {
      summary = assessMatch[1].trim().split(/\n\n+/)[0] || '';
    }
    if (!summary) {
      const paras = stripped.replace(/^#+ .+$/gm, '').trim().split(/\n\n+/);
      summary = paras.find(p => p.length > 40) || paras[0] || '';
    }
    // Fallback: first substantive chunk (handles unconventional formats)
    if (!summary || summary.length < 30) {
      const chunk = stripped.replace(/^#+ .+$/gm, '').replace(/\n+/g, ' ').trim();
      summary = chunk.slice(0, 350);
      const lastSpace = summary.lastIndexOf(' ', 320);
      if (lastSpace > 200) summary = summary.slice(0, lastSpace);
    }
    summary = truncateText(summary, 450);
  }

  const convMatch = stripped.match(/Overall Conviction[:\s]*(\w+(?:\s+\w+)?)/i)
    || stripped.match(/(?:Lean\s+)?(?:STRONG\s+)?(BULLISH|BEARISH|NEUTRAL)/i);
  const conviction = convMatch ? convMatch[1].trim() : '';

  return { listItems, summary, conviction, usedSummary: !!summarizedAnswer };
}

let fontCache = null;

async function loadFont() {
  if (fontCache) return fontCache;
  return new Promise((resolve, reject) => {
    https.get('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.0/files/inter-latin-400-normal.woff', (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        fontCache = Buffer.concat(chunks);
        resolve(fontCache);
      });
    }).on('error', reject);
  });
}

async function generateCard(topic, verdict, summarizedAnswer = null) {
  const fontData = await loadFont();
  const isCrypto = isCryptoTopic(topic);
  const { listItems, summary, conviction } = extractCardContent(verdict, summarizedAnswer);
  const fallback = 'Three AI minds debated. See the full verdict at dissensus.fun';

  // Satori uses React-element-like objects (no JSX)
  const card = {
    type: 'div',
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0a0a0f',
        padding: 40,
        fontFamily: 'Inter',
        position: 'relative'
      },
      children: [
        // Top bar with gradient
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: 'linear-gradient(90deg, #ef4444, #22c55e, #06b6d4)'
            }
          }
        },
        // Logo / branding (compact)
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 20
            },
            children: [
              { type: 'span', props: { style: { fontSize: 28 }, children: '⚡' } },
              { type: 'span', props: { style: { fontSize: 24, fontWeight: 800, color: '#ffffff' }, children: 'DISSENSUS' } },
              { type: 'span', props: { style: { fontSize: 18, color: '#06b6d4' }, children: '$DISS' } }
            ]
          }
        },
        // Topic
        {
          type: 'div',
          props: {
            style: {
              fontSize: 32,
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: 24,
              lineHeight: 1.3
            },
            children: truncateText(topic, 80)
          }
        },
        // Verdict content block — SUMMARY + LIST, compact layout to avoid cut-off
        {
          type: 'div',
          props: {
            style: {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            },
            children: [
              // Summary first — THE DECISION (always show; most important for share cards)
              (summary || (!listItems.length && fallback)) ? {
                type: 'div',
                props: {
                  style: {
                    fontSize: listItems.length ? 16 : 20,
                    color: '#e2e8f0',
                    lineHeight: 1.4,
                    marginBottom: 12
                  },
                  children: summary || fallback
                }
              } : null,
              // THE ANSWER: List (compact, max 6 items, truncated)
              ...(listItems.length > 0 ? [{
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  },
                  children: listItems.map((item, i) => ({
                    type: 'div',
                    props: {
                      style: {
                        fontSize: 15,
                        color: '#94a3b8',
                        lineHeight: 1.35,
                        display: 'flex',
                        gap: 8
                      },
                      children: [
                        { type: 'span', props: { style: { color: '#06b6d4', fontWeight: 600, flexShrink: 0 }, children: `${i + 1}.` } },
                        { type: 'span', props: { style: { flex: 1 }, children: item } }
                      ]
                    }
                  }))
                }
              }] : []),
              // Conviction badge
              ...(conviction ? [{
                type: 'div',
                props: {
                  style: {
                    fontSize: 16,
                    fontWeight: 700,
                    color: conviction.toLowerCase().includes('bull') ? '#22c55e' : conviction.toLowerCase().includes('bear') ? '#ef4444' : '#06b6d4'
                  },
                  children: `Overall: ${conviction.toUpperCase()}`
                }
              }] : [])
            ].filter(Boolean)
          }
        },
        // Footer row (compact)
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              marginTop: 16
            },
            children: [
              ...(isCrypto ? [{
                type: 'div',
                props: {
                  style: {
                    fontSize: 12,
                    color: '#64748b'
                  },
                  children: 'Not financial advice. For entertainment and education only. Do your own research.'
                }
              }] : []),
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: 18,
                    color: '#06b6d4',
                    fontWeight: 600
                  },
                  children: 'dissensus.fun'
                }
              }
            ]
          }
        }
      ]
    }
  };

  const svg = await satori(card, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [{
      name: 'Inter',
      data: fontData,
      weight: 400,
      style: 'normal'
    }]
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: WIDTH },
    background: '#0a0a0f'
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

module.exports = { generateCard, isCryptoTopic, summarizeVerdictForCard };
