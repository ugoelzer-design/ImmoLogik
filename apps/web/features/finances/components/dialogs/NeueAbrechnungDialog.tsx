"use client";

import { useMemo, useState } from "react";
import { newUtilityStatementSchema } from "@/lib/validation/schemas";
import { formatDateForDisplay } from "../../utils/nebenkosten-format";
import type {
  BeispielObjekt,
  VorbereiteteAbrechnung,
} from "@/types/nebenkosten";

function getObjektPrimartext(item: BeispielObjekt | null) {
  if (!item) {
    return "";
  }

  const name = String(item.name ?? "").trim();
  const adresse = String(item.adresse ?? "").trim();

  return name || adresse || String(item.displayId ?? "").trim();
}

function getObjektSekundaertext(item: BeispielObjekt | null) {
  if (!item) {
    return "";
  }

  const primartext = getObjektPrimartext(item);
  const adresse = String(item.adresse ?? "").trim();

  if (adresse === "" || adresse === primartext) {
    return "";
  }

  return adresse;
}

function ObjektRow({
  item,
  active,
  onClick,
}: {
  item: BeispielObjekt;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-2xl border p-4 text-left transition",
        active
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50",
      ].join(" ")}
    >
      <h4 className="text-base font-semibold">{getObjektPrimartext(item)}</h4>
      {getObjektSekundaertext(item) ? (
        <p className={["mt-1 text-sm", active ? "text-zinc-200" : "text-zinc-600"].join(" ")}>
          {getObjektSekundaertext(item)}
        </p>
      ) : null}
    </button>
  );
}

export function NeueAbrechnungDialog({
  open,
  objekte,
  onClose,
  onCreate,
}: {
  open: boolean;
  objekte: BeispielObjekt[];
  onClose: () => void;
  onCreate: (payload: VorbereiteteAbrechnung) => void;
}) {
  const [selectedObjektDisplayId, setSelectedObjektDisplayId] = useState("");
  const [zeitraumVon, setZeitraumVon] = useState("");
  const [zeitraumBis, setZeitraumBis] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedObjekt = useMemo(() => {
    return objekte.find((item) => item.displayId === selectedObjektDisplayId) ?? null;
  }, [objekte, selectedObjektDisplayId]);

  const canCreate =
    selectedObjekt !== null &&
    zeitraumVon.trim() !== "" &&
    zeitraumBis.trim() !== "";

  function handleClose() {
    setSelectedObjektDisplayId("");
    setZeitraumVon("");
    setZeitraumBis("");
    setError(null);
    onClose();
  }

  function handleCreate() {
    const validation = newUtilityStatementSchema.safeParse({
      objectDisplayId: selectedObjektDisplayId,
      zeitraumVon,
      zeitraumBis,
    });

    if (!validation.success) {
      setError(
        validation.error.issues[0]?.message ??
          "Bitte alle Felder korrekt ausfüllen.",
      );
      return;
    }

    if (!selectedObjekt) return;

    onCreate({
      objektDisplayId: selectedObjekt.displayId,
      objektName: selectedObjekt.name,
      zeitraumVon: validation.data.zeitraumVon,
      zeitraumBis: validation.data.zeitraumBis,
    });

    setSelectedObjektDisplayId("");
    setZeitraumVon("");
    setZeitraumBis("");
    setError(null);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-6">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
              Neue Abrechnung erstellen
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-zinc-900">
              Nebenkostenabrechnung
            </h3>
            <p className="mt-2 text-sm text-zinc-600">
              Neue Abrechnungen starten immer mit dem Status In Arbeit.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800"
          >
            Schließen
          </button>
        </div>

        <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
          <div className="space-y-6">
            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <section className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Schritt 1
                  </p>
                  <h4 className="mt-2 text-lg font-semibold text-zinc-900">
                    Objekt wählen
                  </h4>
                </div>

                {selectedObjekt ? (
                  <button
                    type="button"
                    onClick={() => setSelectedObjektDisplayId("")}
                    className="text-sm font-medium text-zinc-600 underline underline-offset-4"
                  >
                    Ändern
                  </button>
                ) : null}
              </div>

              {selectedObjekt ? (
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <h5 className="text-base font-semibold text-zinc-900">
                    {getObjektPrimartext(selectedObjekt)}
                  </h5>
                  {getObjektSekundaertext(selectedObjekt) ? (
                    <p className="mt-1 text-sm text-zinc-600">
                      {getObjektSekundaertext(selectedObjekt)}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {objekte.map((item) => (
                    <ObjektRow
                      key={item.displayId}
                      item={item}
                      active={item.displayId === selectedObjektDisplayId}
                      onClick={() => setSelectedObjektDisplayId(item.displayId)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Schritt 2
              </p>
              <h4 className="mt-2 text-lg font-semibold text-zinc-900">
                Zeitraum wählen
              </h4>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Von
                  </span>
                  <input
                    type="date"
                    value={zeitraumVon}
                    onChange={(event) => setZeitraumVon(event.target.value)}
                    disabled={!selectedObjekt}
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition disabled:bg-zinc-100"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Bis
                  </span>
                  <input
                    type="date"
                    value={zeitraumBis}
                    onChange={(event) => setZeitraumBis(event.target.value)}
                    disabled={!selectedObjekt}
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition disabled:bg-zinc-100"
                  />
                </label>
              </div>

              {!selectedObjekt ? (
                <p className="mt-3 text-sm text-zinc-500">Zuerst ein Objekt auswählen.</p>
              ) : null}
            </section>
          </div>

          <aside className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
              Zusammenfassung
            </p>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-sm text-zinc-500">Objekt</p>
                <p className="mt-2 text-sm font-medium text-zinc-900">
                  {selectedObjekt ? getObjektPrimartext(selectedObjekt) : "Noch nicht gewählt"}
                </p>
                {selectedObjekt && getObjektSekundaertext(selectedObjekt) ? (
                  <p className="mt-1 text-sm text-zinc-500">
                    {getObjektSekundaertext(selectedObjekt)}
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-sm text-zinc-500">Zeitraum</p>
                <p className="mt-2 text-sm font-medium text-zinc-900">
                  {zeitraumVon && zeitraumBis
                    ? `${formatDateForDisplay(zeitraumVon)} bis ${formatDateForDisplay(
                        zeitraumBis,
                      )}`
                    : "Noch nicht vollständig"}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-sm text-zinc-500">Startstatus</p>
                <p className="mt-2 text-sm font-medium text-zinc-900">In Arbeit</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCreate}
                disabled={!canCreate}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-teal-600 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Abrechnung erstellen
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800"
              >
                Abbrechen
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
