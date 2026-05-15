FROM postgres:16-alpine

RUN apk add --no-cache ca-certificates rclone tar

COPY deploy/backup/run-cloud-backup.sh /usr/local/bin/run-cloud-backup.sh
RUN chmod +x /usr/local/bin/run-cloud-backup.sh

CMD ["sleep", "infinity"]
