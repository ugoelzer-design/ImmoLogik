import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createPublicKey, createVerify, type JsonWebKey } from 'crypto';
import { Request } from 'express';
import type { AuthenticatedUser, RequestWithUser } from './authenticated-user';
import { IS_PUBLIC_KEY } from './public.decorator';

type JwtHeader = {
  alg?: string;
  kid?: string;
};

type JwtPayload = {
  aud?: string | string[];
  exp?: number;
  iss?: string;
  name?: string;
  nbf?: number;
  oid?: string;
  preferred_username?: string;
  roles?: string[];
  scp?: string;
  tid?: string;
  upn?: string;
};

type JwksKey = JsonWebKey & {
  kid?: string;
};

type JwksResponse = {
  keys?: JwksKey[];
};

const ENTRA_JWKS_CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Globaler Auth-Guard für Immologik.
 *
 * Unterstützte AUTH_MODE-Werte (via .env):
 *   dev   – Alle Anfragen werden ohne Prüfung durchgelassen (nur Entwicklung!).
 *   entra – Entra ID (Azure AD) Bearer-Token-Validierung (Produktion).
 *
 * Routen, die mit @Public() markiert sind, werden immer durchgelassen
 * (z.B. der öffentliche Mieter-Ablese-Endpunkt).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private jwksCache: { expiresAt: number; keys: JwksKey[] } | null = null;

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const authMode = process.env.AUTH_MODE ?? 'dev';
    const request = context.switchToHttp().getRequest<Request & RequestWithUser>();

    if (authMode === 'dev') {
      request.user = this.createDevUser();
      return true;
    }

    if (authMode === 'entra') {
      const authHeader = request.headers['authorization'];

      if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedException(
          'Kein gültiger Authorization-Header vorhanden.',
        );
      }

      request.user = await this.validateEntraToken(
        authHeader.slice('Bearer '.length),
      );
      return true;
    }

    this.logger.error(
      `Unbekannter AUTH_MODE: "${authMode}". Zugriff verweigert.`,
    );
    throw new UnauthorizedException(
      `Unbekannter Authentifizierungsmodus: ${authMode}`,
    );
  }

  private async validateEntraToken(token: string): Promise<AuthenticatedUser> {
    const tenantId = this.readRequiredEnv('ENTRA_TENANT_ID');
    const clientId = this.readRequiredEnv('ENTRA_CLIENT_ID');
    const expectedAudiences = this.readExpectedAudiences(clientId);
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');

    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new UnauthorizedException('Bearer-Token ist ungültig.');
    }

    const header = this.decodeJwtPart<JwtHeader>(encodedHeader);
    const payload = this.decodeJwtPart<JwtPayload>(encodedPayload);

    if (header.alg !== 'RS256' || !header.kid) {
      throw new UnauthorizedException(
        'Bearer-Token verwendet keinen gültigen Signaturalgorithmus.',
      );
    }

    this.validateTokenClaims(payload, tenantId, expectedAudiences);

    const jwk = await this.getSigningKey(header.kid, tenantId);
    const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${encodedHeader}.${encodedPayload}`);
    verifier.end();

    const signature = this.base64UrlToBuffer(encodedSignature);
    if (!verifier.verify(publicKey, signature)) {
      throw new UnauthorizedException('Bearer-Token-Signatur ist ungültig.');
    }

    return this.createUserFromEntraPayload(payload);
  }

  private validateTokenClaims(
    payload: JwtPayload,
    tenantId: string,
    expectedAudiences: string[],
  ) {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const expectedIssuers = [
      `https://login.microsoftonline.com/${tenantId}/v2.0`,
      `https://sts.windows.net/${tenantId}/`,
    ];
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];

    if (!payload.iss || !expectedIssuers.includes(payload.iss)) {
      throw new UnauthorizedException(
        'Bearer-Token stammt nicht vom erwarteten Entra-Mandanten.',
      );
    }

    if (
      !audiences.some(
        (audience) => audience && expectedAudiences.includes(audience),
      )
    ) {
      throw new UnauthorizedException(
        'Bearer-Token ist nicht für diese API ausgestellt.',
      );
    }

    if (!payload.exp || payload.exp <= nowInSeconds) {
      throw new UnauthorizedException('Bearer-Token ist abgelaufen.');
    }

    if (payload.nbf && payload.nbf > nowInSeconds) {
      throw new UnauthorizedException('Bearer-Token ist noch nicht gültig.');
    }
  }

  private async getSigningKey(kid: string, tenantId: string) {
    const keys = await this.getJwksKeys(tenantId);
    const key = keys.find((item) => item.kid === kid);

    if (!key) {
      throw new UnauthorizedException(
        'Passender Entra-Signaturschlüssel wurde nicht gefunden.',
      );
    }

    return key;
  }

  private async getJwksKeys(tenantId: string) {
    const now = Date.now();
    if (this.jwksCache && this.jwksCache.expiresAt > now) {
      return this.jwksCache.keys;
    }

    const response = await fetch(
      `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
    );

    if (!response.ok) {
      this.logger.error(
        `Entra JWKS konnte nicht geladen werden: HTTP ${response.status}`,
      );
      throw new UnauthorizedException(
        'Entra-Signaturschlüssel konnten nicht geladen werden.',
      );
    }

    const body = (await response.json()) as JwksResponse;
    const keys = Array.isArray(body.keys) ? body.keys : [];

    this.jwksCache = {
      expiresAt: now + ENTRA_JWKS_CACHE_TTL_MS,
      keys,
    };

    return keys;
  }

  private decodeJwtPart<T>(value: string): T {
    try {
      return JSON.parse(this.base64UrlToBuffer(value).toString('utf8')) as T;
    } catch {
      throw new UnauthorizedException(
        'Bearer-Token kann nicht gelesen werden.',
      );
    }
  }

  private base64UrlToBuffer(value: string) {
    return Buffer.from(value, 'base64url');
  }

  private readRequiredEnv(key: string) {
    const value = process.env[key]?.trim();

    if (!value) {
      this.logger.error(`Entra-Konfiguration unvollständig: ${key} fehlt.`);
      throw new UnauthorizedException(
        'Authentifizierung ist nicht vollständig konfiguriert.',
      );
    }

    return value;
  }

  private readExpectedAudiences(clientId: string) {
    const configuredAudiences = process.env.ENTRA_AUDIENCE?.split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    return configuredAudiences?.length ? configuredAudiences : [clientId];
  }

  private createDevUser(): AuthenticatedUser {
    return {
      externalId: process.env.DEV_USER_ID?.trim() || 'dev-user',
      email: process.env.DEV_USER_EMAIL?.trim() || 'admin@immologik.local',
      displayName: process.env.DEV_USER_NAME?.trim() || 'Development User',
      roles: ['ADMIN'],
      appTenantSlug: process.env.DEV_TENANT_SLUG?.trim() || 'default',
    };
  }

  private createUserFromEntraPayload(payload: JwtPayload): AuthenticatedUser {
    const email = payload.preferred_username || payload.upn;
    const externalId = payload.oid || email;

    if (!externalId || !email) {
      throw new UnauthorizedException(
        'Bearer-Token enthält keine verwertbare Benutzerkennung.',
      );
    }

    return {
      externalId,
      email,
      displayName: payload.name || email,
      roles: payload.roles ?? [],
      appTenantSlug: process.env.DEFAULT_TENANT_SLUG?.trim() || 'default',
    };
  }
}
