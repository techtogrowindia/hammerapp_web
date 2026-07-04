#!/usr/bin/env bash
# ============================================================
# deploy.sh — Hammer App deployment script
#
# Run as hammerapp user (no password prompts after setup-sudo.sh):
#   /var/www/hammerapp_web/scripts/deploy.sh
#
# Or trigger from local machine via SSH:
#   ssh -i hammer_vps_key hammerapp@85.208.51.93 \
#       /var/www/hammerapp_web/scripts/deploy.sh
# ============================================================

set -euo pipefail

APP_DIR="/var/www/hammerapp_web"
NPM="/root/.nvm/versions/node/v20.20.2/bin/npm"
NPX="/root/.nvm/versions/node/v20.20.2/bin/npx"
PM2="/root/.nvm/versions/node/v20.20.2/bin/pm2"
LOG_DIR="/var/log/hammerapp"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
LOG_FILE="$LOG_DIR/deploy.log"

log() { echo "[$TIMESTAMP] $*" | tee -a "$LOG_FILE"; }

cd "$APP_DIR"
log "══════════ Deploy started ══════════"

# ── 1. Pull latest code ──────────────────────────────────────
log "[1/5] git pull..."
git pull origin main
log "      HEAD: $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"

# ── 2. Install dependencies ──────────────────────────────────
log "[2/5] npm install..."
# Dev deps required at build time (tailwindcss, postcss, typescript)
sudo env PATH=/root/.nvm/versions/node/v20.20.2/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  "$NPM" install --prefer-offline 2>&1 | tail -5 | tee -a "$LOG_FILE"

# ── 3. Database migrations ───────────────────────────────────
log "[3/5] prisma migrate deploy..."
sudo "$NPX" prisma migrate deploy 2>&1 | tee -a "$LOG_FILE"

# ── 4. Build ─────────────────────────────────────────────────
log "[4/5] next build..."
sudo "$NPM" run build 2>&1 | tail -20 | tee -a "$LOG_FILE"

# ── 5. Restart / start process ──────────────────────────────
log "[5/5] pm2 restart..."
if sudo "$PM2" list | grep -q "hammerapp-web"; then
  sudo "$PM2" restart hammerapp-web --update-env
else
  sudo "$PM2" start "$APP_DIR/ecosystem.config.js"
fi
sudo "$PM2" save

log "══════════ Deploy finished ══════════"

# ── Health check ─────────────────────────────────────────────
sleep 3
STATUS=$(curl -sf http://127.0.0.1:3003/api/health | grep -o '"status":true' || true)
if [[ "$STATUS" == '"status":true' ]]; then
  log "Health check: OK"
else
  log "WARNING: health check failed — check logs: sudo pm2 logs hammerapp-web"
fi
