# ImmoLogik Multi-Tenancy Plan

Stand: 17.06.2026

## Verifizierter Ist-Stand

- `Tenant` und `User` existieren bereits im Prisma-Schema.
- `User.tenantId` verweist auf `Tenant`.
- Fachmodelle sind teilweise mandantengebunden:
  - `PropertyObject` hat `appTenantId` als Pilot.
  - `Document` hat `appTenantId`.
  - `RentUnit` hat `appTenantId`.
  - `Mieter` hat `appTenantId`.
  - `Vertrag` hat `appTenantId`.
  - `Meter`
  - `MeterReading`
  - `ReadingCampaign`
  - `ReadingAccess`
  - `UtilityStatement`
- `AuthGuard` prueft Entra-Bearer-Token und legt User-/Tenant-Kontext am Request ab.
- `@Public()` Endpunkte existieren fuer Health und Mieter-Ablesungen.

## Zielbild

Jeder eingeloggte Nutzer gehoert zu genau einem App-Mandanten. Alle fachlichen Daten werden ueber `appTenantId` isoliert. Query-Filter und Schreiboperationen muessen diesen Mandanten immer erzwingen.

Begriff:

- `Tenant`: App-Mandant, z.B. eine Hausverwaltung oder ein interner Bestand.
- `Mieter`: fachlicher Mieter einer Wohnung. Nicht mit App-Mandant verwechseln.

## Empfohlene Umsetzung in Phasen

### Phase 1: Request-Kontext

1. Entra-Token-Payload um relevante Claims erweitern:
   - `oid`
   - `preferred_username`
   - `name`
   - optional `roles`
2. `AuthGuard` laesst nach Tokenpruefung einen `AuthenticatedUser` am Request.
3. Neuer Service `CurrentUserService` oder Decorator `@CurrentUser()`.
4. In `dev`-Mode festen Mandanten aus Env nutzen:
   - `DEV_TENANT_SLUG=default`
   - `DEV_USER_EMAIL=admin@immologik.local`

### Phase 2: Mandanten-Bootstrap

1. Seed oder Migration legt Default-Mandanten an:
   - `name=Default`
   - `slug=default`
2. Bestehende Nutzer werden diesem Mandanten zugeordnet.
3. Entra-Login mappt `preferred_username` oder `oid` auf `User`.
4. Fehlende User werden anfangs nicht automatisch angelegt, sondern mit 403 abgewiesen.

### Phase 3: Schema-Erweiterung

Neue Pflichtspalte `appTenantId` auf allen fachlichen Root-/Kindtabellen.

Empfohlen:

- `PropertyObject.appTenantId`
- `Document.appTenantId`
- `RentUnit.appTenantId`
- `Mieter.appTenantId`
- `Vertrag.appTenantId`
- `Meter.appTenantId`
- `MeterReading.appTenantId`
- `ReadingCampaign.appTenantId`
- `ReadingAccess.appTenantId`
- `UtilityStatement.appTenantId`

Warum auch Kindtabellen?

- Schnellere Filter.
- Leichtere Sicherheitspruefung.
- Schutz gegen falsch verknuepfte IDs in Schreiboperationen.

### Phase 4: Datenmigration

1. Default-Mandant erzeugen.
2. Alle bestehenden fachlichen Datensaetze auf Default-Mandant setzen.
3. Danach `appTenantId` auf `NOT NULL` setzen.
4. Indizes/Constraints mandantenfaehig machen.

Beispiele:

- `PropertyObject.displayId` nicht mehr global unique, sondern `@@unique([appTenantId, displayId])`.
- `Document.storageKey` kann global unique bleiben.
- `Mieter @@unique([objectId, rentUnitId])` bleibt fachlich ok, optional zusaetzlich `appTenantId`.
- `Meter @@unique([objectId, rentUnitId, type, label])` bleibt fachlich ok.
- `ReadingCampaign @@unique([objectId, reportYear])` bleibt fachlich ok.

### Phase 5: Service-Isolation

Alle Services erhalten Tenant-Kontext und filtern immer mit `appTenantId`.

Prioritaet:

1. `objects.service.ts`
2. `documents.service.ts`
3. `rent-units.service.ts`
4. `tenants.service.ts`
5. `contracts.service.ts`
6. `meter-readings.service.ts`
7. `utility-statements.service.ts`

Schreiboperationen muessen Fremd-IDs gegen denselben Mandanten pruefen:

- Objekt gehoert zu Mandant.
- Einheit gehoert zu Mandant.
- Mieter gehoert zu Mandant.
- Vertrag/Zaehlkampagne/Dokument bleibt im selben Mandanten.

### Phase 6: Public Token Endpunkte

Die Ablese-Endpunkte bleiben `@Public()`, duerfen aber nur ueber `ReadingAccess.token` laden.

Sicherheitsregel:

- Token muss eindeutig bleiben.
- Query darf nicht mandantenlos ueber freie IDs laufen.
- Antwort darf nur Daten der verknuepften `ReadingAccess` liefern.

### Phase 7: Frontend

Fuer den ersten Eigenbetrieb kein Mandanten-Wechsler noetig.

Spaeter:

- Anzeige aktiver Mandant im User-Menue.
- Kein Mandantenwechsel, solange ein User nur einem Mandanten zugeordnet ist.
- Bei Multi-Mandanten-Usern: explizite Auswahl und Header `X-App-Tenant`.

## Reihenfolge fuer Umsetzung

1. Request-Kontext + Tests. Erledigt: AuthGuard setzt `request.user`, `@CurrentUser()` ist vorhanden.
2. Default-Mandant-Seed. Erledigt: Prisma-Seed legt `Tenant(default)` und Admin-User idempotent an.
3. Migration `PropertyObject.appTenantId` mit Backfill. Erledigt fuer Objekt-Pilot.
4. Objekte mandantenfaehig machen. Erledigt: Objekt-Endpunkte nutzen `@CurrentUser()` und filtern nach App-Mandant.
5. Dokumente mandantenfaehig machen. Erledigt: Dokument-Endpunkte nutzen `@CurrentUser()`, Dokumente tragen `appTenantId`, Listen/Export/Duplizierung/Objektbezug sind mandantengefiltert.
6. Mieteinheiten und fachliche Mieter mandantenfaehig machen. Erledigt: Endpunkte nutzen `@CurrentUser()`, Datensaetze tragen `appTenantId`, Objekt-/Einheitsbezug wird gegen den App-Mandanten geprueft.
7. Vertraege mandantenfaehig machen. Erledigt: Endpunkte nutzen `@CurrentUser()`, Datensaetze tragen `appTenantId`, Objekt-/Mieter-/Einheitsbezug wird gegen den App-Mandanten geprueft.
8. Restliche Services nachziehen.
9. Entra-User-Mapping aktivieren.

## Risiken

- Begriffskollision `Tenant` vs. fachlicher `Mieter`.
- Vergessene Query ohne `appTenantId`.
- Public Ablese-Token duerfen keinen Mandantenwechsel erlauben.
- Ein harter DB-Constraint-Wechsel sollte erst nach Backup und Restore-Test erfolgen.

## Empfehlung

Naechster Code-Schritt: Zaehler und Ablesekampagnen mandantenfaehig machen und weitere Fremd-ID-Pruefungen gegen denselben App-Mandanten nachziehen.
