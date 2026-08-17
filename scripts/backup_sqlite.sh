#!/usr/bin/env bash
# Backup leve do SQLite — rode via cron na madrugada.
# Uso: BACKUP_DIR=/opt/road-learn/backups DB=/opt/road-learn/db.sqlite3 RETENTION_DAYS=14 ./backup_sqlite.sh

set -euo pipefail

DB="${DB:-/opt/road-learn/db.sqlite3}"
BACKUP_DIR="${BACKUP_DIR:-/opt/road-learn/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date +%Y-%m-%d)"
DEST="${BACKUP_DIR}/roadlearn_backup_${STAMP}.sqlite3"

mkdir -p "${BACKUP_DIR}"

nice -n 19 ionice -c3 bash -c "
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 \"${DB}\" \".backup '${DEST}'\"
  else
    cp -a \"${DB}\" \"${DEST}\"
  fi
"

find "${BACKUP_DIR}" -name 'roadlearn_backup_*.sqlite3' -mtime "+${RETENTION_DAYS}" -delete

echo "Backup OK: ${DEST}"
