import type { ImmoObject } from "@/types/object";

type ObjectDetailProps = {
  object: ImmoObject | undefined;
};

export function ObjectDetail({ object }: ObjectDetailProps) {
  if (!object) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-zinc-500">Kein Objekt ausgewählt.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">{object.name}</h2>
          <p className="mt-1 text-sm text-zinc-500">{object.address}</p>
        </div>

        <span className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">
          {object.status}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Typ</p>
          <p className="mt-2 text-sm font-medium text-zinc-900">
            {object.type}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Einheiten
          </p>
          <p className="mt-2 text-sm font-medium text-zinc-900">
            {object.units}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Auslastung
          </p>
          <p className="mt-2 text-sm font-medium text-zinc-900">
            {object.occupancy}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Monatliche Sollmiete
          </p>
          <p className="mt-2 text-sm font-medium text-zinc-900">
            {object.monthlyTargetRent}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Notiz</p>
        <p className="mt-2 text-sm leading-6 text-zinc-700">{object.note}</p>
      </div>
    </section>
  );
}