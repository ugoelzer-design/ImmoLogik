import { Logger } from '@nestjs/common';
import { Request, Response } from 'express';

interface HitRecord {
  count: number;
  resetAt: number;
}

type RateLimitOptions = {
  limit: number;
  logger: Logger;
  message: string;
  windowMs: number;
};

export class IpRateLimiter {
  private readonly hits = new Map<string, HitRecord>();

  constructor(private readonly options: RateLimitOptions) {}

  allow(req: Request, res: Response) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.ip ??
      'unknown';
    const now = Date.now();

    if (this.hits.size > 5000) {
      this.pruneExpired(now);
    }

    const record = this.hits.get(ip);

    if (!record || record.resetAt <= now) {
      this.hits.set(ip, {
        count: 1,
        resetAt: now + this.options.windowMs,
      });
      return true;
    }

    record.count++;

    if (record.count <= this.options.limit) {
      return true;
    }

    this.options.logger.warn(
      `Rate Limit überschritten: IP=${ip} Pfad=${req.path} Anfragen=${record.count}`,
    );
    res.status(429).json({
      statusCode: 429,
      message: this.options.message,
      error: 'Too Many Requests',
    });
    return false;
  }

  private pruneExpired(now: number) {
    for (const [key, record] of this.hits) {
      if (record.resetAt <= now) {
        this.hits.delete(key);
      }
    }
  }
}
