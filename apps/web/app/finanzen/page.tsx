"use client";

import { useMemo, useState } from "react";
import { NebenkostenAbrechnungen } from "../../features/finances/components/NebenkostenAbrechnungen";
import { NebenkostenOverview } from "../../features/finances/components/NebenkostenOverview";
import { MietuebersichtModule } from "../../features/finances/components/MietuebersichtModule";
import { financeSections, nebenkostenTabs } from "../../features/finances/data/nebenkosten";
import type { FinanceSectionId, NebenkostenTabId } from "../../features/finances/types/nebenkosten";

function FinanceNavButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={["w-full rounded-xl border px-4 py-3 text-left text-sm transition", active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"].join(" ")}>
      <span className="font-medium">{label}</span>
    </button>
  );
}

function SubNavButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={["rounded-xl border px-4 py-2.5 text-sm transition", active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"].join(" ")}>
      {label}
    </button>
  );
}

function PlaceholderCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{title}</p>
      <p className="mt-3 text-sm leading-6 text-zinc-700">{text}</p>
    </div>
  );
}

export default function FinanzenPage() {
  const [activeSection, setActiveSection] = useState<FinanceSectionId>("nebenkosten");
  const [activeNebenkostenTab, setActiveNebenkostenTab] = useState<NebenkostenTabId>("abrechnungen");

  const currentSection = useMemo(() => financeSections.find((s) => s.id === activeSection), [activeSection]);

  return (
    <section id="finanzen-start" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Finanzen</h1>
        <p className="mt-1 text-sm text-zinc-600">Kaufmännischer Überblick und Bereichseinstieg je WEG.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Bereiche</p>
          <div className="mt-4 space-y-2">
            {financeSections.map((section) => (
              <FinanceNavButton key={section.id} label={section.label} active={section.id === activeSection} onClick={() => setActiveSection(section.id)} />
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">Finanzbereich</p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-900">{currentSection?.label}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">{currentSection?.description}</p>
          </section>

          {activeSection === "mietuebersicht" ? <MietuebersichtModule /> : null}

          {activeSection === "nebenkosten" ? (
            <div className="space-y-6">
              <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Nebenkosten</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {nebenkostenTabs.map((tab) => (
                    <SubNavButton key={tab.id} label={tab.label} active={tab.id === activeNebenkostenTab} onClick={() => setActiveNebenkostenTab(tab.id)} />
                  ))}
                  <a href="/dashboard" className="inline-flex h-[42px] items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50 sm:ml-auto">← Zum Dashboard</a>
                </div>
              </section>
              {activeNebenkostenTab === "uebersicht" ? <NebenkostenOverview /> : null}
              {activeNebenkostenTab === "abrechnungen" ? <NebenkostenAbrechnungen /> : null}
            </div>
          ) : null}

          {activeSection === "bankkonto" ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <PlaceholderCard title="Status" text="Bereich vorbereitet. Kontologik, Bewegungen und Zuordnung werden später ergänzt." />
              <PlaceholderCard title="Später" text="Hier kann später die Übersicht zu Konten, Buchungszeilen und Zuordnungsstatus je WEG entstehen." />
              <PlaceholderCard title="Hinweis" text="In diesem Schritt bleibt Bankkonto bewusst nur ein sauberer Platzhalter innerhalb der Finanzstruktur." />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}