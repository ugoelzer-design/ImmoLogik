# ImmoLogik Deployment mit Coolify

Stand: 13.05.2026

## Zielbild

ImmoLogik wird als Docker-Compose-Stack in Coolify betrieben:

- `web`: Next.js-Frontend auf Port `3001`
- `api`: NestJS-API auf Port `4000`
- `gateway`: Caddy-Gateway mit Basic Auth auf Port `8080`
- `postgres`: interne Postgres-Datenbank
- `minio`: interne Dokumentenablage
- `minio-init`: legt den S3-Bucket an

Web, API, Postgres und MinIO werden nicht direkt öffentlich exponiert. Nach außen geht nur der `gateway`.

## Zielserver

- Anbieter: Hetzner Cloud
- Server: CPX22
- Hostname: `ubuntu-4gb-nbg1-1`
- IPv4: `178.104.65.232`
- Ressourcen: 2 vCPU, 4 GB RAM, 80 GB lokaler Speicher

Der Server reicht fuer den ersten ImmoLogik/Coolify-Betrieb aus. Wichtig ist, Build- und Laufzeitressourcen nach dem ersten Deploy zu beobachten, weil Coolify und die App-Container auf derselben Maschine laufen.

## Wichtiger Sicherheitshinweis

`AUTH_MODE=dev` lässt die App ohne echte Benutzerprüfung laufen und darf nur lokal verwendet werden. Die Coolify-Compose-Dateien starten die API standardmäßig mit `NODE_ENV=production` und `AUTH_MODE=entra`; ohne Entra-Konfiguration bricht der Start bewusst ab.

Für den ersten Hetzner/Coolify-Start ist Basic Auth am Gateway vorgesehen:

1. `GATEWAY_PUBLIC_BIND` auf `127.0.0.1:8080` lassen und per SSH-Tunnel zugreifen.
2. Oder temporär `GATEWAY_PUBLIC_BIND=178.104.65.232:8080` setzen. Dann schützt Basic Auth den Zugriff.

Ein Passwort-Hash wird so erzeugt:

```bash
docker run --rm caddy:2-alpine caddy hash-password --plaintext 'dein-langes-passwort'
```

Den ausgegebenen Hash als `BASIC_AUTH_HASH` in Coolify setzen.

## Coolify Resource anlegen

1. In Coolify ein neues Projekt oder die bestehende Projektgruppe öffnen.
2. Neue Resource erstellen.
3. Repository auswählen.
4. Build Pack: Docker Compose.
5. Compose-Datei setzen: `docker-compose.coolify.yml`.
6. Environment Variables aus `.env.coolify.example` übernehmen und Passwörter ersetzen.
7. Deploy starten.

## Ohne Domain starten

Für direkten Test über die Hetzner-IP:

```env
GATEWAY_PUBLIC_BIND=178.104.65.232:8080
NEXT_PUBLIC_API_BASE_URL=http://178.104.65.232:8080/api/v1
DOCUMENTS_PUBLIC_API_BASE_URL=http://178.104.65.232:8080/api/v1
CORS_ALLOWED_ORIGINS=http://178.104.65.232:8080
```

Aufruf danach:

- Web: `http://178.104.65.232:8080`
- API: `http://178.104.65.232:8080/api/v1`
- Swagger: `http://178.104.65.232:8080/api/docs`

Firewall-Minimum fuer diesen Test:

- SSH offen lassen.
- Coolify-UI nur solange offen lassen, wie es fuer Einrichtung und Betrieb noetig ist.
- Port `8080/tcp` nur oeffnen, wenn der direkte IP-Test gebraucht wird.
- Postgres, MinIO, API und Web nicht direkt oeffnen.

Sicherere Variante per SSH-Tunnel:

```env
GATEWAY_PUBLIC_BIND=127.0.0.1:8080
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080/api/v1
DOCUMENTS_PUBLIC_API_BASE_URL=http://127.0.0.1:8080/api/v1
CORS_ALLOWED_ORIGINS=http://127.0.0.1:8080
```

Dann lokal tunneln:

```bash
ssh -L 8080:127.0.0.1:8080 root@178.104.65.232
```

## Spaeter mit Domain

Sobald eine Domain vorhanden ist:

```env
NEXT_PUBLIC_API_BASE_URL=https://immologik.example.de/api/v1
DOCUMENTS_PUBLIC_API_BASE_URL=https://immologik.example.de/api/v1
CORS_ALLOWED_ORIGINS=https://immologik.example.de
```

Dann im Coolify-UI die Domain fuer den Gateway-Service setzen:

- Service: `gateway`
- Container-Port: `8080`
- Domain: `https://immologik.example.de`

Coolify/Traefik uebernimmt dann Routing und HTTPS-Zertifikate.

## Persistenz

Die Compose-Datei nutzt benannte Volumes:

- `postgres_data`
- `minio_data`

Diese Volumes muessen in Coolify/Server-Backups beruecksichtigt werden.

Fuer automatische OneDrive- oder Google-Drive-Backups siehe `docs/backup-cloud.md`.

## Nach Deploy pruefen

1. API erreichbar: `/api/v1`
2. Swagger erreichbar: `/api/docs`
3. Web erreichbar: `/`
4. Dokumenten-Storage-Status in der App pruefen.
5. Testobjekt, Dokument und Nebenkostenabrechnung anlegen.

## Postgres-Auth nach Crash oder Restore

Wenn der API-Container mit `P1000: Authentication failed` neu startet, zuerst diese Punkte pruefen:

1. In Coolify `DATABASE_URL` entfernen, wenn das Postgres-Passwort keine URL-Sonderzeichen enthaelt. Die Compose-Datei baut die URL dann automatisch aus `POSTGRES_USER`, `POSTGRES_PASSWORD` und `POSTGRES_DB`.
2. Falls `DATABASE_URL` gesetzt bleiben muss, muss das Passwort darin URL-encodiert sein. Beispiel: `/` wird `%2F`, `@` wird `%40`, `#` wird `%23`.
3. Sicherstellen, dass `ALTER USER` im App-Postgres-Container ausgefuehrt wurde, nicht in der Coolify-eigenen Datenbank oder einem alten Container.
4. Nach jeder Aenderung API neu starten, damit Prisma die aktualisierte Umgebung liest.

Gezielter Auth-Test im App-Postgres-Container:

```bash
docker exec -e PGPASSWORD='dein-postgres-passwort' -it <postgres-container> \
  psql -h 127.0.0.1 -U immologik -d immologik -c 'select current_user, current_database();'
```

Wenn dieser Test funktioniert, Prisma aber weiter `P1000` meldet, ist fast immer die im API-Container ankommende `DATABASE_URL` abweichend oder falsch encodiert.
