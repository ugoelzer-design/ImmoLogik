# Immologik — Code-Analyse & Statusreport-Abgleich
**Datum:** 13.05.2026

---

## 1. Bestätigte offene Punkte

**Entra ID Auth fehlt (Produktions-Blocker)**
`auth.guard.ts` wirft im `entra`-Modus sofort `UnauthorizedException` mit explizitem TODO. Im aktuellen Betrieb läuft alles über `AUTH_MODE=dev`, d.h. keinerlei Authentifizierung. Solange dieser Punkt offen ist, darf das System nicht produktiv gehen.

**CORS hardcodiert auf localhost**
`WEB_ALLOWED_ORIGINS = ["http://localhost:3001"]` in `app.constants.ts`. Für Produktion muss dies auf die echte Domain umgestellt werden.

---

## 2. Statusreport-Korrekturen (Punkte inzwischen erledigt)

**Rate Limiting — war als „nicht eingebunden" gemeldet, ist aber aktiv**
`TokenRateLimitMiddleware` ist korrekt in `meter-readings.module.ts` für die öffentlichen Token-Endpunkte registriert. Dieser Punkt ist erledigt.

**Mock-Daten-Importe — waren gemeldet, sind bereinigt**
`mock-contracts.ts`, `mock-tenants.ts`, `mock-documents.ts` existieren noch als Dateien, werden aber nirgends mehr importiert. Die Services rufen die echte API auf. Punkt weitgehend erledigt — Dateien können gelöscht werden.

---

## 3. Neu identifizierte Probleme (nicht im Statusreport)

**Nebenkosten komplett in localStorage gespeichert (kritisch)**
`useNebenkostenStorage`, `useObjektModule` und die Nebenkosten-Komponenten schreiben alle Abrechnungsdaten, Positionen, Einheiten und Reports ins Browser-LocalStorage statt über die API in die Datenbank. Konkrete Risiken:
- Datenverlust bei Browser-Wechsel oder Cache-Leerung
- Kein Multi-User-Betrieb möglich
- Keine serverseitige Datensicherung
Diese Architektur muss auf API-Persistenz migriert werden, bevor das Modul produktiv nutzbar ist.

**Duplizierte Nebenkosten-Komponenten**
`NebenkostenAbrechnungen.tsx`, `NebenkostenAbrechnungen1.tsx` und `NebenkostenAbrechnungenworking.tsx` existieren parallel. Unklar, welche die aktive ist. Tote Dateien sollten entfernt werden.

**Kein Finanz-Backend**
`app.module.ts` enthält kein Finanz- oder Bankkonto-Modul. Die Frontend-Seite `app/finanzen/` (inkl. Mietübersicht, Bankkonto) hat keinen API-Gegenstück — dieser Bereich ist rein frontend-seitig oder noch nicht implementiert.

**13 .bak-Dateien im Repository**
Manuelle Backup-Dateien liegen direkt im Codebaum (z.B. `sidebar.tsx.bak.black-sidebar`, `objects.service.ts.bak.displayid-order`). Diese gehören nicht ins Git-Repo und sollten entfernt oder in `.gitignore` aufgenommen werden.

---

## 4. Prioritätsliste

| Prio | Thema | Aufwand |
|------|-------|---------|
| 🔴 1 | Entra ID JWT-Validierung implementieren | Mittel |
| 🔴 2 | Nebenkosten von localStorage auf API migrieren | Hoch |
| 🟡 3 | CORS-Origin für Produktion konfigurierbar machen | Klein |
| 🟡 4 | Finanz-Backend (Mietübersicht, Bankkonto) implementieren | Hoch |
| 🟢 5 | Duplizierte Nebenkosten-Komponenten bereinigen | Klein |
| 🟢 6 | .bak-Dateien aus Repo entfernen | Klein |
| 🟢 7 | Verbleibende Mock-Datendateien löschen | Klein |
