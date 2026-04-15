# ⚡ Dissensus Engine — Quick Reference Card

> Print this. Tape it to your monitor. You'll use these commands daily.

---

## 🚀 Deploy in 60 Seconds (after VPS setup)

```bash
# 1. Upload from your local machine
scp dissensus-engine.zip dissensus@YOUR_VPS_IP:~/

# 2. SSH into VPS
ssh dissensus@YOUR_VPS_IP

# 3. Unpack & install
unzip dissensus-engine.zip -d ~/dissensus-engine
cd ~/dissensus-engine && npm install --production

# 4. Configure API key (required for visitors to use without their own key)
cp .env.example .env && nano .env   # Add DEEPSEEK_API_KEY=sk-...

# 5. Start
sudo systemctl start dissensus

# 6. Verify
curl http://localhost:3000/api/health
```

---

## 🔧 Daily Operations

| What | Command |
|------|---------|
| **Start** | `sudo systemctl start dissensus` |
| **Stop** | `sudo systemctl stop dissensus` |
| **Restart** | `sudo systemctl restart dissensus` |
| **Status** | `sudo systemctl status dissensus` |
| **Live logs** | `sudo journalctl -u dissensus -f` |
| **Last 50 logs** | `sudo journalctl -u dissensus -n 50` |
| **Restart Nginx** | `sudo systemctl reload nginx` |
| **Test Nginx config** | `sudo nginx -t` |

---

## 🔄 Update Code

```bash
# 1. Upload new zip
scp dissensus-engine.zip dissensus@YOUR_VPS_IP:~/

# 2. SSH in
ssh dissensus@YOUR_VPS_IP

# 3. Backup current version
cp -r ~/dissensus-engine ~/dissensus-engine-backup-$(date +%Y%m%d)

# 4. Unpack over existing (overwrites files)
cd ~ && unzip -o dissensus-engine.zip -d ~/dissensus-engine

# 5. Install deps (in case package.json changed)
cd ~/dissensus-engine && npm install --production

# 6. Restart
sudo systemctl restart dissensus

# 7. Verify
sudo systemctl status dissensus
curl http://localhost:3000/api/health
```

---

## 🔍 Debugging

```bash
# Is Node running?
sudo systemctl is-active dissensus

# What port is it on?
sudo ss -tlnp | grep 3000

# Is Nginx running?
sudo systemctl is-active nginx

# Nginx error log
sudo tail -20 /var/log/nginx/error.log

# Full app logs since last boot
sudo journalctl -u dissensus -b

# Test the debate endpoint directly
curl "http://localhost:3000/api/debate/stream?topic=test&apiKey=YOUR_KEY&provider=deepseek&model=deepseek-chat" | head -5
```

---

## 🔒 SSL

```bash
# Check certificate expiry
sudo certbot certificates

# Renew (auto-renew is set up, but just in case)
sudo certbot renew

# Force renew
sudo certbot renew --force-renewal

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## 📊 Server Health

```bash
# Disk space
df -h

# Memory
free -h

# CPU & processes
htop

# Node.js process specifically
ps aux | grep node

# Uptime
uptime

# Network connections to the app
sudo ss -tlnp | grep -E '3000|80|443'
```

---

## 🚨 Emergency

```bash
# App crashed and won't start — check logs first
sudo journalctl -u dissensus -n 100 --no-pager

# Nuclear restart (both services)
sudo systemctl restart dissensus && sudo systemctl reload nginx

# Server running out of memory — add swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Locked out of SSH — use Hostinger Browser Terminal
# hPanel → VPS → Overview → Browser Terminal

# Roll back to previous version
rm -rf ~/dissensus-engine
mv ~/dissensus-engine-backup-YYYYMMDD ~/dissensus-engine
sudo systemctl restart dissensus
```

---

## 💰 Cost Reminder

| Provider | Model | Per Debate |
|----------|-------|------------|
| 🔥 DeepSeek | V3.2 | ~$0.008 |
| ⚡ Gemini | 2.0 Flash | ~$0.006 |
| ⚡ Gemini | 2.5 Flash | ~$0.03 |
| 🧠 OpenAI | GPT-4o-mini | ~$0.02 |
| 🧠 OpenAI | GPT-4o | ~$0.15 |

**At 100 debates/day with DeepSeek: ~$0.80/day = ~$24/month**

---

*Dissensus — Where AI agents disagree so you don't have to.* 🔴🟢🔵