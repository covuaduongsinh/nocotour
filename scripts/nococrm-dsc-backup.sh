#!/usr/bin/env bash
# Sao luu NocoCRM Duong Sinh tren VPS: Hot-backup SQLite + config.yml -> gdrive-dsc
set -euo pipefail

DEST="${DEST:-/srv/backups/nococrm-dsc}"
KEEP_DAYS="${KEEP_DAYS:-14}"
REMOTE="${REMOTE:-gdrive-dsc:NocoCRM-DSC-backups}"
REMOTE_KEEP_DAYS="${REMOTE_KEEP_DAYS:-30}"

exec 9>/var/lock/nococrm-dsc-backup.lock
flock -n 9 || { echo "$(date -Is) dang co luot sao luu khac, bo qua"; exit 0; }

STAMP=$(date +%Y-%m-%d_%H%M)
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$DEST"
chmod 700 "$DEST"

SQLITE_PATH="/srv/nococrm-dsc/storage/crm.sqlite"
CONFIG_PATH="/srv/nococrm-dsc/config.yml"

[ -f "$SQLITE_PATH" ] || { echo "$(date -Is) LOI: Khong tim thay $SQLITE_PATH"; exit 1; }

# Safe online backup bang better-sqlite3 (khong can dung container)
node -e '
  const Database = require("/srv/nococrm-dsc/releases/current/dist/node_modules/better-sqlite3");
  const db = new Database(process.argv[1], { readonly: true });
  db.backup(process.argv[2])
    .then(() => { process.exit(0); })
    .catch(err => { console.error(err); process.exit(1); });
' "$SQLITE_PATH" "$TMP_DIR/crm.sqlite"

if [ -f "$CONFIG_PATH" ]; then
  cp "$CONFIG_PATH" "$TMP_DIR/config.yml"
fi

tar -czf "$DEST/.crm_${STAMP}.tar.gz.part" -C "$TMP_DIR" .
mv "$DEST/.crm_${STAMP}.tar.gz.part" "$DEST/crm_${STAMP}.tar.gz"

tar -tzf "$DEST/crm_${STAMP}.tar.gz" > /dev/null

find "$DEST" -maxdepth 1 -type f -name 'crm_*.tar.gz' -mtime +"$KEEP_DAYS" -delete

FILE_SIZE=$(du -h "$DEST/crm_${STAMP}.tar.gz" | cut -f1)
echo "$(date -Is) sao luu NocoCRM thanh cong: crm_${STAMP}.tar.gz ($FILE_SIZE)"

if [ -n "$REMOTE" ]; then
  if rclone copy "$DEST" "$REMOTE" --include "crm_${STAMP}.tar.gz" --log-level ERROR; then
    rclone delete "$REMOTE" --min-age "${REMOTE_KEEP_DAYS}d" --log-level ERROR || true
    echo "$(date -Is) da day len ${REMOTE} (giu ${REMOTE_KEEP_DAYS} ngay)"
  else
    echo "$(date -Is) LOI: khong day duoc len ${REMOTE}; ban sao cuc bo van con o ${DEST}"
    exit 2
  fi
fi
