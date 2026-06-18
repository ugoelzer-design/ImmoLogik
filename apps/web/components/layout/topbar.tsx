"use client";

import { LogOut } from "lucide-react";
import { useMsal } from "@azure/msal-react";
import { entraAuthEnabled } from "@/lib/auth/msal-config";

function AuthBadge() {
  const { accounts, instance } = useMsal();
  const account = instance.getActiveAccount() || accounts[0];
  const displayName = account?.name || account?.username || "Udo Gölzer";

  return (
    <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
      <span>{displayName}</span>
      <button
        aria-label="Abmelden"
        className="rounded-full p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900"
        onClick={() => instance.logoutRedirect()}
        type="button"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}

export function Topbar() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-medium text-zinc-900">
            ImmoLogik Verwaltungsoberfläche
          </p>
          <p className="text-xs text-zinc-500">
            Dashboard, Objekte, Dokumente, Mieter und Verträge
          </p>
        </div>

        {entraAuthEnabled ? (
          <AuthBadge />
        ) : (
          <div className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-700">
            Udo Gölzer
          </div>
        )}
      </div>
    </header>
  );
}
