"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { RentUnit } from "@/features/finances/services/rent-units.service";
import { createTenant, deleteTenant, updateTenant } from "@/features/tenants/services/tenants.service";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ImmoDocument } from "@/types/document";
import type { ImmoObject } from "@/types/object";
import type { Tenant, TenantInput, TenantStatus } from "@/types/tenant";

type TenantsModuleProps = {
  tenants: Tenant[];
  objects: ImmoObject[];
  rentUnits: RentUnit[];
  documents: ImmoDocument[];
};

type TenantFormState = TenantInput;

const STATUSES: TenantStatus[] = ["Aktiv", "Ausstehend", "Beendet"];

const emptyForm: TenantFormState = {
  objectId: "",
  rentUnitId: "",
  fullName: "",
  email: "",
  phone: "",
  status: "Aktiv",
};

function getTenantVariant(status: string) {
  switch (status) {
    case "Aktiv":
      return "success";
    case "Ausstehend":
      return "warning";
    case "Beendet":
      return "danger";
    default:
      return "muted";
  }
}

function toTenantPayload(form: TenantFormState): TenantInput {
  return {
    objectId: form.objectId,
    rentUnitId: form.rentUnitId,
    fullName: form.fullName,
    email: form.email,
    phone: form.phone,
    status: form.status,
  };
}

function buildTenantDocumentsHref(tenant: Tenant) {
  const searchParams = new URLSearchParams({
    objectId: tenant.objectId,
    rentUnitId: tenant.rentUnitId,
  });

  return `/dokumente?${searchParams.toString()}`;
}

export function TenantsModule({ tenants: initialTenants, objects, rentUnits, documents }: TenantsModuleProps) {
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TenantFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const stats = useMemo(
    () => ({
      total: tenants.length,
      active: tenants.filter((item) => item.status === "Aktiv").length,
      pending: tenants.filter((item) => item.status === "Ausstehend").length,
    }),
    [tenants],
  );

  function getTenantDocuments(tenant: Tenant) {
    return documents.filter((document) =>
      document.objectId === tenant.objectId &&
      document.rentUnitId === tenant.rentUnitId,
    );
  }

  function getTenantOpenDocumentCount(tenant: Tenant) {
    return getTenantDocuments(tenant).filter((document) =>
      (document.openIssues?.length ?? 0) > 0 || document.actionState,
    ).length;
  }

  const availableUnits = useMemo(
    () =>
      rentUnits
        .filter((unit) => unit.objectId === form.objectId)
        .sort((a, b) => a.unitLabel.localeCompare(b.unitLabel)),
    [form.objectId, rentUnits],
  );

  const selectedObject = useMemo(
    () => objects.find((object) => object.id === form.objectId) ?? null,
    [form.objectId, objects],
  );

  const selectedUnit = useMemo(
    () => availableUnits.find((unit) => unit.id === form.rentUnitId) ?? null,
    [availableUnits, form.rentUnitId],
  );

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function startEdit(tenant: Tenant) {
    setEditingId(tenant.id);
    setForm({
      objectId: tenant.objectId,
      rentUnitId: tenant.rentUnitId,
      fullName: tenant.fullName,
      email: tenant.email,
      phone: tenant.phone,
      status: tenant.status,
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

  function isFormValid() {
    return Object.values(toTenantPayload(form)).every((value) => String(value).trim().length > 0);
  }

  function handleObjectChange(objectId: string) {
    setForm((current) => ({
      ...current,
      objectId,
      rentUnitId: "",
    }));
  }

  async function handleSubmit() {
    if (!isFormValid()) {
      setError("Bitte alle Felder ausfüllen.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const payload = toTenantPayload(form);

      if (editingId) {
        const updated = await updateTenant(editingId, payload);
        setTenants((current) => current.map((tenant) => (tenant.id === editingId ? updated : tenant)));
      } else {
        const created = await createTenant(payload);
        setTenants((current) => [created, ...current]);
      }

      resetForm();
    } catch {
      setError("Mieter konnte nicht gespeichert werden.");
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Mieter wirklich löschen?")) {
      return;
    }

    try {
      setError(null);
      await deleteTenant(id);
      setTenants((current) => current.filter((tenant) => tenant.id !== id));
      if (editingId === id) {
        resetForm();
      }
    } catch {
      setError("Mieter konnte nicht gelöscht werden.");
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mieter</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Übersicht aller Mieter, Kontakte und Statusinformationen.
          </p>
        </div>
        <button
          type="button"
          onClick={() => (showForm ? resetForm() : startCreate())}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          {showForm ? "Abbrechen" : "+ Mieter anlegen"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Gesamt" value={stats.total} />
        <StatCard label="Aktiv" value={stats.active} />
        <StatCard label="Ausstehend" value={stats.pending} />
      </div>

      {showForm ? (
        <SectionCard
          title={editingId ? "Mieter bearbeiten" : "Mieter anlegen"}
          description="Stammdaten, Kontakt und Status zentral pflegen."
        >
          <div className="space-y-4">
            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                placeholder="Vollständiger Name"
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
                value={form.rentUnitId}
                onChange={(event) => setForm((current) => ({ ...current, rentUnitId: event.target.value }))}
                disabled={!form.objectId}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:bg-zinc-100"
              >
                <option value="">{form.objectId ? "Einheit auswählen" : "Erst Objekt wählen"}</option>
                {availableUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unitLabel}
                  </option>
                ))}
              </select>
              <input
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="E-Mail"
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
              <input
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="Telefon"
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
              <input
                value={
                  selectedObject && selectedUnit
                    ? `${selectedObject.displayId} · ${selectedUnit.unitLabel}`
                    : ""
                }
                readOnly
                placeholder="Objekt-ID und Einheit zur Kontrolle"
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 outline-none"
              />
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value as TenantStatus }))
                }
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {form.objectId && availableUnits.length === 0 ? (
              <p className="text-xs text-amber-700">
                Für dieses Objekt sind noch keine Mieteinheiten vorhanden. Lege sie zuerst im Finanzbereich an.
              </p>
            ) : null}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
              >
                {saving ? "Speichert..." : editingId ? "Änderungen speichern" : "Mieter speichern"}
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
        title="Mieterliste"
        description="Kontakte, Einheiten und Status in einer ersten Verwaltungsansicht."
      >
        <div className="space-y-3">
          {tenants.length === 0 ? (
            <p className="text-sm text-zinc-500">Noch keine Mieter vorhanden.</p>
          ) : null}

          {tenants.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">{item.fullName}</h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    {item.objectDisplayId} · {item.objectName} · {item.unit}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {item.email} · {item.phone}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {getTenantDocuments(item).length} Dokumente · {getTenantOpenDocumentCount(item)} offene Dokumentfälle
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={buildTenantDocumentsHref(item)}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-white"
                  >
                    Dokumente
                  </Link>
                  <StatusBadge
                    label={item.status}
                    variant={getTenantVariant(item.status)}
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
