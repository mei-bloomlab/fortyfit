#!/usr/bin/env bash
# Idempotent Cloud Agent bootstrap for FortyFit.
# Prepares a self-contained local PostgreSQL, Node dependencies, Prisma client,
# schema, and seed data. Safe to run repeatedly.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# 1. System dependency: PostgreSQL (stable, only installed once).
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    postgresql postgresql-contrib
fi

PG_VERSION="$(ls /etc/postgresql 2>/dev/null | sort -V | tail -1)"

# 2. Ensure the cluster is running so we can provision the role/database.
sudo pg_ctlcluster "$PG_VERSION" main start 2>/dev/null || true
for _ in $(seq 1 30); do
  pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1 && break
  sleep 1
done

# 3. Provision the fortyfit role and database (idempotent).
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='fortyfit'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE fortyfit LOGIN PASSWORD 'fortyfit';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='fortyfit'" | grep -q 1 \
  || sudo -u postgres createdb -O fortyfit fortyfit

# 4. Local .env (gitignored). Only created if missing so manual edits survive.
if [ ! -f .env ]; then
  cat > .env <<'ENVEOF'
DATABASE_URL="postgresql://fortyfit:fortyfit@127.0.0.1:5432/fortyfit?sslmode=disable"
OPENWA_MODE="mock-success"
OPENWA_URL="http://127.0.0.1:43201"
OPENWA_TOKEN=""
TZ="Asia/Makassar"
ENVEOF
fi

# 5. Node dependencies (repo pins no lockfile, so use npm install).
npm install

# 6. Prisma client, schema push, and seed data.
npm run db:prepare
