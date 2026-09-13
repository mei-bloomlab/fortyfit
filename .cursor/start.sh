#!/usr/bin/env bash
# Per-boot startup for FortyFit: bring the local PostgreSQL cluster online.
# Idempotent and safe to run on every environment start.
set -euo pipefail

PG_VERSION="$(ls /etc/postgresql 2>/dev/null | sort -V | tail -1)"
if [ -n "$PG_VERSION" ]; then
  sudo pg_ctlcluster "$PG_VERSION" main start 2>/dev/null || true
fi

for _ in $(seq 1 30); do
  if pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    echo "PostgreSQL is accepting connections."
    exit 0
  fi
  sleep 1
done

echo "PostgreSQL did not become ready in time." >&2
exit 1
