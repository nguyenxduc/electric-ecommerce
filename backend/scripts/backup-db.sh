#!/bin/sh
# Vong lap backup: pg_dump -Fc moi BACKUP_INTERVAL_HOURS gio, giu BACKUP_KEEP ban moi nhat.
# PG* env (PGHOST, PGUSER, PGPASSWORD, PGDATABASE) do compose cap.
set -eu
DIR="${BACKUP_DIR:-/backups}"
KEEP="${BACKUP_KEEP:-7}"
HOURS="${BACKUP_INTERVAL_HOURS:-24}"
mkdir -p "$DIR"
while true; do
  F="$DIR/ecommerce-$(date +%Y%m%d-%H%M%S).dump"
  if pg_dump -Fc -f "$F.tmp"; then
    mv "$F.tmp" "$F"
    echo "[backup] wrote $F"
    # xoa ban cu, chi giu KEEP ban moi nhat
    ls -1t "$DIR"/ecommerce-*.dump | tail -n +"$((KEEP + 1))" | xargs -r rm -f
  else
    rm -f "$F.tmp"
    echo "[backup] pg_dump failed" >&2
  fi
  [ "${BACKUP_ONCE:-0}" = "1" ] && exit 0
  sleep "$((HOURS * 3600))"
done
