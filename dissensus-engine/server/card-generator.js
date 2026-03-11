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

// Extract first meaningful paragraph for card summary
function extractSummary(verdict) {
  if (!verdict) return '';
  // Strip markdown headers, get first real content
  let cleaned = verdict
    .replace(/^#+ .+$/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^\- .+$/gm, '')
    .trim();
  const paras = cleaned.split(/\n\n+/);
  const first = paras.find(p => p.length > 30) || paras[0] || '';
  return truncateText(first, 200);
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
  const summary = extractSummary(verdict) || 'Three AI minds debated. See the full verdict at dissensus.fun';

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
        // Verdict summary
        {
          type: 'div',
          props: {
            style: {
              fontSize: 20,
              color: '#94a3b8',
              lineHeight: 1.5,
              flex: 1
            },
            children: summary
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
