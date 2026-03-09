import { cn } from "@/lib/utils/format";

type StatusBadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "muted";

type StatusBadgeProps = {
  label: string;
  variant?: StatusBadgeVariant;
};

const variantClasses: Record<StatusBadgeVariant, string> = {
  default: "bg-zinc-900 text-white",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-rose-100 text-rose-800",
  muted: "bg-zinc-200 text-zinc-700",
};

export function StatusBadge({
  label,
  variant = "default",
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium",
        variantClasses[variant]
      )}
    >
      {label}
    </span>
  );
}
