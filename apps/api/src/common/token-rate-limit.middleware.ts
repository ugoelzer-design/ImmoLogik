import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { IpRateLimiter } from './ip-rate-limiter';

/**
 * IP-basiertes Rate Limiting für die öffentlichen Mieter-Token-Endpunkte.
 *
 * Standard: max. 20 Anfragen pro IP pro 60 Sekunden.
 * Konfigurierbar über Umgebungsvariablen:
 *   TOKEN_RATE_LIMIT      – max. Anfragen (Standard: 20)
 *   TOKEN_RATE_WINDOW_MS  – Zeitfenster in ms (Standard: 60000)
 */
@Injectable()
export class TokenRateLimitMiddleware implements NestMiddleware {
  private readonly limiter: IpRateLimiter;

  constructor() {
    this.limiter = new IpRateLimiter({
      limit: parseInt(process.env.TOKEN_RATE_LIMIT ?? '20', 10),
      windowMs: parseInt(process.env.TOKEN_RATE_WINDOW_MS ?? '60000', 10),
      logger: new Logger(TokenRateLimitMiddleware.name),
      message: 'Zu viele Anfragen. Bitte versuche es in einer Minute erneut.',
    });
  }

  use(req: Request, res: Response, next: NextFunction): void {
    if (this.limiter.allow(req, res)) {
      next();
    }
  }
}
