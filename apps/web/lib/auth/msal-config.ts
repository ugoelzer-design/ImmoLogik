import {
  BrowserCacheLocation,
  type Configuration,
  type PopupRequest,
  type RedirectRequest,
} from "@azure/msal-browser";

const tenantId = process.env.NEXT_PUBLIC_ENTRA_TENANT_ID?.trim() || "common";
const clientId = process.env.NEXT_PUBLIC_ENTRA_CLIENT_ID?.trim() || "";
const configuredScopes = process.env.NEXT_PUBLIC_ENTRA_SCOPES?.split(/[,\s]+/)
  .map((scope) => scope.trim())
  .filter(Boolean);

export const entraAuthEnabled =
  process.env.NEXT_PUBLIC_AUTH_MODE === "entra" && Boolean(clientId);

export const entraScopes =
  configuredScopes?.length && configuredScopes.length > 0
    ? configuredScopes
    : clientId
      ? [`api://${clientId}/access_as_user`]
      : [];

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: process.env.NEXT_PUBLIC_ENTRA_REDIRECT_URI || "/",
    postLogoutRedirectUri:
      process.env.NEXT_PUBLIC_ENTRA_POST_LOGOUT_REDIRECT_URI || "/",
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage,
  },
};

export const loginRequest: RedirectRequest & PopupRequest = {
  scopes: entraScopes,
};
