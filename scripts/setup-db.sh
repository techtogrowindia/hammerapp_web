#!/usr/bin/env bash
# ============================================================
# setup-db.sh — Create PostgreSQL database + user for Hammer App
# Run as root on the VPS:  sudo bash /var/www/hammerapp_web/scripts/setup-db.sh
# ============================================================

set -euo pipefail

DB_NAME="hammerapp"
DB_USER="hammerapp"
DB_PASS="Hammerapp"

echo "══════════════════════════════════════════════"
echo "  Hammer App — PostgreSQL setup"
echo "══════════════════════════════════════════════"

# Check postgres is running
if ! systemctl is-active --quiet postgresql; then
  echo "Starting PostgreSQL..."
  systemctl start postgresql
fi

echo "[1/3] Creating role '$DB_USER'..."
sudo -u postgres psql -c "
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
      CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS';
      RAISE NOTICE 'Role $DB_USER created.';
    ELSE
      ALTER ROLE $DB_USER WITH PASSWORD '$DB_PASS';
      RAISE NOTICE 'Role $DB_USER already exists — password updated.';
    END IF;
  END
  \$\$;
"

echo "[2/3] Creating database '$DB_NAME'..."
sudo -u postgres psql -c "
  SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')
  \gexec
"

echo "[3/3] Granting privileges..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d "$DB_NAME" -c "ALTER SCHEMA public OWNER TO $DB_USER;"

echo ""
echo "══════════════════════════════════════════════"
echo "  Database ready!"
echo ""
echo "  Host:     localhost:5432"
echo "  Database: $DB_NAME"
echo "  User:     $DB_USER"
echo "  Password: $DB_PASS"
echo ""
echo "  DATABASE_URL (paste into .env):"
echo "  postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public"
echo "══════════════════════════════════════════════"
