"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { createMissingDocument } from "@/features/documents/services/documents.service";
import type { RentUnit } from "@/features/finances/services/rent-units.service";
import {
  buildDocumentRequirements,
  getMissingDocumentRequirements,
  type DocumentRequirement,
} from "@/features/documents/utils/document-requirements";
import type { Contract } from "@/types/contract";
import {
  OBJECT_MODULE_STORAGE_KEYS,
  readStorageRecord,
  writeStorageRecord,
} from "@/features/finances/utils/nebenkosten-storage";
import type { ImmoDocument } from "@/types/document";
import type { ReadingCampaign } from "@/types/meter-reading";
import type { ImmoObject } from "@/types/object";
import type { Tenant } from "@/types/tenant";
import { kostenarten } from "../../shared/kostenarten";

type ObjectDetailProps = {
  object: ImmoObject | undefined;
  documents: ImmoDocument[];
  tenants?: Tenant[];
  contracts?: Contract[];
  rentUnits?: RentUnit[];
  readingCampaigns?: ReadingCampaign[];
};

type SectionKey =
  | "overview"
  | "apartments"
  | "tenancies"
  | "meters"
  | "utilities"
  | "documents";

type ApartmentStatusValue = "frei" | "vermietet" | "reserviert" | "inaktiv";

type ApartmentDesignationMode = "preset" | "custom";

type LocalApartment = {
  id: string;
  unitLabel: string;
  designation: string;
  area: string;
  status: ApartmentStatusValue;
};

type ApartmentDraft = {
  designation: string;
  area: string;
  status: ApartmentStatusValue | "";
};

type LocalTenancy = {
  id: string;
  apartmentId: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  persons: string;
};

type TenancyDraft = {
  tenantName: string;
  startDate: string;
  endDate: string;
  persons: string;
};

type MeterScopeValue = "object" | "apartment";

type MeterTypeValue =
  | "allgemeinstrom"
  | "strom"
  | "gas"
  | "kaltwasser"
  | "warmwasser"
  | "heizung"
  | "waermemenge"
  | "sonstiges";

type MeterUnitValue = "kWh" | "m³" | "MWh" | "GJ" | "Einheiten";

type LocalMeterReading = {
  id: string;
  date: string;
  value: string;
  reader: string;
};

type MeterOriginValue = "standard" | "optional";

type StandardMeterTemplate = {
  key: string;
  scope: MeterScopeValue;
  type: MeterTypeValue;
  label: string;
  unit: MeterUnitValue;
};

type StandardMeterCreateDraft = {
  meterNumber: string;
  value: string;
};

type LocalMeter = {
  id: string;
  origin: MeterOriginValue;
  standardKey: string | null;
  scope: MeterScopeValue;
  apartmentId: string | null;
  type: MeterTypeValue;
  label: string;
  meterNumber: string;
  unit: MeterUnitValue;
  readings: LocalMeterReading[];
};

type MeterDraft = {
  scope: MeterScopeValue | "";
  apartmentId: string;
  type: MeterTypeValue | "";
  label: string;
  meterNumber: string;
  unit: MeterUnitValue | "";
};

type ValidatedMeterDraft = {
  scope: MeterScopeValue;
  apartmentId: string | null;
  type: MeterTypeValue;
  label: string;
  meterNumber: string;
  unit: MeterUnitValue;
};

type MeterReadingDraft = {
  date: string;
  value: string;
  reader: string;
};

type UtilityCategoryValue = string;

type LocalUtility = {
  id: string;
  category: UtilityCategoryValue;
  label: string;
  apartmentIds: string[];
  meterIds: string[];
  note: string;
};

type UtilityDraft = {
  category: UtilityCategoryValue | "";
  label: string;
  apartmentIds: string[];
  meterIds: string[];
  note: string;
};

type ValidatedUtilityDraft = {
  category: UtilityCategoryValue;
  label: string;
  apartmentIds: string[];
  meterIds: string[];
  note: string;
};

const SECTION_LABELS: Record<SectionKey, string> = {
  overview: "Übersicht",
  apartments: "Wohnungen",
  tenancies: "Mietverhältnisse",
  meters: "Zähler",
  utilities: "Nebenkosten",
  documents: "Dokumente",
};

const APARTMENT_DESIGNATION_OPTIONS = [
  "Haus",
  "EG links",
  "EG rechts",
  "1. OG links",
  "1. OG rechts",
  "DG links",
  "DG rechts",
] as const;

const APARTMENT_DESIGNATION_CUSTOM_OPTION_VALUE = "__custom__";

const APARTMENT_STATUS_OPTIONS: Array<{
  value: ApartmentStatusValue;
  label: string;
}> = [
  { value: "frei", label: "Frei" },
  { value: "vermietet", label: "Vermietet" },
  { value: "reserviert", label: "Reserviert" },
  { value: "inaktiv", label: "Inaktiv" },
];

const METER_TYPE_OPTIONS: Array<{
  value: MeterTypeValue;
  label: string;
  defaultUnit: MeterUnitValue;
}> = [
  { value: "allgemeinstrom", label: "Allgemeinstrom", defaultUnit: "kWh" },
  { value: "strom", label: "Strom", defaultUnit: "kWh" },
  { value: "gas", label: "Gas", defaultUnit: "m³" },
  { value: "kaltwasser", label: "Kaltwasser", defaultUnit: "m³" },
  { value: "warmwasser", label: "Warmwasser", defaultUnit: "m³" },
  { value: "heizung", label: "Heizung", defaultUnit: "kWh" },
  { value: "waermemenge", label: "Wärmemenge", defaultUnit: "MWh" },
  { value: "sonstiges", label: "Sonstiges", defaultUnit: "Einheiten" },
];

const METER_UNIT_OPTIONS: MeterUnitValue[] = [
  "kWh",
  "m³",
  "MWh",
  "GJ",
  "Einheiten",
];

const OBJECT_STANDARD_METER_TEMPLATES: StandardMeterTemplate[] = [
  {
    key: "object-allgemeinstrom",
    scope: "object",
    type: "allgemeinstrom",
    label: "Allgemeinstrom",
    unit: "kWh",
  },
];

const APARTMENT_STANDARD_METER_TEMPLATES: StandardMeterTemplate[] = [
  {
    key: "apartment-kaltwasser",
    scope: "apartment",
    type: "kaltwasser",
    label: "Kaltwasser",
    unit: "m³",
  },
  {
    key: "apartment-heizung",
    scope: "apartment",
    type: "heizung",
    label: "Heizung",
    unit: "kWh",
  },
];

const VISIBLE_APARTMENT_STANDARD_METER_TEMPLATE_KEYS = new Set([
  "apartment-kaltwasser",
  "apartment-heizung",
]);

const APARTMENT_STANDARD_METER_TEMPLATES_FOR_DISPLAY =
  APARTMENT_STANDARD_METER_TEMPLATES.filter((template) =>
    VISIBLE_APARTMENT_STANDARD_METER_TEMPLATE_KEYS.has(template.key),
  );

const METER_SCOPE_OPTIONS: MeterScopeValue[] = ["object", "apartment"];

const METER_ORIGIN_OPTIONS: MeterOriginValue[] = ["standard", "optional"];

const ALL_STANDARD_METER_TEMPLATES: StandardMeterTemplate[] = [
  ...OBJECT_STANDARD_METER_TEMPLATES,
  ...APARTMENT_STANDARD_METER_TEMPLATES,
];

const EMPTY_APARTMENT_DRAFT: ApartmentDraft = {
  designation: "",
  area: "",
  status: "",
};

const EMPTY_TENANCY_DRAFT: TenancyDraft = {
  tenantName: "",
  startDate: "",
  endDate: "",
  persons: "1",
};

const EMPTY_METER_DRAFT: MeterDraft = {
  scope: "",
  apartmentId: "",
  type: "",
  label: "",
  meterNumber: "",
  unit: "",
};

const EMPTY_METER_READING_DRAFT: MeterReadingDraft = {
  date: "",
  value: "",
  reader: "",
};

const EMPTY_STANDARD_METER_CREATE_DRAFT: StandardMeterCreateDraft = {
  meterNumber: "",
  value: "",
};

function formatUtilityDistributionLabel(standardSchluessel: string) {
  switch (standardSchluessel) {
    case "Person":
      return "Personenzahl";
    case "MEA":
      return "Miteigentumsanteile";
    case "Verbrauch":
      return "Verbrauch";
    default:
      return standardSchluessel;
  }
}

type UtilityDropdownGroup = "betrieb" | "eigentuemer";

type UtilityCategoryOption = {
  value: UtilityCategoryValue;
  label: string;
  detail: string;
  distributionLabel: string | null;
  isDefault: boolean;
  legacy: boolean;
  sortOrder: number;
  dropdownGroup: UtilityDropdownGroup | null;
  supportsMeters: boolean;
  supportedMeterTypes: MeterTypeValue[];
};

const OBJECT_STANDARD_UTILITY_CATEGORY_IDS: UtilityCategoryValue[] = [
  "KA_002",
  "KA_004",
  "KA_007",
  "KA_012",
  "KA_013",
  "KA_015",
  "KA_019",
  "KA_024",
];

const OWNER_OPTIONAL_UTILITY_CATEGORY_IDS: UtilityCategoryValue[] = [
  "KA_001",
  "KA_017",
  "KA_018",
  "KA_201",
  "KA_202",
  "KA_301",
  "KA_302",
];

const UTILITY_SUPPORTED_METER_TYPES: Partial<
  Record<UtilityCategoryValue, MeterTypeValue[]>
> = {
  KA_002: ["allgemeinstrom"],
  KA_012: ["heizung", "waermemenge", "gas", "strom"],
  KA_024: ["kaltwasser", "warmwasser"],
};

const OBJECT_STANDARD_UTILITY_CATEGORY_ID_SET = new Set(
  OBJECT_STANDARD_UTILITY_CATEGORY_IDS,
);

const OWNER_OPTIONAL_UTILITY_CATEGORY_ID_SET = new Set(
  OWNER_OPTIONAL_UTILITY_CATEGORY_IDS,
);

const LEGACY_UTILITY_CATEGORY_OPTIONS: UtilityCategoryOption[] = [
  {
    value: "heizung",
    label: "Heizung",
    detail: "Altbestand",
    distributionLabel: null,
    isDefault: false,
    legacy: true,
    sortOrder: 10_000,
    dropdownGroup: null,
    supportsMeters: true,
    supportedMeterTypes: ["heizung", "waermemenge", "gas", "strom"],
  },
  {
    value: "wasser",
    label: "Wasser",
    detail: "Altbestand",
    distributionLabel: null,
    isDefault: false,
    legacy: true,
    sortOrder: 10_001,
    dropdownGroup: null,
    supportsMeters: true,
    supportedMeterTypes: ["kaltwasser", "warmwasser"],
  },
  {
    value: "abwasser",
    label: "Abwasser",
    detail: "Altbestand",
    distributionLabel: null,
    isDefault: false,
    legacy: true,
    sortOrder: 10_002,
    dropdownGroup: null,
    supportsMeters: false,
    supportedMeterTypes: [],
  },
  {
    value: "allgemeinstrom",
    label: "Allgemeinstrom",
    detail: "Altbestand",
    distributionLabel: null,
    isDefault: false,
    legacy: true,
    sortOrder: 10_003,
    dropdownGroup: null,
    supportsMeters: true,
    supportedMeterTypes: ["allgemeinstrom"],
  },
  {
    value: "muell",
    label: "Müll",
    detail: "Altbestand",
    distributionLabel: null,
    isDefault: false,
    legacy: true,
    sortOrder: 10_004,
    dropdownGroup: null,
    supportsMeters: false,
    supportedMeterTypes: [],
  },
  {
    value: "versicherung",
    label: "Versicherung",
    detail: "Altbestand",
    distributionLabel: null,
    isDefault: false,
    legacy: true,
    sortOrder: 10_005,
    dropdownGroup: null,
    supportsMeters: false,
    supportedMeterTypes: [],
  },
  {
    value: "hausreinigung",
    label: "Hausreinigung",
    detail: "Altbestand",
    distributionLabel: null,
    isDefault: false,
    legacy: true,
    sortOrder: 10_006,
    dropdownGroup: null,
    supportsMeters: false,
    supportedMeterTypes: [],
  },
  {
    value: "sonstiges",
    label: "Sonstiges",
    detail: "Altbestand",
    distributionLabel: null,
    isDefault: false,
    legacy: true,
    sortOrder: 10_007,
    dropdownGroup: null,
    supportsMeters: false,
    supportedMeterTypes: [],
  },
];

const MASTER_UTILITY_CATEGORY_OPTIONS: UtilityCategoryOption[] = kostenarten.map(
  (kostenart, index) => {
    const isDefault = OBJECT_STANDARD_UTILITY_CATEGORY_ID_SET.has(kostenart.id);
    const supportedMeterTypes = UTILITY_SUPPORTED_METER_TYPES[kostenart.id] ?? [];
    const distributionLabel = formatUtilityDistributionLabel(
      kostenart.standardSchluessel,
    );
    const detailParts = [kostenart.kategorie, `Verteilung: ${distributionLabel}`];

    if (isDefault) {
      detailParts.push("Standard");
    }

    if (!kostenart.umlagefaehigMieter) {
      detailParts.push("nicht umlagefähig");
    }

    return {
      value: kostenart.id,
      label: kostenart.name,
      detail: detailParts.join(" · "),
      distributionLabel,
      isDefault,
      legacy: false,
      sortOrder: index,
      dropdownGroup: isDefault
        ? null
        : OWNER_OPTIONAL_UTILITY_CATEGORY_ID_SET.has(kostenart.id)
          ? "eigentuemer"
          : "betrieb",
      supportsMeters: supportedMeterTypes.length > 0,
      supportedMeterTypes,
    };
  },
);

const STANDARD_UTILITY_CATEGORY_OPTIONS = MASTER_UTILITY_CATEGORY_OPTIONS.filter(
  (option) => option.isDefault,
);

const OPTIONAL_BETRIEB_UTILITY_CATEGORY_OPTIONS =
  MASTER_UTILITY_CATEGORY_OPTIONS.filter(
    (option) => option.dropdownGroup === "betrieb",
  );

const OPTIONAL_EIGENTUEMER_UTILITY_CATEGORY_OPTIONS =
  MASTER_UTILITY_CATEGORY_OPTIONS.filter(
    (option) => option.dropdownGroup === "eigentuemer",
  );

const UTILITY_CATEGORY_OPTIONS: UtilityCategoryOption[] = [
  ...MASTER_UTILITY_CATEGORY_OPTIONS,
  ...LEGACY_UTILITY_CATEGORY_OPTIONS.filter(
    (legacyOption) =>
      !MASTER_UTILITY_CATEGORY_OPTIONS.some(
        (masterOption) => masterOption.value === legacyOption.value,
      ),
  ),
];

const EMPTY_UTILITY_DRAFT: UtilityDraft = {
  category: "",
  label: "",
  apartmentIds: [],
  meterIds: [],
  note: "",
};

function getTenancyEndSortValue(endDate: string) {
  return endDate.trim() === "" ? "9999-12-31" : endDate;
}

function getSortedTenanciesForDisplay(tenancies: LocalTenancy[]) {
  return [...tenancies].sort((left, right) => {
    const startCompare = right.startDate.localeCompare(left.startDate);

    if (startCompare !== 0) {
      return startCompare;
    }

    const endCompare = getTenancyEndSortValue(right.endDate).localeCompare(
      getTenancyEndSortValue(left.endDate),
    );

    if (endCompare !== 0) {
      return endCompare;
    }

    return right.id.localeCompare(left.id, "de", {
      numeric: true,
      sensitivity: "base",
    });
  });
}

function formatPersonsLabel(persons: string) {
  return `${persons} Person${persons === "1" ? "" : "en"}`;
}

function formatTenancyPeriod(startDate: string, endDate: string) {
  const startLabel = formatDateForDisplay(startDate);

  if (endDate.trim() === "") {
    return `${startLabel} – offen`;
  }

  return `${startLabel} – ${formatDateForDisplay(endDate)}`;
}

function tenancyRangesOverlap(
  leftStartDate: string,
  leftEndDate: string,
  rightStartDate: string,
  rightEndDate: string,
) {
  const normalizedLeftEndDate = getTenancyEndSortValue(leftEndDate);
  const normalizedRightEndDate = getTenancyEndSortValue(rightEndDate);

  return (
    leftStartDate <= normalizedRightEndDate &&
    rightStartDate <= normalizedLeftEndDate
  );
}


function isValidDateInputValue(dateValue: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return false;
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
}

function isValidPersonsValue(persons: string) {
  const personsNumber = Number(persons);

  return (
    persons.trim() !== "" &&
    Number.isInteger(personsNumber) &&
    personsNumber > 0
  );
}

function getValidatedTenancyDraft(
  apartmentId: string,
  draft: TenancyDraft,
  tenancies: LocalTenancy[],
  options?: { ignoreTenancyId?: string | null },
): TenancyDraft | null {
  const tenantName = draft.tenantName.trim();
  const startDate = draft.startDate.trim();
  const endDate = draft.endDate.trim();
  const persons = draft.persons.trim();

  if (apartmentId.trim() === "" || tenantName === "") {
    return null;
  }

  if (!isValidDateInputValue(startDate)) {
    return null;
  }

  if (endDate !== "" && !isValidDateInputValue(endDate)) {
    return null;
  }

  if (endDate !== "" && endDate < startDate) {
    return null;
  }

  if (!isValidPersonsValue(persons)) {
    return null;
  }

  const hasDateOverlap = tenancies.some((tenancy) => {
    if (tenancy.apartmentId !== apartmentId) {
      return false;
    }

    if (options?.ignoreTenancyId && tenancy.id === options.ignoreTenancyId) {
      return false;
    }

    return tenancyRangesOverlap(
      startDate,
      endDate,
      tenancy.startDate,
      tenancy.endDate,
    );
  });

  if (hasDateOverlap) {
    return null;
  }

  return {
    tenantName,
    startDate,
    endDate,
    persons: String(Number(persons)),
  };
}

function splitAddress(address: string) {
  const parts = address.split(",");
  const street = parts[0]?.trim() || address;
  const city = parts.slice(1).join(",").trim() || "—";

  return { street, city };
}

function getStatusVariant(status: ImmoObject["status"]) {
  switch (status) {
    case "Aktiv":
      return "success";
    case "In Prüfung":
      return "warning";
    case "Neu":
      return "default";
    default:
      return "muted";
  }
}

function getApartmentStatusLabel(status: ApartmentStatusValue) {
  return (
    APARTMENT_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status
  );
}

function getApartmentStatusClasses(status: ApartmentStatusValue) {
  switch (status) {
    case "frei":
      return "border border-red-200 bg-red-50 text-red-700";
    case "vermietet":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case "reserviert":
      return "border border-amber-200 bg-amber-50 text-amber-700";
    case "inaktiv":
      return "border border-zinc-200 bg-zinc-100 text-zinc-600";
    default:
      return "border border-zinc-200 bg-zinc-100 text-zinc-600";
  }
}

