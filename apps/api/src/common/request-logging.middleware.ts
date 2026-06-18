import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import type { RequestWithUser } from '../auth/authenticated-user';

type LoggedRequest = Request & RequestWithUser;

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggingMiddleware.name);

  use(req: LoggedRequest, res: Response, next: NextFunction) {
    const startedAt = Date.now();
    const requestId = this.resolveRequestId(req);
    const ip = this.resolveIp(req);

    res.setHeader('x-request-id', requestId);

    res.on('finish', () => {
      const payload = {
        event: 'http_request',
        requestId,
        method: req.method,
        path: req.originalUrl ?? req.url,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        ip,
        userEmail: req.user?.email,
        tenant: req.user?.appTenantSlug,
      };

      const message = JSON.stringify(payload);
      if (res.statusCode >= 500) {
        this.logger.error(message);
      } else if (res.statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }

  private resolveRequestId(req: Request) {
    const incoming = req.headers['x-request-id'];

    if (Array.isArray(incoming)) {
      return incoming[0] || randomUUID();
    }

    return incoming || randomUUID();
  }

  private resolveIp(req: Request) {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown'
    );
  }
}
