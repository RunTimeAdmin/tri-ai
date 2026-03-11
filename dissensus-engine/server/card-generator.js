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

function truncateText(text, maxLen = 280) {
  if (!text || text.length <= maxLen) return text || '';
  return text.slice(0, maxLen - 3).trim() + '…';
}

// Extract the TOP ANSWER in full: Recommended List first, else full Ranked Conclusions
function extractCardContent(verdict) {
  if (!verdict) return { listItems: [], summary: '', conviction: '' };
  const raw = verdict.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');

  // 1. PRIORITY: Recommended List / Ranked Picks — THE CONCRETE ANSWER, IN FULL
  const listMatch = raw.match(/(?:Recommended List|Ranked Picks)[\s\/]*\n([\s\S]*?)(?=\n###|\n##\s|Ranked Conclusions|Where the Agents|Unresolved|Final Score|$)/i);
  let listItems = [];
  if (listMatch) {
    const block = listMatch[1].trim();
    listItems = block.split(/\n/).map(line => line.replace(/^\s*[-*\d.)]+\s*/, '').trim()).filter(Boolean);
  }

  // 2. If no list, get Ranked Conclusions — IN FULL (all of them)
  if (listItems.length === 0) {
    const conclMatch = raw.match(/(?:Ranked Conclusions?[:\s]*\n)([\s\S]*?)(?=\n###|\n##\s|Where the Agents|Unresolved|Final Score|$)/i);
    if (conclMatch) {
      const block = conclMatch[1].trim();
      listItems = block.split(/\n/).map(line => {
        const clean = line.replace(/^\s*[-*\d.)]+\s*/, '').replace(/\s*—\s*Confidence[^\n]*/i, '').trim();
        return clean;
      }).filter(l => l.length > 5);
    }
  }

  // 3. Overall Assessment (brief — list is the star)
  const assessMatch = raw.match(/(?:Overall Assessment|### Overall Assessment)\s*\n([\s\S]*?)(?=\n###|\n##\s|$)/i);
  let summary = '';
  if (assessMatch) {
    summary = assessMatch[1].trim().split(/\n\n+/)[0] || '';
  }
  if (!summary && listItems.length === 0) {
    const paras = raw.replace(/^#+ .+$/gm, '').trim().split(/\n\n+/);
    summary = paras.find(p => p.length > 40) || paras[0] || '';
  }
  summary = truncateText(summary, 240);

  // 4. Overall Conviction
  const convMatch = raw.match(/Overall Conviction[:\s]*(\w+(?:\s+\w+)?)/i)
    || raw.match(/(?:Lean\s+)?(BULLISH|BEARISH|NEUTRAL)/i);
  const conviction = convMatch ? convMatch[1].trim() : '';

  return { listItems, summary, conviction };
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

async function generateCard(topic, verdict) {
  const fontData = await loadFont();
  const isCrypto = isCryptoTopic(topic);
  const { listItems, summary, conviction } = extractCardContent(verdict);
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
        padding: 48,
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
        // Logo / branding
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 32
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
        // Verdict content block — LIST IS THE STAR (full, no truncation)
        {
          type: 'div',
          props: {
            style: {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            },
            children: [
              // THE ANSWER: Full list (Recommended List or Ranked Conclusions)
              ...(listItems.length > 0 ? [{
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  },
                  children: listItems.map((item, i) => ({
                    type: 'div',
                    props: {
                      style: {
                        fontSize: 15,
                        color: '#e2e8f0',
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
              // Summary (when no list, or brief context)
              (summary || (!listItems.length && fallback)) ? {
                type: 'div',
                props: {
                  style: {
                    fontSize: listItems.length ? 14 : 20,
                    color: '#94a3b8',
                    lineHeight: 1.4
                  },
                  children: summary || fallback
                }
              } : null,
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
        // Footer row
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              marginTop: 24
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

module.exports = { generateCard, isCryptoTopic };
