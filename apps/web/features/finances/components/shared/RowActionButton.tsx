"use client";

export function RowActionButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex h-10 items-center justify-center rounded-xl border px-3 text-sm font-medium",
        disabled
          ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
          : "border-zinc-200 bg-white text-zinc-800",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
