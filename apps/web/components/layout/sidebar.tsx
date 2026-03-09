"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/features/navigation/navigation.config";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-r border-zinc-200 bg-white">
      <div className="flex h-full flex-col">
        <div className="border-b border-zinc-200 px-6 py-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
            ImmoLogik
          </p>
          <h1 className="mt-2 text-xl font-semibold text-zinc-900">
            Admin Tool
          </h1>
          <p className="mt-2 text-sm text-zinc-600">Udo Gölzer</p>
        </div>

        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}