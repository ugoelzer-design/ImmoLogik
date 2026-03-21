"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  navigationItems,
  type NavigationItem,
} from "@/features/navigation/navigation.config";

export function Sidebar() {
  const pathname = usePathname();

  const topItems = navigationItems.filter(
    (item) => (item.position ?? "top") === "top"
  );

  const bottomItems = navigationItems.filter(
    (item) => item.position === "bottom"
  );

  function renderItems(items: NavigationItem[]) {
    return items.map((item) => {
      const isActive = pathname === item.href;
      const Icon = item.icon;

      return (
        <li key={item.href}>
          <Link
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
              isActive
                ? "bg-white text-black"
                : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span>{item.label}</span>
          </Link>
        </li>
      );
    });
  }

  return (
    <aside className="border-r border-zinc-800 bg-black">
      <div className="flex h-full flex-col">
        <div className="border-b border-zinc-800 px-6 py-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
            ImmoLogik
          </p>
          <h1 className="mt-2 text-xl font-semibold text-white">
            Admin Tool
          </h1>
          <p className="mt-2 text-sm text-zinc-300">Udo Gölzer</p>
        </div>

        <nav className="flex flex-1 flex-col px-4 py-6">
          <ul className="space-y-2">
            {renderItems(topItems)}
          </ul>

          <div className="mt-auto pt-6">
            <ul className="space-y-2">
              {renderItems(bottomItems)}
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  );
}
