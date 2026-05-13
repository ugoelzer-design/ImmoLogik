import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';

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

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const authMode = process.env.AUTH_MODE ?? 'dev';

    if (authMode === 'dev') {
      return true;
    }

    if (authMode === 'entra') {
      const request = context.switchToHttp().getRequest<Request>();
      const authHeader = request.headers['authorization'];

      if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedException(
          'Kein gültiger Authorization-Header vorhanden.',
        );
      }

      // TODO: Entra ID JWT-Validierung implementieren.
      // Das Bearer-Token muss gegen die Microsoft Identity Platform validiert werden.
      // Empfohlene Bibliothek: @azure/msal-node oder jwks-rsa + jsonwebtoken.
      // Solange die Validierung nicht implementiert ist, werden alle Anfragen im
      // entra-Modus abgelehnt, um unbeabsichtigten Produktionseinsatz zu verhindern.
      this.logger.error(
        'Entra-Authentifizierung ist konfiguriert (AUTH_MODE=entra), ' +
          'aber die JWT-Validierung ist noch nicht implementiert. ' +
          'Zugriff verweigert. Bitte auth.guard.ts um MSAL-Token-Validierung ergänzen.',
      );
      throw new UnauthorizedException(
        'Authentifizierung noch nicht vollständig konfiguriert. Bitte Administrator kontaktieren.',
      );
    }

    this.logger.error(
      `Unbekannter AUTH_MODE: "${authMode}". Zugriff verweigert.`,
    );
    throw new UnauthorizedException(
      `Unbekannter Authentifizierungsmodus: ${authMode}`,
    );
  }
}
