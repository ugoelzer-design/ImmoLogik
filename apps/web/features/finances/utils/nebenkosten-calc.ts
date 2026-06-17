// Pure Berechnungs- und Hilfsfunktionen – kein React, kein State

// ─── Typen ────────────────────────────────────────────────────────────────────

export type Verteilschluessel = "MEA" | "Fläche" | "Einheit" | "Direkt" | "Personen";

export type LocalObjectReference = {
  id: string;
  displayId: string;
  name: string;
  address: string;
  units: number | null;
};

// ─── String-Normalisierung ────────────────────────────────────────────────────

export function normalizeLookupValue(value: string) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeDisplayId(value: string) {
  return String(value ?? "").trim().toUpperCase();
}

export function parseDecimalString(value: string) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function areSerializedValuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

// ─── Objekt-Identifier-Erkennung ──────────────────────────────────────────────

export function isTechnicalIdentifier(value: string) {
  const normalized = String(value ?? "").trim();
  if (normalized === "") return false;
  if (/^MET-[A-Z0-9-]+$/i.test(normalized)) return true;
  if (/^cmp[a-z0-9]+$/i.test(normalized)) return true;
  return /^[a-z0-9]{20,}$/i.test(normalized);
}

export function isTechnicalObjectName(value: string) {
  const normalized = String(value ?? "").trim();
  if (normalized === "") return false;
  if (isTechnicalIdentifier(normalized)) return true;
  const match = normalized.match(/^Objekt\s+(.+)$/i);
  return match ? isTechnicalIdentifier(match[1]) : false;
}

// ─── Record-Helfer ────────────────────────────────────────────────────────────

export function pickFirstStringField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return "";
}

export function pickPositiveNumberField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value.trim().replace(",", "."));
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return null;
}

export function buildReadableAddress(record: Record<string, unknown>) {
  const direct = pickFirstStringField(record, [
    "address", "adresse", "location", "fullAddress", "objectAddress",
  ]);
  if (direct !== "") return direct;

  const street = pickFirstStringField(record, ["street", "streetName"]);
  const houseNumber = pickFirstStringField(record, ["houseNumber"]);
  const postalCode = pickFirstStringField(record, ["postalCode", "zip", "zipCode"]);
  const city = pickFirstStringField(record, ["city", "town"]);

  const streetLine = [street, houseNumber].filter(Boolean).join(" ").trim();
  const cityLine = [postalCode, city].filter(Boolean).join(" ").trim();
  return [streetLine, cityLine].filter(Boolean).join(", ").trim();
}

export function getReadableObjectName(
  reference: Pick<LocalObjectReference, "name" | "address" | "displayId">,
) {
  const name = String(reference.name ?? "").trim();
  if (name !== "" && !isTechnicalObjectName(name)) return name;
  const address = String(reference.address ?? "").trim();
  if (address !== "" && !isTechnicalIdentifier(address)) return address;
  return "";
}

export function createObjectReferencesFromService(items: unknown): LocalObjectReference[] {
  if (!Array.isArray(items)) return [];

  const result = new Map<string, LocalObjectReference>();

  items.forEach((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return;

    const record = entry as Record<string, unknown>;
    const id = pickFirstStringField(record, ["id", "objectId"]);
    const displayId = normalizeDisplayId(
      pickFirstStringField(record, ["displayId", "display_id", "displayID"]),
    );
    const name = pickFirstStringField(record, ["name", "title", "displayName", "objectName"]);
    const address = buildReadableAddress(record);
    const units = pickPositiveNumberField(record, ["units", "unitCount"]);

    if (
      id === "" ||
      displayId === "" ||
      getReadableObjectName({ name, address, displayId }) === ""
    ) return;

    result.set(displayId, { id, displayId, name, address, units });
  });

  return Array.from(result.values()).sort((a, b) =>
    getReadableObjectName(a).localeCompare(getReadableObjectName(b), "de", {
      sensitivity: "base",
    }),
  );
}

