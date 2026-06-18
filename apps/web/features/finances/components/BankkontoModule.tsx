"use client";

import { useMemo, useState } from "react";

type BankTransaction = {
  id: string;
  date: string;
  account: string;
  payee: string;
  purpose: string;
  amount: number;
  status: "Zugeordnet" | "Offen" | "Prüfen";
  objectLabel: string;
};

const transactions: BankTransaction[] = [
  {
    id: "bank-1",
    date: "2026-06-05",
    account: "WEG Rücklagenkonto",
    payee: "Anna Becker",
    purpose: "Miete Juni WE 01",
    amount: 1200,
    status: "Zugeordnet",
    objectLabel: "WEG-001",
  },
  {
    id: "bank-2",
    date: "2026-06-07",
    account: "WEG Girokonto",
    payee: "Stadtwerke",
    purpose: "Allgemeinstrom Mai",
    amount: -184.42,
    status: "Prüfen",
    objectLabel: "WEG-001",
  },
  {
    id: "bank-3",
    date: "2026-06-10",
    account: "WEG Girokonto",
    payee: "Unbekannt",
    purpose: "Überweisung",
    amount: 475,
    status: "Offen",
    objectLabel: "WEG-002",
  },
];

const statusOptions = ["Alle", "Zugeordnet", "Offen", "Prüfen"] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE").format(new Date(value));
}

function statusClass(status: BankTransaction["status"]) {
  if (status === "Zugeordnet") return "bg-emerald-100 text-emerald-700";
  if (status === "Prüfen") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

export function BankkontoModule() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("Alle");

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          transaction.account,
          transaction.payee,
          transaction.purpose,
          transaction.objectLabel,
          transaction.date,
        ].some((value) => value.toLowerCase().includes(normalizedQuery));
      const matchesStatus = statusFilter === "Alle" || transaction.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter]);

  const income = transactions
    .filter((transaction) => transaction.amount > 0)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenses = transactions
    .filter((transaction) => transaction.amount < 0)
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  const openCount = transactions.filter((transaction) => transaction.status !== "Zugeordnet").length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Eingänge" value={formatCurrency(income)} tone="emerald" />
        <MetricCard label="Ausgänge" value={formatCurrency(expenses)} tone="rose" />
        <MetricCard label="Saldo" value={formatCurrency(income - expenses)} />
        <MetricCard label="Offen" value={String(openCount)} tone="amber" />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
          <label className="sr-only" htmlFor="bank-search">Kontobewegungen suchen</label>
          <input
            id="bank-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Suche nach Empfänger, Zweck, Objekt oder Konto"
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-zinc-400"
          />
          <label className="sr-only" htmlFor="bank-status">Zuordnungsstatus filtern</label>
          <select
            id="bank-status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as (typeof statusOptions)[number])}
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-zinc-400"
          >
            {statusOptions.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[120px_1fr_1fr_120px_120px] gap-3 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 md:grid">
          <div>Datum</div>
          <div>Gegenpartei</div>
          <div>Zweck</div>
          <div>Betrag</div>
          <div>Status</div>
        </div>
        {filteredTransactions.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-500">Keine Kontobewegungen passen zur Suche.</p>
        ) : (
          filteredTransactions.map((transaction) => (
            <div key={transaction.id} className="border-t border-zinc-100 px-4 py-4 text-sm first:border-t-0">
              <div className="grid gap-2 md:grid-cols-[120px_1fr_1fr_120px_120px] md:items-center">
                <div className="text-zinc-500">{formatDate(transaction.date)}</div>
                <div>
                  <p className="font-medium text-zinc-900">{transaction.payee}</p>
                  <p className="mt-1 text-xs text-zinc-500">{transaction.account} · {transaction.objectLabel}</p>
                </div>
                <div className="text-zinc-700">{transaction.purpose}</div>
                <div className={transaction.amount < 0 ? "text-rose-700" : "text-emerald-700"}>
                  {formatCurrency(transaction.amount)}
                </div>
                <div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(transaction.status)}`}>
                    {transaction.status}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "zinc",
}: {
  label: string;
  value: string;
  tone?: "zinc" | "amber" | "emerald" | "rose";
}) {
  const valueClass =
    tone === "amber"
      ? "text-amber-700"
      : tone === "emerald"
        ? "text-emerald-700"
        : tone === "rose"
          ? "text-rose-700"
          : "text-zinc-900";

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}
