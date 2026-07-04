#!/usr/bin/env bash
# ============================================================
# setup-sudo.sh — ONE-TIME root setup for hammerapp VPS
#
# Run as root:  sudo bash /var/www/hammerapp_web/scripts/setup-sudo.sh
#
# What this does:
#   1. Creates /usr/local/bin symlinks for node/npm/npx/pm2
#   2. Grants hammerapp user sudo rights for deploy commands
#   3. Creates log directory
#   4. Installs NGINX configs (symlinks into sites-enabled)
#   5. Adds NGINX rate-limit zones to nginx.conf (if not already present)
#   6. Obtains SSL certs via Certbot
#   7. Starts the app with PM2 and saves the process list
# ============================================================

set -euo pipefail

# ── Config ──────────────────────────────────────────────────
APP_DIR="/var/www/hammerapp_web"
APP_USER="hammerapp"
NODE_BIN="/root/.nvm/versions/node/v20.20.2/bin"
LOG_DIR="/var/log/hammerapp"

# Ensure this is run as root
if [[ "$EUID" -ne 0 ]]; then
  echo "ERROR: Must be run as root (sudo bash $0)" >&2
  exit 1
fi

echo "══════════════════════════════════════════════"
echo "  Hammer App — VPS first-time setup"
echo "══════════════════════════════════════════════"

# ── 1. Verify NVM binaries exist ─────────────────────────────
echo "[1/7] Verifying NVM binaries..."
for bin in node npm npx pm2; do
  if [[ -x "$NODE_BIN/$bin" ]]; then
    echo "      OK: $NODE_BIN/$bin"
  else
    echo "      ERROR: $NODE_BIN/$bin not found" >&2
    exit 1
  fi
done

# ── 2. Sudoers drop-in for hammerapp user ───────────────────
echo "[2/7] Configuring sudoers..."
SUDOERS_FILE="/etc/sudoers.d/hammerapp"
cat > "$SUDOERS_FILE" <<'EOF'
# Hammer App deployment — no symlinks; use full NVM paths directly.

hammerapp ALL=(ALL) NOPASSWD: /root/.nvm/versions/node/v20.20.2/bin/npm *
hammerapp ALL=(ALL) NOPASSWD: /root/.nvm/versions/node/v20.20.2/bin/npx *
hammerapp ALL=(ALL) NOPASSWD: /root/.nvm/versions/node/v20.20.2/bin/pm2 *
hammerapp ALL=(ALL) NOPASSWD: /usr/sbin/nginx -s reload
hammerapp ALL=(ALL) NOPASSWD: /usr/sbin/nginx -t
hammerapp ALL=(ALL) NOPASSWD: /usr/bin/certbot *
EOF
chmod 440 "$SUDOERS_FILE"
# Validate the file before leaving it in place
visudo -cf "$SUDOERS_FILE" || { echo "ERROR: sudoers syntax invalid"; rm "$SUDOERS_FILE"; exit 1; }
echo "      $SUDOERS_FILE written OK"

# ── 3. Log directory ─────────────────────────────────────────
echo "[3/7] Creating log directory..."
mkdir -p "$LOG_DIR"
chown "$APP_USER":"$APP_USER" "$LOG_DIR"

# ── 4. NGINX site configs ────────────────────────────────────
echo "[4/7] Installing NGINX configs..."
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"

for domain in dev.hammerapp.in admin.hammerapp.in; do
  src="$APP_DIR/nginx/$domain.conf"
  if [[ -f "$src" ]]; then
    cp "$src" "$NGINX_AVAILABLE/$domain"
    ln -sf "$NGINX_AVAILABLE/$domain" "$NGINX_ENABLED/$domain"
    echo "      Installed: $domain"
  else
    echo "      WARNING: $src not found — skipping"
  fi
done

# Remove default nginx site if present
rm -f "$NGINX_ENABLED/default"

# ── 5. NGINX rate-limit zones ────────────────────────────────
echo "[5/7] Adding NGINX rate-limit zones..."
NGINX_CONF="/etc/nginx/nginx.conf"
if ! grep -q "zone=api_general" "$NGINX_CONF"; then
  # Insert before the first 'server {' block inside the http block
  sed -i '/http {/a\    # Hammer App rate-limiting zones\n    limit_req_zone $binary_remote_addr zone=api_general:10m rate=10r/s;\n    limit_req_zone $binary_remote_addr zone=api_auth:10m    rate=1r/s;' "$NGINX_CONF"
  echo "      Rate-limit zones added to nginx.conf"
else
  echo "      Rate-limit zones already present"
fi

# Test & reload NGINX
nginx -t && nginx -s reload
echo "      NGINX reloaded"

# ── 6. SSL certificates via Certbot ─────────────────────────
echo "[6/7] Obtaining SSL certificates..."
if ! command -v certbot &>/dev/null; then
  echo "      Installing certbot..."
  apt-get install -y certbot python3-certbot-nginx
fi

for domain in dev.hammerapp.in admin.hammerapp.in; do
  CERT="/etc/letsencrypt/live/$domain/fullchain.pem"
  if [[ -f "$CERT" ]]; then
    echo "      $domain — cert already exists, skipping"
  else
    certbot --nginx -d "$domain" --non-interactive --agree-tos \
      --email admin@hammerapp.in --redirect || {
        echo "      WARNING: certbot failed for $domain — HTTP will still work"
      }
  fi
done

# Auto-renewal hook
if [[ ! -f /etc/cron.d/certbot-hammerapp ]]; then
  echo "0 3 * * * root certbot renew --quiet && nginx -s reload" \
    > /etc/cron.d/certbot-hammerapp
  echo "      Certbot renewal cron installed"
fi

# ── 7. Start app with PM2 ────────────────────────────────────
echo "[7/7] Starting hammerapp-web with PM2..."
cd "$APP_DIR"

# Ensure .env exists
if [[ ! -f "$APP_DIR/.env" ]]; then
  echo "      WARNING: $APP_DIR/.env not found."
  echo "      Copy .env.example to .env and fill in values, then run:"
  echo "      sudo pm2 start $APP_DIR/ecosystem.config.js"
else
  sudo -u "$APP_USER" /usr/local/bin/pm2 start "$APP_DIR/ecosystem.config.js" \
    || sudo -u "$APP_USER" /usr/local/bin/pm2 restart hammerapp-web
  sudo -u "$APP_USER" /usr/local/bin/pm2 save
  # Register PM2 startup script
  pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" | tail -1 | bash
  echo "      PM2 process saved and startup configured"
fi

echo ""
echo "══════════════════════════════════════════════"
echo "  Setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Verify .env is populated: cat $APP_DIR/.env"
echo "  2. Run DB migrations:  sudo npx prisma migrate deploy"
echo "  3. Run seed:           sudo npx prisma db seed"
echo "  4. Check app status:   sudo pm2 status"
echo "  5. Check logs:         sudo pm2 logs hammerapp-web"
echo "  6. Health check:       curl https://dev.hammerapp.in/api/health"
echo "══════════════════════════════════════════════"
