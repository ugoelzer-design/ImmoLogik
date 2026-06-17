FROM postgres:16-alpine

RUN apk add --no-cache ca-certificates dcron rclone tar

COPY deploy/backup/run-cloud-backup.sh /usr/local/bin/run-cloud-backup.sh
COPY deploy/backup/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/run-cloud-backup.sh /usr/local/bin/entrypoint.sh

CMD ["/usr/local/bin/entrypoint.sh"]
