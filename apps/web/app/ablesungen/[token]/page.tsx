import { TenantReadingForm } from "@/features/meter-readings/components/tenant-reading-form";
import { getMeterAccess } from "@/features/meter-readings/services/meter-readings.service";

type AblesungTokenPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function AblesungTokenPage({ params }: AblesungTokenPageProps) {
  const { token } = await params;

  try {
    const access = await getMeterAccess(token);
    return <TenantReadingForm initialAccess={access} />;
  } catch {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900">
        <div className="mx-auto max-w-2xl rounded-[28px] border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Zugang nicht verfügbar</h1>
          <p className="mt-3 text-sm text-zinc-600">
            Dieser Ableselink ist ungültig oder bereits abgelaufen.
          </p>
        </div>
      </main>
    );
  }
}
