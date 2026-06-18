import { PortalView } from "@/features/mieter-portal/components/portal-view";
import { getPortalData } from "@/features/mieter-portal/services/mieter-portal.service";

type PortalPageProps = {
  params: Promise<{ token: string }>;
};

export default async function PortalPage({ params }: PortalPageProps) {
  const { token } = await params;

  try {
    const data = await getPortalData(token);
    return <PortalView data={data} token={token} />;
  } catch {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <p className="text-2xl">🔒</p>
          <h1 className="mt-3 text-lg font-semibold text-zinc-900">
            Zugang nicht verfügbar
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Dieser Portal-Link ist ungültig oder abgelaufen. Bitte wenden Sie
            sich an Ihre Hausverwaltung.
          </p>
        </div>
      </main>
    );
  }
}
