# ImmoLogik Coolify Status - 2026-05-14

## Aktueller stabiler Stand

- GitHub Repository: `ugoelzer-design/ImmoLogik`
- Branch: `master`
- Deployter Commit: `6fdff05`
- Coolify Projekt: `ImmoLogik`
- Coolify Resource: ImmoLogik Docker Compose Deployment
- Build Pack: `Docker Compose`
- Base Directory: `/`
- Docker Compose Location aktuell: `/docker-compose.coolify.images.yml`
- Fruehere Build-Compose als Rueckfall: `/docker-compose.coolify.yml`

## Erreichbarkeit

- Coolify Admin-Oberflaeche: `http://178.104.65.232:8000`
- ImmoLogik direkter IP-Test: `http://178.104.65.232:8081`
- Basic Auth ist aktiv.
- Browser-Login-User: `immologik`
- Browser-Login-Passwort: nicht dokumentiert.

## Wichtige Environment-Konfiguration

- `GATEWAY_PUBLIC_BIND=178.104.65.232:8081`
- `NEXT_PUBLIC_API_BASE_URL=http://178.104.65.232:8081/api/v1`
- `DOCUMENTS_PUBLIC_API_BASE_URL=http://178.104.65.232:8081/api/v1`
- `CORS_ALLOWED_ORIGINS=http://178.104.65.232:8081`
- `POSTGRES_PASSWORD`: gesetzt, nicht dokumentiert.
- `DATABASE_URL`: optional explizit setzen, wenn `POSTGRES_PASSWORD` URL-Sonderzeichen enthaelt.
  - Beispiel: ein Slash `/` im Passwort muss in der URL als `%2F` geschrieben werden.
- `MINIO_ROOT_PASSWORD`: gesetzt, nicht dokumentiert.
- `BASIC_AUTH_HASH`: gesetzt, nicht dokumentiert.

## Behobene Deployment-Probleme

- Caddyfile-Mount-Problem in Coolify behoben.
  - Gateway verwendet jetzt `deploy/Caddyfile.Dockerfile`.
  - Die Caddyfile wird ins Gateway-Image kopiert statt als Datei gemountet.
- Port-Konflikt auf `8080` umgangen.
  - Direkter Testzugriff laeuft auf `8081`.
- `BASIC_AUTH_HASH` in Coolify korrekt mit verdoppelten Dollarzeichen gesetzt.
  - Beispielprinzip: `$2a$14$...` wird in Coolify als `$$2a$$14$$...` gespeichert.

## Gepruefter Zustand

- Deployment laeuft fehlerfrei durch.
- Container starten erfolgreich.
- Direkter Browser-Test ueber `http://178.104.65.232:8081` funktioniert.
- Dashboard und App-Navigation wurden kurz geprueft.
- Web-Tests nach Dashboard-Umbau: `pnpm --dir apps/web run test` erfolgreich, 90 Tests bestanden.
- Web-Build nach Dashboard-Umbau: `pnpm --dir apps/web run build` erfolgreich.
- Web-Tests nach Objektakten-Umbau: `pnpm --dir apps/web run test` erfolgreich, 91 Tests bestanden.
- Web-Build nach Objektakten-Umbau: `pnpm --dir apps/web run build` erfolgreich.
- Web-Tests nach Pflichtdokument-Logik: `pnpm --dir apps/web run test` erfolgreich, 94 Tests bestanden.
- Web-Build nach Pflichtdokument-Logik: `pnpm --dir apps/web run build` erfolgreich.
- Web-Tests nach Pflichtluecken-Platzhalter-Aktion: `pnpm --dir apps/web run test` erfolgreich, 95 Tests bestanden.
- Web-Build nach Pflichtluecken-Platzhalter-Aktion: `pnpm --dir apps/web run build` erfolgreich.
- Web-Tests nach Mieterakten-Erweiterung: `pnpm --dir apps/web run test` erfolgreich, 96 Tests bestanden.
- Web-Build nach Mieterakten-Erweiterung: `pnpm --dir apps/web run build` erfolgreich.
- Coolify-Compose erlaubt jetzt eine explizite `DATABASE_URL`, damit Postgres-Passwoerter mit URL-Sonderzeichen Prisma nicht mehr crashen lassen.
- Nach einem Build-bedingten Lastproblem wurde der Server neu gestartet und die ImmoLogik-Container wurden wieder gestartet; App lief danach wieder ueber `http://178.104.65.232:8081`.
- Neue Zielarchitektur aktiv: GitHub Actions baut API-, Web- und Gateway-Images und pusht sie nach GHCR; Coolify pullt nur noch fertige Images.
- GitHub Actions Workflow `Publish ImmoLogik Images` lief fuer Commit `6fdff05` erfolgreich durch.
- GHCR-Packages `immologik-api`, `immologik-web` und `immologik-gateway` wurden auf public gestellt, damit der Server ohne Registry-Login pullen kann.
- Server-Pulltests fuer die GHCR-Images waren erfolgreich.
- Coolify wurde auf `/docker-compose.coolify.images.yml` umgestellt; Redeploy danach erfolgreich, App laeuft.

