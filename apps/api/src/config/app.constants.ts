export const API_GLOBAL_PREFIX = 'api/v1';
export const API_DOCS_PATH = 'api/docs';
export const API_DEFAULT_PORT = 4000;

export const DEFAULT_AUTH_MODE = 'dev';
export const DEFAULT_NODE_ENV = 'development';
export const ENTRA_REQUIRED_ENV_VARS = [
  'ENTRA_TENANT_ID',
  'ENTRA_CLIENT_ID',
] as const;

export const WEB_ALLOWED_ORIGINS = (
  process.env.CORS_ALLOWED_ORIGINS ||
  process.env.WEB_ORIGIN ||
  'http://localhost:3001'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const SWAGGER_CONFIG = {
  title: 'ImmoLogik API',
  description: 'REST-API für die ImmoLogik Wohnungsverwaltung',
  version: '1.0',
  tags: [
    ['objects', 'Verwaltungsobjekte (WEGs)'],
    ['rent-units', 'Mieteinheiten'],
    ['tenants', 'Mieter'],
    ['contracts', 'Mietverträge'],
    ['documents', 'Dokumente'],
    ['meter-readings', 'Zählerablesung'],
    ['utility-statements', 'Nebenkostenabrechnungen'],
  ] as const,
};
