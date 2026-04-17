# Dissensus — AI Debate Platform

**3 AI Minds. 1 Truth.**  
Multi-agent dialectical debate engine.

## Push to GitHub (first time)

```bash
cd z:\tri-ai
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tri-ai.git
git push -u origin main
```

Create the repo on GitHub first (empty, no README), then run the commands above.

## Repo structure

```
tri-ai/
├── dissensus-engine/     # Main app — live LLM debates (Node.js)
├── webpage/              # Landing page (dissensus.fun)
├── ROADMAP.md            # Product roadmap
└── README.md             # This file
```

## Deploy to VPS (Git pull)

```bash
# 1. SSH into VPS
ssh dissensus@YOUR_VPS_IP

# 2. Clone (first time)
git clone https://github.com/YOUR_USERNAME/tri-ai.git ~/tri-ai
cd ~/tri-ai/dissensus-engine

# 3. Install & configure
npm install --production
cp .env.example .env && nano .env   # Add DEEPSEEK_API_KEY

# 4. Start (systemd)
sudo systemctl restart dissensus
```

## Update from Git

```bash
cd ~/tri-ai
git pull
cd dissensus-engine && npm install --production
sudo systemctl restart dissensus
```

## Links

- **Landing:** dissensus.fun
- **App:** app.dissensus.fun
- **Docs:** dissensus-engine/docs/DEPLOY-VPS.md