## Aktive Build-Entlastung

- GitHub Actions Workflow-Datei: `.github/workflows/publish-images.yml`
  - baut `ghcr.io/ugoelzer-design/immologik-api:master`
  - baut `ghcr.io/ugoelzer-design/immologik-web:master`
  - baut `ghcr.io/ugoelzer-design/immologik-gateway:master`
  - tagged zusaetzlich mit dem Commit-SHA.
- Aktive Coolify-Compose-Datei ohne lokale Build-Schritte: `docker-compose.coolify.images.yml`
  - verwendet fertige GHCR-Images fuer `api`, `web` und `gateway`.
  - behaelt Postgres-, MinIO- und Volume-Namen unveraendert, damit Daten erhalten bleiben.
  - verwendet `IMAGE_TAG=master` als Standard.
- Effekt:
  - Coolify fuehrt keinen lokalen Docker-Build fuer API, Web oder Gateway mehr aus.
  - Deployments sollen den kleinen CPX22-Server deutlich weniger belasten.
  - Falls die GHCR-Packages spaeter wieder privat werden, muss in Coolify vorher ein Registry-Zugang fuer `ghcr.io` mit `read:packages` hinterlegt werden.

## Inhaltlicher App-Zustand

Die App ist nicht nur ein leeres Deployment, sondern bereits ein lauffaehiger Verwaltungs-Prototyp mit folgenden Bereichen:

- Dashboard
  - zeigt echte Kennzahlen aus vorhandenen API-Daten.
  - Kennzahlen umfassen Objekte, Mieter, aktive/ausstehende Mieter, Vertraege, bald auslaufende Vertraege, Dokumente, offene Dokumentfaelle und offene Ablesekampagnen.
  - statische Aufgaben/Aktivitaeten wurden entfernt; Hinweise werden aus echten Daten abgeleitet.
- Objekte
  - Objektliste mit Suche, Kennzahlen und Detailansicht.
  - Objektakte buendelt jetzt Einheiten, Mieter, Vertraege, Dokumente, offene Dokumentfaelle und Ablesekampagnen in einer zentralen Sicht.
  - Objektakte zeigt fehlende Pflichtdokumente aus dem erwarteten Sollbestand.
  - Objektakte bietet Schnellzugriffe in Uebersicht, Wohnungen, Mietverhaeltnisse, Zaehler, Nebenkosten und Dokumente.
  - neue Objekte koennen angelegt werden.
  - Objekt-IDs werden automatisch als `WEG-001`, `WEG-002` usw. vergeben.
  - Objektloeschung ist serverseitig geschuetzt, wenn verknuepfte Daten existieren.
- Mieter
  - Mieter koennen angelegt, bearbeitet und geloescht werden.
  - Mieter sind mit Objekt und Mieteinheit verknuepft.
  - Mieterakte zeigt jetzt Vertrag, Einheit/Mietstatus, Dokumente, offene Dokumentfaelle und vorbereiteten Mieterzugang.
  - Verknuepfte Dokumente und offene Dokumentfaelle werden angezeigt.
- Vertraege
  - Vertragsliste mit Objekt-/Mieterbezug.
  - Vertraege koennen angelegt, bearbeitet und geloescht werden.
  - Mietereinheit wird aus der Mieterzuordnung abgeleitet.
  - Vertragsdaten werden in der Mieterakte sichtbar gemacht.
