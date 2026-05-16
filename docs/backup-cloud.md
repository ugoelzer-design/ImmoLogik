# ImmoLogik Cloud-Backup

ImmoLogik kann Produktionsdaten automatisch in ein Cloud-Ziel sichern. Aktuell vorgesehen sind OneDrive und Google Drive. Beide laufen ueber `rclone`, damit das Ziel spaeter austauschbar bleibt.

## Was wird gesichert?

- PostgreSQL-Datenbank als SQL-Dump
- MinIO-Dateien als `.tar.gz`-Archiv

Der App-Code liegt separat in GitHub und ist nicht der Hauptzweck dieses Backups.

## Zielbild

Im Cloud-Ordner liegen wenige, gut lesbare Dateien:

- `immologik-postgres-latest.sql`
- `immologik-files-latest.tar.gz`
- zusaetzlich timestamped Backups fuer kurze Rueckgriffe, standardmaessig 7 Tage

`latest` wird bei jedem Lauf aktualisiert. Aeltere timestamped Dateien werden nach `BACKUP_KEEP_DAYS` entfernt.

## Coolify-Konfiguration

Environment Variables:

- `BACKUP_REMOTE=onedrive:ImmoLogik Backups`
- `BACKUP_KEEP_DAYS=7`
- `DATABASE_URL` wird verwendet, wenn gesetzt. Andernfalls nutzt der Backup-Container `POSTGRES_DB`, `POSTGRES_USER` und `POSTGRES_PASSWORD`.

Fuer Google Drive kann spaeter z.B. genutzt werden:

- `BACKUP_REMOTE=gdrive:ImmoLogik Backups`

## Einmalige rclone-Anmeldung

Der `backup`-Service nutzt das Volume `rclone_config` fuer die rclone-Konfiguration.

Einmalig muss im Backup-Container ein Remote eingerichtet werden:

```sh
rclone config
```

Dabei fuer OneDrive einen Remote-Namen wie `onedrive` waehlen. Fuer Google Drive entsprechend `gdrive`.

## Scheduled Task

In Coolify unter der Resource:

1. `Scheduled Tasks` oeffnen.
2. `+ Add` klicken.
3. Service/Container: `backup`.
4. Command:

```sh
run-cloud-backup.sh
```

5. Zeitplan: taeglich nachts, z.B. 02:30.

Nach dem ersten Lauf sollte im OneDrive-Ordner mindestens `immologik-postgres-latest.sql` liegen.
