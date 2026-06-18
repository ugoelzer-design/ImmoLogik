#!/bin/sh
set -eu

backup_remote="${BACKUP_REMOTE:-}"
keep_days="${BACKUP_KEEP_DAYS:-7}"
db_name="${POSTGRES_DB:-immologik}"
db_user="${POSTGRES_USER:-immologik}"
timestamp="$(date -u +%Y-%m-%d_%H%M%S)"
workdir="/tmp/immologik-backup"

if [ -z "$backup_remote" ]; then
  echo "BACKUP_REMOTE is not set. Example: onedrive:ImmoLogik Backups"
  exit 1
fi

rm -rf "$workdir"
mkdir -p "$workdir"

echo "Creating PostgreSQL dump..."
if [ -n "${DATABASE_URL:-}" ]; then
  pg_dump "${DATABASE_URL%%\?*}" \
    --clean \
    --if-exists \
    > "$workdir/immologik-postgres-$timestamp.sql"
else
  if [ -z "${POSTGRES_PASSWORD:-}" ]; then
    echo "POSTGRES_PASSWORD or DATABASE_URL is required."
    exit 1
  fi

  PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "${POSTGRES_HOST:-postgres}" \
    -U "$db_user" \
    -d "$db_name" \
    --clean \
    --if-exists \
    > "$workdir/immologik-postgres-$timestamp.sql"
fi

cp "$workdir/immologik-postgres-$timestamp.sql" "$workdir/immologik-postgres-latest.sql"

if [ -d /minio-data ]; then
  echo "Creating MinIO archive..."
  tar -czf "$workdir/immologik-files-$timestamp.tar.gz" -C /minio-data .
  cp "$workdir/immologik-files-$timestamp.tar.gz" "$workdir/immologik-files-latest.tar.gz"
fi

echo "Uploading backup files to $backup_remote..."
rclone copy "$workdir" "$backup_remote" --create-empty-src-dirs

echo "Verifying uploaded backup..."
BACKUP_POSTGRES_FILE="immologik-postgres-$timestamp.sql" \
BACKUP_FILES_ARCHIVE="immologik-files-$timestamp.tar.gz" \
  /usr/local/bin/verify-cloud-backup.sh

if [ "$keep_days" -gt 0 ] 2>/dev/null; then
  echo "Deleting remote timestamped backups older than $keep_days days..."
  rclone delete "$backup_remote" \
    --min-age "${keep_days}d" \
    --filter "+ immologik-postgres-*.sql" \
    --filter "+ immologik-files-*.tar.gz" \
    --filter "- *latest*" \
    --filter "- *"
fi

echo "Backup finished."
