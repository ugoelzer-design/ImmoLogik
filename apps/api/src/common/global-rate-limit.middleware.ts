import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { IpRateLimiter } from './ip-rate-limiter';

/**
 * Globales IP-basiertes Rate Limiting für API-Endpunkte.
 *
 * Standard: max. 600 Anfragen pro IP pro 60 Sekunden.
 * Konfigurierbar über:
 *   GLOBAL_RATE_LIMIT
 *   GLOBAL_RATE_WINDOW_MS
 */
@Injectable()
export class GlobalRateLimitMiddleware implements NestMiddleware {
  private readonly limiter: IpRateLimiter;

  constructor() {
    this.limiter = new IpRateLimiter({
      limit: parseInt(process.env.GLOBAL_RATE_LIMIT ?? '600', 10),
      windowMs: parseInt(process.env.GLOBAL_RATE_WINDOW_MS ?? '60000', 10),
      logger: new Logger(GlobalRateLimitMiddleware.name),
      message: 'Zu viele Anfragen. Bitte versuche es gleich erneut.',
    });
  }

  use(req: Request, res: Response, next: NextFunction): void {
    if (this.isHealthCheck(req.path)) {
      next();
      return;
    }

    if (this.limiter.allow(req, res)) {
      next();
    }
  }

  private isHealthCheck(path: string) {
    return path === '/health' || path.endsWith('/health');
  }
}
