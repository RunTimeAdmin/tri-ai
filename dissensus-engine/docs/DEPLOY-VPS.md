# 🚀 Dissensus Engine — Hostinger VPS Deployment Guide

> Complete step-by-step guide to deploy the Dissensus AI Debate Engine on a Hostinger VPS running Ubuntu.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Connect to Your VPS](#2-connect-to-your-vps)
3. [Initial Server Setup](#3-initial-server-setup)
4. [Install Node.js](#4-install-nodejs)
5. [Deploy the Engine](#5-deploy-the-engine)
6. [Configure Environment Variables](#6-configure-environment-variables)
7. [Create systemd Service](#7-create-systemd-service)
8. [Install & Configure Nginx](#8-install--configure-nginx)
9. [Set Up SSL with Let's Encrypt](#9-set-up-ssl-with-lets-encrypt)
10. [Point Your Domain](#10-point-your-domain)
11. [Firewall Configuration](#11-firewall-configuration)
12. [Verify Everything Works](#12-verify-everything-works)
13. [Maintenance & Monitoring](#13-maintenance--monitoring)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Prerequisites

Before you start, make sure you have:

- [ ] Hostinger VPS plan (any tier works — the engine is lightweight)
- [ ] Ubuntu 22.04 or 24.04 selected as your OS template
- [ ] Domain `dissensus.fun` pointed to your VPS IP (or ready to point)
- [ ] DeepSeek API key (get from [platform.deepseek.com](https://platform.deepseek.com/api_keys))
- [ ] SSH client (Terminal on Mac/Linux, PuTTY on Windows)
- [ ] The `dissensus-engine.zip` file on your local machine

---

## 2. Connect to Your VPS

### Find Your Credentials

1. Log into [hPanel](https://hpanel.hostinger.com)
2. Go to **VPS** → select your server
3. Under **Overview** → **SSH access**, note your:
   - **IP Address** (e.g., `123.456.78.90`)
   - **SSH Port** (default: `22`)
   - **Root Password**

### Connect via SSH

**Mac/Linux Terminal:**
```bash
ssh root@YOUR_VPS_IP
```

**Windows (PuTTY):**
1. Open PuTTY
2. Enter your VPS IP and port 22
3. Click **Open**
4. Login as `root` with your password

**Hostinger Browser Terminal (easiest):**
1. In hPanel → VPS → **Overview** → **Browser Terminal**
2. Click to open — no software needed

---

## 3. Initial Server Setup

Run these commands one by one after connecting:

```bash
# Update system packages
apt update && apt upgrade -y

# Set timezone (optional but recommended)
timedatectl set-timezone UTC

# Create a dedicated user for the app (don't run Node as root)
adduser dissensus
# Enter a strong password when prompted, skip the rest with Enter

# Give sudo privileges
usermod -aG sudo dissensus

# Switch to the new user
su - dissensus
```

> **Why not run as root?** Running Node.js as root is a security risk. If the app gets compromised, the attacker has full server access. The `dissensus` user limits the blast radius.

---

## 4. Install Node.js

We'll use NodeSource to install Node.js 20 LTS:

```bash
# Install Node.js 20.x (as the dissensus user with sudo)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version    # Should show v20.x.x
npm --version     # Should show 10.x.x
```

---

## 5. Deploy the Engine

### Option A: Upload via SCP (from your local machine)

Open a **new terminal on your local machine** (not the VPS):

```bash
# Upload the zip to your VPS
scp dissensus-engine.zip dissensus@YOUR_VPS_IP:~/

# Or if using a non-standard SSH port:
scp -P YOUR_PORT dissensus-engine.zip dissensus@YOUR_VPS_IP:~/
```

### Option B: Upload via SFTP (FileZilla)

1. Open FileZilla
2. Connect: Host=`YOUR_VPS_IP`, User=`dissensus`, Password=your password, Port=`22`
3. Upload `dissensus-engine.zip` to `/home/dissensus/`

### Option C: Download directly on VPS

If you host the zip somewhere accessible:
```bash
cd ~
wget YOUR_DOWNLOAD_URL/dissensus-engine.zip
```

### Unpack and Install

Back on the VPS (as the `dissensus` user):

```bash
# Install unzip if needed
sudo apt install -y unzip

# Create app directory
mkdir -p ~/dissensus-engine
cd ~

# Unzip
unzip dissensus-engine.zip -d ~/dissensus-engine

# Install dependencies
cd ~/dissensus-engine
npm install --production

# Quick test — should print "running on http://localhost:3000"
node server/index.js
# Press Ctrl+C to stop after confirming it works
```

---

## 6. Configure Environment Variables

Create an environment file to store your API key securely:

```bash
nano ~/dissensus-engine/.env
```

Paste the following:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# API Key — REQUIRED for VPS. When set, visitors can debate without entering a key.
DEEPSEEK_API_KEY=sk-your-actual-key-here
```

Save and exit: `Ctrl+X` → `Y` → `Enter`

> **Important:** Set `DEEPSEEK_API_KEY` so visitors can use the app without their own key. The engine supports OpenAI and Gemini too — set `OPENAI_API_KEY` or `GOOGLE_API_KEY` as needed.

---

## 7. Create systemd Service

This makes the engine start automatically on boot and restart if it crashes.

```bash
sudo nano /etc/systemd/system/dissensus.service
```

Paste this entire block:

```ini
[Unit]
Description=Dissensus AI Debate Engine
Documentation=https://dissensus.fun
After=network.target

[Service]
Type=simple
User=dissensus
Group=dissensus
WorkingDirectory=/home/dissensus/dissensus-engine
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=dissensus
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/home/dissensus/dissensus-engine/.env

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/home/dissensus/dissensus-engine

[Install]
WantedBy=multi-user.target
```

Save and exit, then enable and start:

```bash
# Reload systemd to pick up the new service
sudo systemctl daemon-reload

# Enable auto-start on boot
sudo systemctl enable dissensus

# Start the service now
sudo systemctl start dissensus

# Check status — should show "active (running)"
sudo systemctl status dissensus
```

You should see output like:
```
● dissensus.service - Dissensus AI Debate Engine
     Loaded: loaded
     Active: active (running)
```

### Useful Service Commands

```bash
# View live logs
sudo journalctl -u dissensus -f

# Restart after code changes
sudo systemctl restart dissensus

# Stop the service
sudo systemctl stop dissensus

# Check if it's running
sudo systemctl is-active dissensus
```

---

## 8. Install & Configure Nginx

Nginx acts as a reverse proxy — it handles SSL, compression, and forwards requests to your Node.js app.

```bash
# Install Nginx
sudo apt install -y nginx

# Create the Dissensus site config
sudo nano /etc/nginx/sites-available/dissensus
```

Paste this configuration:

```nginx
# Dissensus AI Debate Engine — Nginx Configuration
# Reverse proxy for Node.js app on port 3000

server {
    listen 80;
    listen [::]:80;
    server_name app.dissensus.fun;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # Static assets — serve directly from Nginx (faster)
    location /css/ {
        alias /home/dissensus/dissensus-engine/public/css/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location /js/ {
        alias /home/dissensus/dissensus-engine/public/js/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location /images/ {
        alias /home/dissensus/dissensus-engine/public/images/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # SSE streaming — special proxy settings (no buffering!)
    location /api/debate/stream {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection '';

        # CRITICAL for SSE streaming — disable all buffering
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;

        # Long timeout for debates (they can take 5+ minutes)
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Everything else — proxy to Node
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Save and exit, then activate:

```bash
# Enable the site
sudo ln -sf /etc/nginx/sites-available/dissensus /etc/nginx/sites-enabled/

# Remove default site (optional but clean)
sudo rm -f /etc/nginx/sites-enabled/default

# Test config for syntax errors
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
sudo systemctl enable nginx
```

> **⚠️ Critical:** The SSE streaming location block has `proxy_buffering off` — this is essential. Without it, Nginx will buffer the streaming chunks and the debate won't stream in real-time.

---

## 9. Set Up SSL with Let's Encrypt

Free HTTPS via Certbot:

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (make sure app.dissensus.fun points to this VPS first!)
sudo certbot --nginx -d app.dissensus.fun
```

Certbot will:
1. Ask for your email (for renewal notices)
2. Ask you to agree to terms
3. Automatically modify your Nginx config to add SSL
4. Set up auto-renewal

**Verify auto-renewal works:**
```bash
sudo certbot renew --dry-run
```

After SSL is set up, your site will be accessible at `https://app.dissensus.fun` 🔒

---

## 10. Point Your Domain

### Subdomain Architecture

The debate engine runs on `app.dissensus.fun` while the landing page stays on `dissensus.fun`:

```
dissensus.fun          → Landing page (Hostinger shared hosting — keep as-is)
app.dissensus.fun      → Debate engine (Hostinger VPS)
```

### DNS Setup in Hostinger hPanel:

1. Log into [hPanel](https://hpanel.hostinger.com)
2. Go to **Domains** → select `dissensus.fun`
3. Click **DNS / Nameservers** → **DNS records**
4. **Keep your existing A records** for `@` and `www` (these point to your shared hosting for the landing page)
5. **Add one new A record** for the subdomain:

| Type | Name | Points to | TTL |
|------|------|-----------|-----|
| A | app | YOUR_VPS_IP | 14400 |

> **Important:** Only add the `app` record. Do NOT change the `@` or `www` records — those keep your landing page working on shared hosting.

6. Wait for DNS propagation (usually 5-30 minutes, can take up to 24 hours)

**Check propagation:**
```bash
# From your local machine or the VPS
dig app.dissensus.fun +short
# Should return your VPS IP

# Verify landing page still works
dig dissensus.fun +short
# Should return your shared hosting IP (different from VPS)
```

---

## 11. Firewall Configuration

```bash
# Install UFW (Uncomplicated Firewall)
sudo apt install -y ufw

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (IMPORTANT — do this first or you'll lock yourself out!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable the firewall
sudo ufw enable

# Verify rules
sudo ufw status verbose
```

Expected output:
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

> **Note:** Port 3000 is NOT exposed publicly. Nginx handles all public traffic on 80/443 and proxies to Node.js internally. This is more secure.

---

## 12. Verify Everything Works

### Quick Checklist

```bash
# 1. Is Node.js running?
sudo systemctl is-active dissensus
# Expected: active

# 2. Is it listening on port 3000?
curl -s http://localhost:3000/api/health
# Expected: JSON health response

# 3. Is Nginx running?
sudo systemctl is-active nginx
# Expected: active

# 4. Can you reach it externally?
curl -s http://app.dissensus.fun/api/health
# Expected: JSON health response

# 5. Is SSL working?
curl -s https://app.dissensus.fun/api/health
# Expected: JSON health response

# 6. Are providers available?
curl -s https://app.dissensus.fun/api/providers | python3 -m json.tool
# Expected: JSON with deepseek, openai, gemini
```

### Test a Live Debate

Open `https://app.dissensus.fun` in your browser:
1. Enter your DeepSeek API key
2. Select DeepSeek V3.2
3. Type a topic: "Is Bitcoin a better store of value than gold?"
4. Click **Start Debate**
5. Watch all 4 phases stream in real-time 🔥

---

## 13. Maintenance & Monitoring

### View Logs

```bash
# Live application logs
sudo journalctl -u dissensus -f

# Last 100 lines
sudo journalctl -u dissensus -n 100

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Update the Engine

When you have a new version of the code:

```bash
# As the dissensus user
cd ~/dissensus-engine

# Upload new files (via SCP/SFTP) or git pull if using git

# Install any new dependencies
npm install --production

# Restart the service
sudo systemctl restart dissensus

# Verify it's running
sudo systemctl status dissensus
```

### System Monitoring

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU and processes
htop    # (install with: sudo apt install -y htop)

# Check Node.js memory usage specifically
ps aux | grep node
```

### Automatic Security Updates

```bash
# Enable unattended security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
# Select "Yes" when prompted
```

---

## 14. Troubleshooting

### "502 Bad Gateway" from Nginx

The Node.js app isn't running or crashed:
```bash
# Check if the service is running
sudo systemctl status dissensus

# If it's dead, check why
sudo journalctl -u dissensus -n 50

# Restart it
sudo systemctl restart dissensus
```

### "Connection refused" on port 3000

```bash
# Check if anything is listening on 3000
sudo ss -tlnp | grep 3000

# If nothing, start the service
sudo systemctl start dissensus
```

### SSE streaming not working (debate doesn't stream)

This is almost always an Nginx buffering issue:
```bash
# Verify your Nginx config has these in the /api/debate/stream block:
#   proxy_buffering off;
#   proxy_cache off;
#   chunked_transfer_encoding off;

# Check config
sudo nginx -t

# Reload after changes
sudo systemctl reload nginx
```

### SSL certificate won't issue

```bash
# Make sure your subdomain points to this VPS
dig app.dissensus.fun +short
# Must return YOUR_VPS_IP

# Make sure port 80 is open
sudo ufw status | grep 80

# Try again with verbose output
sudo certbot --nginx -d app.dissensus.fun -v
```

### Out of memory

The engine is lightweight, but if your VPS has limited RAM:
```bash
# Check memory
free -h

# Add swap space (2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Need to change the port

Edit the systemd service:
```bash
sudo nano /etc/systemd/system/dissensus.service
# Change: Environment=PORT=3000 → Environment=PORT=YOUR_PORT

# Also update Nginx config:
sudo nano /etc/nginx/sites-available/dissensus
# Change all proxy_pass http://127.0.0.1:3000 → http://127.0.0.1:YOUR_PORT

# Reload both
sudo systemctl daemon-reload
sudo systemctl restart dissensus
sudo systemctl reload nginx
```

---

## Quick Reference Card

| Action | Command |
|--------|---------|
| Start engine | `sudo systemctl start dissensus` |
| Stop engine | `sudo systemctl stop dissensus` |
| Restart engine | `sudo systemctl restart dissensus` |
| View status | `sudo systemctl status dissensus` |
| View live logs | `sudo journalctl -u dissensus -f` |
| Restart Nginx | `sudo systemctl reload nginx` |
| Test Nginx config | `sudo nginx -t` |
| Renew SSL | `sudo certbot renew` |
| Check firewall | `sudo ufw status` |
| Check disk | `df -h` |
| Check memory | `free -h` |

---

## Architecture Overview

```
Internet
    │
    ▼
┌─────────────────────────┐
│   Nginx (port 80/443)   │  ← SSL termination, compression, static files
│   - SSL via Let's Encrypt│
│   - Gzip compression    │
│   - Static asset caching │
│   - SSE proxy (no buffer)│
└──────────┬──────────────┘
           │ proxy_pass
           ▼
┌─────────────────────────┐
│  Node.js (port 3000)    │  ← Express server, debate orchestration
│  - SSE streaming        │
│  - Multi-provider AI    │
│  - 4-phase debate engine│
└──────────┬──────────────┘
           │ HTTPS
           ▼
┌─────────────────────────┐
│  AI Providers           │
│  - DeepSeek V3.2        │
│  - Google Gemini         │
│  - OpenAI GPT-4o        │
└─────────────────────────┘
```

---

**Built for Dissensus — Where AI agents disagree so you don't have to.** 🔴🟢🔵