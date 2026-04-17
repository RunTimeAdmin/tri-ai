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

API keys are configured **server-side only** via environment variables. Users do NOT need to provide API keys.

| Provider | Model | Cost/Debate | Quality | Speed |
|----------|-------|------------|---------|-------|
| **🔥 DeepSeek** | V3.2 | **~$0.008** | Very Good | Fast |
| **⚡ Google Gemini** | 2.0 Flash | **~$0.006** | Good | Very Fast |
| **⚡ Google Gemini** | 2.5 Flash | **~$0.03** | Very Good | Fast |
| **⚡ Google Gemini** | 2.5 Flash-Lite | **~$0.006** | Good | Very Fast |
| **🧠 OpenAI** | GPT-4o | **~$0.15** | Excellent | Medium |
| **🧠 OpenAI** | GPT-4o Mini | **~$0.01** | Good | Fast |

**Recommended:** DeepSeek V3.2 for best value, or Gemini 2.5 Flash for the free tier.

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (download from https://nodejs.org/)
- **API Key** from at least one supported provider (DeepSeek, Google, or OpenAI)

### Installation

```powershell
# 1. Navigate to the project directory
cd dissensus-engine

# 2. Install dependencies
npm install

# 3. Configure environment variables
copy .env.example .env
# Edit .env and add your API keys:
# DEEPSEEK_API_KEY=sk-your-key
# OPENAI_API_KEY=sk-your-key
# GOOGLE_API_KEY=your-key

# 4. Start the server
npm start
```

The server will start on **http://localhost:3000**

### Usage

1. Open **http://localhost:3000** in your browser
2. Select an **AI Provider** (DeepSeek, Gemini, or OpenAI)
3. Select a **Model**
4. Type a **Debate Topic**
5. Click **⚡ Start Debate** and watch the agents battle it out in real-time!

### VPS Deployment (Server-Side API Keys)

For production deployment, API keys are configured exclusively via server-side environment variables:

```powershell
# Copy example environment file
copy .env.example .env

# Edit .env and add your API keys:
# DEEPSEEK_API_KEY=sk-your-key    # Recommended — ~$0.008/debate
# OPENAI_API_KEY=sk-your-key
# GOOGLE_API_KEY=your-key (or GEMINI_API_KEY)
```

**Security Note:** Clients never provide or influence API key selection. All keys are loaded server-side from the `.env` file.

See **docs/DEPLOY-VPS.md** for the full Hostinger deployment guide.

### 📊 Metrics & transparency

In-memory analytics for this process (resets on restart):

| Endpoint / page | Purpose |
|-----------------|--------|
| `GET /api/metrics?recent=12` | JSON: debate counts, provider usage, optional `recentTopics` |
| `GET /api/metrics/topics?limit=10` | JSON array: recent topic rows only |
| **`/metrics`** | Public dashboard (auto-refresh ~60s) |

`recordDebate` runs after each completed debate; `recordError` on debate/card/debate-of-the-day failures.

## 📁 Project Structure

```
dissensus-engine/
├── package.json              # Dependencies & scripts
├── README.md                 # This file
├── server/
│   ├── index.js              # Express server + SSE streaming
│   ├── agents.js             # Agent personality definitions
│   ├── debate-engine.js      # 4-phase debate orchestrator (multi-provider)
│   ├── metrics.js            # In-memory analytics for transparency dashboard
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

- **API keys are server-side only** — configured via `.env` environment variables
- Clients never provide, see, or influence API key selection
- All API calls to AI providers are made from the server, not the client
- Rate limiting is enabled (10 debates/minute per IP in production)
- Topics are sanitized to prevent prompt injection attacks
- For production: enable HTTPS and consider adding authentication

## 🎨 Customization

### Adding New Agents
Edit `server/agents.js` — each agent needs an `id`, `name`, `role`, `systemPrompt`, `color`, and `portrait`.

### Changing the Theme
Edit `public/css/styles.css` — all colors are CSS variables at the top.

### Adjusting Debate Length
In `server/debate-engine.js`, modify `max_tokens` in `callAgent()`.

## 📝 License

MIT — Built for the Dissensus project.

---

**Built with ⚡ by the Dissensus team**
*Where Disagreement Forges Truth*