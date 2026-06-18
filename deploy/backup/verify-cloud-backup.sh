#!/bin/sh
set -eu

backup_remote="${BACKUP_REMOTE:-}"
postgres_file="${BACKUP_POSTGRES_FILE:-immologik-postgres-latest.sql}"
files_archive="${BACKUP_FILES_ARCHIVE:-immologik-files-latest.tar.gz}"
workdir="/tmp/immologik-backup-verify"

if [ -z "$backup_remote" ]; then
  echo "BACKUP_REMOTE is not set. Example: onedrive:ImmoLogik Backups"
  exit 1
fi

rm -rf "$workdir"
mkdir -p "$workdir"

echo "Checking remote backup files in $backup_remote..."
rclone copyto "$backup_remote/$postgres_file" "$workdir/$postgres_file"

if [ ! -s "$workdir/$postgres_file" ]; then
  echo "PostgreSQL backup is missing or empty: $postgres_file"
  exit 1
fi

echo "Validating PostgreSQL backup syntax..."
grep -Eq '^(CREATE|ALTER|COPY|INSERT|SELECT|SET|--)' "$workdir/$postgres_file" || {
  echo "PostgreSQL backup does not look like a SQL dump."
  exit 1
}

if rclone lsf "$backup_remote/$files_archive" >/dev/null 2>&1; then
  echo "Checking files archive..."
  rclone copyto "$backup_remote/$files_archive" "$workdir/$files_archive"
  tar -tzf "$workdir/$files_archive" >/dev/null
else
  echo "Files archive not found, skipped: $files_archive"
fi

echo "Backup verification finished."
