import { AdminShell } from "@/components/layout/admin-shell";
import { ContractsModule } from "@/features/contracts/components/contracts-module";
import { getContracts } from "@/features/contracts/services/contracts.service";

export default async function VertraegePage() {
  const contracts = await getContracts();

  return (
    <AdminShell>
      <ContractsModule contracts={contracts} />
    </AdminShell>
  );
}
