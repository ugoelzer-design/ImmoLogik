# ImmoLogik Web

Next.js-Frontend für die ImmoLogik-Wohnungsverwaltung. Die App läuft standardmäßig auf `http://localhost:3001` und spricht mit der NestJS-API über `NEXT_PUBLIC_API_BASE_URL`.

## Wichtige Bereiche

- `app/`: App-Router-Routen inklusive `error.tsx` Error Boundaries pro Bereich
- `features/`: Fachmodule für Dashboard, Dokumente, Finanzen, Mieter, Verträge und Zählerablesungen
- `lib/api/`: gemeinsamer API-Client und zentrale Endpoint-Konstanten
- `vitest.config.ts`: Test-Setup für Unit- und UI-Tests mit jsdom

## Entwicklung

```bash
pnpm --dir apps/web install
pnpm --dir apps/web dev
```

## Tests

```bash
pnpm --dir apps/web test
```

Aktuell abgedeckt sind vor allem:

- Service-Tests für API-Wrapper
- UI-Tests für Dokumente und Mietübersicht
- Utility-Tests für Dashboard-Metriken

## Fehlerbehandlung

Bereichsspezifische Error Boundaries liegen unter `app/**/error.tsx`. Die gemeinsame Darstellung steckt in `components/ui/error-display.tsx`.

## API-Anbindung

Die Frontend-Services verwenden den gemeinsamen Client aus `lib/api/client.ts` und zentrale Pfade aus `lib/api/endpoints.ts`, damit Request-URLs nicht an vielen Stellen dupliziert werden.
