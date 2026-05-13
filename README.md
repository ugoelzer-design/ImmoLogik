# ImmoLogik

Monorepo für das ImmoLogik-Tool mit Next.js-Frontend (`apps/web`) und NestJS-API (`apps/api`).

## Schnellstart

```bash
pnpm install
pnpm dev
```

Frontend:

- `http://localhost:3001`

Backend:

- `http://localhost:4000/api/v1`
- Swagger: `http://localhost:4000/api/docs`

## Wichtige Skripte

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm test:api
pnpm test:e2e
pnpm test:web
```

## Struktur

- `apps/web`: UI, Feature-Module, Error Boundaries und Vitest-Tests
- `apps/api`: REST-API, Prisma, Swagger und Jest-Tests
- `scripts`: Hilfsskripte fuer lokale Entwicklung und Migrationen

## Aktueller Stand

- Bereichsspezifische Error Boundaries sind im Frontend vorhanden.
- Swagger/OpenAPI ist im Backend eingerichtet.
- Testabdeckung für zentrale Services, ausgewählte UI-Flows und einen API-E2E-Pfad ist vorhanden.
- Die lokale Web-App läuft standardmäßig auf Port `3001`; CORS wird über `CORS_ALLOWED_ORIGINS` konfiguriert.
