"use client";

import { useEffect, useMemo, useState } from "react";
import type { RentUnit } from "@/features/finances/services/rent-units.service";
import type { ImmoDocument } from "@/types/document";
import {
  getDocuments,
  getDownloadUrl,
  getDocumentStorageStatus,
  exportDocumentsInventory,
  uploadDocument,
  attachFileToDocument,
  createMissingDocument,
  deleteDocument,
  updateDocumentStatus,
  updateDocumentMetadata,
} from "@/features/documents/services/documents.service";
import { documentUploadSchema } from "@/lib/validation/schemas";

const CATEGORIES = ["Sonstiges", "Jahresreport WEG", "Jahresreport Wohnung", "Mietvertrag", "Nebenkostenabrechnung", "Protokoll", "Rechnung", "Foto", "Versicherung", "Ausweis", "Sonstige Korrespondenz"];
const STATUSES = ["Vorhanden", "In Prüfung", "Fehlt"];

function requiresReportYear(category: string) {
  return (
    category === "Jahresreport WEG" ||
    category === "Jahresreport Wohnung" ||
    category === "Nebenkostenabrechnung"
  );
}

function getDocumentValidationMessage(
  issue: { path: Array<string | number>; message: string } | undefined,
  titleMessage: string,
) {
  if (!issue) {
    return "Bitte alle Felder korrekt ausfüllen.";
  }

  if (issue.path[0] === "title") {
    return titleMessage;
  }

  if (issue.path[0] === "reportYear") {
    return "Für Jahresreports und Nebenkostenabrechnungen bitte ein gültiges 4-stelliges Berichtsjahr angeben.";
  }

  return issue.message;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusColor(status: string) {
  switch (status) {
    case "Vorhanden": return "bg-emerald-100 text-emerald-700";
    case "In Prüfung": return "bg-amber-100 text-amber-700";
    case "Fehlt": return "bg-rose-100 text-rose-700";
    default: return "bg-zinc-100 text-zinc-600";
  }
}

function formatDocumentDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unbekanntes Datum";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatActivityDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unbekannt";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatUploadAssignmentSummary(
  objectLabel: string | null,
  unitLabel: string | null,
) {
  if (objectLabel && unitLabel) {
    return `${objectLabel} / ${unitLabel}`;
  }

  if (objectLabel) {
    return `${objectLabel} / Gesamtes Objekt`;
  }

  return "Allgemeines Dokument ohne Objektbezug";
}

function getDocumentOpenIssues(doc: ImmoDocument) {
  return doc.openIssues ?? [];
}

function getDocumentActionState(doc: ImmoDocument) {
  return doc.actionState ?? null;
}

function getActionStateLabel(actionState: DocumentActionState) {
  switch (actionState) {
    case "file_missing":
      return "Datei fehlt";
    case "assignment_missing":
      return "Zuordnung fehlt";
    case "review_pending":
      return "In Prüfung";
    case "status_missing":
      return "Status Fehlt";
    default:
      return "Offen";
  }
}

function getDocumentSortTimestamp(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortDocuments(items: ImmoDocument[]) {
  return [...items].sort((left, right) => {
    const leftYear = left.reportYear ?? -1;
    const rightYear = right.reportYear ?? -1;

    if (leftYear !== rightYear) {
      return rightYear - leftYear;
    }

    return getDocumentSortTimestamp(right.createdAt) - getDocumentSortTimestamp(left.createdAt);
  });
}

function getDocumentCaseWeight(doc: ImmoDocument) {
  if (doc.fileAvailable === false || doc.actionState === "file_missing") {
    return 4;
  }

  if (doc.actionState === "assignment_missing") {
    return 3;
  }

  if (doc.status === "Fehlt" || doc.actionState === "status_missing") {
    return 2;
  }

  if (doc.status === "In Prüfung" || doc.actionState === "review_pending") {
    return 1;
  }

  return 0;
}

function getDocumentCaseLabel(doc: ImmoDocument) {
  const actionState = getDocumentActionState(doc);
  if (actionState) {
    return getActionStateLabel(actionState);
  }

  if (doc.fileAvailable === false) {
    return "Datei fehlt";
  }

  if (doc.status === "Fehlt") {
    return "Status Fehlt";
  }

  if (doc.status === "In Prüfung") {
    return "In Prüfung";
  }

  return "Offen";
}

type DocumentEditForm = {
  id: string;
  title: string;
  category: string;
  uploadedBy: string;
  objectId: string;
  rentUnitId: string;
  reportYear: string;
};

type DocumentFileAttachForm = {
  documentId: string;
  file: File | null;
};

type Props = {
  initialDocuments: ImmoDocument[];
  objects: { id: string; displayId: string; name: string }[];
  rentUnits: RentUnit[];
  initialFilters?: {
    search?: string;
    category?: string;
    status?: string;
    fileState?: string;
    actionState?: string;
    reportYear?: string;
    objectId?: string;
    rentUnitId?: string;
  };
};

type DocumentActivityEntry = {
  label: string;
  detail: string;
  timestamp: string;
};

type ActiveFilterEntry = {
  key: string;
  label: string;
  clear: () => void;
};

type RelatedDocumentStat = {
  label: string;
  value: number;
};

type DocumentActionState =
  | "file_missing"
  | "assignment_missing"
  | "review_pending"
  | "status_missing";

type ActionStateSummary = {
  key: DocumentActionState;
  label: string;
  value: number;
};

type SimpleSummary = {
  label: string;
  value: number;
};

type DocumentStorageStatus = {
  mode: "filesystem" | "s3";
  rootPath: string | null;
  available: boolean;
};

export function DocumentsModule({ initialDocuments, objects, rentUnits, initialFilters }: Props) {
  const defaultReportYear = String(new Date().getFullYear());
  const normalizedInitialFilters = {
    search: initialFilters?.search ?? "",
    category: initialFilters?.category ?? "ALLE",
    status: initialFilters?.status ?? "ALLE",
    fileState: initialFilters?.fileState ?? "ALLE",
    actionState: initialFilters?.actionState ?? "ALLE",
    reportYear: initialFilters?.reportYear ?? "ALLE",
    objectId: initialFilters?.objectId ?? "ALLE",
    rentUnitId: initialFilters?.rentUnitId ?? "ALLE",
  };
  const [allDocuments, setAllDocuments] = useState<ImmoDocument[]>(initialDocuments);
  const [documents, setDocuments] = useState<ImmoDocument[]>(initialDocuments);
  const [search, setSearch] = useState(normalizedInitialFilters.search);
  const [debouncedSearch, setDebouncedSearch] = useState(normalizedInitialFilters.search);
  const [catFilter, setCatFilter] = useState(normalizedInitialFilters.category);
  const [statusFilter, setStatusFilter] = useState(normalizedInitialFilters.status);
  const [fileStateFilter, setFileStateFilter] = useState(normalizedInitialFilters.fileState);
  const [actionStateFilter, setActionStateFilter] = useState(normalizedInitialFilters.actionState);
  const [yearFilter, setYearFilter] = useState(normalizedInitialFilters.reportYear);
  const [objectFilter, setObjectFilter] = useState(normalizedInitialFilters.objectId);
  const [unitFilter, setUnitFilter] = useState(normalizedInitialFilters.rentUnitId);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exportingInventory, setExportingInventory] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [downloadDocumentId, setDownloadDocumentId] = useState<string | null>(null);
  const [expandedDocumentId, setExpandedDocumentId] = useState<string | null>(null);
  const [statusUpdateId, setStatusUpdateId] = useState<string | null>(null);
  const [metadataUpdateId, setMetadataUpdateId] = useState<string | null>(null);
  const [fileAttachUpdateId, setFileAttachUpdateId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<DocumentEditForm | null>(null);
  const [fileAttachForm, setFileAttachForm] = useState<DocumentFileAttachForm | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    category: "Sonstiges",
    uploadedBy: "",
    objectId: "",
    rentUnitId: "",
    reportYear: "",
    file: null as File | null,
  });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadError, setReloadError] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState<DocumentStorageStatus | null>(null);
  const uploadBlockedByStorage =
    storageStatus?.mode === "filesystem" &&
    storageStatus.available === false;

  function getUploadFormDefaults() {
    const activeCategory = catFilter !== "ALLE" ? catFilter : "Sonstiges";
    const activeObjectId = objectFilter !== "ALLE" ? objectFilter : "";
    const activeRentUnitId = unitFilter !== "ALLE" ? unitFilter : "";
    const activeReportYear =
      yearFilter !== "ALLE"
        ? yearFilter
        : requiresReportYear(activeCategory)
          ? defaultReportYear
          : "";

    return {
      title: "",
      category: activeCategory,
      uploadedBy: "",
      objectId: activeObjectId,
      rentUnitId: activeRentUnitId,
      reportYear: activeReportYear,
      file: null as File | null,
    };
  }

  const availableUnits = useMemo(
    () => rentUnits.filter((unit) => unit.objectId === uploadForm.objectId).sort((a, b) => a.unitLabel.localeCompare(b.unitLabel)),
    [rentUnits, uploadForm.objectId],
  );

  const availableEditUnits = useMemo(() => {
    if (!editForm?.objectId) {
      return [];
    }

    return rentUnits
      .filter((unit) => unit.objectId === editForm.objectId)
      .sort((a, b) => a.unitLabel.localeCompare(b.unitLabel));
  }, [editForm?.objectId, rentUnits]);

  const filterUnits = useMemo(() => {
    const units = objectFilter === "ALLE"
      ? rentUnits
      : rentUnits.filter((unit) => unit.objectId === objectFilter);

    return [...units].sort((a, b) => a.unitLabel.localeCompare(b.unitLabel));
  }, [rentUnits, objectFilter]);

  const selectedUploadObject = uploadForm.objectId
    ? objects.find((object) => object.id === uploadForm.objectId) ?? null
    : null;
  const selectedUploadUnit = uploadForm.rentUnitId
    ? rentUnits.find((unit) => unit.id === uploadForm.rentUnitId) ?? null
    : null;
  const uploadAssignmentSummary = formatUploadAssignmentSummary(
    selectedUploadObject ? `${selectedUploadObject.displayId} · ${selectedUploadObject.name}` : null,
    selectedUploadUnit?.unitLabel ?? null,
  );
  const selectedEditObject = editForm?.objectId
    ? objects.find((object) => object.id === editForm.objectId) ?? null
    : null;
  const selectedEditUnit = editForm?.rentUnitId
    ? rentUnits.find((unit) => unit.id === editForm.rentUnitId) ?? null
    : null;
  const editAssignmentSummary = editForm
    ? formatUploadAssignmentSummary(
      selectedEditObject ? `${selectedEditObject.displayId} · ${selectedEditObject.name}` : null,
      selectedEditUnit?.unitLabel ?? null,
    )
    : null;
  const editingDocument = editForm
    ? allDocuments.find((doc) => doc.id === editForm.id) ??
      documents.find((doc) => doc.id === editForm.id) ??
      null
    : null;
  const editingDocumentNeedsFile = editingDocument
    ? editingDocument.fileAvailable === false || editingDocument.status === "Fehlt"
    : false;
  const availableReportYears = useMemo(() => {
    const years = new Set<number>();
    for (const doc of allDocuments) {
      if (doc.reportYear) {
        years.add(doc.reportYear);
      }
    }

    return Array.from(years).sort((a, b) => b - a);
  }, [allDocuments]);

  useEffect(() => {
    if (unitFilter === "ALLE") {
      return;
    }

    const unitStillAvailable = filterUnits.some((unit) => unit.id === unitFilter);
    if (!unitStillAvailable) {
      setUnitFilter("ALLE");
    }
  }, [filterUnits, unitFilter]);

  useEffect(() => {
    if (!showUpload) {
      return;
    }

    setUploadForm((current) => {
      const nextObjectId = objectFilter === "ALLE" ? current.objectId : objectFilter;
      const nextRentUnitId =
        unitFilter === "ALLE"
          ? (nextObjectId === current.objectId ? current.rentUnitId : "")
          : unitFilter;

      if (current.objectId === nextObjectId && current.rentUnitId === nextRentUnitId) {
        return current;
      }

      return {
        ...current,
        objectId: nextObjectId,
        rentUnitId: nextRentUnitId,
      };
    });
  }, [objectFilter, showUpload, unitFilter]);

  useEffect(() => {
    setUploadForm((current) => {
      const uploadNeedsReportYear = requiresReportYear(current.category);
      const nextDefaultReportYear = yearFilter !== "ALLE" ? yearFilter : defaultReportYear;

      if (uploadNeedsReportYear && !current.reportYear) {
        return {
          ...current,
          reportYear: nextDefaultReportYear,
        };
      }

      if (
        !uploadNeedsReportYear &&
        yearFilter === "ALLE" &&
        current.reportYear === defaultReportYear
      ) {
        return {
          ...current,
          reportYear: "",
        };
      }

      return current;
    });
  }, [defaultReportYear, uploadForm.category, yearFilter]);

  useEffect(() => {
    if (!editForm) {
      return;
    }

    setEditForm((current) => {
      if (!current) {
        return current;
      }

      const editNeedsReportYear = requiresReportYear(current.category);
      if (!editNeedsReportYear || current.reportYear) {
        return current;
      }

      return {
        ...current,
        reportYear: yearFilter !== "ALLE" ? yearFilter : defaultReportYear,
      };
    });
  }, [defaultReportYear, editForm, yearFilter]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);

    return () => {
      window.clearTimeout(handle);
    };
  }, [search]);

  useEffect(() => {
    const sortedInitialDocuments = sortDocuments(initialDocuments);
    setAllDocuments(sortedInitialDocuments);
    setDocuments(sortedInitialDocuments);
  }, [initialDocuments]);

  useEffect(() => {
    let cancelled = false;

    async function loadStorageStatus() {
      const nextStatus = await getDocumentStorageStatus();
      if (!cancelled) {
        setStorageStatus(nextStatus);
      }
    }

    void loadStorageStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function reloadDocuments() {
      const trimmedSearch = debouncedSearch.trim();
      const hasServerFilters =
        trimmedSearch.length >= 2 ||
        objectFilter !== "ALLE" ||
        unitFilter !== "ALLE" ||
        catFilter !== "ALLE" ||
        statusFilter !== "ALLE" ||
        fileStateFilter !== "ALLE" ||
        actionStateFilter !== "ALLE" ||
        yearFilter !== "ALLE";

      if (!hasServerFilters) {
        setDocuments(allDocuments);
        setIsReloading(false);
        setReloadError(null);
        return;
      }

      setIsReloading(true);
      try {
        const nextDocuments = await getDocuments({
          ...(objectFilter !== "ALLE" ? { objectId: objectFilter } : {}),
          ...(unitFilter !== "ALLE" ? { rentUnitId: unitFilter } : {}),
          ...(catFilter !== "ALLE" ? { category: catFilter } : {}),
          ...(statusFilter !== "ALLE" ? { status: statusFilter } : {}),
          ...(fileStateFilter !== "ALLE"
            ? {
              fileState:
                fileStateFilter === "DATEI_FEHLT"
                  ? "missing"
                  : "available",
            }
            : {}),
          ...(actionStateFilter !== "ALLE" ? { actionState: actionStateFilter } : {}),
          ...(yearFilter !== "ALLE" ? { reportYear: yearFilter } : {}),
          ...(trimmedSearch.length >= 2 ? { search: trimmedSearch } : {}),
        });

        if (!cancelled) {
          setDocuments(sortDocuments(nextDocuments));
          setReloadError(null);
        }
      } catch {
        if (!cancelled) {
          setReloadError("Dokumente konnten für den aktuellen Filter nicht neu geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setIsReloading(false);
        }
      }
    }

    void reloadDocuments();

    return () => {
      cancelled = true;
    };
  }, [actionStateFilter, allDocuments, catFilter, debouncedSearch, fileStateFilter, objectFilter, statusFilter, unitFilter, yearFilter]);

  function matchesActiveServerFilters(doc: ImmoDocument) {
    const matchesObject = objectFilter === "ALLE" || doc.objectId === objectFilter;
    const matchesUnit = unitFilter === "ALLE" || doc.rentUnitId === unitFilter;
    const matchesCategory = catFilter === "ALLE" || doc.category === catFilter;
    const matchesStatus = statusFilter === "ALLE" || doc.status === statusFilter;
    const matchesFileState =
      fileStateFilter === "ALLE" ||
      (fileStateFilter === "DATEI_FEHLT" && doc.fileAvailable === false) ||
      (fileStateFilter === "DATEI_VORHANDEN" && doc.fileAvailable !== false);
    const matchesActionState =
      actionStateFilter === "ALLE" || getDocumentActionState(doc) === actionStateFilter;
    const matchesYear = yearFilter === "ALLE" || String(doc.reportYear ?? "") === yearFilter;
    return matchesObject && matchesUnit && matchesCategory && matchesStatus && matchesFileState && matchesActionState && matchesYear;
  }

  function applyUpdatedDocumentToVisibleList(items: ImmoDocument[], updated: ImmoDocument) {
    const nextItems = items.map((d) => d.id === updated.id ? updated : d);
    const isPresent = nextItems.some((d) => d.id === updated.id);

    if (!matchesActiveServerFilters(updated)) {
      return nextItems.filter((d) => d.id !== updated.id);
    }

    if (isPresent) {
      return sortDocuments(nextItems);
    }

    return sortDocuments([updated, ...nextItems]);
  }

  function getObjectDisplay(doc: ImmoDocument) {
    const object = doc.objectId ? objects.find((item) => item.id === doc.objectId) : null;
    if (object) {
      return `${object.displayId} · ${object.name}`;
    }
    return doc.objectName || "Allgemein";
  }

  function getUnitDisplay(doc: ImmoDocument) {
    if (doc.unitLabel) {
      return doc.unitLabel;
    }

    const unit = doc.rentUnitId ? rentUnits.find((item) => item.id === doc.rentUnitId) : null;
    return unit?.unitLabel ?? "Gesamtes Objekt / Allgemein";
  }

  function getDocumentActivityEntries(doc: ImmoDocument): DocumentActivityEntry[] {
    const entries: DocumentActivityEntry[] = [
      {
        label: "Hochgeladen",
        detail: doc.uploadedBy ? `Erfasst von ${doc.uploadedBy}` : "Ohne Upload-Hinweis",
        timestamp: doc.createdAt,
      },
    ];

    if (doc.updatedAt !== doc.createdAt) {
      entries.push({
        label: "Zuletzt bearbeitet",
        detail: `Aktueller Status: ${doc.status}`,
        timestamp: doc.updatedAt,
      });
    }

    if (doc.reportYear) {
      entries.push({
        label: "Berichtsjahr",
        detail: `Dokument ist dem Jahr ${doc.reportYear} zugeordnet`,
        timestamp: doc.updatedAt,
      });
    }

    return entries;
  }

  function getRelatedDocumentStats(doc: ImmoDocument): RelatedDocumentStat[] {
    return [
      {
        label: "Im selben Objekt",
        value: allDocuments.filter((item) => item.objectId && item.objectId === doc.objectId).length,
      },
      {
        label: "In derselben Einheit",
        value: allDocuments.filter((item) => item.rentUnitId && item.rentUnitId === doc.rentUnitId).length,
      },
      {
        label: "In derselben Kategorie",
        value: allDocuments.filter((item) => item.category === doc.category).length,
      },
      ...(doc.reportYear
        ? [
          {
            label: `Im Jahr ${doc.reportYear}`,
            value: allDocuments.filter((item) => item.reportYear === doc.reportYear).length,
          },
        ]
        : []),
    ];
  }

  function applyDocumentContextFilter(
    doc: ImmoDocument,
    scope: "object" | "unit" | "category" | "year" | "action",
  ) {
    setActionError(null);
    setReloadError(null);

    if (scope === "object") {
      setObjectFilter(doc.objectId ?? "ALLE");
      setUnitFilter("ALLE");
      return;
    }

    if (scope === "unit") {
      setObjectFilter(doc.objectId ?? "ALLE");
      setUnitFilter(doc.rentUnitId ?? "ALLE");
      return;
    }

    if (scope === "category") {
      setCatFilter(doc.category || "ALLE");
      return;
    }

    if (scope === "action") {
      setActionStateFilter(getDocumentActionState(doc) ?? "ALLE");
      return;
    }

    setYearFilter(doc.reportYear ? String(doc.reportYear) : "ALLE");
  }

  const filtered = documents.filter((d) => {
    const objectDisplay = getObjectDisplay(d).toLowerCase();
    const unitDisplay = getUnitDisplay(d).toLowerCase();
    const normalizedSearch = search.toLowerCase();
    const matchSearch =
      !search ||
      d.title.toLowerCase().includes(normalizedSearch) ||
      d.fileName.toLowerCase().includes(normalizedSearch) ||
      d.category.toLowerCase().includes(normalizedSearch) ||
      d.status.toLowerCase().includes(normalizedSearch) ||
      (d.uploadedBy ?? "").toLowerCase().includes(normalizedSearch) ||
      objectDisplay.includes(normalizedSearch) ||
      unitDisplay.includes(normalizedSearch) ||
      String(d.reportYear ?? "").includes(search);
    return matchSearch;
  });

  const totalSize = documents.reduce((s, d) => s + d.size, 0);
  const countPruefung = documents.filter((d) => d.status === "In Prüfung").length;
  const countFehlt = documents.filter((d) => d.status === "Fehlt").length;
  const countMissingFiles = documents.filter((d) => d.fileAvailable === false).length;
  const assignedCount = documents.filter((d) => d.objectId || d.rentUnitId).length;
  const visibleOpenCases = filtered.filter((doc) => getDocumentCaseWeight(doc) > 0);
  const priorityDocumentCases = [...visibleOpenCases]
    .sort((left, right) => {
      const weightDifference = getDocumentCaseWeight(right) - getDocumentCaseWeight(left);
      if (weightDifference !== 0) {
        return weightDifference;
      }

      return getDocumentSortTimestamp(right.updatedAt) - getDocumentSortTimestamp(left.updatedAt);
    })
    .slice(0, 3);
  const statusSummaries: SimpleSummary[] = STATUSES.map((status) => ({
    label: status,
    value: documents.filter((doc) => doc.status === status).length,
  }));
  const categorySummaries: SimpleSummary[] = Array.from(
    documents.reduce((summary, doc) => {
      summary.set(doc.category, (summary.get(doc.category) ?? 0) + 1);
      return summary;
    }, new Map<string, number>()),
    ([label, value]) => ({ label, value }),
  )
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label, "de"))
    .slice(0, 6);
  const actionStateSummaries: ActionStateSummary[] = [
    {
      key: "file_missing",
      label: "Datei fehlt",
      value: documents.filter((doc) => getDocumentActionState(doc) === "file_missing").length,
    },
    {
      key: "assignment_missing",
      label: "Zuordnung fehlt",
      value: documents.filter((doc) => getDocumentActionState(doc) === "assignment_missing").length,
    },
    {
      key: "review_pending",
      label: "In Prüfung",
      value: documents.filter((doc) => getDocumentActionState(doc) === "review_pending").length,
    },
    {
      key: "status_missing",
      label: "Status Fehlt",
      value: documents.filter((doc) => getDocumentActionState(doc) === "status_missing").length,
    },
  ];
  const openActionCount = actionStateSummaries.reduce((sum, entry) => sum + entry.value, 0);
  const activeFilterSummary: ActiveFilterEntry[] = [
    search.trim()
      ? {
        key: "search",
        label: `Suche: ${search.trim()}`,
        clear: () => setSearch(""),
      }
      : null,
    catFilter !== "ALLE"
      ? {
        key: "category",
        label: `Kategorie: ${catFilter}`,
        clear: () => setCatFilter("ALLE"),
      }
      : null,
    statusFilter !== "ALLE"
      ? {
        key: "status",
        label: `Status: ${statusFilter}`,
        clear: () => setStatusFilter("ALLE"),
      }
      : null,
    fileStateFilter !== "ALLE"
      ? {
        key: "fileState",
        label: fileStateFilter === "DATEI_FEHLT" ? "Ablage: Datei fehlt" : "Ablage: Datei vorhanden",
        clear: () => setFileStateFilter("ALLE"),
      }
      : null,
    actionStateFilter !== "ALLE"
      ? {
        key: "actionState",
        label: `Offener Fall: ${getActionStateLabel(actionStateFilter as DocumentActionState)}`,
        clear: () => setActionStateFilter("ALLE"),
      }
      : null,
    yearFilter !== "ALLE"
      ? {
        key: "year",
        label: `Jahr: ${yearFilter}`,
        clear: () => setYearFilter("ALLE"),
      }
      : null,
    objectFilter !== "ALLE"
      ? {
        key: "object",
        label: `Objekt: ${objects.find((object) => object.id === objectFilter)?.displayId ?? objectFilter}`,
        clear: () => setObjectFilter("ALLE"),
      }
      : null,
    unitFilter !== "ALLE"
      ? {
        key: "unit",
        label: `Einheit: ${rentUnits.find((unit) => unit.id === unitFilter)?.unitLabel ?? unitFilter}`,
        clear: () => setUnitFilter("ALLE"),
      }
      : null,
  ].filter((item): item is ActiveFilterEntry => Boolean(item));

  function closeUploadForm() {
    setShowUpload(false);
    setUploadError(null);
  }

  function openUploadForm() {
    setEditForm(null);
    setEditError(null);
    setActionError(null);
    setUploadError(null);
    setUploadForm(getUploadFormDefaults());
    setShowUpload(true);
  }

  function toggleUploadForm() {
    if (showUpload) {
      closeUploadForm();
      return;
    }

    openUploadForm();
  }

  async function handleExportInventory() {
    setExportingInventory(true);
    setActionError(null);

    const result = await exportDocumentsInventory();

    if (!result.ok) {
      setActionError(result.error);
      setExportingInventory(false);
      return;
    }

    const downloadUrl = URL.createObjectURL(result.data);
    const link = window.document.createElement("a");
    link.href = downloadUrl;
    link.download = "dokumentenbestand.csv";
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
    setExportingInventory(false);
  }

  function closeEditForm() {
    setEditForm(null);
    setFileAttachForm(null);
    setEditError(null);
  }

  function resetFilters() {
    setSearch("");
    setCatFilter("ALLE");
    setStatusFilter("ALLE");
    setFileStateFilter("ALLE");
    setActionStateFilter("ALLE");
    setYearFilter("ALLE");
    setObjectFilter("ALLE");
    setUnitFilter("ALLE");
    setReloadError(null);
    setActionError(null);
  }

  function validateDocumentDraft(titleFallback = "", titleMessage = "Bitte einen Dokumenttitel angeben.") {
    const validation = documentUploadSchema.safeParse({
      title: uploadForm.title.trim() || titleFallback,
      category: uploadForm.category,
      objectId: uploadForm.objectId || undefined,
      rentUnitId: uploadForm.rentUnitId || undefined,
      reportYear: uploadForm.reportYear.trim() || undefined,
    });

    if (!validation.success) {
      setUploadError(getDocumentValidationMessage(validation.error.issues[0], titleMessage));
      return null;
    }

    return {
      trimmedTitle: validation.data.title,
      trimmedReportYear: validation.data.reportYear ?? "",
      trimmedUploadedBy: uploadForm.uploadedBy.trim(),
    };
  }

  function applyCreatedDocument(document: ImmoDocument) {
    setAllDocuments((prev) => sortDocuments([document, ...prev]));
    if (matchesActiveServerFilters(document)) {
      setDocuments((prev) => sortDocuments([document, ...prev]));
    }
    closeUploadForm();
    setUploadForm(getUploadFormDefaults());
  }

  async function handleUpload() {
    if (uploadBlockedByStorage) {
      setUploadError("OneDrive-Ablage ist aktuell nicht erreichbar.");
      return;
    }

    if (!uploadForm.file) {
      setUploadError("Bitte eine Datei auswählen.");
      return;
    }

    const validatedDraft = validateDocumentDraft(uploadForm.file.name);
    if (!validatedDraft) {
      return;
    }

    setUploading(true);
    setUploadError(null);
    setActionError(null);
    const fd = new FormData();
    fd.append("file", uploadForm.file);
    fd.append("title", validatedDraft.trimmedTitle || uploadForm.file.name);
    fd.append("category", uploadForm.category);
    if (uploadForm.objectId) {
      fd.append("objectId", uploadForm.objectId);
    }
    if (uploadForm.rentUnitId) {
      fd.append("rentUnitId", uploadForm.rentUnitId);
    }
    if (validatedDraft.trimmedReportYear) {
      fd.append("reportYear", validatedDraft.trimmedReportYear);
    }
    if (validatedDraft.trimmedUploadedBy) {
      fd.append("uploadedBy", validatedDraft.trimmedUploadedBy);
    }
    const uploadResult = await uploadDocument(fd);
    if (uploadResult.ok) {
      applyCreatedDocument(uploadResult.document);
    } else {
      setUploadError(uploadResult.error);
    }
    setUploading(false);
  }

  async function handleCreateMissing() {
    const validatedDraft = validateDocumentDraft("", "Für fehlende Dokumente bitte einen Titel angeben.");
    if (!validatedDraft) {
      return;
    }

    setUploading(true);
    setUploadError(null);
    setActionError(null);

    const createResult = await createMissingDocument({
      title: validatedDraft.trimmedTitle,
      category: uploadForm.category,
      objectId: uploadForm.objectId || undefined,
      rentUnitId: uploadForm.rentUnitId || undefined,
      reportYear: validatedDraft.trimmedReportYear || undefined,
      uploadedBy: validatedDraft.trimmedUploadedBy || undefined,
    });

    if (createResult.ok) {
      applyCreatedDocument(createResult.document);
    } else {
      setUploadError(createResult.error);
    }

    setUploading(false);
  }

  function startEditing(doc: ImmoDocument) {
    closeUploadForm();
    setEditError(null);
    setActionError(null);
    setEditForm({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      uploadedBy: doc.uploadedBy ?? "",
      objectId: doc.objectId ?? "",
      rentUnitId: doc.rentUnitId ?? "",
      reportYear: doc.reportYear ? String(doc.reportYear) : "",
    });
    setFileAttachForm({
      documentId: doc.id,
      file: null,
    });
  }

  async function handleAttachFile() {
    if (!editForm || !fileAttachForm || fileAttachForm.documentId !== editForm.id) {
      return;
    }

    if (!fileAttachForm.file) {
      setEditError("Bitte eine Datei zum Nachreichen auswählen.");
      return;
    }

    setFileAttachUpdateId(editForm.id);
    setEditError(null);
    setActionError(null);

    const formData = new FormData();
    formData.append("file", fileAttachForm.file);
    if (editForm.uploadedBy.trim()) {
      formData.append("uploadedBy", editForm.uploadedBy.trim());
    }

    const attachResult = await attachFileToDocument(editForm.id, formData);
    if (attachResult.ok) {
      setAllDocuments((prev) =>
        sortDocuments(prev.map((doc) => (doc.id === attachResult.document.id ? attachResult.document : doc))),
      );
      setDocuments((prev) => applyUpdatedDocumentToVisibleList(prev, attachResult.document));
      setFileAttachForm({
        documentId: editForm.id,
        file: null,
      });
    } else {
      setEditError(attachResult.error);
    }

    setFileAttachUpdateId(null);
  }

  async function handleMetadataSave() {
    if (!editForm) {
      return;
    }

    const validation = documentUploadSchema.safeParse({
      title: editForm.title,
      category: editForm.category,
      objectId: editForm.objectId || undefined,
      rentUnitId: editForm.rentUnitId || undefined,
      reportYear: editForm.reportYear.trim() || undefined,
    });

    if (!validation.success) {
      setEditError(getDocumentValidationMessage(validation.error.issues[0], "Bitte einen Dokumenttitel angeben."));
      return;
    }

    setMetadataUpdateId(editForm.id);
    setEditError(null);
    setActionError(null);
    const updated = await updateDocumentMetadata(editForm.id, {
      title: validation.data.title,
      category: validation.data.category,
      uploadedBy: editForm.uploadedBy.trim(),
      objectId: validation.data.objectId || undefined,
      rentUnitId: validation.data.rentUnitId || undefined,
      reportYear: validation.data.reportYear ?? "",
    });

    if (updated.ok) {
      setAllDocuments((prev) => sortDocuments(prev.map((d) => d.id === updated.data.id ? updated.data : d)));
      setDocuments((prev) => applyUpdatedDocumentToVisibleList(prev, updated.data));
      closeEditForm();
    } else {
      setEditError(updated.error);
    }
    setMetadataUpdateId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Dokument wirklich löschen?")) return;
    setActionError(null);
    const deleted = await deleteDocument(id);
    if (deleted.ok) {
      if (expandedDocumentId === id) {
        setExpandedDocumentId(null);
      }
      setAllDocuments((prev) => prev.filter((d) => d.id !== id));
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      return;
    }

    setActionError(deleted.error);
  }

  async function handleDownload(doc: ImmoDocument) {
    setDownloadDocumentId(doc.id);
    setActionError(null);

    const downloadResult = doc.downloadUrl
      ? { ok: true as const, data: doc.downloadUrl }
      : await getDownloadUrl(doc.id);
    if (!downloadResult.ok) {
      setActionError(downloadResult.error);
      setDownloadDocumentId(null);
      return;
    }

    setAllDocuments((prev) => prev.map((item) => item.id === doc.id ? { ...item, downloadUrl: downloadResult.data } : item));
    setDocuments((prev) => prev.map((item) => item.id === doc.id ? { ...item, downloadUrl: downloadResult.data } : item));
    window.open(downloadResult.data, "_blank", "noopener,noreferrer");
    setDownloadDocumentId(null);
  }

  function toggleDocumentDetails(id: string) {
    setExpandedDocumentId((current) => current === id ? null : id);
  }

  async function handleStatusChange(id: string, status: string) {
    setStatusUpdateId(id);
    setActionError(null);
    const updated = await updateDocumentStatus(id, status);
    if (updated.ok) {
      setAllDocuments((prev) => sortDocuments(prev.map((d) => d.id === id ? updated.data : d)));
      setDocuments((prev) => applyUpdatedDocumentToVisibleList(prev, updated.data));
    } else {
      setActionError(updated.error);
    }
    setStatusUpdateId(null);
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dokumente</h1>
          <p className="mt-1 text-sm text-zinc-600">Zentrale Dokumentenablage je WEG, Wohnung und Berichtsjahr.</p>
          {storageStatus?.mode === "filesystem" && storageStatus.rootPath ? (
            <p className={`mt-1 text-xs ${storageStatus.available ? "text-emerald-700" : "text-rose-700"}`}>
              {storageStatus.available
                ? `Ablage aktiv: ${storageStatus.rootPath}`
                : `Ablage nicht verfügbar: ${storageStatus.rootPath}`}
            </p>
          ) : storageStatus?.mode === "s3" ? (
            <p className="mt-1 text-xs text-amber-700">Ablage läuft aktuell nicht über OneDrive/Dateisystem.</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900"
          >
            ← Zurück zum Dashboard
          </a>
          <button
            type="button"
            onClick={handleExportInventory}
            disabled={exportingInventory}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportingInventory ? "Export läuft..." : "Bestand exportieren"}
          </button>
          <button
            type="button"
            onClick={toggleUploadForm}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500 transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showUpload ? "Abbrechen" : "+ Dokument erfassen"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Bestand", value: documents.length },
          { label: "Sichtbar", value: filtered.length },
          { label: "Gesamtgröße", value: formatBytes(totalSize) },
          { label: "Zugeordnet", value: assignedCount },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-500">{s.label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-zinc-900">Status-Überblick</h3>
            <span className="text-xs text-zinc-500">{countPruefung + countFehlt} offen</span>
          </div>
          <div className="mt-4 grid gap-2">
            {statusSummaries.map((entry) => (
              <button
                key={entry.label}
                type="button"
                onClick={() => setStatusFilter(entry.label)}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                  statusFilter === entry.label
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white"
                }`}
              >
                <span>{entry.label}</span>
                <span className="font-semibold">{entry.value}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-zinc-900">Kategorie-Überblick</h3>
            <span className="text-xs text-zinc-500">Top Kategorien</span>
          </div>
          {categorySummaries.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-zinc-200 px-3 py-4 text-sm text-zinc-500">
              Noch keine Kategorien im Bestand.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {categorySummaries.map((entry) => (
                <button
                  key={entry.label}
                  type="button"
                  onClick={() => setCatFilter(entry.label)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
                    catFilter === entry.label
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white"
                  }`}
                >
                  <span>{entry.label}</span>
                  <span className="font-semibold">{entry.value}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Offene Dokumentfälle</h3>
            <p className="mt-1 text-xs text-zinc-500">
              {openActionCount === 0
                ? "Aktuell sind keine offenen Fälle im Dokumentenpfad markiert."
                : `${openActionCount} offene Fälle sind aktuell direkt bearbeitbar.`}
            </p>
          </div>
          {actionStateFilter !== "ALLE" ? (
            <button
              type="button"
              onClick={() => setActionStateFilter("ALLE")}
              className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
            >
              Offene-Fälle-Filter aufheben
            </button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {actionStateSummaries.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => setActionStateFilter(entry.key)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                actionStateFilter === entry.key
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white"
              }`}
            >
              <p className={`text-[11px] uppercase tracking-wide ${actionStateFilter === entry.key ? "text-zinc-200" : "text-zinc-500"}`}>
                {entry.label}
              </p>
              <p className="mt-2 text-2xl font-semibold">{entry.value}</p>
            </button>
          ))}
        </div>
        {priorityDocumentCases.length > 0 ? (
          <div className="mt-4 border-t border-zinc-100 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Priorität</p>
            <div className="mt-3 grid gap-2 lg:grid-cols-3">
              {priorityDocumentCases.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setExpandedDocumentId(doc.id)}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-left transition hover:border-zinc-300 hover:bg-white"
                >
                  <p className="truncate text-sm font-medium text-zinc-900">{doc.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">{getDocumentCaseLabel(doc)}</p>
                  <p className="mt-1 truncate text-xs text-zinc-400">{getObjectDisplay(doc)} / {getUnitDisplay(doc)}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {countMissingFiles > 0 ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {countMissingFiles} {countMissingFiles === 1 ? "Datei fehlt" : "Dateien fehlen"} aktuell in der Ablage.
        </div>
      ) : null}

      {showUpload && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-zinc-900">Dokument erfassen</h3>
          <p className="text-xs text-zinc-500">Aktuelle Zuordnung: {uploadAssignmentSummary}</p>
          {uploadBlockedByStorage && storageStatus?.rootPath ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              Datei-Upload gesperrt, weil die OneDrive-Ablage aktuell nicht erreichbar ist: {storageStatus.rootPath}. Fehlende Dokumente lassen sich trotzdem anlegen.
            </div>
          ) : null}
          {uploadError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{uploadError}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Titel</label>
              <input value={uploadForm.title} onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))} placeholder="Dokumententitel" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Kategorie</label>
              <select value={uploadForm.category} onChange={(e) => setUploadForm((f) => ({ ...f, category: e.target.value }))} className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Hochgeladen von</label>
              <input value={uploadForm.uploadedBy} onChange={(e) => setUploadForm((f) => ({ ...f, uploadedBy: e.target.value }))} placeholder="z. B. Max Mustermann" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">WEG / Objekt</label>
              <select value={uploadForm.objectId} onChange={(e) => setUploadForm((f) => ({ ...f, objectId: e.target.value, rentUnitId: "" }))} className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400">
                <option value="">Kein Objekt (Allgemein)</option>
                {objects.map((o) => <option key={o.id} value={o.id}>{o.displayId} · {o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Wohnung / Einheit</label>
              <select value={uploadForm.rentUnitId} onChange={(e) => setUploadForm((f) => ({ ...f, rentUnitId: e.target.value }))} disabled={!uploadForm.objectId} className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:bg-zinc-100">
                <option value="">{uploadForm.objectId ? "Keine Wohnung / gesamtes Objekt" : "Erst Objekt wählen"}</option>
                {availableUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.unitLabel}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Berichtsjahr</label>
              <p className="mb-1 text-[11px] text-zinc-400">Optional, außer bei Jahresreports und Nebenkostenabrechnungen.</p>
              <input value={uploadForm.reportYear} onChange={(e) => setUploadForm((f) => ({ ...f, reportYear: e.target.value }))} placeholder="z. B. 2025" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Datei</label>
              <input type="file" onChange={(e) => setUploadForm((f) => ({ ...f, file: e.target.files?.[0] || null }))} className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleUpload} disabled={uploading || uploadBlockedByStorage} className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition disabled:opacity-50">
              {uploading ? "Wird verarbeitet..." : "Mit Datei hochladen"}
            </button>
            <button type="button" onClick={handleCreateMissing} disabled={uploading} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50">
              {uploading ? "Wird verarbeitet..." : "Fehlend anlegen"}
            </button>
          </div>
        </div>
      )}

      {editForm && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-zinc-900">Dokument bearbeiten</h3>
              <p className="text-xs text-zinc-500">Aktuelle Zuordnung: {editAssignmentSummary}</p>
            </div>
            <button
              type="button"
              onClick={closeEditForm}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
            >
              Schließen
            </button>
          </div>
          {editError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{editError}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Titel</label>
              <input
                value={editForm.title}
                onChange={(e) => setEditForm((current) => current ? { ...current, title: e.target.value } : current)}
                placeholder="Dokumententitel"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Kategorie</label>
              <select
                value={editForm.category}
                onChange={(e) => setEditForm((current) => current ? { ...current, category: e.target.value } : current)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Hochgeladen von</label>
              <input
                value={editForm.uploadedBy}
                onChange={(e) => setEditForm((current) => current ? { ...current, uploadedBy: e.target.value } : current)}
                placeholder="z. B. Max Mustermann"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">WEG / Objekt</label>
              <select
                value={editForm.objectId}
                onChange={(e) => setEditForm((current) => current ? { ...current, objectId: e.target.value, rentUnitId: "" } : current)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              >
                <option value="">Kein Objekt (Allgemein)</option>
                {objects.map((o) => <option key={o.id} value={o.id}>{o.displayId} · {o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Wohnung / Einheit</label>
              <select
                value={editForm.rentUnitId}
                onChange={(e) => setEditForm((current) => current ? { ...current, rentUnitId: e.target.value } : current)}
                disabled={!editForm.objectId}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:bg-zinc-100"
              >
                <option value="">{editForm.objectId ? "Keine Wohnung / gesamtes Objekt" : "Erst Objekt wählen"}</option>
                {availableEditUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.unitLabel}</option>)}
              </select>
            </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Berichtsjahr</label>
            <input
              value={editForm.reportYear}
              onChange={(e) => setEditForm((current) => current ? { ...current, reportYear: e.target.value } : current)}
                placeholder="z. B. 2025"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
            </div>
          </div>
          {editingDocument ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Aktuelle Datei</p>
              <p className="mt-1 text-sm text-zinc-900">{editingDocument.fileName}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {editingDocument.mimeType} · {formatBytes(editingDocument.size)}
              </p>
            </div>
          ) : null}
          {editingDocumentNeedsFile ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Datei nachreichen</p>
              <p className="mt-1 text-xs text-zinc-500">
                Für dieses Dokument fehlt aktuell noch die physische Datei in der Ablage.
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="file"
                  onChange={(event) =>
                    setFileAttachForm((current) =>
                      current ? { ...current, file: event.target.files?.[0] || null } : current,
                    )}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
                />
                <button
                  type="button"
                  onClick={handleAttachFile}
                  disabled={fileAttachUpdateId === editForm.id}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {fileAttachUpdateId === editForm.id ? "Datei wird ergänzt..." : "Datei nachreichen"}
                </button>
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleMetadataSave}
              disabled={metadataUpdateId === editForm.id}
              className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition disabled:opacity-50"
            >
              {metadataUpdateId === editForm.id ? "Speichert..." : "Änderungen speichern"}
            </button>
            <button
              type="button"
              onClick={closeEditForm}
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 transition"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-8">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Suche nach Titel, Objekt-ID, Wohnung oder Jahr..." className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 xl:col-span-2" />
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400">
            <option value="ALLE">Alle Kategorien</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400">
            <option value="ALLE">Alle Status</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={fileStateFilter} onChange={(e) => setFileStateFilter(e.target.value)} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400">
            <option value="ALLE">Alle Ablagen</option>
            <option value="DATEI_VORHANDEN">Datei vorhanden</option>
            <option value="DATEI_FEHLT">Datei fehlt</option>
          </select>
          <select value={actionStateFilter} onChange={(e) => setActionStateFilter(e.target.value)} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400">
            <option value="ALLE">Alle offenen Fälle</option>
            <option value="file_missing">Datei fehlt</option>
            <option value="assignment_missing">Zuordnung fehlt</option>
            <option value="review_pending">In Prüfung</option>
            <option value="status_missing">Status Fehlt</option>
          </select>
          <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400">
            <option value="ALLE">Alle Jahre</option>
            {availableReportYears.map((year) => <option key={year} value={String(year)}>{year}</option>)}
          </select>
          <select value={objectFilter} onChange={(e) => setObjectFilter(e.target.value)} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400">
            <option value="ALLE">Alle Objekte</option>
            {objects.map((o) => <option key={o.id} value={o.id}>{o.displayId} · {o.name}</option>)}
          </select>
          <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400">
            <option value="ALLE">Alle Einheiten</option>
            {filterUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.unitLabel}</option>)}
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">Suche und Filter laufen bei aktiver Eingabe gemeinsam ueber den API-Pfad.</p>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
          >
            Filter zuruecksetzen
          </button>
        </div>
      </div>
      {activeFilterSummary.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilterSummary.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={entry.clear}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
              aria-label={`${entry.label} entfernen`}
            >
              <span>{entry.label}</span>
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}

      {isReloading && (
        <p className="text-xs text-zinc-500">Dokumente werden aktualisiert...</p>
      )}
      {reloadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">{reloadError}</div>
      )}
      {actionError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{actionError}</div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-[minmax(0,2fr)_180px_120px_140px_120px_120px] gap-3 px-4 py-3 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <div>Dokument</div><div>WEG / Wohnung</div><div>Jahr</div><div>Kategorie</div><div>Status</div><div>Aktionen</div>
        </div>
        {filtered.length === 0 ? (
          <div className="px-4 py-10">
            <p className="text-sm font-medium text-zinc-800">
              {activeFilterSummary.length > 0
                ? "Keine Dokumente passen zur aktuellen Suche oder Filterkombination."
                : "Noch keine Dokumente vorhanden."}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {activeFilterSummary.length > 0
                ? "Pruefe die aktiven Filter oder setze sie gesammelt zurueck."
                : "Lege das erste Dokument direkt ueber den Upload an."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {activeFilterSummary.length > 0 ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900"
                >
                  Filter zurücksetzen
                </button>
              ) : null}
              <button
                type="button"
                onClick={openUploadForm}
                className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-500"
              >
                Neues Dokument erfassen
              </button>
            </div>
          </div>
        ) : filtered.map((doc) => {
          const detailsExpanded = expandedDocumentId === doc.id;
          const activityEntries = getDocumentActivityEntries(doc);
          const relatedDocumentStats = getRelatedDocumentStats(doc);
          const openIssues = getDocumentOpenIssues(doc);
          const actionState = getDocumentActionState(doc);

          return (
            <div key={doc.id} className="border-t border-zinc-100">
              <div className="grid grid-cols-[minmax(0,2fr)_180px_120px_140px_120px_120px] gap-3 px-4 py-4 text-sm items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-zinc-900 truncate">{doc.title}</p>
                    {doc.fileAvailable === false ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                        Datei fehlt
                      </span>
                    ) : null}
                    {actionState && actionState !== "file_missing" ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        {getActionStateLabel(actionState)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-zinc-500">{doc.fileName} · {formatBytes(doc.size)}</p>
                  <p className="text-xs text-zinc-400">{formatDocumentDate(doc.createdAt)}</p>
                  <p className="text-xs text-zinc-400">
                    {doc.uploadedBy ? `Hochgeladen von ${doc.uploadedBy}` : "Ohne Upload-Hinweis"}
                    {doc.updatedAt !== doc.createdAt ? ` · Zuletzt geändert ${formatActivityDateTime(doc.updatedAt)}` : ""}
                  </p>
                </div>
                <div className="text-xs text-zinc-600">
                  <p className="truncate">{getObjectDisplay(doc)}</p>
                  <p className="truncate text-zinc-400">{getUnitDisplay(doc)}</p>
                </div>
                <div className="text-xs text-zinc-600">{doc.reportYear ?? "Ohne Jahr"}</div>
                <div className="text-xs text-zinc-600">{doc.category}</div>
                <div>
                  <select value={doc.status} onChange={(e) => handleStatusChange(doc.id, e.target.value)} disabled={statusUpdateId === doc.id} className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 outline-none cursor-pointer disabled:cursor-wait disabled:opacity-60 ${statusColor(doc.status)}`}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(doc)}
                    disabled={downloadDocumentId === doc.id || doc.fileAvailable === false}
                    className="text-xs text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {downloadDocumentId === doc.id ? "Lädt..." : doc.fileAvailable === false ? "Datei fehlt" : "↓ Download"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditing(doc)}
                    className="text-xs text-zinc-600 hover:text-zinc-900"
                  >
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleDocumentDetails(doc.id)}
                    className="text-xs text-zinc-600 hover:text-zinc-900"
                  >
                    {detailsExpanded ? "Weniger" : "Details"}
                  </button>
                  <button type="button" onClick={() => handleDelete(doc.id)} className="text-xs text-rose-500 hover:text-rose-700">✕</button>
                </div>
              </div>

              {detailsExpanded && (
                <div className="grid gap-6 border-t border-zinc-100 bg-zinc-50/70 px-4 py-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-900">Dokumentdetails</h4>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-zinc-200 bg-white p-3">
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Zuordnung</p>
                          <p className="mt-1 text-sm text-zinc-900">{getObjectDisplay(doc)}</p>
                          <p className="text-xs text-zinc-500">{getUnitDisplay(doc)}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-white p-3">
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Ablage</p>
                          <p className="mt-1 text-sm text-zinc-900">{doc.category}</p>
                          <p className="text-xs text-zinc-500">{doc.reportYear ? `Berichtsjahr ${doc.reportYear}` : "Ohne Berichtsjahr"}</p>
                          {doc.storagePath ? (
                            <p className="mt-2 break-all text-[11px] text-zinc-400">{doc.storagePath}</p>
                          ) : null}
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-white p-3">
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Datei</p>
                          <p className="mt-1 text-sm text-zinc-900">{doc.fileName}</p>
                          <p className="text-xs text-zinc-500">{doc.mimeType} · {formatBytes(doc.size)}</p>
                          <p className={`mt-2 text-xs ${doc.fileAvailable === false ? "text-rose-600" : "text-emerald-700"}`}>
                            {doc.fileAvailable === false ? "Datei fehlt in der Ablage" : "Datei in der Ablage vorhanden"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-white p-3">
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Workflow</p>
                          <p className="mt-1 text-sm text-zinc-900">{doc.status}</p>
                          <p className="text-xs text-zinc-500">{doc.uploadedBy ? `Upload durch ${doc.uploadedBy}` : "Kein Name zum Upload hinterlegt"}</p>
                        </div>
                      </div>
                      {openIssues.length > 0 ? (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-amber-700">Offene Punkte</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {openIssues.map((issue) => (
                              <span key={`${doc.id}-${issue}`} className="rounded-full bg-white px-3 py-1 text-xs text-amber-800">
                                {issue}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                          Kein offener Dokumentfall für diesen Eintrag.
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-zinc-900">Arbeitskontext</h4>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {relatedDocumentStats.map((entry) => (
                          <div key={`${doc.id}-${entry.label}`} className="rounded-xl border border-zinc-200 bg-white p-3">
                            <p className="text-[11px] uppercase tracking-wide text-zinc-500">{entry.label}</p>
                            <p className="mt-1 text-xl font-semibold text-zinc-900">{entry.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {doc.objectId && (
                          <button
                            type="button"
                            onClick={() => applyDocumentContextFilter(doc, "object")}
                            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
                          >
                            Objekt filtern
                          </button>
                        )}
                        {doc.objectId && doc.rentUnitId && (
                          <button
                            type="button"
                            onClick={() => applyDocumentContextFilter(doc, "unit")}
                            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
                          >
                            Einheit filtern
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => applyDocumentContextFilter(doc, "category")}
                          className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
                        >
                          Kategorie filtern
                        </button>
                        {actionState && (
                          <button
                            type="button"
                            onClick={() => applyDocumentContextFilter(doc, "action")}
                            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
                          >
                            Offenen Fall filtern
                          </button>
                        )}
                        {doc.reportYear && (
                          <button
                            type="button"
                            onClick={() => applyDocumentContextFilter(doc, "year")}
                            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
                          >
                            Jahr filtern
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900">Aktivität</h4>
                    <div className="mt-3 space-y-3">
                      {activityEntries.map((entry) => (
                        <div key={`${doc.id}-${entry.label}-${entry.timestamp}`} className="rounded-xl border border-zinc-200 bg-white p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-zinc-900">{entry.label}</p>
                            <p className="text-xs text-zinc-500">{formatActivityDateTime(entry.timestamp)}</p>
                          </div>
                          <p className="mt-1 text-xs text-zinc-600">{entry.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-zinc-400 text-right">{filtered.length} von {documents.length} Dokumenten</p>
    </section>
  );
}