- Finanzen
  - Bereichsstruktur fuer Mietuebersicht, Nebenkosten und Bankkonto.
  - Mietuebersicht nutzt Mieteinheiten mit Soll-/Ist-Mieten und Zahlungsstatus.
  - Nebenkosten hat Arbeitsstand, Validierung und Freigabe-/Archivlogik ueber API.
  - Bankkonto ist aktuell nur ein vorbereiteter Platzhalter.
- Ablesungen
  - Ablesekampagnen koennen je Objekt und Berichtsjahr erzeugt werden.
  - fuer aktive Mieter werden Zugangs-Token erzeugt.
  - separate Token-Seite fuer Mieterablesungen ist vorhanden.
  - Standardzaehler fuer Heizung, Kaltwasser und Warmwasser werden automatisch angelegt.
- Dokumente
  - Dokumentenbestand mit Suche, Filtern, Export und Detailansicht.
  - Upload mit MinIO-Ablage.
  - fehlende Dokumente koennen als Platzhalter erfasst werden.
  - Pflichtlogik erkennt erwartete Objekt- und Einheitsdokumente fuer das letzte Abrechnungsjahr.
  - Pflichtluecken koennen in der Objektakte per Klick als `Fehlt`-Dokument-Platzhalter angelegt werden.
  - Aktuelle Pflichtregeln: Jahresreport WEG je Objekt, Mietvertrag je aktiver/ausstehender Einheit, Nebenkostenabrechnung und Jahresreport Wohnung je aktiver/ausstehender Einheit.
  - Metadaten, Objekt-/Einheitenzuordnung, Status und Datei-Nachreichung sind vorhanden.
  - offene Dokumentfaelle werden aus fehlender Datei, fehlender Zuordnung oder Pruefstatus abgeleitet.

## Aktuelle fachliche Grenzen

- Dashboard ist jetzt ein echtes Kennzahlen-Cockpit, braucht aber spaeter noch fachlich definierte Schwellen, Fristen und priorisierte Aufgabenlogik.
- Es gibt noch keine echte Nutzer-/Rollenverwaltung in der Oberflaeche; Zugriffsschutz erfolgt derzeit ueber Basic Auth.
- Mieterzugang ist fachlich vorbereitet, aber noch nicht als echter Login-/Portalbereich umgesetzt.
- Bankkonto/Kontobewegungen sind nur als Struktur vorbereitet.
- Nebenkostenlogik ist vorhanden, braucht aber fachliche Validierung mit realen Daten.
- Dokumentenlogik erkennt erste Pflichtdokumente, aber Kategorien, Fristen und Sonderfaelle sollten fachlich weiter geschärft werden.
- Ablesungen sind technisch angelegt, aber Versand/Kommunikation an Mieter ist noch nicht als echter Workflow umgesetzt.
- Die Demo-/Seed-Daten sind brauchbar, aber noch nicht repraesentativ genug fuer eine starke Produktdemo.

## Naechste sinnvolle Produktverbesserungen

1. Mieterportal konzipieren und umsetzen: sicherer Zugang fuer Mieter zu Stammdaten, Vertrag, Dokumenten und Ablesungen.
2. Objektakte weiter vertiefen: Mieter-/Vertragslisten direkt in der Akte anzeigen statt nur Kennzahlen und Sprungziele.
3. Dashboard-Hinweise fachlich priorisieren: Fristen, Verantwortliche, Eskalationsstufen und konkrete naechste Aktionen.
4. Pflichtdokument-Regeln fachlich ausbauen: weitere Kategorien, Stichtage, Sonderfaelle und optionale Regeln.
5. Nebenkosten mit einem echten Beispielobjekt pruefen und daraus UI/Validierung schaerfen.
6. Ablese-Workflow komplettieren: Kampagne, Mieterlink, Ruecklaufstatus, Erinnerung, Abschluss.

## Offen fuer spaeter

- Echte Domain beschaffen oder festlegen.
- DNS auf Server-IP zeigen lassen.
- Coolify-Domain/HTTPS sauber einrichten.
- Environment-URLs von direkter IP auf finale Domain umstellen.
- Optional: Resource-Name in Coolify kosmetisch vereinfachen.
