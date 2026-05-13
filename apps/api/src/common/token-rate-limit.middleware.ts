import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface HitRecord {
  count: number;
  resetAt: number;
}

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
  private readonly logger = new Logger(TokenRateLimitMiddleware.name);
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly hits = new Map<string, HitRecord>();

  constructor() {
    this.limit = parseInt(process.env.TOKEN_RATE_LIMIT ?? '20', 10);
    this.windowMs = parseInt(process.env.TOKEN_RATE_WINDOW_MS ?? '60000', 10);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.ip ??
      'unknown';

    const now = Date.now();

    // Abgelaufene Einträge bereinigen wenn Map zu groß wird
    if (this.hits.size > 5000) {
      for (const [key, record] of this.hits) {
        if (record.resetAt <= now) this.hits.delete(key);
      }
    }

    const record = this.hits.get(ip);

    if (!record || record.resetAt <= now) {
      this.hits.set(ip, { count: 1, resetAt: now + this.windowMs });
      next();
      return;
    }

    record.count++;

    if (record.count > this.limit) {
      this.logger.warn(
        `Rate Limit überschritten: IP=${ip} Pfad=${req.path} Anfragen=${record.count}`,
      );
      res.status(429).json({
        statusCode: 429,
        message: 'Zu viele Anfragen. Bitte versuche es in einer Minute erneut.',
        error: 'Too Many Requests',
      });
      return;
    }

    next();
  }
}
