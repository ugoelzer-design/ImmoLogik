"use client";

import {
  InteractionRequiredAuthError,
  PublicClientApplication,
} from "@azure/msal-browser";
import { MsalProvider, useIsAuthenticated, useMsal } from "@azure/msal-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  entraAuthEnabled,
  loginRequest,
  msalConfig,
} from "@/lib/auth/msal-config";
import { setAccessTokenProvider } from "@/lib/auth/token-provider";

const publicPathPrefixes = ["/ablesungen"];

function isPublicPath(pathname: string | null) {
  return publicPathPrefixes.some((prefix) => pathname?.startsWith(prefix));
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { accounts, inProgress, instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const loginStarted = useRef(false);
  const activeAccount = instance.getActiveAccount() || accounts[0];

  useEffect(() => {
    if (!activeAccount && accounts[0]) {
      instance.setActiveAccount(accounts[0]);
    }
  }, [accounts, activeAccount, instance]);

  useEffect(() => {
    if (!entraAuthEnabled || !activeAccount) {
      setAccessTokenProvider(null);
      return;
    }

    setAccessTokenProvider(async () => {
      try {
        const result = await instance.acquireTokenSilent({
          ...loginRequest,
          account: activeAccount,
        });
        return result.accessToken;
      } catch (error) {
        if (error instanceof InteractionRequiredAuthError) {
          await instance.acquireTokenRedirect({
            ...loginRequest,
            account: activeAccount,
          });
        }
        return null;
      }
    });

    return () => setAccessTokenProvider(null);
  }, [activeAccount, instance]);

  useEffect(() => {
    if (
      !entraAuthEnabled ||
      isPublicPath(pathname) ||
      isAuthenticated ||
      inProgress !== "none" ||
      loginStarted.current
    ) {
      return;
    }

    loginStarted.current = true;
    void instance.loginRedirect(loginRequest);
  }, [inProgress, instance, isAuthenticated, pathname]);

  if (!entraAuthEnabled || isPublicPath(pathname) || isAuthenticated) {
    return children;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <button
        className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        onClick={() => instance.loginRedirect(loginRequest)}
        type="button"
      >
        Anmelden
      </button>
    </main>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!entraAuthEnabled) {
    return children;
  }

  return <EntraAuthProvider>{children}</EntraAuthProvider>;
}

function EntraAuthProvider({ children }: { children: React.ReactNode }) {
  const [msalInstance] = useState(
    () => new PublicClientApplication(msalConfig),
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void msalInstance.initialize().then(() => {
      if (isMounted) {
        setIsReady(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [msalInstance]);

  if (!isReady) {
    return null;
  }

  return (
    <MsalProvider instance={msalInstance}>
      <AuthGate>{children}</AuthGate>
    </MsalProvider>
  );
}
