#!/bin/bash
# ============================================================
# DISSENSUS ENGINE — VPS Quick Setup Script
# ============================================================
# Run as root on a fresh Ubuntu 22.04/24.04 Hostinger VPS
#
# Usage:
#   chmod +x setup-vps.sh
#   sudo ./setup-vps.sh
#
# What this script does:
#   1. Updates system packages
#   2. Creates 'dissensus' user
#   3. Installs Node.js 20 LTS
#   4. Installs Nginx
#   5. Installs Certbot (SSL)
#   6. Installs UFW firewall
#   7. Configures firewall rules
#   8. Creates systemd service
#   9. Copies Nginx config
#  10. Prints next steps
#
# What this script does NOT do (you do manually):
#   - Upload dissensus-engine.zip
#   - Run npm install
#   - Point your domain DNS
#   - Run certbot for SSL
#   - Start the service
# ============================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════╗"
echo "║   DISSENSUS ENGINE — VPS Setup Script        ║"
echo "║   Where AI agents disagree so you don't      ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✗ Please run as root: sudo ./setup-vps.sh${NC}"
    exit 1
fi

# ---- STEP 1: System Update ----
echo -e "\n${GREEN}[1/8] Updating system packages...${NC}"
apt update && apt upgrade -y
echo -e "${GREEN}✓ System updated${NC}"

# ---- STEP 2: Create User ----
echo -e "\n${GREEN}[2/8] Creating 'dissensus' user...${NC}"
if id "dissensus" &>/dev/null; then
    echo -e "${YELLOW}→ User 'dissensus' already exists, skipping${NC}"
else
    adduser --disabled-password --gecos "Dissensus Engine" dissensus
    echo -e "${YELLOW}→ Set a password for the dissensus user:${NC}"
    passwd dissensus
    usermod -aG sudo dissensus
    echo -e "${GREEN}✓ User 'dissensus' created with sudo privileges${NC}"
fi

# Create app directory
mkdir -p /home/dissensus/dissensus-engine
chown dissensus:dissensus /home/dissensus/dissensus-engine

# ---- STEP 3: Install Node.js 20 ----
echo -e "\n${GREEN}[3/8] Installing Node.js 20 LTS...${NC}"
if command -v node &>/dev/null; then
    NODE_VER=$(node --version)
    echo -e "${YELLOW}→ Node.js ${NODE_VER} already installed${NC}"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    echo -e "${GREEN}✓ Node.js $(node --version) installed${NC}"
fi

# ---- STEP 4: Install Nginx ----
echo -e "\n${GREEN}[4/8] Installing Nginx...${NC}"
apt install -y nginx
systemctl enable nginx
echo -e "${GREEN}✓ Nginx installed and enabled${NC}"

# ---- STEP 5: Install Certbot ----
echo -e "\n${GREEN}[5/8] Installing Certbot (Let's Encrypt SSL)...${NC}"
apt install -y certbot python3-certbot-nginx
echo -e "${GREEN}✓ Certbot installed${NC}"

# ---- STEP 6: Install & Configure UFW Firewall ----
echo -e "\n${GREEN}[6/8] Configuring UFW firewall...${NC}"
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
echo "y" | ufw enable
echo -e "${GREEN}✓ Firewall configured (SSH + HTTP + HTTPS)${NC}"

# ---- STEP 7: Create systemd Service ----
echo -e "\n${GREEN}[7/8] Creating systemd service...${NC}"
cat > /etc/systemd/system/dissensus.service << 'EOF'
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

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/home/dissensus/dissensus-engine

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable dissensus
echo -e "${GREEN}✓ systemd service created and enabled${NC}"

# ---- STEP 8: Configure Nginx ----
echo -e "\n${GREEN}[8/8] Configuring Nginx reverse proxy...${NC}"
cat > /etc/nginx/sites-available/dissensus << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name app.dissensus.fun;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

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

    location /api/debate/stream {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/dissensus /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload
nginx -t && systemctl reload nginx
echo -e "${GREEN}✓ Nginx configured and reloaded${NC}"

# ---- DONE ----
echo -e "\n${CYAN}"
echo "╔══════════════════════════════════════════════╗"
echo "║   ✅ VPS SETUP COMPLETE                      ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "${YELLOW}Next steps (do these manually):${NC}"
echo ""
echo "  1. Upload dissensus-engine.zip to the VPS:"
echo "     scp dissensus-engine.zip dissensus@YOUR_VPS_IP:~/"
echo ""
echo "  2. SSH in as the dissensus user and unpack:"
echo "     su - dissensus"
echo "     unzip dissensus-engine.zip -d ~/dissensus-engine"
echo "     cd ~/dissensus-engine && npm install --production"
echo ""
echo "  3. Start the engine:"
echo "     sudo systemctl start dissensus"
echo "     sudo systemctl status dissensus"
echo ""
echo "  4. Add DNS A record: app.dissensus.fun → this VPS IP"
echo ""
echo "  5. After DNS propagates, get SSL:"
echo "     sudo certbot --nginx -d app.dissensus.fun"
echo ""
echo -e "${GREEN}Then open https://app.dissensus.fun and start debating! 🔴🟢🔵${NC}"
echo ""