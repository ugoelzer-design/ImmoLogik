export type AuthenticatedUser = {
  externalId: string;
  email: string;
  displayName: string;
  roles: string[];
  appTenantSlug: string;
};

export type RequestWithUser = {
  user?: AuthenticatedUser;
};
