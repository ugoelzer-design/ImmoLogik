"use client";

export function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-3 last:border-b-0">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}
