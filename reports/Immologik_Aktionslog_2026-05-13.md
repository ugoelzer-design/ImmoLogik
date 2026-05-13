# ImmoLogik - Aktionslog

**Datum:** 13.05.2026

## Umgesetzt

- `.env.example` auf den lokalen Standard-Port `3001` fuer die Web-App angepasst.
- `CORS_ALLOWED_ORIGINS` als konfigurierbare, kommaseparierte CORS-Origin-Liste eingefuehrt.
- API-Konfiguration nutzt nun `CORS_ALLOWED_ORIGINS`, danach `WEB_ORIGIN`, danach `http://localhost:3001` als Fallback.
- Swagger-Konfiguration um `utility-statements` fuer Nebenkostenabrechnungen ergaenzt.
- README/API-Dokumentation an die konfigurierbare CORS-Logik und den aktuellen Modulstand angepasst.
- Zusaetzliches `apps/web/pnpm-lock.yaml` entfernt; die Next-Build-Warnung zum doppelten Lockfile tritt danach nicht mehr auf.
- Ausgeschlossene Nebenkosten-Altdateien entfernt:
  - `apps/web/features/finances/components/NebenkostenAbrechnungen1.tsx`
  - `apps/web/features/finances/components/Master/`
- Physische `.bak*`-Altlasten im `apps`-Baum entfernt.
- Ungenutzte Mock-Datendateien entfernt:
  - `mock-contracts.ts`
  - `mock-documents.ts`
  - `mock-objects.ts`
  - `mock-tenants.ts`
- `apps/web/tsconfig.json` bereinigt, da die ausgeschlossenen Altdateien entfernt wurden.

## Verifikation

- `pnpm run test`: erfolgreich
  - API: 70 Tests erfolgreich
  - Web: 87 Tests erfolgreich
- `pnpm run build`: erfolgreich
- `pnpm --dir apps/api run prisma:validate`: erfolgreich

## Hinweise

- Die grobe Repo-Lage ist weiterhin dirty, weil der bestehende Arbeitsstand sehr viele Feature-Dateien, Migrationen, Reports und Dokumente umfasst.
- Die eigentliche Nebenkosten-Datenhoheit ist noch nicht fertig bereinigt: API-Persistenz ist vorhanden, aber localStorage-Fallbacks und Objektmodul-Stammdatenpfade bleiben ein Folgethema.
- Entra-JWT-Validierung bleibt offen und ist weiterhin der zentrale Produktions-Blocker.

## Nachtrag: Nebenkosten-Datenhoheit

- `syncWorkspace()` loescht nicht mehr global alle nicht eingehenden Nebenkostenabrechnungen.
- Loeschungen sind jetzt auf die im Payload betroffenen `objectDisplayId`-Scopes begrenzt.
- Archivierte Abrechnungen werden durch den Workspace-Sync nicht mehr geloescht.
- Ein leerer `settlements`-Payload loescht keinen Bestand mehr.
- Neuer API-Test ergaenzt: Leere Workspace-Synchronisation darf den Bestand nicht wipen.
- Frontend-Nebenkosten laden API-Ergebnisse jetzt auch dann als fuehrend, wenn die API erfolgreich eine leere Liste liefert.
- localStorage wird im aktiven Nebenkostenmodul nur noch als Fallback genutzt, wenn der API-Ladevorgang fehlschlaegt.
- Der ungenutzte Hook `useNebenkostenStorage` wurde entfernt; damit schreibt der Nebenkosten-Normalpfad nicht mehr parallel in localStorage.

## Verifikation Nachtrag

- `pnpm run test`: erfolgreich
  - API: 71 Tests erfolgreich
  - Web: 87 Tests erfolgreich
- `pnpm run build`: erfolgreich
- `pnpm --dir apps/api run prisma:validate`: erfolgreich

## Nachtrag: Coolify/Hetzner-Deployment vorbereitet

- `apps/api/Dockerfile` fuer NestJS/API inklusive Prisma-Generate und Migration beim Containerstart angelegt.
- `apps/web/Dockerfile` fuer Next.js-Webapp auf Port `3001` angelegt.
- `.dockerignore` ergaenzt, damit Build-Kontext und Artefakte sauber bleiben.
- `docker-compose.coolify.yml` fuer Coolify erstellt:
  - `web`
  - `api`
  - `postgres`
  - `minio`
  - `minio-init`
- `.env.coolify.example` als sichere Startvorlage angelegt. Standard ist localhost-Binding fuer SSH-Tunnel; direkte IP-Freigabe ist dokumentiert.
- Deployment-Doku erstellt: `docs/deployment-coolify.md`.
- Root-`pnpm-lock.yaml` aktualisiert, damit Docker/Coolify mit `--frozen-lockfile` reproduzierbar bauen kann.

## Verifikation Coolify/Deployment

- `docker compose --env-file .env.coolify.example -f docker-compose.coolify.yml config`: erfolgreich.
- Lokaler Docker-Build fuer `api` und `web` erfolgreich; Images wurden erzeugt:
  - `immologik-api:latest`
  - `immologik-web:latest`