function isApartmentDesignationOption(value: string) {
  return APARTMENT_DESIGNATION_OPTIONS.includes(
    value as (typeof APARTMENT_DESIGNATION_OPTIONS)[number],
  );
}

function getApartmentDesignationMode(value: string): ApartmentDesignationMode {
  return value.trim() !== "" && !isApartmentDesignationOption(value)
    ? "custom"
    : "preset";
}

function formatApartmentDesignationSelectValue(
  value: string,
  mode: ApartmentDesignationMode,
) {
  if (mode === "custom") {
    return APARTMENT_DESIGNATION_CUSTOM_OPTION_VALUE;
  }

  return value;
}

function formatApartmentArea(area: string) {
  return `${area} m²`;
}

function formatApartmentUnitLabel(nextNumber: number) {
  return `WE ${String(nextNumber).padStart(2, "0")}`;
}

function formatApartmentInternalId(objectKey: string, nextNumber: number) {
  return `APT-${objectKey}-${String(nextNumber).padStart(3, "0")}`;
}

function getApartmentSequenceFromUnitLabel(unitLabel: string) {
  const match = unitLabel.match(/(\d+)$/);

  if (!match) {
    return 0;
  }

  return Number(match[1]);
}

function getNextApartmentNumber(apartments: LocalApartment[]) {
  return (
    apartments.reduce((maxNumber, apartment) => {
      return Math.max(
        maxNumber,
        getApartmentSequenceFromUnitLabel(apartment.unitLabel),
      );
    }, 0) + 1
  );
}

function formatTenancyInternalId(objectKey: string, nextNumber: number) {
  return `TEN-${objectKey}-${String(nextNumber).padStart(3, "0")}`;
}

function getTenancySequenceFromId(tenancyId: string) {
  const match = tenancyId.match(/(\d+)$/);

  if (!match) {
    return 0;
  }

  return Number(match[1]);
}

function getNextTenancyNumber(tenancies: LocalTenancy[]) {
  return (
    tenancies.reduce((maxNumber, tenancy) => {
      return Math.max(maxNumber, getTenancySequenceFromId(tenancy.id));
    }, 0) + 1
  );
}

function formatDateForDisplay(dateValue: string) {
  if (!dateValue) {
    return "—";
  }

  const parsedDate = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("de-DE").format(parsedDate);
}