// ─── Verteilung ───────────────────────────────────────────────────────────────

export function distributeIntegerTotal(
  total: number,
  weightedEntries: Array<{ id: string; weight: number }>,
) {
  const result: Record<string, number> = {};
  weightedEntries.forEach((entry) => { result[entry.id] = 0; });

  const valid = weightedEntries.filter((e) => e.weight > 0);
  if (total <= 0 || valid.length === 0) return result;

  const sumWeights = valid.reduce((sum, e) => sum + e.weight, 0);
  if (sumWeights <= 0) return result;

  const shares = valid.map((e) => {
    const exact = (total * e.weight) / sumWeights;
    return { id: e.id, base: Math.floor(exact), rest: exact - Math.floor(exact) };
  });

  let remainder = total - shares.reduce((sum, e) => sum + e.base, 0);
  shares
    .sort((a, b) => b.rest - a.rest)
    .forEach((e) => {
      result[e.id] = e.base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
    });

  return result;
}

export function getObjectStorageKeyByDisplayId(
  objektDisplayId: string,
  objectStorageKeyByDisplayId: Record<string, string>,
) {
  return objectStorageKeyByDisplayId[normalizeDisplayId(objektDisplayId)] ?? null;
}

// ─── Objektmodul-Typen ────────────────────────────────────────────────────────

export type ObjectModuleApartment = {
  id: string;
  unitLabel: string;
  designation: string;
  area: string;
  status: string;
};

export type ObjectModuleTenancy = {
  id: string;
  apartmentId: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  persons: string;
};

export type ObjectModuleUtility = {
  id: string;
  category: string;
  label: string;
  apartmentIds: string[];
  meterIds: string[];
  note: string;
};

export type ObjektkostenstelleQuelle = {
  id: string;
  name: string;
  umlagefaehig: boolean;
  verteilschluessel: Verteilschluessel;
  art: "standard" | "optional";
};

export type Abrechnungseinheit = {
  id: string;
  wegId: string;
  einheitId: string;
  reportLabel: string;
  einheit: string;
  eigentuemer: string;
  mieter: string;
  flaeche: number;
  mea: number;
  personen: number;
  vorauszahlung: number;
};

export type AbrechnungsPosition = {
  id: string;
  bezeichnung: string;
  kostenart: string;
  betrag: number;
  umlagefaehig: boolean;
  verteilschluessel: Verteilschluessel;
  direkteEinheitId: string | null;
  erfasstAm: string;
  art: "standard" | "optional" | "sonder";
  bewertungsstatus: "offen" | "erfasst" | "bewusst-0" | "nicht-relevant";
};

// ─── Objektmodul-Funktionen ───────────────────────────────────────────────────

export function getAktiveTenancyByApartmentId(tenancies: ObjectModuleTenancy[]) {
  const activeMap = new Map<string, ObjectModuleTenancy>();
  tenancies
    .filter((t) => t.endDate.trim() === "")
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .forEach((t) => {
      if (!activeMap.has(t.apartmentId)) activeMap.set(t.apartmentId, t);
    });
  return activeMap;
}

