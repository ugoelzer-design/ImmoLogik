"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createContract, deleteContract, updateContract } from "@/features/contracts/services/contracts.service";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { contractSchema } from "@/lib/validation/schemas";
import type { Contract, ContractInput, ContractStatus } from "@/types/contract";
import type { ImmoDocument } from "@/types/document";
import type { ImmoObject } from "@/types/object";
import type { Tenant } from "@/types/tenant";

type ContractsModuleProps = {
  contracts: Contract[];
  objects: ImmoObject[];
  tenants: Tenant[];
  documents: ImmoDocument[];
};

type ContractFormState = ContractInput;

const STATUSES: ContractStatus[] = ["Aktiv", "In Prüfung", "Läuft aus"];

const emptyForm: ContractFormState = {
  objectId: "",
  tenantId: "",
  rentUnitId: null,
  title: "",
  startDate: "",
  endDate: "",
  status: "Aktiv",
};

function getContractVariant(status: string) {
  switch (status) {
    case "Aktiv":
      return "success";
    case "In Prüfung":
      return "warning";
    case "Läuft aus":
      return "danger";
    default:
      return "muted";
  }
}

function buildContractDocumentsHref(contract: Contract) {
  const searchParams = new URLSearchParams({
    objectId: contract.objectId,
    category: "Mietvertrag",
  });

  if (contract.rentUnitId) {
    searchParams.set("rentUnitId", contract.rentUnitId);
  }

  return `/dokumente?${searchParams.toString()}`;
}

export function ContractsModule({ contracts: initialContracts, objects, tenants, documents }: ContractsModuleProps) {
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContractFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const stats = useMemo(
    () => ({
      total: contracts.length,
      active: contracts.filter((item) => item.status === "Aktiv").length,
      critical: contracts.filter((item) => item.status === "Läuft aus" || item.status === "In Prüfung").length,
    }),
    [contracts],
  );

  const availableTenants = useMemo(
    () =>
      tenants
        .filter((tenant) => tenant.objectId === form.objectId)
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [form.objectId, tenants],
  );

  const selectedTenant = useMemo(
    () => availableTenants.find((tenant) => tenant.id === form.tenantId) ?? null,
    [availableTenants, form.tenantId],
  );

  function getContractDocuments(contract: Contract) {
    return documents.filter((document) =>
      document.category === "Mietvertrag" &&
      document.objectId === contract.objectId &&
      (!contract.rentUnitId || document.rentUnitId === contract.rentUnitId),
    );
  }

  function getContractOpenDocumentCount(contract: Contract) {
    return getContractDocuments(contract).filter((document) =>
      (document.openIssues?.length ?? 0) > 0 || document.actionState,
    ).length;
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function startEdit(contract: Contract) {
    setEditingId(contract.id);
    setForm({
      objectId: contract.objectId,
      tenantId: contract.tenantId,
      rentUnitId: contract.rentUnitId,
      title: contract.title,
      startDate: contract.startDate,
      endDate: contract.endDate,
      status: contract.status,
    });
    setError(null);
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(false);
    setSaving(false);
  }

  function handleObjectChange(objectId: string) {
    setForm((current) => ({
      ...current,
      objectId,
      tenantId: "",
      rentUnitId: null,
    }));
  }

  async function handleSubmit() {
    const validation = contractSchema.safeParse(form);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Bitte alle Felder korrekt ausfüllen.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const payload = validation.data;

      if (editingId) {
        const updated = await updateContract(editingId, payload);
        setContracts((current) => current.map((contract) => (contract.id === editingId ? updated : contract)));
      } else {
        const created = await createContract(payload);
        setContracts((current) => [created, ...current]);
      }

      resetForm();
    } catch {
      setError("Vertrag konnte nicht gespeichert werden.");
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Vertrag wirklich löschen?")) {
      return;
    }

    try {
      setError(null);
      await deleteContract(id);
      setContracts((current) => current.filter((contract) => contract.id !== id));
      if (editingId === id) {
        resetForm();
      }
    } catch {
      setError("Vertrag konnte nicht gelöscht werden.");
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Verträge</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Vertragsübersicht mit Laufzeiten, Status und Zuordnung.
          </p>
        </div>
        <button
          type="button"
          onClick={() => (showForm ? resetForm() : startCreate())}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          {showForm ? "Abbrechen" : "+ Vertrag anlegen"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Gesamt" value={stats.total} />
        <StatCard label="Aktiv" value={stats.active} />
        <StatCard label="Kritisch" value={stats.critical} />
      </div>

      {showForm ? (
        <SectionCard
          title={editingId ? "Vertrag bearbeiten" : "Vertrag anlegen"}
          description="Laufzeiten, Objektbezug und Status zentral pflegen."
        >
          <div className="space-y-4">
            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Vertragstitel"
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
              <select
                value={form.objectId}
                onChange={(event) => handleObjectChange(event.target.value)}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              >
                <option value="">Objekt auswählen</option>
                {objects.map((object) => (
                  <option key={object.id} value={object.id}>
                    {object.displayId} · {object.name}
                  </option>
                ))}
              </select>
              <select
                value={form.tenantId}
                onChange={(event) => {
                  const selectedTenant = availableTenants.find((tenant) => tenant.id === event.target.value);
                  setForm((current) => ({
                    ...current,
                    tenantId: event.target.value,
                    rentUnitId: selectedTenant?.rentUnitId ?? null,
                  }));
                }}
                disabled={!form.objectId}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:bg-zinc-100"
              >
                <option value="">{form.objectId ? "Mieter auswählen" : "Erst Objekt wählen"}</option>
                {availableTenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.fullName} · {tenant.unit}
                  </option>
                ))}
              </select>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value as ContractStatus }))
                }
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <input
                value={selectedTenant ? `${selectedTenant.objectDisplayId} · ${selectedTenant.unit}` : ""}
                readOnly
                placeholder="Einheit wird aus dem Mieter übernommen"
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 outline-none"
              />
              <input
                value={form.startDate}
                onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                placeholder="Startdatum"
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
              <input
                value={form.endDate}
                onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
                placeholder="Enddatum"
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
            </div>

            {form.objectId && availableTenants.length === 0 ? (
              <p className="text-xs text-amber-700">
                Für dieses Objekt sind noch keine Mieter vorhanden. Lege zuerst einen Mieter an oder wähle ein anderes Objekt.
              </p>
            ) : null}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
              >
                {saving ? "Speichert..." : editingId ? "Änderungen speichern" : "Vertrag speichern"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {error && !showForm ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <SectionCard
        title="Vertragsliste"
        description="Laufzeiten, Mieterbezug und Status in einer ersten Arbeitsansicht."
      >
        <div className="space-y-3">
          {contracts.length === 0 ? (
            <p className="text-sm text-zinc-500">Noch keine Verträge vorhanden.</p>
          ) : null}

          {contracts.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    {item.objectDisplayId} · {item.objectName} · {item.unit}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {item.tenantName}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {item.startDate} bis {item.endDate}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {getContractDocuments(item).length} Mietvertragsdokumente · {getContractOpenDocumentCount(item)} offene Dokumentfälle
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={buildContractDocumentsHref(item)}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-white"
                  >
                    Dokumente
                  </Link>
                  <StatusBadge
                    label={item.status}
                    variant={getContractVariant(item.status)}
                  />
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-white"
                  >
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </section>
  );
}