function getMeterTypeLabel(type: MeterTypeValue) {
  return METER_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

function getDefaultMeterUnit(type: MeterTypeValue | "") {
  return METER_TYPE_OPTIONS.find((option) => option.value === type)?.defaultUnit ?? "";
}

function getMeterOriginLabel(origin: MeterOriginValue) {
  return origin === "standard" ? "Standard" : "Optional";
}

function getTodayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatMeterInternalId(objectKey: string, nextNumber: number) {
  return `MET-${objectKey}-${String(nextNumber).padStart(3, "0")}`;
}

function getMeterSequenceFromId(meterId: string) {
  const match = meterId.match(/(\d+)$/);

  if (!match) {
    return 0;
  }

  return Number(match[1]);
}

function getNextMeterNumber(meters: LocalMeter[]) {
  return (
    meters.reduce((maxNumber, meter) => {
      return Math.max(maxNumber, getMeterSequenceFromId(meter.id));
    }, 0) + 1
  );
}

function formatMeterReadingInternalId(meterId: string, nextNumber: number) {
  return `${meterId}-RD-${String(nextNumber).padStart(3, "0")}`;
}

function getMeterReadingSequenceFromId(readingId: string) {
  const match = readingId.match(/(\d+)$/);

  if (!match) {
    return 0;
  }

  return Number(match[1]);
}

function getNextMeterReadingNumber(readings: LocalMeterReading[]) {
  return (
    readings.reduce((maxNumber, reading) => {
      return Math.max(maxNumber, getMeterReadingSequenceFromId(reading.id));
    }, 0) + 1
  );
}

function formatMeterReadingValue(value: string, unit: MeterUnitValue) {
  return `${value} ${unit}`;
}

function formatUtilityInternalId(objectKey: string, nextNumber: number) {
  return `UTL-${objectKey}-${String(nextNumber).padStart(3, "0")}`;
}

function getUtilitySequenceFromId(utilityId: string) {
  const match = utilityId.match(/(\d+)$/);

  if (!match) {
    return 0;
  }

  return Number(match[1]);
}

function getNextUtilityNumber(utilities: LocalUtility[]) {
  return (
    utilities.reduce((maxNumber, utility) => {
      return Math.max(maxNumber, getUtilitySequenceFromId(utility.id));
    }, 0) + 1
  );
}

function getUtilityCategoryOption(category: string) {
  return UTILITY_CATEGORY_OPTIONS.find((option) => option.value === category);
}

function getUtilityCategorySortOrder(category: UtilityCategoryValue) {
  return getUtilityCategoryOption(category)?.sortOrder ?? Number.MAX_SAFE_INTEGER;
}

function getUtilityCategoryLabel(category: UtilityCategoryValue) {
  return getUtilityCategoryOption(category)?.label ?? category;
}

function getUtilityCategoryDetail(category: UtilityCategoryValue) {
  return getUtilityCategoryOption(category)?.detail ?? category;
}

function utilityCategorySupportsMeters(category: string) {
  return getUtilityCategoryOption(category)?.supportsMeters ?? false;
}

function getSupportedMeterTypesForUtility(category: string) {
  return getUtilityCategoryOption(category)?.supportedMeterTypes ?? [];
}

function utilityCategoryAllowsEmptyLinks(category: string) {
  return getUtilityCategoryOption(category)?.isDefault ?? false;
}

function isMeterCompatibleWithUtility(category: string, meter: LocalMeter) {
  switch (category) {
    case "KA_002":
    case "allgemeinstrom":
      return meter.scope === "object" && meter.type === "allgemeinstrom";
    case "KA_012":
    case "heizung":
      if (meter.type === "heizung") {
        return meter.scope === "object" || meter.scope === "apartment";
      }

      if (
        meter.type === "gas" ||
        meter.type === "waermemenge" ||
        meter.type === "strom"
      ) {
        return meter.scope === "object";
      }

      return false;
    case "KA_024":
    case "wasser":
      return (
        meter.scope === "apartment" &&
        (meter.type === "kaltwasser" || meter.type === "warmwasser")
      );
    default:
      return false;
  }
}

function getCompatibleMetersForUtility(
  meters: LocalMeter[],
  category: string,
) {
  if (!utilityCategorySupportsMeters(category)) {
    return [];
  }

  const supportedTypes = getSupportedMeterTypesForUtility(category);

  return meters.filter(
    (meter) =>
      supportedTypes.includes(meter.type) &&
      isMeterCompatibleWithUtility(category, meter),
  );
}

function getCompatibleMeterIdsForUtility(
  meters: LocalMeter[],
  category: string,
  meterIds: string[],
) {
  const compatibleMeterIdSet = new Set(
    getCompatibleMetersForUtility(meters, category).map((meter) => meter.id),
  );

  return [...new Set(meterIds)].filter((meterId) =>
    compatibleMeterIdSet.has(meterId),
  );
}

function isUtilityCategoryValue(value: string): value is UtilityCategoryValue {
  return value.trim() !== "" && UTILITY_CATEGORY_OPTIONS.some((option) => option.value === value);
}

function getUtilityCategoryOptionsForSelect(currentCategory: string) {
  const currentLegacyOption = LEGACY_UTILITY_CATEGORY_OPTIONS.find(
    (option) => option.value === currentCategory,
  );

  return {
    betriebOptions: OPTIONAL_BETRIEB_UTILITY_CATEGORY_OPTIONS,
    eigentuemerOptions: OPTIONAL_EIGENTUEMER_UTILITY_CATEGORY_OPTIONS,
    currentLegacyOption,
  };
}

function applyUtilityCategorySelection(
  currentDraft: UtilityDraft,
  nextCategory: string,
  meters: LocalMeter[],
): UtilityDraft {
  const currentOption = currentDraft.category
    ? getUtilityCategoryOption(currentDraft.category)
    : undefined;
  const nextOption = getUtilityCategoryOption(nextCategory);
  const currentLabel = currentDraft.label.trim();
  const shouldPrefillLabel =
    currentLabel === "" ||
    (currentOption !== undefined && currentLabel === currentOption.label);

  return {
    ...currentDraft,
    category: nextCategory,
    label: shouldPrefillLabel && nextOption ? nextOption.label : currentDraft.label,
    meterIds: getCompatibleMeterIdsForUtility(
      meters,
      nextCategory,
      currentDraft.meterIds,
    ),
  };
}

function getValidatedUtilityDraft(

  apartments: LocalApartment[],
  meters: LocalMeter[],
  draft: UtilityDraft,
  options?: { allowEmptyLinks?: boolean },
): ValidatedUtilityDraft | null {
  const category = draft.category;

  if (!isUtilityCategoryValue(category)) {
    return null;
  }

  const label = draft.label.trim();
  const apartmentIds = [...new Set(draft.apartmentIds)].filter((apartmentId) =>
    apartments.some((apartment) => apartment.id === apartmentId),
  );
  const meterIds = getCompatibleMeterIdsForUtility(
    meters,
    category,
    draft.meterIds,
  );
  const allowEmptyLinks =
    options?.allowEmptyLinks ?? utilityCategoryAllowsEmptyLinks(category);

  if (label === "") {
    return null;
  }

  if (!allowEmptyLinks && apartmentIds.length === 0 && meterIds.length === 0) {
    return null;
  }

  return {
    category,
    label,
    apartmentIds,
    meterIds,
    note: draft.note.trim(),
  };
}

function normalizeStoredUtility(
  utility: LocalUtility | null | undefined,
  apartments: LocalApartment[],
  meters: LocalMeter[],
): LocalUtility | null {
  if (
    !utility ||
    typeof utility.id !== "string" ||
    typeof utility.category !== "string" ||
    typeof utility.label !== "string" ||
    !Array.isArray(utility.apartmentIds) ||
    !Array.isArray(utility.meterIds) ||
    typeof utility.note !== "string"
  ) {
    return null;
  }

  const id = utility.id.trim();

  if (id === "") {
    return null;
  }

  if (
    !utility.apartmentIds.every((apartmentId) => typeof apartmentId === "string") ||
    !utility.meterIds.every((meterId) => typeof meterId === "string")
  ) {
    return null;
  }

  const validatedDraft = getValidatedUtilityDraft(
    apartments,
    meters,
    {
      category: utility.category,
      label: utility.label,
      apartmentIds: utility.apartmentIds,
      meterIds: utility.meterIds,
      note: utility.note,
    },
    { allowEmptyLinks: true },
  );

  if (!validatedDraft) {
    return null;
  }

  return {
    id,
    category: validatedDraft.category,
    label: validatedDraft.label,
    apartmentIds: validatedDraft.apartmentIds,
    meterIds: validatedDraft.meterIds,
    note: validatedDraft.note,
  };
}

function isOptionalPlaceholderUtility(utility: LocalUtility) {
  const categoryOption = getUtilityCategoryOption(utility.category);

  if (!categoryOption || categoryOption.legacy || categoryOption.isDefault) {
    return false;
  }

  return (
    utility.label.trim() === categoryOption.label &&
    utility.apartmentIds.length === 0 &&
    utility.meterIds.length === 0 &&
    utility.note.trim() === ""
  );
}

function createInitialUtilitiesForObject(objectKey: string): LocalUtility[] {
  return STANDARD_UTILITY_CATEGORY_OPTIONS.map((option, index) => ({
    id: formatUtilityInternalId(objectKey, index + 1),
    category: option.value,
    label: option.label,
    apartmentIds: [],
    meterIds: [],
    note: "",
  }));
}

function getSortedMeterReadings(readings: LocalMeterReading[]) {
  return [...readings].sort((left, right) => {
    const dateCompare = right.date.localeCompare(left.date);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return right.id.localeCompare(left.id, "de", {
      numeric: true,
      sensitivity: "base",
    });
  });
}

function getLatestMeterReading(meter: LocalMeter) {
  return getSortedMeterReadings(meter.readings)[0];
}

function isMeterScopeValue(value: string): value is MeterScopeValue {
  return METER_SCOPE_OPTIONS.includes(value as MeterScopeValue);
}

function isMeterTypeValue(value: string): value is MeterTypeValue {
  return METER_TYPE_OPTIONS.some((option) => option.value === value);
}

function isMeterUnitValue(value: string): value is MeterUnitValue {
  return METER_UNIT_OPTIONS.includes(value as MeterUnitValue);
}

function isMeterOriginValue(value: string): value is MeterOriginValue {
  return METER_ORIGIN_OPTIONS.includes(value as MeterOriginValue);
}

function getStandardMeterTemplateByKey(key: string) {
  return ALL_STANDARD_METER_TEMPLATES.find((template) => template.key === key) ?? null;
}

function getNormalizedMeterNumberValue(meterNumber: string) {
  return meterNumber.trim().toLowerCase();
}

function hasStoredMeterNumberConflict(
  meters: LocalMeter[],
  meterNumber: string,
  options?: { ignoreMeterId?: string | null },
) {
  const normalizedMeterNumber = getNormalizedMeterNumberValue(meterNumber);

  if (normalizedMeterNumber === "") {
    return false;
  }

  return meters.some((meter) => {
    if (options?.ignoreMeterId && meter.id === options.ignoreMeterId) {
      return false;
    }

    return (
      getNormalizedMeterNumberValue(meter.meterNumber) === normalizedMeterNumber
    );
  });
}

function normalizeMeterReadingDraft(
  draft: MeterReadingDraft,
): MeterReadingDraft | null {
  const date = draft.date.trim();
  const reader = draft.reader.trim();
  const valueNumber = Number(draft.value);

  if (!isValidDateInputValue(date)) {
    return null;
  }

  if (!Number.isFinite(valueNumber) || valueNumber < 0) {
    return null;
  }

  return {
    date,
    value: String(valueNumber),
    reader,
  };
}

function normalizeStoredMeterReading(
  reading: LocalMeterReading | null | undefined,
): LocalMeterReading | null {
  if (
    !reading ||
    typeof reading.id !== "string" ||
    typeof reading.date !== "string" ||
    typeof reading.value !== "string" ||
    typeof reading.reader !== "string"
  ) {
    return null;
  }

  const id = reading.id.trim();

  if (id === "") {
    return null;
  }

  const normalizedDraft = normalizeMeterReadingDraft({
    date: reading.date,
    value: reading.value,
    reader: reading.reader,
  });

  if (!normalizedDraft) {
    return null;
  }

  return {
    id,
    ...normalizedDraft,
  };
}

function getValidatedMeterNumber(
  meters: LocalMeter[],
  meterNumber: string,
  options?: { ignoreMeterId?: string | null },
) {
  const normalizedMeterNumber = meterNumber.trim();

  if (normalizedMeterNumber === "") {
    return null;
  }

  if (
    hasStoredMeterNumberConflict(meters, normalizedMeterNumber, {
      ignoreMeterId: options?.ignoreMeterId ?? null,
    })
  ) {
    return null;
  }

  return normalizedMeterNumber;
}

function getValidatedMeterDraft(
  apartments: LocalApartment[],
  meters: LocalMeter[],
  draft: MeterDraft,
  options?: { ignoreMeterId?: string | null },
): ValidatedMeterDraft | null {
  if (
    !isMeterScopeValue(draft.scope) ||
    !isMeterTypeValue(draft.type) ||
    !isMeterUnitValue(draft.unit)
  ) {
    return null;
  }

  const label = draft.label.trim();
  const meterNumber = getValidatedMeterNumber(meters, draft.meterNumber, {
    ignoreMeterId: options?.ignoreMeterId ?? null,
  });

  if (label === "" || meterNumber === null) {
    return null;
  }

  if (draft.scope === "object") {
    return {
      scope: draft.scope,
      apartmentId: null,
      type: draft.type,
      label,
      meterNumber,
      unit: draft.unit,
    };
  }

  const apartmentId = draft.apartmentId.trim();

  if (
    apartmentId === "" ||
    !apartments.some((apartment) => apartment.id === apartmentId)
  ) {
    return null;
  }

  return {
    scope: draft.scope,
    apartmentId,
    type: draft.type,
    label,
    meterNumber,
    unit: draft.unit,
  };
}

function normalizeStoredMeter(
  meter: LocalMeter | null | undefined,
  apartments: LocalApartment[],
): LocalMeter | null {
  if (
    !meter ||
    typeof meter.id !== "string" ||
    typeof meter.origin !== "string" ||
    typeof meter.meterNumber !== "string" ||
    !Array.isArray(meter.readings)
  ) {
    return null;
  }

  const id = meter.id.trim();
  const meterNumber = meter.meterNumber.trim();

  if (id === "" || meterNumber === "" || !isMeterOriginValue(meter.origin)) {
    return null;
  }

  const readings = meter.readings.reduce<LocalMeterReading[]>((validReadings, reading) => {
    const normalizedReading = normalizeStoredMeterReading(reading);

    if (!normalizedReading) {
      return validReadings;
    }

    if (validReadings.some((existingReading) => existingReading.id === normalizedReading.id)) {
      return validReadings;
    }

    return [...validReadings, normalizedReading];
  }, []);

  if (meter.origin === "standard") {
    if (typeof meter.standardKey !== "string") {
      return null;
    }

    const template = getStandardMeterTemplateByKey(meter.standardKey);

    if (!template) {
      return null;
    }

    if (template.scope === "object") {
      return {
        ...meter,
        id,
        origin: "standard",
        standardKey: template.key,
        scope: template.scope,
        apartmentId: null,
        type: template.type,
        label: template.label,
        meterNumber,
        unit: template.unit,
        readings,
      };
    }

    const apartmentId =
      typeof meter.apartmentId === "string" ? meter.apartmentId.trim() : "";

    if (
      apartmentId === "" ||
      !apartments.some((apartment) => apartment.id === apartmentId)
    ) {
      return null;
    }

    return {
      ...meter,
      id,
      origin: "standard",
      standardKey: template.key,
      scope: template.scope,
      apartmentId,
      type: template.type,
      label: template.label,
      meterNumber,
      unit: template.unit,
      readings,
    };
  }

  if (
    !isMeterScopeValue(meter.scope) ||
    !isMeterTypeValue(meter.type) ||
    !isMeterUnitValue(meter.unit) ||
    typeof meter.label !== "string"
  ) {
    return null;
  }

  const label = meter.label.trim();

  if (label === "") {
    return null;
  }

  if (meter.scope === "object") {
    return {
      ...meter,
      id,
      origin: "optional",
      standardKey: null,
      scope: meter.scope,
      apartmentId: null,
      type: meter.type,
      label,
      meterNumber,
      unit: meter.unit,
      readings,
    };
  }

  const apartmentId =
    typeof meter.apartmentId === "string" ? meter.apartmentId.trim() : "";

  if (
    apartmentId === "" ||
    !apartments.some((apartment) => apartment.id === apartmentId)
  ) {
    return null;
  }

  return {
    ...meter,
    id,
    origin: "optional",
    standardKey: null,
    scope: meter.scope,
    apartmentId,
    type: meter.type,
    label,
    meterNumber,
    unit: meter.unit,
    readings,
  };
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}

function SectionCard({
  title,
  text,
  onClick,
}: {
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-zinc-200 bg-white p-5 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
    >
      <p className="text-base font-semibold text-zinc-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{text}</p>
    </button>
  );
}

function FocusHeader({
  label,
  onBack,
}: {
  label: string;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
      >
        ← Zurück zur Bereichsauswahl
      </button>

      <p className="text-sm text-zinc-500">
        Arbeitsmodus: <span className="font-medium text-zinc-900">{label}</span>
      </p>
    </div>
  );
}

function getDocumentTimestamp(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isOpenDocumentCase(document: ImmoDocument) {
  return (
    document.actionState !== null && document.actionState !== undefined ||
    document.fileAvailable === false ||
    (document.openIssues?.length ?? 0) > 0 ||
    document.status === "Fehlt" ||
    document.status === "In Prüfung"
  );
}

function isOpenReadingCampaign(campaign: ReadingCampaign) {
  if (campaign.status === "offen") {
    return true;
  }

  return campaign.recipients.some(
    (recipient) => recipient.status !== "eingereicht" && !recipient.submittedAt,
  );
}

function isContractExpiring(contract: Contract) {
  if (contract.status === "Läuft aus" || contract.status === "In Prüfung") {
    return true;
  }

  const endDate = new Date(contract.endDate).getTime();
  if (Number.isNaN(endDate)) {
    return false;
  }

  const now = Date.now();
  const ninetyDaysFromNow = now + 90 * 24 * 60 * 60 * 1000;
  return endDate > now && endDate <= ninetyDaysFromNow;
}

function ObjectDossierOverview({
  object,
  apartments,
  tenancies,
  meters,
  utilities,
  documents,
  tenants,
  contracts,
  rentUnits,
  readingCampaigns,
  missingRequirements,
  creatingRequirementKey,
  requirementActionError,
  onCreateMissingRequirement,
  onOpenSection,
}: {
  object: ImmoObject;
  apartments: LocalApartment[];
  tenancies: LocalTenancy[];
  meters: LocalMeter[];
  utilities: LocalUtility[];
  documents: ImmoDocument[];
  tenants: Tenant[];
  contracts: Contract[];
  rentUnits: RentUnit[];
  readingCampaigns: ReadingCampaign[];
  missingRequirements: DocumentRequirement[];
  creatingRequirementKey: string | null;
  requirementActionError: string | null;
  onCreateMissingRequirement: (requirement: DocumentRequirement) => void;
  onOpenSection: (section: SectionKey) => void;
}) {
  const activeTenants = tenants.filter((tenant) => tenant.status === "Aktiv").length;
  const pendingTenants = tenants.filter((tenant) => tenant.status === "Ausstehend").length;
  const activeContracts = contracts.filter((contract) => contract.status === "Aktiv").length;
  const expiringContracts = contracts.filter(isContractExpiring).length;
  const openDocuments = documents.filter(isOpenDocumentCase).length;
  const missingFiles = documents.filter((document) => document.fileAvailable === false).length;
  const openCampaigns = readingCampaigns.filter(isOpenReadingCampaign).length;
  const submittedReadings = readingCampaigns.reduce(
    (sum, campaign) =>
      sum + campaign.recipients.filter((recipient) => recipient.status === "eingereicht").length,
    0,
  );
  const readingRecipients = readingCampaigns.reduce(
    (sum, campaign) => sum + campaign.recipients.length,
    0,
  );
  const persistedUnitCount = Math.max(apartments.length, rentUnits.length, object.units);
  const openHints = [
    ...(pendingTenants > 0 ? [`${pendingTenants} Mieter ausstehend`] : []),
    ...(expiringContracts > 0 ? [`${expiringContracts} Vertrag/Verträge bald kritisch`] : []),
    ...(missingRequirements.length > 0 ? [`${missingRequirements.length} fehlende Pflichtdokumente`] : []),
    ...(openDocuments > 0 ? [`${openDocuments} offene Dokumentfälle`] : []),
    ...(missingFiles > 0 ? [`${missingFiles} Datei(en) fehlen in der Ablage`] : []),
    ...(openCampaigns > 0 ? [`${openCampaigns} offene Ablesekampagnen`] : []),
  ];

  return (
    <div className="space-y-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">Objektakte</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Zentrale Sicht auf Einheiten, Mieter, Verträge, Dokumente und laufende Vorgänge.
          </p>
        </div>
        <Link
          href={buildObjectDocumentsHref(object.id)}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50"
        >
          Dokumentenakte öffnen
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DetailField label="Einheiten" value={persistedUnitCount} />
        <DetailField label="Mieter" value={`${tenants.length} gesamt · ${activeTenants} aktiv`} />
        <DetailField label="Verträge" value={`${contracts.length} gesamt · ${activeContracts} aktiv`} />
        <DetailField label="Dokumente" value={`${documents.length} gesamt · ${openDocuments} offen`} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DetailField label="Lokale Wohnungsstruktur" value={apartments.length} />
        <DetailField label="Mietverhältnisse" value={tenancies.length} />
        <DetailField label="Zähler" value={meters.length} />
        <DetailField label="Nebenkostenpositionen" value={utilities.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-sm font-semibold text-zinc-900">Offene Punkte</p>
          <div className="mt-3 space-y-2">
            {openHints.length === 0 ? (
              <p className="text-sm text-emerald-700">Keine offenen Punkte aus den aktuellen Daten.</p>
            ) : (
              openHints.map((hint) => (
                <p key={hint} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {hint}
                </p>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-sm font-semibold text-zinc-900">Ablesungen</p>
          <p className="mt-3 text-sm text-zinc-600">
            {readingCampaigns.length} Kampagnen · {submittedReadings} von {readingRecipients} Rückmeldungen eingereicht
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Offene Kampagnen erscheinen zusätzlich im Dashboard und in den Hinweisen dieser Objektakte.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Pflichtdokumente</p>
            <p className="mt-1 text-sm text-zinc-500">
              Sollbestand aus Objekt, belegten Einheiten und dem letzten Abrechnungsjahr.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenSection("documents")}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            Dokumente prüfen
          </button>
        </div>

        {missingRequirements.length === 0 ? (
          <p className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Alle aktuell erwarteten Pflichtdokumente sind vorhanden.
          </p>
        ) : (
          <>
            {requirementActionError ? (
              <p className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {requirementActionError}
              </p>
            ) : null}
            <div className="mt-3 grid gap-2 xl:grid-cols-2">
              {missingRequirements.slice(0, 6).map((requirement) => (
                <div
                  key={requirement.key}
                  className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <Link
                      href={buildObjectDocumentsHref(object.id, {
                        rentUnitId: requirement.rentUnitId ?? undefined,
                        category: requirement.category,
                        reportYear: requirement.reportYear,
                      })}
                      className="min-w-0 transition hover:text-amber-950"
                    >
                      <p className="text-sm font-medium text-amber-900">{requirement.title}</p>
                      <p className="mt-1 text-xs text-amber-700">{requirement.reason}</p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => onCreateMissingRequirement(requirement)}
                      disabled={creatingRequirementKey === requirement.key}
                      className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-amber-900 px-3 text-xs font-medium text-white transition hover:bg-amber-800 disabled:cursor-wait disabled:opacity-60"
                    >
                      {creatingRequirementKey === requirement.key ? "Wird angelegt..." : "Als fehlend anlegen"}
                    </button>
                  </div>
                </div>
              ))}
              {missingRequirements.length > 6 ? (
                <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                  + {missingRequirements.length - 6} weitere Pflichtdokumente
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {Object.entries(SECTION_LABELS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onOpenSection(key as SectionKey)}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function buildObjectDocumentsHref(
  objectId: string,
  options?: {
    rentUnitId?: string;
    category?: string;
    reportYear?: number | null;
    fileState?: string;
  },
) {
  const params = new URLSearchParams({ objectId });

  if (options?.rentUnitId) {
    params.set("rentUnitId", options.rentUnitId);
  }

  if (options?.category) {
    params.set("category", options.category);
  }

  if (options?.reportYear) {
    params.set("reportYear", String(options.reportYear));
  }

  if (options?.fileState) {
    params.set("fileState", options.fileState);
  }

  return `/dokumente?${params.toString()}`;
}

function ObjectDocumentsSection({
  object,
  documents,
}: {
  object: ImmoObject;
  documents: ImmoDocument[];
}) {
  const sortedDocuments = [...documents].sort(
    (left, right) =>
      getDocumentTimestamp(right.updatedAt) - getDocumentTimestamp(left.updatedAt),
  );
  const missingFilesCount = documents.filter(
    (document) => document.fileAvailable === false,
  ).length;
  const openDocumentCount = documents.filter(
    (document) => (document.openIssues?.length ?? 0) > 0 || document.actionState,
  ).length;
  const categorySummary = Array.from(
    documents.reduce((map, document) => {
      map.set(document.category, (map.get(document.category) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  )
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 6);
  const yearSummary = Array.from(
    documents.reduce((map, document) => {
      if (document.reportYear) {
        map.set(document.reportYear, (map.get(document.reportYear) ?? 0) + 1);
      }
      return map;
    }, new Map<number, number>()),
  ).sort((left, right) => right[0] - left[0]);

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">Dokumente</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Objektbezogene Unterlagen direkt am Primäranker sichten und in die Ablage öffnen.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildObjectDocumentsHref(object.id)}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            Alle Dokumente öffnen
          </Link>
          <Link
            href={buildObjectDocumentsHref(object.id, { fileState: "DATEI_FEHLT" })}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            Fehlende Dateien
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Gesamt</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{documents.length}</p>
          <p className="mt-1 text-xs text-zinc-600">Dokumente mit Objektzuordnung</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Offene Fälle</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{openDocumentCount}</p>
          <p className="mt-1 text-xs text-zinc-600">Prüfung, fehlende Datei oder fehlende Bereinigung</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Datei fehlt</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{missingFilesCount}</p>
          <p className="mt-1 text-xs text-zinc-600">Physisch nicht mehr in der Ablage vorhanden</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-zinc-900">Zuletzt bearbeitete Dokumente</h4>
              <p className="mt-1 text-xs text-zinc-500">Direkter Überblick über den aktuellen Objektbestand.</p>
            </div>
          </div>

          {sortedDocuments.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-5 text-sm text-zinc-500">
              Für dieses Objekt sind noch keine Dokumente abgelegt.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {sortedDocuments.slice(0, 6).map((document) => (
                <div key={document.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{document.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {document.category}
                        {document.unitLabel ? ` · ${document.unitLabel}` : ""}
                        {document.reportYear ? ` · ${document.reportYear}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">{document.fileName}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {document.fileAvailable === false ? (
                        <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-medium text-rose-700">
                          Datei fehlt
                        </span>
                      ) : null}
                      {(document.openIssues?.length ?? 0) > 0 ? (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700">
                          {document.openIssues?.length} offene Punkte
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <h4 className="text-sm font-semibold text-zinc-900">Kategorien</h4>
            {categorySummary.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Noch keine Kategorien vorhanden.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {categorySummary.map(([category, count]) => (
                  <Link
                    key={category}
                    href={buildObjectDocumentsHref(object.id, { category })}
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    <span>{category}</span>
                    <span className="font-semibold">{count}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <h4 className="text-sm font-semibold text-zinc-900">Berichtsjahre</h4>
            {yearSummary.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Noch keine Jahreszuordnung vorhanden.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {yearSummary.map(([year, count]) => (
                  <Link
                    key={year}
                    href={buildObjectDocumentsHref(object.id, { reportYear: year })}
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    <span>{year}</span>
                    <span className="font-semibold">{count}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewSection({ object }: { object: ImmoObject }) {
  const { street, city } = splitAddress(object.address);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-zinc-900">Übersicht</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Basisdaten des ausgewählten Objekts.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DetailField label="Bezeichnung" value={object.name} />
        <DetailField label="Straße" value={street} />
        <DetailField label="PLZ / Ort" value={city} />
        <DetailField label="Einheiten" value={object.units} />
        <DetailField label="Typ" value={object.type} />
        <DetailField label="Verwalter" value="Udo Gölzer" />
        <DetailField label="Status" value={object.status} />
        <DetailField label="Auslastung" value={object.occupancy} />
        <DetailField
          label="Monatliche Sollmiete"
          value={object.monthlyTargetRent}
        />
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">Notiz</p>
        <p className="mt-2 text-sm leading-6 text-zinc-700">{object.note}</p>
      </div>
    </div>
  );
}

function ApartmentsSection({
  object,
  apartments,
  documents,
  onCreateApartment,
  onUpdateApartment,
  onDeleteApartment,
}: {
  object: ImmoObject;
  apartments: LocalApartment[];
  documents: ImmoDocument[];
  onCreateApartment: (draft: ApartmentDraft) => void;
  onUpdateApartment: (apartmentId: string, draft: ApartmentDraft) => void;
  onDeleteApartment: (apartmentId: string) => void;
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [draft, setDraft] = useState<ApartmentDraft>(EMPTY_APARTMENT_DRAFT);
  const [draftDesignationMode, setDraftDesignationMode] =
    useState<ApartmentDesignationMode>("preset");
  const [editingApartmentId, setEditingApartmentId] = useState<string | null>(
    null,
  );
  const [editDraft, setEditDraft] = useState<ApartmentDraft>(
    EMPTY_APARTMENT_DRAFT,
  );
  const [editDesignationMode, setEditDesignationMode] =
    useState<ApartmentDesignationMode>("preset");

  useEffect(() => {
    setIsCreateOpen(false);
    setDraft(EMPTY_APARTMENT_DRAFT);
    setDraftDesignationMode("preset");
    setEditingApartmentId(null);
    setEditDraft(EMPTY_APARTMENT_DRAFT);
    setEditDesignationMode("preset");
  }, [object.id]);

  const isDuplicateDesignation =
    draft.designation.trim() !== "" &&
    apartments.some(
      (apartment) =>
        apartment.designation.trim().toLowerCase() ===
        draft.designation.trim().toLowerCase(),
    );

  const areaNumber = Number(draft.area);
  const isAreaValid =
    draft.area.trim() !== "" &&
    Number.isFinite(areaNumber) &&
    areaNumber > 0;

  const createdCount = apartments.length;
  const freeCount = apartments.filter(
    (apartment) => apartment.status === "frei",
  ).length;
  const rentedCount = apartments.filter(
    (apartment) => apartment.status === "vermietet",
  ).length;

  const objectUnitsNumber = Number(object.units);
  const hasUnitsLimit =
    Number.isFinite(objectUnitsNumber) && objectUnitsNumber > 0;
  const remainingCount = hasUnitsLimit
    ? Math.max(objectUnitsNumber - createdCount, 0)
    : null;
  const isObjectLimitReached =
    hasUnitsLimit && createdCount >= objectUnitsNumber;

  const isCreateDisabled =
    isObjectLimitReached ||
    draft.designation.trim() === "" ||
    !isAreaValid ||
    draft.status === "" ||
    isDuplicateDesignation;

  const isEditDuplicateDesignation =
    editDraft.designation.trim() !== "" &&
    apartments.some(
      (apartment) =>
        apartment.id !== editingApartmentId &&
        apartment.designation.trim().toLowerCase() ===
          editDraft.designation.trim().toLowerCase(),
    );

  const editAreaNumber = Number(editDraft.area);
  const isEditAreaValid =
    editDraft.area.trim() !== "" &&
    Number.isFinite(editAreaNumber) &&
    editAreaNumber > 0;

  const isSaveEditDisabled =
    editingApartmentId === null ||
    editDraft.designation.trim() === "" ||
    !isEditAreaValid ||
    editDraft.status === "" ||
    isEditDuplicateDesignation;

  const sortedApartments = [...apartments].sort((left, right) =>
    left.unitLabel.localeCompare(right.unitLabel, "de", {
      numeric: true,
      sensitivity: "base",
    }),
  );

  function updateDraft(field: keyof ApartmentDraft, value: string) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateEditDraft(field: keyof ApartmentDraft, value: string) {
    setEditDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleDraftDesignationSelectChange(value: string) {
    if (value === APARTMENT_DESIGNATION_CUSTOM_OPTION_VALUE) {
      setDraftDesignationMode("custom");

      setDraft((current) => ({
        ...current,
        designation: isApartmentDesignationOption(current.designation)
          ? ""
          : current.designation,
      }));

      return;
    }

    setDraftDesignationMode("preset");
    updateDraft("designation", value);
  }

  function handleEditDesignationSelectChange(value: string) {
    if (value === APARTMENT_DESIGNATION_CUSTOM_OPTION_VALUE) {
      setEditDesignationMode("custom");

      setEditDraft((current) => ({
        ...current,
        designation: isApartmentDesignationOption(current.designation)
          ? ""
          : current.designation,
      }));

      return;
    }

    setEditDesignationMode("preset");
    updateEditDraft("designation", value);
  }

  function resetCreateState() {
    setDraft(EMPTY_APARTMENT_DRAFT);
    setDraftDesignationMode("preset");
    setIsCreateOpen(false);
  }

  function resetEditState() {
    setEditingApartmentId(null);
    setEditDraft(EMPTY_APARTMENT_DRAFT);
    setEditDesignationMode("preset");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isCreateDisabled || draft.status === "") {
      return;
    }

    onCreateApartment({
      designation: draft.designation.trim(),
      area: areaNumber.toString(),
      status: draft.status,
    });

    resetCreateState();
  }

  function handleEditStart(apartment: LocalApartment) {
    setEditingApartmentId(apartment.id);
    setEditDraft({
      designation: apartment.designation,
      area: apartment.area,
      status: apartment.status,
    });
    setEditDesignationMode(getApartmentDesignationMode(apartment.designation));
    setIsCreateOpen(false);
  }

  function handleEditSubmit(
    event: FormEvent<HTMLFormElement>,
    apartmentId: string,
  ) {
    event.preventDefault();

    if (isSaveEditDisabled || editDraft.status === "") {
      return;
    }

    onUpdateApartment(apartmentId, {
      designation: editDraft.designation.trim(),
      area: editAreaNumber.toString(),
      status: editDraft.status,
    });

    resetEditState();
  }

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">Wohnungen</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Hier wird die Wohnungsstruktur des ausgewählten Objekts aufgebaut.
          </p>
        </div>

        <div className="flex flex-col gap-3 xl:items-end">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Einheiten laut Objekt
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-900">{object.units}</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Angelegte Wohnungen
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-900">{createdCount}</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Frei
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-900">{freeCount}</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Vermietet
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-900">{rentedCount}</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Noch offen
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {remainingCount ?? "—"}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isObjectLimitReached}
            onClick={() => setIsCreateOpen((current) => !current)}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isObjectLimitReached
              ? "Alle Einheiten angelegt"
              : isCreateOpen
                ? "Formular schließen"
                : "+ Wohnung anlegen"}
          </button>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        {isObjectLimitReached ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Die im Objekt hinterlegte Einheitenzahl ist bereits vollständig als
            Wohnungen angelegt.
          </div>
        ) : null}

        {isCreateOpen ? (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-zinc-200 bg-white p-4"
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_180px_180px]">
              <label className="block">
                <span className="text-sm font-medium text-zinc-900">
                  Bezeichnung
                </span>
                <select
                  value={formatApartmentDesignationSelectValue(
                    draft.designation,
                    draftDesignationMode,
                  )}
                  onChange={(event) =>
                    handleDraftDesignationSelectChange(event.target.value)
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                >
                  <option value="">Bitte wählen</option>
                  {APARTMENT_DESIGNATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                  <option value={APARTMENT_DESIGNATION_CUSTOM_OPTION_VALUE}>
                    Freitext
                  </option>
                </select>

                {draftDesignationMode === "custom" ? (
                  <input
                    type="text"
                    value={draft.designation}
                    onChange={(event) =>
                      updateDraft("designation", event.target.value)
                    }
                    placeholder="Eigene Bezeichnung eingeben"
                    className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                  />
                ) : null}

                {isDuplicateDesignation ? (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    Diese Bezeichnung ist in diesem Objekt bereits vorhanden.
                  </p>
                ) : null}
              </label>

              <label className="block">
                <span className="text-sm font-medium text-zinc-900">Fläche</span>
                <div className="mt-2 flex h-11 items-center overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    value={draft.area}
                    onChange={(event) => updateDraft("area", event.target.value)}
                    className="h-full w-full px-3 text-sm text-zinc-900 outline-none"
                  />
                  <span className="border-l border-zinc-200 px-3 text-sm text-zinc-500">
                    m²
                  </span>
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-zinc-900">Status</span>
                <select
                  value={draft.status}
                  onChange={(event) => updateDraft("status", event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                >
                  <option value="">Bitte wählen</option>
                  {APARTMENT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isCreateDisabled}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Wohnung speichern
              </button>

              <button
                type="button"
                onClick={resetCreateState}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Abbrechen
              </button>
            </div>
          </form>
        ) : null}

        <div className="grid grid-cols-[minmax(0,1.1fr)_120px_160px_180px_220px] gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          <p>Einheit</p>
          <p>Fläche</p>
          <p>Status</p>
          <p>Dokumente</p>
          <p>Aktionen</p>
        </div>

        {sortedApartments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-5 text-sm text-zinc-500">
            Noch keine Wohnungen angelegt.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedApartments.map((apartment) =>
              editingApartmentId === apartment.id ? (
                <form
                  key={apartment.id}
                  onSubmit={(event) => handleEditSubmit(event, apartment.id)}
                  className="rounded-2xl border border-zinc-200 bg-white p-4"
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_180px_180px]">
                    <label className="block">
                      <span className="text-sm font-medium text-zinc-900">
                        Bezeichnung
                      </span>
                      <select
                        value={formatApartmentDesignationSelectValue(
                          editDraft.designation,
                          editDesignationMode,
                        )}
                        onChange={(event) =>
                          handleEditDesignationSelectChange(event.target.value)
                        }
                        className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                      >
                        <option value="">Bitte wählen</option>
                        {APARTMENT_DESIGNATION_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                        <option value={APARTMENT_DESIGNATION_CUSTOM_OPTION_VALUE}>
                          Freitext
                        </option>
                      </select>

                      {editDesignationMode === "custom" ? (
                        <input
                          type="text"
                          value={editDraft.designation}
                          onChange={(event) =>
                            updateEditDraft("designation", event.target.value)
                          }
                          placeholder="Eigene Bezeichnung eingeben"
                          className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                        />
                      ) : null}

                      {isEditDuplicateDesignation ? (
                        <p className="mt-2 text-xs font-medium text-red-600">
                          Diese Bezeichnung ist in diesem Objekt bereits vorhanden.
                        </p>
                      ) : null}
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-zinc-900">
                        Fläche
                      </span>
                      <div className="mt-2 flex h-11 items-center overflow-hidden rounded-xl border border-zinc-200 bg-white">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0.01"
                          step="0.01"
                          value={editDraft.area}
                          onChange={(event) =>
                            updateEditDraft("area", event.target.value)
                          }
                          className="h-full w-full px-3 text-sm text-zinc-900 outline-none"
                        />
                        <span className="border-l border-zinc-200 px-3 text-sm text-zinc-500">
                          m²
                        </span>
                      </div>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-zinc-900">
                        Status
                      </span>
                      <select
                        value={editDraft.status}
                        onChange={(event) =>
                          updateEditDraft("status", event.target.value)
                        }
                        className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                      >
                        <option value="">Bitte wählen</option>
                        {APARTMENT_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {apartment.unitLabel}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        Technische ID bleibt intern: {apartment.id}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={isSaveEditDisabled}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Änderungen speichern
                      </button>

                      <button
                        type="button"
                        onClick={resetEditState}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div
                  key={apartment.id}
                  className="grid grid-cols-[minmax(0,1.1fr)_120px_160px_180px_220px] items-center gap-4 rounded-2xl border border-zinc-200 bg-white px-4 py-4"
                >
                  {(() => {
                    const apartmentDocuments = documents
                      .filter((document) => document.rentUnitId === apartment.id)
                      .sort(
                        (left, right) =>
                          getDocumentTimestamp(right.updatedAt) -
                          getDocumentTimestamp(left.updatedAt),
                      );
                    const openDocumentCount = apartmentDocuments.filter(
                      (document) =>
                        document.fileAvailable === false ||
                        (document.openIssues?.length ?? 0) > 0 ||
                        document.status === "Fehlt" ||
                        document.status === "In Prüfung",
                    ).length;
                    const latestDocument = apartmentDocuments[0] ?? null;

                    return (
                      <>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">
                      {apartment.unitLabel}
                    </p>
                    <p className="mt-1 truncate text-sm text-zinc-500">
                      {apartment.designation}
                    </p>
                  </div>

                  <p className="text-sm font-medium text-zinc-900">
                    {formatApartmentArea(apartment.area)}
                  </p>

                  <div className="justify-self-start">
                    <span
                      className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold ${getApartmentStatusClasses(apartment.status)}`}
                    >
                      {getApartmentStatusLabel(apartment.status)}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900">
                      {apartmentDocuments.length} Dokument
                      {apartmentDocuments.length === 1 ? "" : "e"}
                    </p>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {latestDocument
                        ? `${latestDocument.category}${latestDocument.reportYear ? ` · ${latestDocument.reportYear}` : ""}`
                        : "Noch keine Ablage"}
                    </p>
                    {openDocumentCount > 0 ? (
                      <p className="mt-1 text-xs font-medium text-amber-700">
                        {openDocumentCount} offener Fall
                        {openDocumentCount === 1 ? "" : "e"}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap justify-self-start gap-2">
                    <Link
                      href={buildObjectDocumentsHref(object.id, {
                        rentUnitId: apartment.id,
                      })}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Dokumente
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleEditStart(apartment)}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Bearbeiten
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (editingApartmentId === apartment.id) {
                          resetEditState();
                        }

                        onDeleteApartment(apartment.id);
                      }}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 transition hover:bg-red-100"
                    >
                      Löschen
                    </button>
                  </div>
                      </>
                    );
                  })()}
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TenanciesSection({
  object,
  apartments,
  tenancies,
  documents,
  onCreateTenancy,
  onUpdateTenancy,
  onDeleteTenancy,
}: {
  object: ImmoObject;
  apartments: LocalApartment[];
  tenancies: LocalTenancy[];
  documents: ImmoDocument[];
  onCreateTenancy: (apartmentId: string, draft: TenancyDraft) => void;
  onUpdateTenancy: (tenancyId: string, draft: TenancyDraft) => void;
  onDeleteTenancy: (tenancyId: string) => void;
}) {
  const [formApartmentId, setFormApartmentId] = useState<string | null>(null);
  const [editingTenancyId, setEditingTenancyId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TenancyDraft>(EMPTY_TENANCY_DRAFT);

  useEffect(() => {
    setFormApartmentId(null);
    setEditingTenancyId(null);
    setDraft(EMPTY_TENANCY_DRAFT);
  }, [object.id]);

  useEffect(() => {
    if (
      formApartmentId !== null &&
      !apartments.some((apartment) => apartment.id === formApartmentId)
    ) {
      setFormApartmentId(null);
      setEditingTenancyId(null);
      setDraft(EMPTY_TENANCY_DRAFT);
    }
  }, [formApartmentId, apartments]);

  const sortedApartments = [...apartments].sort((left, right) =>
    left.unitLabel.localeCompare(right.unitLabel, "de", {
      numeric: true,
      sensitivity: "base",
    }),
  );

  const tenanciesByApartmentId = new Map<string, LocalTenancy[]>();

  tenancies.forEach((tenancy) => {
    const apartmentTenancies = tenanciesByApartmentId.get(tenancy.apartmentId) ?? [];
    apartmentTenancies.push(tenancy);
    tenanciesByApartmentId.set(tenancy.apartmentId, apartmentTenancies);
  });

  const activeTenanciesCount = apartments.filter((apartment) => {
    const apartmentTenancies = tenanciesByApartmentId.get(apartment.id) ?? [];

    return apartmentTenancies.some((tenancy) => tenancy.endDate.trim() === "");
  }).length;

  const withoutActiveTenancyCount = apartments.length - activeTenanciesCount;

  const selectedApartmentTenancies =
    formApartmentId === null ? [] : tenanciesByApartmentId.get(formApartmentId) ?? [];

  const personsNumber = Number(draft.persons);
  const isPersonsValid =
    draft.persons.trim() !== "" &&
    Number.isInteger(personsNumber) &&
    personsNumber > 0;
  const isDateRangeInvalid =
    draft.startDate.trim() !== "" &&
    draft.endDate.trim() !== "" &&
    draft.endDate < draft.startDate;

  const hasDateOverlap =
    formApartmentId !== null &&
    draft.startDate.trim() !== "" &&
    !isDateRangeInvalid &&
    selectedApartmentTenancies.some((tenancy) => {
      if (editingTenancyId !== null && tenancy.id === editingTenancyId) {
        return false;
      }

      return tenancyRangesOverlap(
        draft.startDate,
        draft.endDate,
        tenancy.startDate,
        tenancy.endDate,
      );
    });

  const isFormDisabled =
    formApartmentId === null ||
    draft.tenantName.trim() === "" ||
    draft.startDate.trim() === "" ||
    !isPersonsValid ||
    isDateRangeInvalid ||
    hasDateOverlap;

  function updateDraft(field: keyof TenancyDraft, value: string) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetFormState() {
    setFormApartmentId(null);
    setEditingTenancyId(null);
    setDraft(EMPTY_TENANCY_DRAFT);
  }

  function handleCreateStart(apartmentId: string) {
    setFormApartmentId(apartmentId);
    setEditingTenancyId(null);
    setDraft({
      tenantName: "",
      startDate: getTodayDateInputValue(),
      endDate: "",
      persons: "1",
    });
  }

  function handleEditStart(tenancy: LocalTenancy) {
    setFormApartmentId(tenancy.apartmentId);
    setEditingTenancyId(tenancy.id);
    setDraft({
      tenantName: tenancy.tenantName,
      startDate: tenancy.startDate,
      endDate: tenancy.endDate,
      persons: tenancy.persons,
    });
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
    apartmentId: string,
    existingTenancy: LocalTenancy | undefined,
  ) {
    event.preventDefault();

    if (isFormDisabled) {
      return;
    }

    const nextDraft: TenancyDraft = {
      tenantName: draft.tenantName.trim(),
      startDate: draft.startDate,
      endDate: draft.endDate,
      persons: String(personsNumber),
    };

    if (existingTenancy) {
      onUpdateTenancy(existingTenancy.id, nextDraft);
    } else {
      onCreateTenancy(apartmentId, nextDraft);
    }

    resetFormState();
  }

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">Mietverhältnisse</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Mietverhältnisse werden mit Mietbeginn, Mietende und Personenzahl
            je Wohnung geführt. Das bildet die Grundlage für spätere
            Personentage in der Abrechnung.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
              Angelegte Wohnungen
            </p>
            <p className="mt-2 text-sm font-medium text-zinc-900">
              {apartments.length}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
              Mietverhältnisse gesamt
            </p>
            <p className="mt-2 text-sm font-medium text-zinc-900">
              {tenancies.length}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
              Aktive Mietverhältnisse
            </p>
            <p className="mt-2 text-sm font-medium text-zinc-900">
              {activeTenanciesCount}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
              Ohne aktives Mietverhältnis
            </p>
            <p className="mt-2 text-sm font-medium text-zinc-900">
              {withoutActiveTenancyCount}
            </p>
          </div>
        </div>
      </div>

      {apartments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6">
          <p className="text-sm font-semibold text-zinc-900">
            Noch keine Wohnungen als Basis vorhanden.
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Mietverhältnisse werden erst im Objektkontext erfasst, wenn zuvor
            mindestens eine Wohnung angelegt wurde.
          </p>
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          {sortedApartments.map((apartment) => {
            const apartmentTenancies = getSortedTenanciesForDisplay(
              tenanciesByApartmentId.get(apartment.id) ?? [],
            );
            const apartmentDocuments = documents.filter(
              (document) => document.rentUnitId === apartment.id,
            );
            const contractDocuments = apartmentDocuments.filter(
              (document) => document.category === "Mietvertrag",
            );
            const openDocumentCount = apartmentDocuments.filter(
              (document) =>
                document.fileAvailable === false ||
                (document.openIssues?.length ?? 0) > 0 ||
                document.status === "Fehlt" ||
                document.status === "In Prüfung",
            ).length;
            const activeTenancy = apartmentTenancies.find(
              (tenancy) => tenancy.endDate.trim() === "",
            );
            const lastClosedTenancy = apartmentTenancies.find(
              (tenancy) => tenancy.endDate.trim() !== "",
            );
            const isFormOpen = formApartmentId === apartment.id;
            const editingTenancy = editingTenancyId
              ? apartmentTenancies.find((tenancy) => tenancy.id === editingTenancyId)
              : undefined;

            return (
              <div
                key={apartment.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm font-semibold text-zinc-900">
                        {apartment.unitLabel}
                      </p>
                      <span
                        className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold ${getApartmentStatusClasses(apartment.status)}`}
                      >
                        {getApartmentStatusLabel(apartment.status)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-zinc-500">
                      {apartment.designation} · {formatApartmentArea(apartment.area)}
                    </p>

                    {activeTenancy ? (
                      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <p className="text-sm font-semibold text-emerald-800">
                          Aktives Mietverhältnis
                        </p>
                        <p className="mt-1 text-sm text-emerald-700">
                          {activeTenancy.tenantName} ·{" "}
                          {formatPersonsLabel(activeTenancy.persons)}
                        </p>
                        <p className="mt-1 text-sm text-emerald-700">
                          Zeitraum:{" "}
                          {formatTenancyPeriod(
                            activeTenancy.startDate,
                            activeTenancy.endDate,
                          )}
                        </p>
                      </div>
                    ) : lastClosedTenancy ? (
                      <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                        <p className="text-sm font-semibold text-zinc-900">
                          Letztes beendetes Mietverhältnis
                        </p>
                        <p className="mt-1 text-sm text-zinc-600">
                          {lastClosedTenancy.tenantName} ·{" "}
                          {formatPersonsLabel(lastClosedTenancy.persons)}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600">
                          Zeitraum:{" "}
                          {formatTenancyPeriod(
                            lastClosedTenancy.startDate,
                            lastClosedTenancy.endDate,
                          )}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                        Noch kein Mietverhältnis vorhanden.
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={buildObjectDocumentsHref(object.id, {
                        rentUnitId: apartment.id,
                      })}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Dokumente
                    </Link>

                    <Link
                      href={buildObjectDocumentsHref(object.id, {
                        rentUnitId: apartment.id,
                        category: "Mietvertrag",
                      })}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Mietvertrag
                    </Link>

                    {activeTenancy ? (
                      <button
                        type="button"
                        onClick={() => handleEditStart(activeTenancy)}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                      >
                        Aktives Mietverhältnis bearbeiten
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCreateStart(apartment.id)}
                        className="inline-flex h-9 items-center justify-center rounded-xl bg-zinc-900 px-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                      >
                        {apartmentTenancies.length === 0
                          ? "Mietverhältnis anlegen"
                          : "Mieterwechsel anlegen"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                      Dokumente gesamt
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-900">
                      {apartmentDocuments.length}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                      Mietverträge
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-900">
                      {contractDocuments.length}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                      Offene Dokumentfälle
                    </p>
                    <p className="mt-2 text-sm font-medium text-zinc-900">
                      {openDocumentCount}
                    </p>
                  </div>
                </div>

                {activeTenancy ? (
                  <p className="mt-4 text-sm text-zinc-500">
                    Für einen Mieterwechsel zuerst beim aktiven Mietverhältnis das
                    Mietende setzen. Danach kann das nächste Mietverhältnis
                    angelegt werden.
                  </p>
                ) : null}

                {isFormOpen ? (
                  <form
                    onSubmit={(event) =>
                      handleSubmit(event, apartment.id, editingTenancy)
                    }
                    className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                  >
                    <div className="grid gap-4 xl:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-medium text-zinc-900">
                          Mietername
                        </span>
                        <input
                          type="text"
                          value={draft.tenantName}
                          onChange={(event) =>
                            updateDraft("tenantName", event.target.value)
                          }
                          className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-zinc-900">
                          Personen
                        </span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          inputMode="numeric"
                          value={draft.persons}
                          onChange={(event) =>
                            updateDraft("persons", event.target.value)
                          }
                          className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-zinc-900">
                          Mietbeginn
                        </span>
                        <input
                          type="date"
                          value={draft.startDate}
                          onChange={(event) =>
                            updateDraft("startDate", event.target.value)
                          }
                          className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-zinc-900">
                          Mietende
                        </span>
                        <input
                          type="date"
                          value={draft.endDate}
                          onChange={(event) =>
                            updateDraft("endDate", event.target.value)
                          }
                          className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                        />
                        <p className="mt-2 text-xs text-zinc-500">
                          Leer lassen, solange das Mietverhältnis aktiv ist.
                        </p>
                      </label>
                    </div>

                    {isDateRangeInvalid ? (
                      <p className="mt-3 text-xs font-medium text-red-600">
                        Das Mietende darf nicht vor dem Mietbeginn liegen.
                      </p>
                    ) : null}

                    {hasDateOverlap ? (
                      <p className="mt-3 text-xs font-medium text-red-600">
                        Der Zeitraum überschneidet sich mit einem vorhandenen
                        Mietverhältnis dieser Wohnung.
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={isFormDisabled}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {editingTenancy ? "Änderungen speichern" : "Mietverhältnis speichern"}
                      </button>

                      <button
                        type="button"
                        onClick={resetFormState}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </form>
                ) : null}

                {apartmentTenancies.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                      <p className="text-sm font-semibold text-zinc-900">
                        Historie
                      </p>
                    </div>

                    {apartmentTenancies.map((tenancy) => {
                      const isActiveTenancy = tenancy.endDate.trim() === "";

                      return (
                        <div
                          key={tenancy.id}
                          className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-zinc-900">
                                  {tenancy.tenantName}
                                </p>
                                <span
                                  className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold ${
                                    isActiveTenancy
                                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border border-zinc-200 bg-white text-zinc-700"
                                  }`}
                                >
                                  {isActiveTenancy ? "Aktiv" : "Beendet"}
                                </span>
                              </div>

                              <p className="mt-2 text-sm text-zinc-600">
                                Zeitraum:{" "}
                                {formatTenancyPeriod(
                                  tenancy.startDate,
                                  tenancy.endDate,
                                )}
                              </p>
                              <p className="mt-1 text-sm text-zinc-600">
                                Belegung: {formatPersonsLabel(tenancy.persons)}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditStart(tenancy)}
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                              >
                                Bearbeiten
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (editingTenancyId === tenancy.id) {
                                    resetFormState();
                                  }

                                  onDeleteTenancy(tenancy.id);
                                }}
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 transition hover:bg-red-100"
                              >
                                Löschen
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MetersSection({
  object,
  apartments,
  meters,
  onCreateStandardMeter,
  onCreateMeter,
  onUpdateMeter,
  onDeleteMeter,
  onCreateMeterReading,
  onUpdateMeterReading,
  onDeleteMeterReading,
}: {
  object: ImmoObject;
  apartments: LocalApartment[];
  meters: LocalMeter[];
  onCreateStandardMeter: (
    template: StandardMeterTemplate,
    apartmentId: string | null,
    draft: StandardMeterCreateDraft,
  ) => void;
  onCreateMeter: (draft: MeterDraft, initialReading: MeterReadingDraft) => void;
  onUpdateMeter: (meterId: string, draft: MeterDraft) => void;
  onDeleteMeter: (meterId: string) => void;
  onCreateMeterReading: (meterId: string, draft: MeterReadingDraft) => void;
  onUpdateMeterReading: (
    meterId: string,
    readingId: string,
    draft: MeterReadingDraft,
  ) => void;
  onDeleteMeterReading: (meterId: string, readingId: string) => void;
}) {
  const [isOptionalCreateOpen, setIsOptionalCreateOpen] = useState(false);
  const [optionalDraft, setOptionalDraft] = useState<MeterDraft>(EMPTY_METER_DRAFT);
  const [optionalInitialReadingDraft, setOptionalInitialReadingDraft] =
    useState<MeterReadingDraft>(EMPTY_METER_READING_DRAFT);
  const [standardDrafts, setStandardDrafts] = useState<
    Record<string, StandardMeterCreateDraft>
  >({});
  const [editingMeterId, setEditingMeterId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<MeterDraft>(EMPTY_METER_DRAFT);
  const [readingFormMeterId, setReadingFormMeterId] = useState<string | null>(null);
  const [editingReadingId, setEditingReadingId] = useState<string | null>(null);
  const [readingDraft, setReadingDraft] = useState<MeterReadingDraft>(
    EMPTY_METER_READING_DRAFT,
  );

  useEffect(() => {
    setIsOptionalCreateOpen(false);
    setOptionalDraft(EMPTY_METER_DRAFT);
    setOptionalInitialReadingDraft(EMPTY_METER_READING_DRAFT);
    setStandardDrafts({});
    setEditingMeterId(null);
    setEditDraft(EMPTY_METER_DRAFT);
    setReadingFormMeterId(null);
    setEditingReadingId(null);
    setReadingDraft(EMPTY_METER_READING_DRAFT);
  }, [object.id]);

  useEffect(() => {
    if (
      optionalDraft.scope === "apartment" &&
      optionalDraft.apartmentId !== "" &&
      !apartments.some((apartment) => apartment.id === optionalDraft.apartmentId)
    ) {
      setOptionalDraft((current) => ({
        ...current,
        apartmentId: "",
      }));
    }
  }, [apartments, optionalDraft.apartmentId, optionalDraft.scope]);

  useEffect(() => {
    if (
      editDraft.scope === "apartment" &&
      editDraft.apartmentId !== "" &&
      !apartments.some((apartment) => apartment.id === editDraft.apartmentId)
    ) {
      setEditDraft((current) => ({
        ...current,
        apartmentId: "",
      }));
    }
  }, [apartments, editDraft.apartmentId, editDraft.scope]);

  useEffect(() => {
    const validApartmentIds = new Set(apartments.map((apartment) => apartment.id));

    setStandardDrafts((current) => {
      const nextEntries = Object.entries(current).filter(([draftKey]) => {
        if (draftKey.startsWith("object::")) {
          return true;
        }

        if (!draftKey.startsWith("apartment::")) {
          return false;
        }

        const [, apartmentId] = draftKey.split("::");
        return validApartmentIds.has(apartmentId);
      });

      if (nextEntries.length === Object.keys(current).length) {
        return current;
      }

      return Object.fromEntries(nextEntries);
    });
  }, [apartments]);

  const apartmentsById = new Map(
    apartments.map((apartment) => [apartment.id, apartment]),
  );

  const totalReadingsCount = meters.reduce((sum, meter) => {
    return sum + meter.readings.length;
  }, 0);

  const standardMetersCount = meters.filter(
    (meter) => meter.origin === "standard",
  ).length;
  const optionalMetersCount = meters.filter(
    (meter) => meter.origin === "optional",
  ).length;
  const objectMetersCount = meters.filter((meter) => meter.scope === "object").length;
  const apartmentMetersCount = meters.filter(
    (meter) => meter.scope === "apartment",
  ).length;

  const sortedApartments = [...apartments].sort((left, right) =>
    left.unitLabel.localeCompare(right.unitLabel, "de", {
      numeric: true,
      sensitivity: "base",
    }),
  );

  const sortedMeters = [...meters].sort((left, right) => {
    if (left.scope !== right.scope) {
      return left.scope === "object" ? -1 : 1;
    }

    if (left.scope === "apartment" && right.scope === "apartment") {
      const leftApartment = left.apartmentId
        ? apartmentsById.get(left.apartmentId)
        : undefined;
      const rightApartment = right.apartmentId
        ? apartmentsById.get(right.apartmentId)
        : undefined;

      const leftLabel = leftApartment?.unitLabel ?? "";
      const rightLabel = rightApartment?.unitLabel ?? "";
      const apartmentCompare = leftLabel.localeCompare(rightLabel, "de", {
        numeric: true,
        sensitivity: "base",
      });

      if (apartmentCompare !== 0) {
        return apartmentCompare;
      }
    }

    const labelCompare = left.label.localeCompare(right.label, "de", {
      numeric: true,
      sensitivity: "base",
    });

    if (labelCompare !== 0) {
      return labelCompare;
    }

    return left.meterNumber.localeCompare(right.meterNumber, "de", {
      numeric: true,
      sensitivity: "base",
    });
  });

  const editingMeter = editingMeterId
    ? meters.find((meter) => meter.id === editingMeterId) ?? null
    : null;
  const isEditingStandardMeter = editingMeter?.origin === "standard";

  const isDuplicateMeterNumber = (
    meterNumber: string,
    options?: { ignoreMeterId?: string | null },
  ) => {
    const normalizedMeterNumber = meterNumber.trim().toLowerCase();

    if (normalizedMeterNumber === "") {
      return false;
    }

    return meters.some((meter) => {
      if (options?.ignoreMeterId && meter.id === options.ignoreMeterId) {
        return false;
      }

      return meter.meterNumber.trim().toLowerCase() === normalizedMeterNumber;
    });
  };

  const isDuplicateOptionalMeterNumber = isDuplicateMeterNumber(
    optionalDraft.meterNumber,
  );

  const optionalInitialReadingValueNumber = Number(optionalInitialReadingDraft.value);
  const isOptionalInitialReadingValueValid =
    optionalInitialReadingDraft.value.trim() !== "" &&
    Number.isFinite(optionalInitialReadingValueNumber) &&
    optionalInitialReadingValueNumber >= 0;

  const isOptionalCreateDisabled =
    optionalDraft.scope === "" ||
    optionalDraft.type === "" ||
    optionalDraft.label.trim() === "" ||
    optionalDraft.meterNumber.trim() === "" ||
    optionalDraft.unit === "" ||
    (optionalDraft.scope === "apartment" && optionalDraft.apartmentId === "") ||
    optionalInitialReadingDraft.date.trim() === "" ||
    !isOptionalInitialReadingValueValid ||
    isDuplicateOptionalMeterNumber;

  const isEditDuplicateMeterNumber = isDuplicateMeterNumber(editDraft.meterNumber, {
    ignoreMeterId: editingMeterId,
  });

  const isSaveEditDisabled =
    editingMeterId === null ||
    editDraft.meterNumber.trim() === "" ||
    isEditDuplicateMeterNumber ||
    (!isEditingStandardMeter &&
      (
        editDraft.scope === "" ||
        editDraft.type === "" ||
        editDraft.label.trim() === "" ||
        editDraft.unit === "" ||
        (editDraft.scope === "apartment" && editDraft.apartmentId === "")
      ));

  const readingValueNumber = Number(readingDraft.value);
  const isReadingValueValid =
    readingDraft.value.trim() !== "" &&
    Number.isFinite(readingValueNumber) &&
    readingValueNumber >= 0;

  const isReadingSubmitDisabled =
    readingFormMeterId === null ||
    readingDraft.date.trim() === "" ||
    !isReadingValueValid;

  function getStandardDraftKey(templateKey: string, apartmentId: string | null) {
    return apartmentId === null
      ? `object::${templateKey}`
      : `apartment::${apartmentId}::${templateKey}`;
  }

  function getStandardDraft(
    templateKey: string,
    apartmentId: string | null,
  ): StandardMeterCreateDraft {
    return (
      standardDrafts[getStandardDraftKey(templateKey, apartmentId)] ??
      EMPTY_STANDARD_METER_CREATE_DRAFT
    );
  }

  function updateStandardDraft(
    templateKey: string,
    apartmentId: string | null,
    field: keyof StandardMeterCreateDraft,
    value: string,
  ) {
    const draftKey = getStandardDraftKey(templateKey, apartmentId);

    setStandardDrafts((current) => ({
      ...current,
      [draftKey]: {
        ...(current[draftKey] ?? EMPTY_STANDARD_METER_CREATE_DRAFT),
        [field]: value,
      },
    }));
  }

  function resetStandardDraft(templateKey: string, apartmentId: string | null) {
    const draftKey = getStandardDraftKey(templateKey, apartmentId);

    setStandardDrafts((current) => {
      if (!(draftKey in current)) {
        return current;
      }

      const nextDrafts = { ...current };
      delete nextDrafts[draftKey];
      return nextDrafts;
    });
  }

  function getExistingStandardMeter(
    template: StandardMeterTemplate,
    apartmentId: string | null,
  ) {
    return (
      meters.find((meter) => {
        if (meter.origin !== "standard" || meter.standardKey !== template.key) {
          return false;
        }

        if (template.scope === "object") {
          return meter.scope === "object";
        }

        return meter.apartmentId === apartmentId;
      }) ?? null
    );
  }

  function updateOptionalDraft(field: keyof MeterDraft, value: string) {
    setOptionalDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateEditDraft(field: keyof MeterDraft, value: string) {
    setEditDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateOptionalInitialReadingDraft(
    field: keyof MeterReadingDraft,
    value: string,
  ) {
    setOptionalInitialReadingDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateReadingDraft(field: keyof MeterReadingDraft, value: string) {
    setReadingDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleOptionalCreateTypeChange(value: string) {
    const nextType = value as MeterTypeValue | "";
    updateOptionalDraft("type", value);

    if (nextType === "") {
      return;
    }

    setOptionalDraft((current) => ({
      ...current,
      type: nextType,
      unit: getDefaultMeterUnit(nextType),
    }));
  }

  function handleEditTypeChange(value: string) {
    const nextType = value as MeterTypeValue | "";
    updateEditDraft("type", value);

    if (nextType === "") {
      return;
    }

    setEditDraft((current) => ({
      ...current,
      type: nextType,
      unit: getDefaultMeterUnit(nextType),
    }));
  }

  function resetOptionalCreateState() {
    setIsOptionalCreateOpen(false);
    setOptionalDraft(EMPTY_METER_DRAFT);
    setOptionalInitialReadingDraft(EMPTY_METER_READING_DRAFT);
  }

  function resetEditState() {
    setEditingMeterId(null);
    setEditDraft(EMPTY_METER_DRAFT);
  }

  function resetReadingState() {
    setReadingFormMeterId(null);
    setEditingReadingId(null);
    setReadingDraft(EMPTY_METER_READING_DRAFT);
  }

  function handleStandardCreate(
    template: StandardMeterTemplate,
    apartmentId: string | null,
  ) {
    const standardDraft = getStandardDraft(template.key, apartmentId);
    const initialReadingValue = Number(standardDraft.value);

    if (
      standardDraft.meterNumber.trim() === "" ||
      standardDraft.value.trim() === "" ||
      !Number.isFinite(initialReadingValue) ||
      initialReadingValue < 0 ||
      isDuplicateMeterNumber(standardDraft.meterNumber) ||
      getExistingStandardMeter(template, apartmentId)
    ) {
      return;
    }

    onCreateStandardMeter(template, apartmentId, {
      meterNumber: standardDraft.meterNumber.trim(),
      value: initialReadingValue.toString(),
    });

    resetStandardDraft(template.key, apartmentId);
  }

  function handleOptionalCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isOptionalCreateDisabled) {
      return;
    }

    onCreateMeter(
      {
        scope: optionalDraft.scope,
        apartmentId:
          optionalDraft.scope === "apartment" ? optionalDraft.apartmentId : "",
        type: optionalDraft.type,
        label: optionalDraft.label.trim(),
        meterNumber: optionalDraft.meterNumber.trim(),
        unit: optionalDraft.unit,
      },
      {
        date: optionalInitialReadingDraft.date,
        value: optionalInitialReadingValueNumber.toString(),
        reader: optionalInitialReadingDraft.reader.trim(),
      },
    );

    resetOptionalCreateState();
  }

  function handleEditStart(meter: LocalMeter) {
    setEditingMeterId(meter.id);
    setEditDraft({
      scope: meter.scope,
      apartmentId: meter.apartmentId ?? "",
      type: meter.type,
      label: meter.label,
      meterNumber: meter.meterNumber,
      unit: meter.unit,
    });
    setIsOptionalCreateOpen(false);
    resetReadingState();
  }

  function handleEditSubmit(event: FormEvent<HTMLFormElement>, meterId: string) {
    event.preventDefault();

    if (isSaveEditDisabled) {
      return;
    }

    onUpdateMeter(meterId, {
      scope: editDraft.scope,
      apartmentId: editDraft.scope === "apartment" ? editDraft.apartmentId : "",
      type: editDraft.type,
      label: editDraft.label.trim(),
      meterNumber: editDraft.meterNumber.trim(),
      unit: editDraft.unit,
    });

    resetEditState();
  }

  function handleCreateReadingStart(meterId: string) {
    setReadingFormMeterId(meterId);
    setEditingReadingId(null);
    setReadingDraft(EMPTY_METER_READING_DRAFT);
    setEditingMeterId(null);
  }

  function handleEditReadingStart(meterId: string, reading: LocalMeterReading) {
    setReadingFormMeterId(meterId);
    setEditingReadingId(reading.id);
    setReadingDraft({
      date: reading.date,
      value: reading.value,
      reader: reading.reader,
    });
    setEditingMeterId(null);
  }

  function handleReadingSubmit(
    event: FormEvent<HTMLFormElement>,
    meterId: string,
  ) {
    event.preventDefault();

    if (isReadingSubmitDisabled) {
      return;
    }

    const nextDraft: MeterReadingDraft = {
      date: readingDraft.date,
      value: readingValueNumber.toString(),
      reader: readingDraft.reader.trim(),
    };

    if (editingReadingId) {
      onUpdateMeterReading(meterId, editingReadingId, nextDraft);
    } else {
      onCreateMeterReading(meterId, nextDraft);
    }

    resetReadingState();
  }

  function renderStandardTemplateCard(
    template: StandardMeterTemplate,
    apartment: LocalApartment | null,
  ) {
    const apartmentId = apartment?.id ?? null;
    const standardDraft = getStandardDraft(template.key, apartmentId);
    const existingMeter = getExistingStandardMeter(template, apartmentId);
    const latestReading = existingMeter ? getLatestMeterReading(existingMeter) : null;
    const duplicateMeterNumber = isDuplicateMeterNumber(standardDraft.meterNumber);
    const readingValueNumber = Number(standardDraft.value);
    const isReadingValueValid =
      standardDraft.value.trim() !== "" &&
      Number.isFinite(readingValueNumber) &&
      readingValueNumber >= 0;
    const isSubmitDisabled =
      existingMeter !== null ||
      standardDraft.meterNumber.trim() === "" ||
      !isReadingValueValid ||
      duplicateMeterNumber;

    return (
      <div
        key={`${apartmentId ?? "object"}-${template.key}`}
        className="rounded-2xl border border-zinc-200 bg-white p-4"
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-900">{template.label}</p>
            <p className="mt-1 text-sm text-zinc-500">
              {getMeterTypeLabel(template.type)} · {template.unit} ·{" "}
              {apartment
                ? `${apartment.unitLabel} · ${apartment.designation}`
                : "Objekt"}
            </p>
          </div>

          {existingMeter ? (
            <span className="inline-flex h-8 items-center rounded-full border border-zinc-200 bg-zinc-100 px-3 text-xs font-semibold text-zinc-700">
              Bereits angelegt
            </span>
          ) : null}
        </div>

        {existingMeter ? (
          <div
            className={`mt-4 grid gap-3 ${latestReading ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}
          >
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Zählernummer
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {existingMeter.meterNumber}
              </p>
            </div>

            {latestReading ? (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                  Letzter Stand
                </p>
                <p className="mt-2 text-sm font-medium text-zinc-900">
                  {formatMeterReadingValue(latestReading.value, existingMeter.unit)}
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <label className="block">
                <span className="text-sm font-medium text-zinc-900">
                  Zählernummer
                </span>
                <input
                  type="text"
                  value={standardDraft.meterNumber}
                  onChange={(event) =>
                    updateStandardDraft(
                      template.key,
                      apartmentId,
                      "meterNumber",
                      event.target.value,
                    )
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                />
                {duplicateMeterNumber ? (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    Diese Zählernummer ist in diesem Objekt bereits vorhanden.
                  </p>
                ) : null}
              </label>

              <label className="block">
                <span className="text-sm font-medium text-zinc-900">Erststand</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={standardDraft.value}
                  onChange={(event) =>
                    updateStandardDraft(template.key, apartmentId, "value", event.target.value)
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isSubmitDisabled}
                onClick={() => handleStandardCreate(template, apartmentId)}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Standardzähler speichern
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">Zähler</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Standardzähler und optionale Zähler im Objekt.
          </p>
        </div>

        <div className="flex flex-col gap-3 xl:items-end">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Zähler gesamt
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-900">{meters.length}</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Standard
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {standardMetersCount}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Optional
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {optionalMetersCount}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Objektzähler
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {objectMetersCount}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Wohnungszähler
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {apartmentMetersCount}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Erfasste Stände
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {totalReadingsCount}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOptionalCreateOpen((current) => !current)}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            {isOptionalCreateOpen
              ? "Optionalformular schließen"
              : "+ Optionalen Zähler anlegen"}
          </button>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-zinc-900">
              Standardzähler · Objekt
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {OBJECT_STANDARD_METER_TEMPLATES.map((template) =>
              renderStandardTemplateCard(template, null),
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-zinc-900">
              Standardzähler · Wohnungen
            </p>
          </div>

          {sortedApartments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
              Noch keine Wohnungen angelegt.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedApartments.map((apartment) => (
                <div
                  key={apartment.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="mb-4 flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {apartment.unitLabel}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {apartment.designation} · {formatApartmentArea(apartment.area)}
                      </p>
                    </div>

                    <span
                      className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold ${getApartmentStatusClasses(apartment.status)}`}
                    >
                      {getApartmentStatusLabel(apartment.status)}
                    </span>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                                        {APARTMENT_STANDARD_METER_TEMPLATES_FOR_DISPLAY.map((template) =>
                      renderStandardTemplateCard(template, apartment),
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-zinc-900">
              Optionale Zähler
            </p>
          </div>

          {isOptionalCreateOpen ? (
            <form
              onSubmit={handleOptionalCreateSubmit}
              className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="grid gap-4 lg:grid-cols-3">
                <label className="block">
                  <span className="text-sm font-medium text-zinc-900">Ebene</span>
                  <select
                    value={optionalDraft.scope}
                    onChange={(event) => {
                      const nextScope = event.target.value as MeterScopeValue | "";
                      setOptionalDraft((current) => ({
                        ...current,
                        scope: nextScope,
                        apartmentId:
                          nextScope === "apartment" ? current.apartmentId : "",
                      }));
                    }}
                    className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                  >
                    <option value="">Bitte wählen</option>
                    <option value="object">Objekt</option>
                    <option value="apartment">Wohnung</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-900">Zählerart</span>
                  <select
                    value={optionalDraft.type}
                    onChange={(event) =>
                      handleOptionalCreateTypeChange(event.target.value)
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                  >
                    <option value="">Bitte wählen</option>
                    {METER_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-900">Einheit</span>
                  <select
                    value={optionalDraft.unit}
                    onChange={(event) =>
                      updateOptionalDraft("unit", event.target.value)
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                  >
                    <option value="">Bitte wählen</option>
                    {METER_UNIT_OPTIONS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {optionalDraft.scope === "apartment" ? (
                <div className="mt-4">
                  <label className="block">
                    <span className="text-sm font-medium text-zinc-900">Wohnung</span>
                    <select
                      value={optionalDraft.apartmentId}
                      onChange={(event) =>
                        updateOptionalDraft("apartmentId", event.target.value)
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                    >
                      <option value="">Bitte wählen</option>
                      {apartments.map((apartment) => (
                        <option key={apartment.id} value={apartment.id}>
                          {apartment.unitLabel} · {apartment.designation}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_220px]">
                <label className="block">
                  <span className="text-sm font-medium text-zinc-900">
                    Bezeichnung
                  </span>
                  <input
                    type="text"
                    value={optionalDraft.label}
                    onChange={(event) =>
                      updateOptionalDraft("label", event.target.value)
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-900">
                    Zählernummer
                  </span>
                  <input
                    type="text"
                    value={optionalDraft.meterNumber}
                    onChange={(event) =>
                      updateOptionalDraft("meterNumber", event.target.value)
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                  />
                  {isDuplicateOptionalMeterNumber ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      Diese Zählernummer ist in diesem Objekt bereits vorhanden.
                    </p>
                  ) : null}
                </label>
              </div>

              <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Erstablesung</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Der erste Stand wird direkt mit dem optionalen Zähler gespeichert.
                  </p>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[220px_220px_minmax(0,1fr)]">
                  <label className="block">
                    <span className="text-sm font-medium text-zinc-900">Datum</span>
                    <input
                      type="date"
                      value={optionalInitialReadingDraft.date}
                      onChange={(event) =>
                        updateOptionalInitialReadingDraft("date", event.target.value)
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-900">Stand</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={optionalInitialReadingDraft.value}
                      onChange={(event) =>
                        updateOptionalInitialReadingDraft("value", event.target.value)
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-900">
                      Erfasst durch
                    </span>
                    <input
                      type="text"
                      value={optionalInitialReadingDraft.reader}
                      onChange={(event) =>
                        updateOptionalInitialReadingDraft("reader", event.target.value)
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isOptionalCreateDisabled}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Optionalen Zähler speichern
                </button>

                <button
                  type="button"
                  onClick={resetOptionalCreateState}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
              Optional bei Bedarf.
            </div>
          )}
        </div>

        {sortedMeters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-5 text-sm text-zinc-500">
            Noch keine Zähler angelegt.
          </div>
        ) : (
          <div className="space-y-4">
            {sortedMeters.map((meter) => {
              const apartment = meter.apartmentId
                ? apartmentsById.get(meter.apartmentId)
                : undefined;
              const latestReading = getLatestMeterReading(meter);
              const sortedReadings = getSortedMeterReadings(meter.readings);
              const isReadingFormOpen = readingFormMeterId === meter.id;

              if (editingMeterId === meter.id) {
                return (
                  <form
                    key={meter.id}
                    onSubmit={(event) => handleEditSubmit(event, meter.id)}
                    className="rounded-2xl border border-zinc-200 bg-white p-4"
                  >
                    {meter.origin === "standard" ? (
                      <>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <p className="text-sm font-semibold text-zinc-900">
                            Standardzähler
                          </p>
                          <p className="mt-1 text-sm text-zinc-500">
                            Bezeichnung, Ebene und Einheit bleiben bei
                            Standardzählern fest. Hier wird nur die Zählernummer
                            geändert.
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="inline-flex h-8 items-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700">
                              {meter.scope === "object"
                                ? "Objekt"
                                : apartment
                                  ? `${apartment.unitLabel} · ${apartment.designation}`
                                  : "Wohnung"}
                            </span>
                            <span className="inline-flex h-8 items-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700">
                              {getMeterTypeLabel(meter.type)}
                            </span>
                            <span className="inline-flex h-8 items-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700">
                              Einheit: {meter.unit}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                          <label className="block">
                            <span className="text-sm font-medium text-zinc-900">
                              Zählernummer
                            </span>
                            <input
                              type="text"
                              value={editDraft.meterNumber}
                              onChange={(event) =>
                                updateEditDraft("meterNumber", event.target.value)
                              }
                              className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                            />
                            {isEditDuplicateMeterNumber ? (
                              <p className="mt-2 text-xs font-medium text-red-600">
                                Diese Zählernummer ist in diesem Objekt bereits vorhanden.
                              </p>
                            ) : null}
                          </label>

                          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                            <p className="text-sm font-semibold text-zinc-900">
                              Zählerstände
                            </p>
                            <p className="mt-1 text-sm text-zinc-500">
                              Zählerstände werden weiterhin separat unterhalb des
                              Zählers gepflegt.
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid gap-4 lg:grid-cols-3">
                          <label className="block">
                            <span className="text-sm font-medium text-zinc-900">Ebene</span>
                            <select
                              value={editDraft.scope}
                              onChange={(event) => {
                                const nextScope = event.target.value as MeterScopeValue | "";
                                setEditDraft((current) => ({
                                  ...current,
                                  scope: nextScope,
                                  apartmentId:
                                    nextScope === "apartment" ? current.apartmentId : "",
                                }));
                              }}
                              className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                            >
                              <option value="">Bitte wählen</option>
                              <option value="object">Objekt</option>
                              <option value="apartment">Wohnung</option>
                            </select>
                          </label>

                          <label className="block">
                            <span className="text-sm font-medium text-zinc-900">
                              Zählerart
                            </span>
                            <select
                              value={editDraft.type}
                              onChange={(event) =>
                                handleEditTypeChange(event.target.value)
                              }
                              className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                            >
                              <option value="">Bitte wählen</option>
                              {METER_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block">
                            <span className="text-sm font-medium text-zinc-900">Einheit</span>
                            <select
                              value={editDraft.unit}
                              onChange={(event) =>
                                updateEditDraft("unit", event.target.value)
                              }
                              className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                            >
                              <option value="">Bitte wählen</option>
                              {METER_UNIT_OPTIONS.map((unit) => (
                                <option key={unit} value={unit}>
                                  {unit}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        {editDraft.scope === "apartment" ? (
                          <div className="mt-4">
                            <label className="block">
                              <span className="text-sm font-medium text-zinc-900">
                                Wohnung
                              </span>
                              <select
                                value={editDraft.apartmentId}
                                onChange={(event) =>
                                  updateEditDraft("apartmentId", event.target.value)
                                }
                                className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                              >
                                <option value="">Bitte wählen</option>
                                {apartments.map((apartmentOption) => (
                                  <option key={apartmentOption.id} value={apartmentOption.id}>
                                    {apartmentOption.unitLabel} · {apartmentOption.designation}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        ) : null}

                        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_220px]">
                          <label className="block">
                            <span className="text-sm font-medium text-zinc-900">
                              Bezeichnung
                            </span>
                            <input
                              type="text"
                              value={editDraft.label}
                              onChange={(event) =>
                                updateEditDraft("label", event.target.value)
                              }
                              className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                            />
                          </label>

                          <label className="block">
                            <span className="text-sm font-medium text-zinc-900">
                              Zählernummer
                            </span>
                            <input
                              type="text"
                              value={editDraft.meterNumber}
                              onChange={(event) =>
                                updateEditDraft("meterNumber", event.target.value)
                              }
                              className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                            />
                            {isEditDuplicateMeterNumber ? (
                              <p className="mt-2 text-xs font-medium text-red-600">
                                Diese Zählernummer ist in diesem Objekt bereits vorhanden.
                              </p>
                            ) : null}
                          </label>
                        </div>
                      </>
                    )}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={isSaveEditDisabled}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Änderungen speichern
                      </button>

                      <button
                        type="button"
                        onClick={resetEditState}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </form>
                );
              }

              return (
                <div
                  key={meter.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {meter.label}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {getMeterTypeLabel(meter.type)} · Zählernummer: {meter.meterNumber}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex h-8 items-center rounded-full border border-zinc-200 bg-zinc-100 px-3 text-xs font-semibold text-zinc-700">
                          {getMeterOriginLabel(meter.origin)}
                        </span>
                        <span className="inline-flex h-8 items-center rounded-full border border-zinc-200 bg-zinc-100 px-3 text-xs font-semibold text-zinc-700">
                          {meter.scope === "object"
                            ? "Objekt"
                            : apartment
                              ? `${apartment.unitLabel} · ${apartment.designation}`
                              : "Wohnung"}
                        </span>
                        <span className="inline-flex h-8 items-center rounded-full border border-zinc-200 bg-zinc-100 px-3 text-xs font-semibold text-zinc-700">
                          Einheit: {meter.unit}
                        </span>
                        <span className="inline-flex h-8 items-center rounded-full border border-zinc-200 bg-zinc-100 px-3 text-xs font-semibold text-zinc-700">
                          {meter.readings.length} Stand{meter.readings.length === 1 ? "" : "e"}
                        </span>
                      </div>
                    </div>

                    {latestReading ? (
                      <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[340px]">
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                            Letzter Stand
                          </p>
                          <p className="mt-2 text-sm font-medium text-zinc-900">
                            {formatMeterReadingValue(latestReading.value, meter.unit)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                            Letztes Datum
                          </p>
                          <p className="mt-2 text-sm font-medium text-zinc-900">
                            {formatDateForDisplay(latestReading.date)}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditStart(meter)}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Bearbeiten
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCreateReadingStart(meter.id)}
                      className="inline-flex h-9 items-center justify-center rounded-xl bg-zinc-900 px-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                    >
                      + Zählerstand
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (readingFormMeterId === meter.id) {
                          resetReadingState();
                        }

                        onDeleteMeter(meter.id);
                      }}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 transition hover:bg-red-100"
                    >
                      Löschen
                    </button>
                  </div>

                  {isReadingFormOpen ? (
                    <form
                      onSubmit={(event) => handleReadingSubmit(event, meter.id)}
                      className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                    >
                      <div className="grid gap-4 lg:grid-cols-[220px_220px_minmax(0,1fr)]">
                        <label className="block">
                          <span className="text-sm font-medium text-zinc-900">Datum</span>
                          <input
                            type="date"
                            value={readingDraft.date}
                            onChange={(event) =>
                              updateReadingDraft("date", event.target.value)
                            }
                            className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                          />
                        </label>

                        <label className="block">
                          <span className="text-sm font-medium text-zinc-900">Stand</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            value={readingDraft.value}
                            onChange={(event) =>
                              updateReadingDraft("value", event.target.value)
                            }
                            className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                          />
                        </label>

                        <label className="block">
                          <span className="text-sm font-medium text-zinc-900">
                            Erfasst durch
                          </span>
                          <input
                            type="text"
                            value={readingDraft.reader}
                            onChange={(event) =>
                              updateReadingDraft("reader", event.target.value)
                            }
                            className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                          />
                        </label>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="submit"
                          disabled={isReadingSubmitDisabled}
                          className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {editingReadingId ? "Änderungen speichern" : "Zählerstand speichern"}
                        </button>

                        <button
                          type="button"
                          onClick={resetReadingState}
                          className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </form>
                  ) : null}

                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-[160px_160px_minmax(0,1fr)_220px] gap-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      <p>Datum</p>
                      <p>Stand</p>
                      <p>Erfasst durch</p>
                      <p>Aktionen</p>
                    </div>

                    {sortedReadings.map((reading) => (
                      <div
                        key={reading.id}
                        className="grid grid-cols-[160px_160px_minmax(0,1fr)_220px] items-center gap-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4"
                      >
                        <p className="text-sm font-medium text-zinc-900">
                          {formatDateForDisplay(reading.date)}
                        </p>

                        <p className="text-sm font-medium text-zinc-900">
                          {formatMeterReadingValue(reading.value, meter.unit)}
                        </p>

                        <p className="truncate text-sm text-zinc-500">
                          {reading.reader}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditReadingStart(meter.id, reading)}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                          >
                            Bearbeiten
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteMeterReading(meter.id, reading.id)}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 transition hover:bg-red-100"
                          >
                            Löschen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


function UtilitiesSection({
  object,
  apartments,
  meters,
  utilities,
  documents,
  onCreateUtility,
  onUpdateUtility,
  onDeleteUtility,
}: {
  object: ImmoObject;
  apartments: LocalApartment[];
  meters: LocalMeter[];
  utilities: LocalUtility[];
  documents: ImmoDocument[];
  onCreateUtility: (draft: UtilityDraft) => void;
  onUpdateUtility: (utilityId: string, draft: UtilityDraft) => void;
  onDeleteUtility: (utilityId: string) => void;
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [draft, setDraft] = useState<UtilityDraft>(EMPTY_UTILITY_DRAFT);
  const [editingUtilityId, setEditingUtilityId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<UtilityDraft>(EMPTY_UTILITY_DRAFT);

  useEffect(() => {
    setIsCreateOpen(false);
    setDraft(EMPTY_UTILITY_DRAFT);
    setEditingUtilityId(null);
    setEditDraft(EMPTY_UTILITY_DRAFT);
  }, [object.id]);

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      apartmentIds: current.apartmentIds.filter((apartmentId) =>
        apartments.some((apartment) => apartment.id === apartmentId),
      ),
      meterIds: getCompatibleMeterIdsForUtility(
        meters,
        current.category,
        current.meterIds,
      ),
    }));
  }, [apartments, meters]);

  useEffect(() => {
    setEditDraft((current) => ({
      ...current,
      apartmentIds: current.apartmentIds.filter((apartmentId) =>
        apartments.some((apartment) => apartment.id === apartmentId),
      ),
      meterIds: getCompatibleMeterIdsForUtility(
        meters,
        current.category,
        current.meterIds,
      ),
    }));
  }, [apartments, meters]);

  const apartmentsById = new Map(
    apartments.map((apartment) => [apartment.id, apartment]),
  );
  const metersById = new Map(meters.map((meter) => [meter.id, meter]));

  const sortedApartments = [...apartments].sort((left, right) =>
    left.unitLabel.localeCompare(right.unitLabel, "de", {
      numeric: true,
      sensitivity: "base",
    }),
  );

  const sortedMeters = [...meters].sort((left, right) =>
    left.label.localeCompare(right.label, "de", {
      numeric: true,
      sensitivity: "base",
    }),
  );

  const sortedUtilities = [...utilities].sort((left, right) => {
    const sortOrderCompare =
      getUtilityCategorySortOrder(left.category) -
      getUtilityCategorySortOrder(right.category);

    if (sortOrderCompare !== 0) {
      return sortOrderCompare;
    }

    return left.label.localeCompare(right.label, "de", {
      numeric: true,
      sensitivity: "base",
    });
  });

  const linkedApartmentCount = new Set(
    utilities.flatMap((utility) => utility.apartmentIds),
  ).size;
  const linkedMeterCount = new Set(
    utilities.flatMap((utility) => utility.meterIds),
  ).size;
  const utilityDocuments = documents.filter(
    (document) =>
      document.objectId === object.id &&
      (document.category === "Nebenkostenabrechnung" ||
        document.category === "Jahresreport WEG"),
  );
  const utilityStatementDocuments = utilityDocuments.filter(
    (document) => document.category === "Nebenkostenabrechnung",
  );
  const utilityReportDocuments = utilityDocuments.filter(
    (document) => document.category === "Jahresreport WEG",
  );
  const utilityOpenDocumentCount = utilityDocuments.filter(
    (document) =>
      document.fileAvailable === false ||
      (document.openIssues?.length ?? 0) > 0 ||
      document.status === "Fehlt" ||
      document.status === "In Prüfung",
  ).length;

  const createCategoryOptions = getUtilityCategoryOptionsForSelect(draft.category);
  const editCategoryOptions = getUtilityCategoryOptionsForSelect(editDraft.category);
  const draftCompatibleMeterIds = getCompatibleMeterIdsForUtility(
    meters,
    draft.category,
    draft.meterIds,
  );
  const editCompatibleMeterIds = getCompatibleMeterIdsForUtility(
    meters,
    editDraft.category,
    editDraft.meterIds,
  );
  const draftAllowsEmptyLinks = utilityCategoryAllowsEmptyLinks(draft.category);
  const editAllowsEmptyLinks = utilityCategoryAllowsEmptyLinks(editDraft.category);

  const isCreateDisabled =
    draft.category === "" ||
    draft.label.trim() === "" ||
    (!draftAllowsEmptyLinks &&
      draft.apartmentIds.length === 0 &&
      draftCompatibleMeterIds.length === 0);

  const isSaveEditDisabled =
    editingUtilityId === null ||
    editDraft.category === "" ||
    editDraft.label.trim() === "" ||
    (!editAllowsEmptyLinks &&
      editDraft.apartmentIds.length === 0 &&
      editCompatibleMeterIds.length === 0);

  function updateDraft(field: keyof UtilityDraft, value: string) {
    setDraft((current) => {
      if (field === "category") {
        return applyUtilityCategorySelection(current, value, meters);
      }

      return {
        ...current,
        [field]: value,
      };
    });
  }

  function updateEditDraft(field: keyof UtilityDraft, value: string) {
    setEditDraft((current) => {
      if (field === "category") {
        return applyUtilityCategorySelection(current, value, meters);
      }

      return {
        ...current,
        [field]: value,
      };
    });
  }

  function toggleDraftApartment(apartmentId: string) {
    setDraft((current) => ({
      ...current,
      apartmentIds: current.apartmentIds.includes(apartmentId)
        ? current.apartmentIds.filter((entryId) => entryId !== apartmentId)
        : [...current.apartmentIds, apartmentId],
    }));
  }

  function toggleDraftMeter(meterId: string) {
    setDraft((current) => ({
      ...current,
      meterIds: current.meterIds.includes(meterId)
        ? current.meterIds.filter((entryId) => entryId !== meterId)
        : [...current.meterIds, meterId],
    }));
  }

  function toggleEditApartment(apartmentId: string) {
    setEditDraft((current) => ({
      ...current,
      apartmentIds: current.apartmentIds.includes(apartmentId)
        ? current.apartmentIds.filter((entryId) => entryId !== apartmentId)
        : [...current.apartmentIds, apartmentId],
    }));
  }

  function toggleEditMeter(meterId: string) {
    setEditDraft((current) => ({
      ...current,
      meterIds: current.meterIds.includes(meterId)
        ? current.meterIds.filter((entryId) => entryId !== meterId)
        : [...current.meterIds, meterId],
    }));
  }

  function resetCreateState() {
    setIsCreateOpen(false);
    setDraft(EMPTY_UTILITY_DRAFT);
  }

  function resetEditState() {
    setEditingUtilityId(null);
    setEditDraft(EMPTY_UTILITY_DRAFT);
  }

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isCreateDisabled || draft.category === "") {
      return;
    }

    onCreateUtility({
      category: draft.category,
      label: draft.label.trim(),
      apartmentIds: draft.apartmentIds,
      meterIds: draftCompatibleMeterIds,
      note: draft.note.trim(),
    });

    resetCreateState();
  }

  function handleEditStart(utility: LocalUtility) {
    setEditingUtilityId(utility.id);
    setEditDraft({
      category: utility.category,
      label: utility.label,
      apartmentIds: utility.apartmentIds,
      meterIds: utility.meterIds,
      note: utility.note,
    });
    setIsCreateOpen(false);
  }

  function handleEditSubmit(
    event: FormEvent<HTMLFormElement>,
    utilityId: string,
  ) {
    event.preventDefault();

    if (isSaveEditDisabled || editDraft.category === "") {
      return;
    }

    onUpdateUtility(utilityId, {
      category: editDraft.category,
      label: editDraft.label.trim(),
      apartmentIds: editDraft.apartmentIds,
      meterIds: editCompatibleMeterIds,
      note: editDraft.note.trim(),
    });

    resetEditState();
  }

  function renderApartmentSelection(
    selectedApartmentIds: string[],
    onToggle: (apartmentId: string) => void,
  ) {
    if (sortedApartments.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-5 text-sm text-zinc-500">
          Noch keine Wohnungen als Zuordnungsbasis vorhanden.
        </div>
      );
    }

    return (
      <div className="grid gap-3 md:grid-cols-2">
        {sortedApartments.map((apartment) => {
          const isSelected = selectedApartmentIds.includes(apartment.id);

          return (
            <label
              key={apartment.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                isSelected
                  ? "border-zinc-900 bg-zinc-100"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(apartment.id)}
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900"
              />

              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900">
                  {apartment.unitLabel}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  {apartment.designation} · {formatApartmentArea(apartment.area)}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    );
  }

  function renderMeterSelection(
    availableMeters: LocalMeter[],
    selectedMeterIds: string[],
    onToggle: (meterId: string) => void,
  ) {
    if (availableMeters.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-5 text-sm text-zinc-500">
          Keine passenden Zähler für diese Kostenart vorhanden.
        </div>
      );
    }

    return (
      <div className="grid gap-3 md:grid-cols-2">
        {availableMeters.map((meter) => {
          const apartment = meter.apartmentId
            ? apartmentsById.get(meter.apartmentId)
            : undefined;
          const isSelected = selectedMeterIds.includes(meter.id);

          return (
            <label
              key={meter.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                isSelected
                  ? "border-zinc-900 bg-zinc-100"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(meter.id)}
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900"
              />

              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900">{meter.label}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {getMeterTypeLabel(meter.type)} ·{" "}
                  {meter.scope === "object"
                    ? "Objekt"
                    : apartment
                      ? `${apartment.unitLabel} · ${apartment.designation}`
                      : "Wohnung"}{" "}
                  · {meter.unit}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    );
  }

  function renderUtilityForm(
    formDraft: UtilityDraft,
    onSubmit: (event: FormEvent<HTMLFormElement>) => void,
    onCategoryChange: (value: string) => void,
    onLabelChange: (value: string) => void,
    onNoteChange: (value: string) => void,
    onToggleApartment: (apartmentId: string) => void,
    onToggleMeter: (meterId: string) => void,
    categoryOptions: {
      betriebOptions: UtilityCategoryOption[];
      eigentuemerOptions: UtilityCategoryOption[];
      currentLegacyOption?: UtilityCategoryOption;
    },
    isSubmitDisabled: boolean,
    submitLabel: string,
    onCancel: () => void,
  ) {
    const compatibleMeters = getCompatibleMetersForUtility(
      meters,
      formDraft.category,
    );
    const showMeterSelection = utilityCategorySupportsMeters(formDraft.category);

    return (
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-zinc-200 bg-white p-4"
      >
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <label className="block">
            <span className="text-sm font-medium text-zinc-900">Kostenart</span>
            <select
              value={formDraft.category}
              onChange={(event) => onCategoryChange(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
            >
              <option value="">Bitte wählen</option>
              {categoryOptions.betriebOptions.length > 0 ? (
                <optgroup label="Weitere Betriebskosten">
                  {categoryOptions.betriebOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {categoryOptions.eigentuemerOptions.length > 0 ? (
                <optgroup label="Eigentümer / Sonderfälle">
                  {categoryOptions.eigentuemerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {categoryOptions.currentLegacyOption ? (
                <optgroup label="Altbestand">
                  <option
                    value={categoryOptions.currentLegacyOption.value}
                  >
                    {categoryOptions.currentLegacyOption.label}
                  </option>
                </optgroup>
              ) : null}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-900">Bezeichnung</span>
            <input
              type="text"
              value={formDraft.label}
              onChange={(event) => onLabelChange(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-zinc-900">Notiz</span>
          <textarea
            value={formDraft.note}
            onChange={(event) => onNoteChange(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
          />
        </label>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-4">
              <p className="text-sm font-semibold text-zinc-900">
                Zugeordnete Wohnungen
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Grundlage sind die bereits im Objekt angelegten Wohnungen.
              </p>
            </div>

            {renderApartmentSelection(formDraft.apartmentIds, onToggleApartment)}
          </div>

          {showMeterSelection ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="mb-4">
                <p className="text-sm font-semibold text-zinc-900">
                  Zugeordnete Zähler
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Grundlage sind die bereits im Objekt angelegten passenden Zähler.
                </p>
              </div>

              {renderMeterSelection(compatibleMeters, formDraft.meterIds, onToggleMeter)}
            </div>
          ) : null}
        </div>


        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitLabel}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Abbrechen
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">Nebenkosten</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Lokaler Grundbereich für Standard- und Zusatzkostenarten auf Objektebene
            mit wohnungs- und zählerbezogenen Zuordnungen bei Bedarf.
          </p>
        </div>

        <div className="flex flex-col gap-3 xl:items-end">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Positionen
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {utilities.length}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Wohnungen verfügbar
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {apartments.length}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Zähler verfügbar
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {meters.length}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Verknüpfte Basis
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {linkedApartmentCount} Wohnungen · {linkedMeterCount} Zähler
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen((current) => !current)}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreateOpen
              ? "Formular schließen"
              : "+ Nebenkostenposition anlegen"}
          </button>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-zinc-900">
                Dokumente zur Abrechnung
              </h4>
              <p className="mt-1 text-sm text-zinc-500">
                Jahresreports und Nebenkostenabrechnungen direkt aus dem
                Nebenkostenkontext erreichen.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={buildObjectDocumentsHref(object.id, {
                  category: "Nebenkostenabrechnung",
                })}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Nebenkostenabrechnungen
              </Link>
              <Link
                href={buildObjectDocumentsHref(object.id, {
                  category: "Jahresreport WEG",
                })}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Jahresreports
              </Link>
              <Link
                href={buildObjectDocumentsHref(object.id, {
                  fileState: "DATEI_FEHLT",
                })}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Fehlende Dateien
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Nebenkostenabrechnungen
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {utilityStatementDocuments.length}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Jahresreports WEG
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {utilityReportDocuments.length}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Offene Dokumentfälle
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {utilityOpenDocumentCount}
              </p>
            </div>
          </div>
        </div>

        {isCreateOpen ? (
          renderUtilityForm(
            draft,
            handleCreateSubmit,
            (value) => updateDraft("category", value),
            (value) => updateDraft("label", value),
            (value) => updateDraft("note", value),
            toggleDraftApartment,
            toggleDraftMeter,
            createCategoryOptions,
            isCreateDisabled,
            "Nebenkostenposition speichern",
            resetCreateState,
          )
        ) : null}

        {sortedUtilities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-5 text-sm text-zinc-500">
            Noch keine Nebenkostenpositionen angelegt.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedUtilities.map((utility) => {
              if (editingUtilityId === utility.id) {
                return (
                  <div
                    key={utility.id}
                    className="rounded-2xl border border-zinc-200 bg-white p-4"
                  >
                    {renderUtilityForm(
                      editDraft,
                      (event) => handleEditSubmit(event, utility.id),
                      (value) => updateEditDraft("category", value),
                      (value) => updateEditDraft("label", value),
                      (value) => updateEditDraft("note", value),
                      toggleEditApartment,
                      toggleEditMeter,
                      editCategoryOptions,
                      isSaveEditDisabled,
                      "Änderungen speichern",
                      resetEditState,
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={utility.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {utility.label}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {getUtilityCategoryDetail(utility.category)}
                        </p>
                      </div>

                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditStart(utility)}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                      >
                        Bearbeiten
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (editingUtilityId === utility.id) {
                            resetEditState();
                          }

                          onDeleteUtility(utility.id);
                        }}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 transition hover:bg-red-100"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>

                  {utility.note ? (
                    <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                        Notiz
                      </p>
                      <p className="mt-2 text-sm leading-6 text-zinc-700">
                        {utility.note}
                      </p>
                    </div>
                  ) : null}

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


type ObjectDetailLocalState = {
  apartments: LocalApartment[];
  tenancies: LocalTenancy[];
  meters: LocalMeter[];
  utilities: LocalUtility[];
};

function syncApartmentStatuses(
  apartments: LocalApartment[],
  tenancies: LocalTenancy[],
) {
  const activeTenancyApartmentIds = new Set(
    tenancies
      .filter((tenancy) => tenancy.endDate.trim() === "")
      .map((tenancy) => tenancy.apartmentId),
  );

  return apartments.map((apartment) => {
    const hasActiveTenancy = activeTenancyApartmentIds.has(apartment.id);

    if (hasActiveTenancy && apartment.status !== "vermietet") {
      return {
        ...apartment,
        status: "vermietet" as ApartmentStatusValue,
      };
    }

    return apartment;
  });
}

function normalizeObjectDetailState(
  state: ObjectDetailLocalState,
): ObjectDetailLocalState {
  const apartmentIds = new Set(state.apartments.map((apartment) => apartment.id));

  const tenancies = state.tenancies.reduce<LocalTenancy[]>((validTenancies, tenancy) => {
    if (
      tenancy.id.trim() === "" ||
      !apartmentIds.has(tenancy.apartmentId)
    ) {
      return validTenancies;
    }

    const validatedDraft = getValidatedTenancyDraft(
      tenancy.apartmentId,
      {
        tenantName: tenancy.tenantName,
        startDate: tenancy.startDate,
        endDate: tenancy.endDate,
        persons: tenancy.persons,
      },
      validTenancies,
    );

    if (!validatedDraft) {
      return validTenancies;
    }

    return [
      ...validTenancies,
      {
        ...tenancy,
        tenantName: validatedDraft.tenantName,
        startDate: validatedDraft.startDate,
        endDate: validatedDraft.endDate,
        persons: validatedDraft.persons,
      },
    ];
  }, []);

  const meters = state.meters.reduce<LocalMeter[]>((validMeters, meter) => {
    const normalizedMeter = normalizeStoredMeter(meter, state.apartments);

    if (!normalizedMeter) {
      return validMeters;
    }

    if (
      validMeters.some((existingMeter) => existingMeter.id === normalizedMeter.id) ||
      hasStoredMeterNumberConflict(validMeters, normalizedMeter.meterNumber)
    ) {
      return validMeters;
    }

    return [...validMeters, normalizedMeter];
  }, []);

  const utilities = state.utilities.reduce<LocalUtility[]>((validUtilities, utility) => {
    const normalizedUtility = normalizeStoredUtility(
      utility,
      state.apartments,
      meters,
    );

    if (!normalizedUtility) {
      return validUtilities;
    }

    if (validUtilities.some((existingUtility) => existingUtility.id === normalizedUtility.id)) {
      return validUtilities;
    }

    if (isOptionalPlaceholderUtility(normalizedUtility)) {
      return validUtilities;
    }

    return [...validUtilities, normalizedUtility];
  }, []);

  const apartments = syncApartmentStatuses(state.apartments, tenancies);

  return {
    apartments,
    tenancies,
    meters,
    utilities,
  };
}

export function ObjectDetail({
  object,
  documents,
  tenants = [],
  contracts = [],
  rentUnits = [],
  readingCampaigns = [],
}: ObjectDetailProps) {
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const [createdMissingDocuments, setCreatedMissingDocuments] = useState<ImmoDocument[]>([]);
  const [creatingRequirementKey, setCreatingRequirementKey] = useState<string | null>(null);
  const [requirementActionError, setRequirementActionError] = useState<string | null>(null);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);
  const [apartmentsByObject, setApartmentsByObject] = useState<
    Record<string, LocalApartment[]>
  >({});
  const [tenanciesByObject, setTenanciesByObject] = useState<
    Record<string, LocalTenancy[]>
  >({});
  const [metersByObject, setMetersByObject] = useState<
    Record<string, LocalMeter[]>
  >({});
  const [utilitiesByObject, setUtilitiesByObject] = useState<
    Record<string, LocalUtility[]>
  >({});

  useEffect(() => {
    setActiveSection(null);
    setCreatedMissingDocuments([]);
    setCreatingRequirementKey(null);
    setRequirementActionError(null);
  }, [object?.id]);

  useEffect(() => {
    setApartmentsByObject(
      readStorageRecord<LocalApartment>(OBJECT_MODULE_STORAGE_KEYS.apartments),
    );
    setTenanciesByObject(
      readStorageRecord<LocalTenancy>(OBJECT_MODULE_STORAGE_KEYS.tenancies),
    );
    setMetersByObject(readStorageRecord<LocalMeter>(OBJECT_MODULE_STORAGE_KEYS.meters));
    setUtilitiesByObject(
      readStorageRecord<LocalUtility>(OBJECT_MODULE_STORAGE_KEYS.utilities),
    );
    setHasLoadedStorage(true);
  }, []);

  const objectKey = object ? String(object.id) : "";
  const rawApartments = objectKey ? apartmentsByObject[objectKey] ?? [] : [];
  const rawTenancies = objectKey ? tenanciesByObject[objectKey] ?? [] : [];
  const rawMeters = objectKey ? metersByObject[objectKey] ?? [] : [];
  const rawUtilities = objectKey ? utilitiesByObject[objectKey] ?? [] : [];
  const allDocuments = [...documents, ...createdMissingDocuments];
  const objectDocuments = objectKey
    ? allDocuments.filter((document) => document.objectId === objectKey)
    : [];
  const objectTenants = objectKey
    ? tenants.filter((tenant) => tenant.objectId === objectKey)
    : [];
  const objectContracts = objectKey
    ? contracts.filter((contract) => contract.objectId === objectKey)
    : [];
  const objectRentUnits = objectKey
    ? rentUnits.filter((rentUnit) => rentUnit.objectId === objectKey)
    : [];
  const objectReadingCampaigns = objectKey
    ? readingCampaigns.filter((campaign) => campaign.objectId === objectKey)
    : [];
  const documentRequirements = object
    ? buildDocumentRequirements({
        object,
        documents: objectDocuments,
        tenants: objectTenants,
        contracts: objectContracts,
        rentUnits: objectRentUnits,
      })
    : [];
  const missingDocumentRequirements = getMissingDocumentRequirements(documentRequirements);

  async function handleCreateMissingRequirement(requirement: DocumentRequirement) {
    setCreatingRequirementKey(requirement.key);
    setRequirementActionError(null);

    const result = await createMissingDocument({
      objectId: requirement.objectId,
      rentUnitId: requirement.rentUnitId ?? undefined,
      reportYear: requirement.reportYear ? String(requirement.reportYear) : undefined,
      category: requirement.category,
      title: requirement.title,
      uploadedBy: "Pflichtlogik",
    });

    if (result.ok) {
      setCreatedMissingDocuments((current) => [result.document, ...current]);
    } else {
      setRequirementActionError(result.error);
    }

    setCreatingRequirementKey(null);
  }

  useEffect(() => {
    if (!hasLoadedStorage || objectKey === "") {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(utilitiesByObject, objectKey)) {
      return;
    }

    const nextUtilitiesRecord = {
      ...utilitiesByObject,
      [objectKey]: createInitialUtilitiesForObject(objectKey),
    };

    setUtilitiesByObject(nextUtilitiesRecord);
    writeStorageRecord(OBJECT_MODULE_STORAGE_KEYS.utilities, nextUtilitiesRecord);
  }, [hasLoadedStorage, objectKey, utilitiesByObject]);

  const {
    apartments,
    tenancies,
    meters,
    utilities,
  } = normalizeObjectDetailState({
    apartments: rawApartments,
    tenancies: rawTenancies,
    meters: rawMeters,
    utilities: rawUtilities,
  });

  if (!object) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Objekt-Detail</h2>
        <p className="mt-4 text-sm text-zinc-500">Kein Objekt ausgewählt.</p>
      </section>
    );
  }

  function getNextRecordForObject<T>(
    currentRecord: Record<string, T[]>,
    nextItems: T[],
  ) {
    const nextRecord = { ...currentRecord };

    if (nextItems.length === 0) {
      delete nextRecord[objectKey];
    } else {
      nextRecord[objectKey] = nextItems;
    }

    return nextRecord;
  }

  function getNextUtilitiesRecordForObject(
    currentRecord: Record<string, LocalUtility[]>,
    nextItems: LocalUtility[],
  ) {
    return {
      ...currentRecord,
      [objectKey]: nextItems,
    };
  }

  function persistCurrentObjectState(nextState: ObjectDetailLocalState) {
    const normalizedState = normalizeObjectDetailState(nextState);

    const nextApartmentsRecord = getNextRecordForObject(
      apartmentsByObject,
      normalizedState.apartments,
    );
    const nextTenanciesRecord = getNextRecordForObject(
      tenanciesByObject,
      normalizedState.tenancies,
    );
    const nextMetersRecord = getNextRecordForObject(
      metersByObject,
      normalizedState.meters,
    );
    const nextUtilitiesRecord = getNextUtilitiesRecordForObject(
      utilitiesByObject,
      normalizedState.utilities,
    );

    setApartmentsByObject(nextApartmentsRecord);
    setTenanciesByObject(nextTenanciesRecord);
    setMetersByObject(nextMetersRecord);
    setUtilitiesByObject(nextUtilitiesRecord);

    writeStorageRecord(OBJECT_MODULE_STORAGE_KEYS.apartments, nextApartmentsRecord);
    writeStorageRecord(OBJECT_MODULE_STORAGE_KEYS.tenancies, nextTenanciesRecord);
    writeStorageRecord(OBJECT_MODULE_STORAGE_KEYS.meters, nextMetersRecord);
    writeStorageRecord(OBJECT_MODULE_STORAGE_KEYS.utilities, nextUtilitiesRecord);
  }

  function handleCreateApartment(draft: ApartmentDraft) {
    if (draft.status === "") {
      return;
    }

    const nextNumber = getNextApartmentNumber(apartments);
    const newApartment: LocalApartment = {
      id: formatApartmentInternalId(objectKey, nextNumber),
      unitLabel: formatApartmentUnitLabel(nextNumber),
      designation: draft.designation,
      area: draft.area,
      status: draft.status,
    };

    persistCurrentObjectState({
      apartments: [...apartments, newApartment],
      tenancies,
      meters,
      utilities,
    });
  }

  function handleUpdateApartment(apartmentId: string, draft: ApartmentDraft) {
    if (draft.status === "") {
      return;
    }

    const nextStatus: ApartmentStatusValue = draft.status;

    persistCurrentObjectState({
      apartments: apartments.map((apartment) =>
        apartment.id === apartmentId
          ? {
              ...apartment,
              designation: draft.designation,
              area: draft.area,
              status: nextStatus,
            }
          : apartment,
      ),
      tenancies,
      meters,
      utilities,
    });
  }

  function handleDeleteApartment(apartmentId: string) {
    const meterIdsToRemove = meters
      .filter((meter) => meter.apartmentId === apartmentId)
      .map((meter) => meter.id);

    persistCurrentObjectState({
      apartments: apartments.filter((apartment) => apartment.id !== apartmentId),
      tenancies: tenancies.filter((tenancy) => tenancy.apartmentId !== apartmentId),
      meters: meters.filter((meter) => meter.apartmentId !== apartmentId),
      utilities: utilities.map((utility) => ({
        ...utility,
        apartmentIds: utility.apartmentIds.filter((entryId) => entryId !== apartmentId),
        meterIds: utility.meterIds.filter(
          (entryId) => !meterIdsToRemove.includes(entryId),
        ),
      })),
    });
  }

  function handleCreateTenancy(apartmentId: string, draft: TenancyDraft) {
    if (!apartments.some((apartment) => apartment.id === apartmentId)) {
      return;
    }

    const validatedDraft = getValidatedTenancyDraft(apartmentId, draft, tenancies);

    if (!validatedDraft) {
      return;
    }

    const nextNumber = getNextTenancyNumber(tenancies);
    const newTenancy: LocalTenancy = {
      id: formatTenancyInternalId(objectKey, nextNumber),
      apartmentId,
      tenantName: validatedDraft.tenantName,
      startDate: validatedDraft.startDate,
      endDate: validatedDraft.endDate,
      persons: validatedDraft.persons,
    };

    persistCurrentObjectState({
      apartments,
      tenancies: [...tenancies, newTenancy],
      meters,
      utilities,
    });
  }

  function handleUpdateTenancy(tenancyId: string, draft: TenancyDraft) {
    const existingTenancy = tenancies.find((tenancy) => tenancy.id === tenancyId);

    if (!existingTenancy) {
      return;
    }

    const validatedDraft = getValidatedTenancyDraft(
      existingTenancy.apartmentId,
      draft,
      tenancies,
      { ignoreTenancyId: tenancyId },
    );

    if (!validatedDraft) {
      return;
    }

    persistCurrentObjectState({
      apartments,
      tenancies: tenancies.map((tenancy) =>
        tenancy.id === tenancyId
          ? {
              ...tenancy,
              tenantName: validatedDraft.tenantName,
              startDate: validatedDraft.startDate,
              endDate: validatedDraft.endDate,
              persons: validatedDraft.persons,
            }
          : tenancy,
      ),
      meters,
      utilities,
    });
  }

  function handleDeleteTenancy(tenancyId: string) {
    persistCurrentObjectState({
      apartments,
      tenancies: tenancies.filter((tenancy) => tenancy.id !== tenancyId),
      meters,
      utilities,
    });
  }

  function handleCreateStandardMeter(
    template: StandardMeterTemplate,
    apartmentId: string | null,
    draft: StandardMeterCreateDraft,
  ) {
    const meterNumber = getValidatedMeterNumber(meters, draft.meterNumber);
    const firstReadingDraft = normalizeMeterReadingDraft({
      date: getTodayDateInputValue(),
      value: draft.value,
      reader: "",
    });

    if (meterNumber === null || firstReadingDraft === null) {
      return;
    }

    if (
      template.scope === "apartment" &&
      (
        apartmentId === null ||
        !apartments.some((apartment) => apartment.id === apartmentId)
      )
    ) {
      return;
    }

    const standardAlreadyExists = meters.some((meter) => {
      if (meter.origin !== "standard" || meter.standardKey !== template.key) {
        return false;
      }

      if (template.scope === "object") {
        return meter.scope === "object";
      }

      return meter.apartmentId === apartmentId;
    });

    if (standardAlreadyExists) {
      return;
    }

    const nextNumber = getNextMeterNumber(meters);
    const meterId = formatMeterInternalId(objectKey, nextNumber);
    const firstReading: LocalMeterReading = {
      id: formatMeterReadingInternalId(meterId, 1),
      date: firstReadingDraft.date,
      value: firstReadingDraft.value,
      reader: firstReadingDraft.reader,
    };
    const newMeter: LocalMeter = {
      id: meterId,
      origin: "standard",
      standardKey: template.key,
      scope: template.scope,
      apartmentId: template.scope === "apartment" ? apartmentId : null,
      type: template.type,
      label: template.label,
      meterNumber,
      unit: template.unit,
      readings: [firstReading],
    };

    persistCurrentObjectState({
      apartments,
      tenancies,
      meters: [...meters, newMeter],
      utilities,
    });
  }

  function handleCreateMeter(
    draft: MeterDraft,
    initialReading: MeterReadingDraft,
  ) {
    const validatedDraft = getValidatedMeterDraft(apartments, meters, draft);
    const validatedInitialReading = normalizeMeterReadingDraft(initialReading);

    if (!validatedDraft || !validatedInitialReading) {
      return;
    }

    const nextNumber = getNextMeterNumber(meters);
    const meterId = formatMeterInternalId(objectKey, nextNumber);
    const firstReading: LocalMeterReading = {
      id: formatMeterReadingInternalId(meterId, 1),
      date: validatedInitialReading.date,
      value: validatedInitialReading.value,
      reader: validatedInitialReading.reader,
    };
    const newMeter: LocalMeter = {
      id: meterId,
      origin: "optional",
      standardKey: null,
      scope: validatedDraft.scope,
      apartmentId: validatedDraft.apartmentId,
      type: validatedDraft.type,
      label: validatedDraft.label,
      meterNumber: validatedDraft.meterNumber,
      unit: validatedDraft.unit,
      readings: [firstReading],
    };

    persistCurrentObjectState({
      apartments,
      tenancies,
      meters: [...meters, newMeter],
      utilities,
    });
  }

  function handleUpdateMeter(meterId: string, draft: MeterDraft) {
    const existingMeter = meters.find((meter) => meter.id === meterId);

    if (!existingMeter) {
      return;
    }

    if (existingMeter.origin === "standard") {
      const meterNumber = getValidatedMeterNumber(meters, draft.meterNumber, {
        ignoreMeterId: meterId,
      });

      if (meterNumber === null) {
        return;
      }

      persistCurrentObjectState({
        apartments,
        tenancies,
        meters: meters.map((meter) =>
          meter.id === meterId
            ? {
                ...meter,
                meterNumber,
              }
            : meter,
        ),
        utilities,
      });

      return;
    }

    const validatedDraft = getValidatedMeterDraft(apartments, meters, draft, {
      ignoreMeterId: meterId,
    });

    if (!validatedDraft) {
      return;
    }

    persistCurrentObjectState({
      apartments,
      tenancies,
      meters: meters.map((meter) =>
        meter.id === meterId
          ? {
              ...meter,
              scope: validatedDraft.scope,
              apartmentId: validatedDraft.apartmentId,
              type: validatedDraft.type,
              label: validatedDraft.label,
              meterNumber: validatedDraft.meterNumber,
              unit: validatedDraft.unit,
            }
          : meter,
      ),
      utilities,
    });
  }

  function handleDeleteMeter(meterId: string) {
    persistCurrentObjectState({
      apartments,
      tenancies,
      meters: meters.filter((meter) => meter.id !== meterId),
      utilities: utilities.map((utility) => ({
        ...utility,
        meterIds: utility.meterIds.filter((entryId) => entryId !== meterId),
      })),
    });
  }

  function handleCreateMeterReading(meterId: string, draft: MeterReadingDraft) {
    const validatedDraft = normalizeMeterReadingDraft(draft);
    const targetMeter = meters.find((meter) => meter.id === meterId);

    if (!validatedDraft || !targetMeter) {
      return;
    }

    persistCurrentObjectState({
      apartments,
      tenancies,
      meters: meters.map((meter) => {
        if (meter.id !== meterId) {
          return meter;
        }

        const nextNumber = getNextMeterReadingNumber(targetMeter.readings);
        const newReading: LocalMeterReading = {
          id: formatMeterReadingInternalId(meterId, nextNumber),
          date: validatedDraft.date,
          value: validatedDraft.value,
          reader: validatedDraft.reader,
        };

        return {
          ...meter,
          readings: [...meter.readings, newReading],
        };
      }),
      utilities,
    });
  }

  function handleUpdateMeterReading(
    meterId: string,
    readingId: string,
    draft: MeterReadingDraft,
  ) {
    const validatedDraft = normalizeMeterReadingDraft(draft);
    const targetMeter = meters.find((meter) => meter.id === meterId);

    if (
      !validatedDraft ||
      !targetMeter ||
      !targetMeter.readings.some((reading) => reading.id === readingId)
    ) {
      return;
    }

    persistCurrentObjectState({
      apartments,
      tenancies,
      meters: meters.map((meter) =>
        meter.id === meterId
          ? {
              ...meter,
              readings: meter.readings.map((reading) =>
                reading.id === readingId
                  ? {
                      ...reading,
                      date: validatedDraft.date,
                      value: validatedDraft.value,
                      reader: validatedDraft.reader,
                    }
                  : reading,
              ),
            }
          : meter,
      ),
      utilities,
    });
  }

  function handleDeleteMeterReading(meterId: string, readingId: string) {
    persistCurrentObjectState({
      apartments,
      tenancies,
      meters: meters.map((meter) =>
        meter.id === meterId
          ? {
              ...meter,
              readings: meter.readings.filter((reading) => reading.id !== readingId),
            }
          : meter,
      ),
      utilities,
    });
  }

  function handleCreateUtility(draft: UtilityDraft) {
    const validatedDraft = getValidatedUtilityDraft(apartments, meters, draft);

    if (!validatedDraft) {
      return;
    }

    const nextNumber = getNextUtilityNumber(utilities);
    const newUtility: LocalUtility = {
      id: formatUtilityInternalId(objectKey, nextNumber),
      category: validatedDraft.category,
      label: validatedDraft.label,
      apartmentIds: validatedDraft.apartmentIds,
      meterIds: validatedDraft.meterIds,
      note: validatedDraft.note,
    };

    persistCurrentObjectState({
      apartments,
      tenancies,
      meters,
      utilities: [...utilities, newUtility],
    });
  }

  function handleUpdateUtility(utilityId: string, draft: UtilityDraft) {
    const existingUtility = utilities.find((utility) => utility.id === utilityId);
    const validatedDraft = getValidatedUtilityDraft(apartments, meters, draft);

    if (!existingUtility || !validatedDraft) {
      return;
    }

    persistCurrentObjectState({
      apartments,
      tenancies,
      meters,
      utilities: utilities.map((utility) =>
        utility.id === utilityId
          ? {
              ...utility,
              category: validatedDraft.category,
              label: validatedDraft.label,
              apartmentIds: validatedDraft.apartmentIds,
              meterIds: validatedDraft.meterIds,
              note: validatedDraft.note,
            }
          : utility,
      ),
    });
  }

  function handleDeleteUtility(utilityId: string) {
    persistCurrentObjectState({
      apartments,
      tenancies,
      meters,
      utilities: utilities.filter((utility) => utility.id !== utilityId),
    });
  }

  return (
    <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        {object.displayId ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {object.displayId}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-zinc-900">{object.name}</h2>
            <p className="mt-2 text-sm text-zinc-500">{object.address}</p>
          </div>

          <StatusBadge
            label={object.status}
            variant={getStatusVariant(object.status)}
          />
        </div>
      </div>

      {activeSection === null ? (
        <div className="space-y-5">
          <ObjectDossierOverview
            object={object}
            apartments={apartments}
            tenancies={tenancies}
            meters={meters}
            utilities={utilities}
            documents={objectDocuments}
            tenants={objectTenants}
            contracts={objectContracts}
            rentUnits={objectRentUnits}
            readingCampaigns={objectReadingCampaigns}
            missingRequirements={missingDocumentRequirements}
            creatingRequirementKey={creatingRequirementKey}
            requirementActionError={requirementActionError}
            onCreateMissingRequirement={handleCreateMissingRequirement}
            onOpenSection={setActiveSection}
          />

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-zinc-900">Arbeitsbereich wählen</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Wähle den Bereich, in dem du im Objekt weiterarbeiten willst.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <SectionCard
                title="Übersicht"
                text="Stammdaten, Status, Kennzahlen und Objektkopf ansehen."
                onClick={() => setActiveSection("overview")}
              />
              <SectionCard
                title="Wohnungen"
                text="Wohnungsstruktur des Objekts aufbauen und später je Wohnung weiterarbeiten."
                onClick={() => setActiveSection("apartments")}
              />
              <SectionCard
                title="Mietverhältnisse"
                text="Mietverhältnisse im Objektkontext führen und prüfen."
                onClick={() => setActiveSection("tenancies")}
              />
              <SectionCard
                title="Zähler"
                text="Zähler, Zählerstände und spätere Verbrauchslogik vorbereiten."
                onClick={() => setActiveSection("meters")}
              />
              <SectionCard
                title="Nebenkosten"
                text="Nebenkosten, Verteilungen und spätere Abrechnungen im Objekt bearbeiten."
                onClick={() => setActiveSection("utilities")}
              />
              <SectionCard
                title="Dokumente"
                text="Objektbezogene Unterlagen an einem Ort bündeln."
                onClick={() => setActiveSection("documents")}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <FocusHeader
            label={SECTION_LABELS[activeSection]}
            onBack={() => setActiveSection(null)}
          />

          {activeSection === "overview" ? (
            <OverviewSection object={object} />
          ) : null}

          {activeSection === "apartments" ? (
            <ApartmentsSection
              object={object}
              apartments={apartments}
              documents={allDocuments}
              onCreateApartment={handleCreateApartment}
              onUpdateApartment={handleUpdateApartment}
              onDeleteApartment={handleDeleteApartment}
            />
          ) : null}

          {activeSection === "tenancies" ? (
            <TenanciesSection
              object={object}
              apartments={apartments}
              tenancies={tenancies}
              documents={allDocuments}
              onCreateTenancy={handleCreateTenancy}
              onUpdateTenancy={handleUpdateTenancy}
              onDeleteTenancy={handleDeleteTenancy}
            />
          ) : null}

          {activeSection === "meters" ? (
            <MetersSection
              object={object}
              apartments={apartments}
              meters={meters}
              onCreateStandardMeter={handleCreateStandardMeter}
              onCreateMeter={handleCreateMeter}
              onUpdateMeter={handleUpdateMeter}
              onDeleteMeter={handleDeleteMeter}
              onCreateMeterReading={handleCreateMeterReading}
              onUpdateMeterReading={handleUpdateMeterReading}
              onDeleteMeterReading={handleDeleteMeterReading}
            />
          ) : null}

          {activeSection === "utilities" ? (
            <UtilitiesSection
              object={object}
              apartments={apartments}
              meters={meters}
              utilities={utilities}
              documents={allDocuments}
              onCreateUtility={handleCreateUtility}
              onUpdateUtility={handleUpdateUtility}
              onDeleteUtility={handleDeleteUtility}
            />
          ) : null}

          {activeSection === "documents" ? (
            <ObjectDocumentsSection object={object} documents={objectDocuments} />
          ) : null}
        </>
      )}
    </section>
  );
}