export function createPositionenFromObjektmodul(
  abrechnungId: string,
  objektkostenstellen: ObjektkostenstelleQuelle[],
  previousPositionen: AbrechnungsPosition[],
): AbrechnungsPosition[] {
  const previousKatalog = previousPositionen.filter((i) => i.art !== "sonder");
  const previousById = new Map(previousKatalog.map((i) => [i.id, i]));
  const previousByName = new Map<string, AbrechnungsPosition>();

  previousKatalog.forEach((item) => {
    const bKey = normalizeLookupValue(item.bezeichnung);
    const kKey = normalizeLookupValue(item.kostenart);
    if (bKey !== "") previousByName.set(bKey, item);
    if (kKey !== "") previousByName.set(kKey, item);
  });

  const sonder = previousPositionen.filter((i) => i.art === "sonder");

  const imported = objektkostenstellen.map((item) => {
    const importedId = `${abrechnungId}__${item.art === "standard" ? "STD" : "OPT"}__${item.id}`;
    const previous = previousById.get(importedId) ?? previousByName.get(normalizeLookupValue(item.name));
    const betrag = previous?.betrag ?? 0;
    const bewertungsstatus = betrag > 0 ? "erfasst" : previous?.bewertungsstatus ?? "offen";

    return {
      id: importedId,
      bezeichnung: item.name,
      kostenart: item.name,
      betrag,
      umlagefaehig: item.umlagefaehig,
      verteilschluessel: previous?.verteilschluessel ?? item.verteilschluessel,
      direkteEinheitId:
        (previous?.verteilschluessel ?? item.verteilschluessel) === "Direkt"
          ? previous?.direkteEinheitId ?? null
          : null,
      erfasstAm: previous?.erfasstAm ?? new Date().toLocaleDateString("de-DE"),
      art: item.art,
      bewertungsstatus,
    } as AbrechnungsPosition;
  });

  return [...imported, ...sonder];
}

export function createEinheitenFromObjektmodul(
  abrechnungId: string,
  objektDisplayId: string,
  objektName: string,
  apartmentsByObjectId: Record<string, ObjectModuleApartment[]>,
  tenanciesByObjectId: Record<string, ObjectModuleTenancy[]>,
  previousEinheiten: Abrechnungseinheit[],
  objectStorageKeyByDisplayId: Record<string, string>,
): Abrechnungseinheit[] | null {
  const objectStorageKey = getObjectStorageKeyByDisplayId(
    objektDisplayId,
    objectStorageKeyByDisplayId,
  );
  if (!objectStorageKey) return null;

  const apartments = [...(apartmentsByObjectId[objectStorageKey] ?? [])].sort((a, b) =>
    a.unitLabel.localeCompare(b.unitLabel, "de", { numeric: true, sensitivity: "base" }),
  );
  if (apartments.length === 0) return null;

  const tenancies = tenanciesByObjectId[objectStorageKey] ?? [];
  const activeTenancyByApartmentId = getAktiveTenancyByApartmentId(tenancies);
  const previousByApartmentId = new Map(
    previousEinheiten.map((i) => [String(i.einheitId ?? "").trim(), i]),
  );
  const previousByApartmentLabel = new Map(
    previousEinheiten.map((i) => [normalizeLookupValue(i.einheit), i]),
  );

  const weights = apartments.map((a) => ({ id: a.id, weight: parseDecimalString(a.area) }));
  const meaByApartmentId = distributeIntegerTotal(1000, weights);

  return apartments.map((apartment) => {
    const activeTenancy = activeTenancyByApartmentId.get(apartment.id);
    const previous =
      previousByApartmentId.get(String(apartment.id ?? "").trim()) ??
      previousByApartmentLabel.get(normalizeLookupValue(apartment.unitLabel));
    const persons = Math.max(1, activeTenancy ? parseDecimalString(activeTenancy.persons) : 1);

    return {
      id: `${abrechnungId}__${apartment.id}`,
      wegId: objektDisplayId,
      einheitId: apartment.id,
      reportLabel: `${objektName}, ${apartment.unitLabel}${apartment.designation ? ` · ${apartment.designation}` : ""}`,
      einheit: apartment.unitLabel,
      eigentuemer: previous?.eigentuemer ?? "Eigentümer offen",
      mieter: activeTenancy?.tenantName ?? "Leerstand / Selbstnutzer",
      flaeche: parseDecimalString(apartment.area),
      mea: previous?.mea && previous.mea > 0 ? previous.mea : meaByApartmentId[apartment.id] ?? 0,
      personen: persons,
      vorauszahlung: previous?.vorauszahlung ?? 0,
    };
  });
}
