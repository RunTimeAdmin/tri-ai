# ⚡ DISSENSUS AI — Debate Engine

**3 AI Minds. 1 Truth.**

The Dissensus AI Debate Engine is a multi-agent dialectical debate system where three AI agents with opposing perspectives battle over any topic and forge consensus from chaos.

## 🧠 The Three Agents

| Agent | Role | Personality |
|-------|------|-------------|
| **CIPHER** 🔴 | The Skeptic | Red-team auditor. Finds weaknesses, risks, and flaws. |
| **NOVA** 🟢 | The Advocate | Visionary optimist. Finds opportunities and catalysts. |
| **PRISM** 🔵 | The Synthesizer | Neutral referee. Weighs both sides, delivers the verdict. |

## 🔄 The 4-Phase Debate Process

1. **Phase 1 — Independent Analysis**: All 3 agents silently analyze the topic in parallel
2. **Phase 2 — Opening Arguments**: Each agent presents their formal position
3. **Phase 3 — Cross-Examination**: Agents directly challenge each other's arguments
4. **Phase 4 — Final Verdict**: PRISM synthesizes everything into ranked consensus with confidence scores

## 💰 Supported AI Providers & Pricing

| Provider | Model | Cost/Debate | Quality | Speed | API Key |
|----------|-------|------------|---------|-------|---------|
| **🔥 DeepSeek** | V3.2 | **~$0.008** | Very Good | Fast | [platform.deepseek.com](https://platform.deepseek.com/api_keys) |
| **⚡ Google Gemini** | 2.0 Flash | **~$0.006** | Good | Very Fast | [aistudio.google.com](https://aistudio.google.com/apikey) |
| **⚡ Google Gemini** | 2.5 Flash | **~$0.03** | Very Good | Fast | [aistudio.google.com](https://aistudio.google.com/apikey) |
| **⚡ Google Gemini** | 2.5 Flash-Lite | **~$0.006** | Good | Very Fast | [aistudio.google.com](https://aistudio.google.com/apikey) |
| **🧠 OpenAI** | GPT-4o | **~$0.15** | Excellent | Medium | [platform.openai.com](https://platform.openai.com/api-keys) |
| **🧠 OpenAI** | GPT-4o Mini | **~$0.01** | Good | Fast | [platform.openai.com](https://platform.openai.com/api-keys) |

**Recommended:** DeepSeek V3.2 for best value, or Gemini 2.5 Flash for the free tier.

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (download from https://nodejs.org/)
- **API Key** from any supported provider (DeepSeek, Google, or OpenAI)

### Installation

```bash
# 1. Navigate to the project directory
cd dissensus-engine

# 2. Install dependencies
npm install

# 3. Start the server
npm start
```

The server will start on **http://localhost:3000**

### Usage

1. Open **http://localhost:3000** in your browser
2. Select your **AI Provider** (DeepSeek, Gemini, or OpenAI)
3. Enter your **API Key** (or use server key if configured — see VPS deploy)
4. Select a **model**
5. Type a **debate topic**
6. Click **⚡ Start Debate** and watch the agents battle it out in real-time!

### VPS Deployment (Server-Side API Keys)

For production, set API keys in `.env` so visitors can debate without entering keys:

```bash
cp .env.example .env
# Edit .env and add:
DEEPSEEK_API_KEY=sk-your-key    # Recommended — ~$0.008/debate
# Optional: OPENAI_API_KEY, GOOGLE_API_KEY (or GEMINI_API_KEY)
```

See **docs/DEPLOY-VPS.md** for the full Hostinger deployment guide.

### 🔐 Simulated staking (Phase 1)

In-memory **simulated** $DISS tiers for demos. Production would verify on-chain stake.

| Endpoint | Purpose |
|----------|---------|
| `GET /api/staking/tiers` | Tier thresholds & features |
| `GET /api/staking/status?wallet=...` | Tier, staked amount, debates used / remaining today |
| `POST /api/staking/stake` | Body `{ wallet, amount }` — set simulated stake |
| `POST /api/staking/unstake` | Body `{ wallet }` — reset stake to 0 |

Set **`STAKING_ENFORCE=1`** in `.env` to require a wallet and enforce daily debate limits by tier. Default: off (optional wallet; limits only apply when a wallet is sent).

### 📊 Metrics & transparency (Phase 4)

In-memory analytics for this process (resets on restart):

| Endpoint / page | Purpose |
|-----------------|--------|
| `GET /api/metrics?recent=12` | JSON: debate counts, provider usage, simulated staking aggregates, optional `recentTopics` |
| `GET /api/metrics/topics?limit=10` | JSON array: recent topic rows only |
| **`/metrics`** | Public dashboard (auto-refresh ~60s) |

`recordDebate` runs after each completed debate; `recordError` on debate/card/debate-of-the-day failures.

### 🔗 Solana wallet & $DISS balance

- **Header:** Connect with **Phantom** or **Solflare**; shows shortened address + **on-chain $DISS** balance.
- **Balance** is read via **`GET /api/solana/token-balance?wallet=`** using server `SOLANA_RPC_URL` (keeps premium RPC keys off the client).
- **Mint:** `DISS_TOKEN_MINT` (defaults to project CA / mint).
- **On-chain stake/unstake:** not live until you deploy a program and set **`DISS_STAKING_PROGRAM_ID`** — see **`GET /api/solana/staking-status`**.

## 📁 Project Structure

```
dissensus-engine/
├── package.json              # Dependencies & scripts
├── README.md                 # This file
├── server/
│   ├── index.js              # Express server + SSE streaming
│   ├── agents.js             # Agent personality definitions
│   ├── debate-engine.js      # 4-phase debate orchestrator (multi-provider)
│   ├── staking.js            # Simulated $DISS tiers & daily debate limits
│   ├── metrics.js            # In-memory analytics for transparency dashboard
│   └── solana-balance.js     # Server-side SPL token balance for $DISS
└── public/
    ├── index.html            # Main UI
    ├── css/
    │   └── styles.css        # Cyberpunk theme styles
    ├── js/
    │   └── app.js            # Frontend debate controller
    └── images/
        └── characters/
            ├── cipher-portrait.jpg
            ├── nova-portrait.jpg
            └── prism-portrait.jpg
```

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `SOLANA_RPC_URL` | `https://api.mainnet-beta.solana.com` | RPC for on-chain balance checks |
| `DISS_TOKEN_MINT` | Project mint CA | SPL mint for $DISS |
| `SOLANA_CLUSTER` | `mainnet-beta` | Shown in `/api/config` |
| `DISS_STAKING_PROGRAM_ID` | _(unset)_ | When set, signals future on-chain staking wiring |
| `TRUST_PROXY` | _(on)_ | Set `0` or `false` only if Node has **no** reverse proxy (disables `trust proxy`) |
| `TRUST_PROXY_HOPS` | `1` | Number of trusted proxy hops (nginx in front = usually `1`) |

**Behind nginx / Hostinger proxy:** leave `TRUST_PROXY` unset (default). If you see `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` in logs, pull latest — the server enables `trust proxy` by default.

### Adding New Providers

Edit `server/debate-engine.js` — the `PROVIDERS` object at the top. Any provider with an OpenAI-compatible chat completions API can be added.

## 🌐 Deployment Options

### Option 1: VPS / Cloud Server (Recommended)
Deploy on any Node.js-capable server (DigitalOcean, Railway, Render, Fly.io):

```bash
npm install
PORT=3000 node server/index.js
```

### Option 2: Railway (One-Click)
1. Push to GitHub
2. Connect to Railway
3. It auto-detects Node.js and deploys

### Option 3: Docker
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server/index.js"]
```

## 🔒 Security Notes

- API keys are entered client-side and sent directly to the AI provider — they never touch server storage
- Keys are saved in browser localStorage per provider for convenience
- For production: consider adding rate limiting, authentication, and HTTPS

## 🎨 Customization

### Adding New Agents
Edit `server/agents.js` — each agent needs an `id`, `name`, `role`, `systemPrompt`, `color`, and `portrait`.

### Changing the Theme
Edit `public/css/styles.css` — all colors are CSS variables at the top.

### Adjusting Debate Length
In `server/debate-engine.js`, modify `max_tokens` in `callAgent()`.

## 📝 License

MIT — Built for the $DISS (Dissensus) project.

---

**Built with ⚡ by the Dissensus team**
*Where Disagreement Forges Truth*