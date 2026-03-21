"use client";

import { useEffect, useState, useCallback } from "react";
import type { ImmoDocument } from "@/types/document";
import { uploadDocument, deleteDocument, updateDocumentStatus } from "@/features/documents/services/documents.service";

const CATEGORIES = ["Sonstiges", "Mietvertrag", "Nebenkostenabrechnung", "Protokoll", "Rechnung", "Foto", "Versicherung", "Ausweis", "Sonstige Korrespondenz"];
const STATUSES = ["Vorhanden", "In Prüfung", "Fehlt"];

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

type Props = { initialDocuments: ImmoDocument[]; objects: { id: string; displayId: string; name: string }[] };

export function DocumentsModule({ initialDocuments, objects }: Props) {
  const [documents, setDocuments] = useState<ImmoDocument[]>(initialDocuments);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALLE");
  const [statusFilter, setStatusFilter] = useState("ALLE");
  const [objectFilter, setObjectFilter] = useState("ALLE");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: "", category: "Sonstiges", objectId: "", file: null as File | null });
  const [error, setError] = useState<string | null>(null);

  const filtered = documents.filter((d) => {
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.fileName.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "ALLE" || d.category === catFilter;
    const matchStatus = statusFilter === "ALLE" || d.status === statusFilter;
    const matchObj = objectFilter === "ALLE" || d.objectId === objectFilter;
    return matchSearch && matchCat && matchStatus && matchObj;
  });

  const totalSize = documents.reduce((s, d) => s + d.size, 0);
  const countPruefung = documents.filter((d) => d.status === "In Prüfung").length;
  const countFehlt = documents.filter((d) => d.status === "Fehlt").length;

  async function handleUpload() {
    if (!uploadForm.file) { setError("Bitte eine Datei auswählen."); return; }
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", uploadForm.file);
    fd.append("title", uploadForm.title || uploadForm.file.name);
    fd.append("category", uploadForm.category);
    if (uploadForm.objectId) {
      fd.append("objectId", uploadForm.objectId);
      const obj = objects.find((o) => o.id === uploadForm.objectId);
      if (obj) fd.append("objectName", `${obj.displayId} · ${obj.name}`);
    }
    const doc = await uploadDocument(fd);
    if (doc) {
      setDocuments((prev) => [doc, ...prev]);
      setShowUpload(false);
      setUploadForm({ title: "", category: "Sonstiges", objectId: "", file: null });
    } else {
      setError("Upload fehlgeschlagen.");
    }
    setUploading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Dokument wirklich löschen?")) return;
    const ok = await deleteDocument(id);
    if (ok) setDocuments((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleStatusChange(id: string, status: string) {
    const ok = await updateDocumentStatus(id, status);
    if (ok) setDocuments((prev) => prev.map((d) => d.id === id ? { ...d, status } : d));
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dokumente</h1>
          <p className="mt-1 text-sm text-zinc-600">Zentrale Dokumentenablage je WEG, Mieter und Vertrag.</p>
        </div>
        <button type="button" onClick={() => setShowUpload((v) => !v)} className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500 transition">
          {showUpload ? "Abbrechen" : "+ Dokument hochladen"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Gesamt", value: documents.length },
          { label: "Gesamtgröße", value: formatBytes(totalSize) },
          { label: "In Prüfung", value: countPruefung },
          { label: "Fehlt", value: countFehlt },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-500">{s.label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-zinc-900">Neues Dokument hochladen</h3>
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}
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
              <label className="block text-xs font-medium text-zinc-500 mb-1">WEG / Objekt</label>
              <select value={uploadForm.objectId} onChange={(e) => setUploadForm((f) => ({ ...f, objectId: e.target.value }))} className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400">
                <option value="">Kein Objekt (Allgemein)</option>
                {objects.map((o) => <option key={o.id} value={o.id}>{o.displayId} · {o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Datei</label>
              <input type="file" onChange={(e) => setUploadForm((f) => ({ ...f, file: e.target.files?.[0] || null }))} className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400" />
            </div>
          </div>
          <button type="button" onClick={handleUpload} disabled={uploading} className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition disabled:opacity-50">
            {uploading ? "Wird hochgeladen..." : "Hochladen"}
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="grid gap-4 sm:grid-cols-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Suche..." className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400" />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400">
          <option value="ALLE">Alle Kategorien</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400">
          <option value="ALLE">Alle Status</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={objectFilter} onChange={(e) => setObjectFilter(e.target.value)} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400">
          <option value="ALLE">Alle Objekte</option>
          {objects.map((o) => <option key={o.id} value={o.id}>{o.displayId} · {o.name}</option>)}
        </select>
      </div>

      {/* Document List */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-[minmax(0,2fr)_160px_140px_120px_120px] gap-3 px-4 py-3 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <div>Dokument</div><div>WEG / Objekt</div><div>Kategorie</div><div>Status</div><div>Aktionen</div>
        </div>
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-sm text-zinc-500">Keine Dokumente gefunden.</p>
        ) : filtered.map((doc) => (
          <div key={doc.id} className="grid grid-cols-[minmax(0,2fr)_160px_140px_120px_120px] gap-3 px-4 py-4 border-t border-zinc-100 text-sm items-center">
            <div>
              <p className="font-medium text-zinc-900 truncate">{doc.title}</p>
              <p className="text-xs text-zinc-500">{doc.fileName} · {formatBytes(doc.size)}</p>
              <p className="text-xs text-zinc-400">{doc.createdAt}</p>
            </div>
            <div className="text-xs text-zinc-600 truncate">{doc.objectName}</div>
            <div className="text-xs text-zinc-600">{doc.category}</div>
            <div>
              <select value={doc.status} onChange={(e) => handleStatusChange(doc.id, e.target.value)} className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 outline-none cursor-pointer ${statusColor(doc.status)}`}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              {doc.downloadUrl && (
                <a href={doc.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800">↓ Download</a>
              )}
              <button type="button" onClick={() => handleDelete(doc.id)} className="text-xs text-rose-500 hover:text-rose-700">✕</button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-400 text-right">{filtered.length} von {documents.length} Dokumenten</p>
    </section>
  );
}