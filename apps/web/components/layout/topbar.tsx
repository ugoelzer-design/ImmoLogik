export function Topbar() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-medium text-zinc-900">
            ImmoLogik Verwaltungsoberfläche
          </p>
          <p className="text-xs text-zinc-500">
            Dashboard, Objekte, Dokumente, Mieter und Verträge
          </p>
        </div>

        <div className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-700">
          Udo Gölzer
        </div>
      </div>
    </header>
  );
}