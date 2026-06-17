#!/bin/sh
set -eu

if [ -n "${BACKUP_CRON:-}" ]; then
  echo "$BACKUP_CRON /usr/local/bin/run-cloud-backup.sh >> /var/log/immologik-backup.log 2>&1" > /etc/crontabs/root
  echo "Backup scheduler started with cron: $BACKUP_CRON"
  exec crond -f -l 8
fi

echo "BACKUP_CRON is not set. Backup container is ready for manual or Coolify scheduled runs."
exec sleep infinity
