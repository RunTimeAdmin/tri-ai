# Deploy Dissensus Engine via Git Pull

> Use Git instead of uploading zip files. Pull from GitHub on the VPS.

---

## First-time setup on VPS

### 1. Install Git (if needed)

```bash
sudo apt update
sudo apt install -y git
```

### 2. Clone the repo

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/tri-ai.git
```

Replace `YOUR_USERNAME` with your GitHub username (or org) and `tri-ai` with your repo name.

### 3. Deploy the engine

```bash
cd ~/tri-ai/dissensus-engine
npm install --production
cp .env.example .env
nano .env
```

Add your DeepSeek API key:

```
DEEPSEEK_API_KEY=sk-your-key-here
```

Save: `Ctrl+X` → `Y` → `Enter`

### 4. Create systemd service

```bash
sudo nano /etc/systemd/system/dissensus.service
```

Paste (update paths if your clone is elsewhere):

```ini
[Unit]
Description=Dissensus AI Debate Engine
After=network.target

[Service]
Type=simple
User=dissensus
Group=dissensus
WorkingDirectory=/home/dissensus/tri-ai/dissensus-engine
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/home/dissensus/tri-ai/dissensus-engine/.env

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable dissensus
sudo systemctl start dissensus
sudo systemctl status dissensus
```

---

## Update (pull new code)

```bash
cd ~/tri-ai
git pull
cd dissensus-engine
npm install --production
sudo systemctl restart dissensus
```

---

## Optional: Deploy script

Create `~/deploy-dissensus.sh`:

```bash
#!/bin/bash
set -e
cd ~/tri-ai
git pull
cd dissensus-engine
npm install --production
sudo systemctl restart dissensus
echo "Deployed. Status:"
sudo systemctl status dissensus --no-pager
```

Make executable and run:

```bash
chmod +x ~/deploy-dissensus.sh
~/deploy-dissensus.sh
```
