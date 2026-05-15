# ImmoLogik API

NestJS-Backend für die ImmoLogik-Wohnungsverwaltung. Die API startet standardmäßig auf `http://localhost:4000`, verwendet den globalen Prefix `api/v1` und stellt Swagger unter `http://localhost:4000/api/docs` bereit.

## Wichtige Bereiche

- `src/main.ts`: Bootstrap, CORS, Swagger und Umgebungsprüfungen
- `src/config/app.constants.ts`: zentrale Konstanten für Prefixe, Swagger, CORS und Auth-Konfiguration
- `src/modules/`: Fachmodule für Objekte, Dokumente, Mieter, Verträge, Mieteinheiten, Zählerablesungen und Nebenkostenabrechnungen
- `prisma/`: Datenmodell, Migrationen und Seed

## Entwicklung

```bash
pnpm --dir apps/api install
pnpm --dir apps/api start:dev
```

## Tests

```bash
pnpm --dir apps/api test
pnpm --dir apps/api test:e2e
```

Vorhanden sind aktuell vor allem Service-Unit-Tests für:

- `objects`
- `documents`
- `tenants`
- `contracts`
- `rent-units`

Zusätzlich gibt es einen API-E2E-Test in `test/app.e2e-spec.ts`, der den echten `api/v1`-Prefix sowie das Guard-Verhalten für geschützte und öffentliche Routen prüft.

## Sicherheit und Konfiguration

- `AUTH_MODE=dev` ist in Produktion absichtlich blockiert.
- Für `AUTH_MODE=entra` müssen `ENTRA_TENANT_ID` und `ENTRA_CLIENT_ID` gesetzt sein. Bearer-Token werden gegen die Microsoft-JWKS des Tenants validiert. Falls die API eine App-ID-URI als Audience nutzt, kann `ENTRA_AUDIENCE` gesetzt werden.
- Swagger/OpenAPI ist in `NODE_ENV=production` standardmäßig deaktiviert. Nur bei Bedarf mit `API_DOCS_ENABLED=true` freischalten.
- Erlaubte Frontend-Origins werden über `CORS_ALLOWED_ORIGINS` als kommaseparierte Liste gesetzt.
- Ohne `CORS_ALLOWED_ORIGINS` wird `WEB_ORIGIN` verwendet, danach als Fallback `http://localhost:3001`.
