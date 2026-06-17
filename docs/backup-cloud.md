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
- `BACKUP_CRON="30 2 * * *"` fuer taeglich 02:30 UTC
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

## Automatischer Lauf

Empfohlen: `BACKUP_CRON` in Coolify setzen, z.B.:

```sh
BACKUP_CRON="30 2 * * *"
```

Der Backup-Container startet dann intern `crond` und fuehrt `run-cloud-backup.sh` taeglich um 02:30 UTC aus. Ohne `BACKUP_CRON` bleibt der Container fuer manuelle oder Coolify Scheduled Task-Laeufe bereit.

## Alternative: Coolify Scheduled Task

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

## Restore-Runbook

Der Restore ist bewusst ein manueller Admin-Ablauf. Nicht direkt gegen die laufende Produktion testen, sondern zuerst in einer neuen Test-Resource oder nach einem frischen Server-Snapshot.

### 1. Backup-Dateien pruefen

Im Backup-Container:

```sh
rclone lsf "$BACKUP_REMOTE"
rclone lsl "$BACKUP_REMOTE/immologik-postgres-latest.sql"
rclone lsl "$BACKUP_REMOTE/immologik-files-latest.tar.gz"
```

Erwartung:

- `immologik-postgres-latest.sql` ist vorhanden und groesser als 0 Byte.
- `immologik-files-latest.tar.gz` ist vorhanden, wenn MinIO-Dateien gesichert wurden.

Am 17.06.2026 verifiziert:

- `immologik-postgres-latest.sql`
- `immologik-files-latest.tar.gz`
- timestamped Dateien `2026-06-17_053439`
- SQL-Latest-Groesse: `32120` Byte

### 2. Zielumgebung vorbereiten

1. Neue Test-Resource oder Server-Snapshot anlegen.
2. App einmal starten lassen, damit Container und Volumes existieren.
3. API/Web stoppen, damit waehrend des Restores keine Schreibzugriffe stattfinden.
4. Postgres- und MinIO-Container identifizieren:

```sh
docker ps -a --format 'table {{.Names}}\t{{.Status}}' | grep -E 'postgres|minio|backup'
```

### 3. Datenbank wiederherstellen

Variablen setzen:

```sh
BACKUP_CONTAINER=<backup-container>
POSTGRES_CONTAINER=<postgres-container>
```

Im Backup-Container die SQL-Datei lokal ablegen und auf den Host kopieren:

```sh
docker exec "$BACKUP_CONTAINER" sh -c 'mkdir -p /tmp/restore && rclone copy "$BACKUP_REMOTE/immologik-postgres-latest.sql" /tmp/restore'
docker cp "$BACKUP_CONTAINER":/tmp/restore/immologik-postgres-latest.sql ./immologik-postgres-latest.sql
docker cp ./immologik-postgres-latest.sql "$POSTGRES_CONTAINER":/tmp/immologik-postgres-latest.sql
```

Restore im Postgres-Container ausfuehren:

```sh
docker exec -it "$POSTGRES_CONTAINER" sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/immologik-postgres-latest.sql'
```

Danach grob pruefen:

```sh
docker exec -it "$POSTGRES_CONTAINER" sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"'
```

### 4. Dateien wiederherstellen

Wenn `immologik-files-latest.tar.gz` vorhanden ist:

```sh
MINIO_CONTAINER=<minio-container>
docker exec "$BACKUP_CONTAINER" sh -c 'mkdir -p /tmp/restore && rclone copy "$BACKUP_REMOTE/immologik-files-latest.tar.gz" /tmp/restore'
docker cp "$BACKUP_CONTAINER":/tmp/restore/immologik-files-latest.tar.gz ./immologik-files-latest.tar.gz
docker cp ./immologik-files-latest.tar.gz "$MINIO_CONTAINER":/tmp/immologik-files-latest.tar.gz
docker exec -it "$MINIO_CONTAINER" sh -c 'tar -xzf /tmp/immologik-files-latest.tar.gz -C /data'
```

Falls der MinIO-Datenpfad im Container abweicht, vorher pruefen:

```sh
docker exec -it "$MINIO_CONTAINER" sh -c 'ls -la /data /minio-data 2>/dev/null || true'
```

### 5. App pruefen

1. API/Web wieder starten.
2. `/api/v1/health` pruefen.
3. Dashboard oeffnen.
4. Objekte, Mieter, Vertraege und Dokumentliste pruefen.
5. Ein Dokument herunterladen.

Der Restore gilt erst als bestanden, wenn Datenbankdaten sichtbar sind und mindestens ein Dokument erfolgreich geoeffnet werden kann.
