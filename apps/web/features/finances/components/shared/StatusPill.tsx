"use client";

import type { ReactNode } from "react";

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "dark" | "teal" | "green" | "amber" | "blue";
}) {
  const className =
    tone === "dark"
      ? "bg-zinc-900 text-white"
      : tone === "teal"
        ? "bg-teal-50 text-teal-700"
        : tone === "green"
          ? "bg-green-50 text-green-700"
          : tone === "amber"
            ? "bg-amber-50 text-amber-700"
            : tone === "blue"
              ? "bg-blue-50 text-blue-700"
              : "bg-zinc-100 text-zinc-700";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
