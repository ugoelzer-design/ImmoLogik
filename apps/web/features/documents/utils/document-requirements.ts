import type { RentUnit } from "@/features/finances/services/rent-units.service";
import type { Contract } from "@/types/contract";
import type { ImmoDocument } from "@/types/document";
import type { ImmoObject } from "@/types/object";
import type { Tenant } from "@/types/tenant";

export type DocumentRequirementScope = "object" | "unit";

export type DocumentRequirement = {
  key: string;
  scope: DocumentRequirementScope;
  objectId: string;
  objectLabel: string;
  rentUnitId: string | null;
  unitLabel: string | null;
  category: string;
  reportYear: number | null;
  title: string;
  reason: string;
  tracked: boolean;
  fulfilled: boolean;
};

type BuildDocumentRequirementsInput = {
  object: ImmoObject;
  documents: ImmoDocument[];
  tenants?: Tenant[];
  contracts?: Contract[];
  rentUnits?: RentUnit[];
  today?: Date;
};

function getPreviousReportYear(today: Date) {
  return today.getFullYear() - 1;
}

function getObjectLabel(object: ImmoObject) {
  return object.displayId ? `${object.displayId} · ${object.name}` : object.name;
}

function isRelevantTenant(tenant: Tenant) {
  return tenant.status === "Aktiv" || tenant.status === "Ausstehend";
}

function isRelevantContract(contract: Contract) {
  return contract.status === "Aktiv" || contract.status === "In Prüfung" || contract.status === "Läuft aus";
}

function isUsableDocument(document: ImmoDocument) {
  return document.status !== "Fehlt" && document.fileAvailable !== false;
}

function matchesRequirement(document: ImmoDocument, requirement: Omit<DocumentRequirement, "tracked" | "fulfilled">) {
  return (
    document.objectId === requirement.objectId &&
    document.category === requirement.category &&
    (document.reportYear ?? null) === requirement.reportYear &&
    (document.rentUnitId ?? null) === requirement.rentUnitId
  );
}

function fulfillsRequirement(document: ImmoDocument, requirement: Omit<DocumentRequirement, "tracked" | "fulfilled">) {
  return isUsableDocument(document) && matchesRequirement(document, requirement);
}

function getUnitLabel(
  rentUnitId: string,
  rentUnits: RentUnit[],
  tenants: Tenant[],
  contracts: Contract[],
) {
  return (
    rentUnits.find((unit) => unit.id === rentUnitId)?.unitLabel ??
    tenants.find((tenant) => tenant.rentUnitId === rentUnitId)?.unit ??
    contracts.find((contract) => contract.rentUnitId === rentUnitId)?.unit ??
    "Einheit"
  );
}

export function buildDocumentRequirements({
  object,
  documents,
  tenants = [],
  contracts = [],
  rentUnits = [],
  today = new Date(),
}: BuildDocumentRequirementsInput) {
  const reportYear = getPreviousReportYear(today);
  const objectLabel = getObjectLabel(object);
  const objectRequirements: Array<Omit<DocumentRequirement, "tracked" | "fulfilled">> = [
    {
      key: `${object.id}:object:Jahresreport WEG:${reportYear}`,
      scope: "object",
      objectId: object.id,
      objectLabel,
      rentUnitId: null,
      unitLabel: null,
      category: "Jahresreport WEG",
      reportYear,
      title: `Jahresreport WEG ${reportYear}`,
      reason: "Jährlicher Objektabschluss für Verwaltung und Nachweisführung.",
    },
  ];

  const relevantUnitIds = new Set<string>();
  for (const tenant of tenants.filter((tenant) => tenant.objectId === object.id && isRelevantTenant(tenant))) {
    relevantUnitIds.add(tenant.rentUnitId);
  }
  for (const contract of contracts.filter((contract) => contract.objectId === object.id && contract.rentUnitId && isRelevantContract(contract))) {
    relevantUnitIds.add(contract.rentUnitId as string);
  }

  const unitRequirements = Array.from(relevantUnitIds)
    .sort((left, right) =>
      getUnitLabel(left, rentUnits, tenants, contracts).localeCompare(
        getUnitLabel(right, rentUnits, tenants, contracts),
        "de",
        { numeric: true },
      ),
    )
    .flatMap((rentUnitId) => {
      const unitLabel = getUnitLabel(rentUnitId, rentUnits, tenants, contracts);
      return [
        {
          key: `${object.id}:${rentUnitId}:Mietvertrag`,
          scope: "unit" as const,
          objectId: object.id,
          objectLabel,
          rentUnitId,
          unitLabel,
          category: "Mietvertrag",
          reportYear: null,
          title: `Mietvertrag ${unitLabel}`,
          reason: "Belegte oder vorgemerkte Einheit braucht eine Vertragsunterlage.",
        },
        {
          key: `${object.id}:${rentUnitId}:Nebenkostenabrechnung:${reportYear}`,
          scope: "unit" as const,
          objectId: object.id,
          objectLabel,
          rentUnitId,
          unitLabel,
          category: "Nebenkostenabrechnung",
          reportYear,
          title: `Nebenkostenabrechnung ${unitLabel} ${reportYear}`,
          reason: "Jährliche Abrechnung je belegter Einheit.",
        },
        {
          key: `${object.id}:${rentUnitId}:Jahresreport Wohnung:${reportYear}`,
          scope: "unit" as const,
          objectId: object.id,
          objectLabel,
          rentUnitId,
          unitLabel,
          category: "Jahresreport Wohnung",
          reportYear,
          title: `Jahresreport Wohnung ${unitLabel} ${reportYear}`,
          reason: "Jährlicher Wohnungsreport je belegter Einheit.",
        },
      ];
    });

  return [...objectRequirements, ...unitRequirements].map((requirement) => ({
    ...requirement,
    tracked: documents.some((document) => matchesRequirement(document, requirement)),
    fulfilled: documents.some((document) => fulfillsRequirement(document, requirement)),
  }));
}

export function getMissingDocumentRequirements(requirements: DocumentRequirement[]) {
  return requirements.filter((requirement) => !requirement.tracked);
}
