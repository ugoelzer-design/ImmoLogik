import { getAccessToken } from "@/lib/auth/token-provider";

type QueryValue = string | number | boolean | null | undefined;

type RequestOptions = RequestInit & {
  query?: Record<string, QueryValue>;
};

function stripTrailingSlash(value?: string) {
  return value?.replace(/\/$/, "");
}

/**
 * Liefert die API-Basis-URL kontextabhaengig:
 *  - Browser  -> gleiche Domain wie die Seite (ueber das Gateway). Basic-Auth/
 *                Cookies werden vom Browser automatisch mitgeschickt.
 *  - Server   -> interner Service-Aufruf im Container-Netzwerk. Umgeht das
 *                Gateway und dessen Basic-Auth komplett (sonst 401 -> leere Daten).
 */
function resolveApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return (
      stripTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL) ||
      stripTrailingSlash(process.env.NEXT_PUBLIC_API_URL) ||
      `${window.location.origin}/api/v1`
    );
  }

  return (
    stripTrailingSlash(process.env.API_INTERNAL_URL) ||
    "http://api:4000/api/v1"
  );
}

export const API_BASE_URL = resolveApiBaseUrl();

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { query, headers, ...init } = options;
  const requestHeaders = new Headers(headers ?? undefined);
  const isBrowser = typeof window !== "undefined";

  if (init.body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (!requestHeaders.has("Authorization")) {
    const accessToken = isBrowser ? await getAccessToken() : null;
    if (accessToken) {
      requestHeaders.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  if (!isBrowser && process.env.API_INTERNAL_AUTH_TOKEN?.trim()) {
    requestHeaders.set(
      "x-internal-auth-token",
      process.env.API_INTERNAL_AUTH_TOKEN.trim(),
    );
  }

  const response = await fetch(buildUrl(path, query), {
    ...init,
    headers: requestHeaders,
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    const message = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new Error(message || `Nicht autorisiert (${response.status})`);
    }
    throw new Error(message || `API request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const responseText = await response.text();

  if (!responseText.trim()) {
    return undefined as T;
  }

  return JSON.parse(responseText) as T;
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T, B = unknown>(path: string, body?: B, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T, B = unknown>(path: string, body?: B, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T, B = unknown>(path: string, body?: B, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  del: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
