import { Injectable } from '@nestjs/common';
import { MinioService } from './modules/documents/minio.service';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async getHealth() {
    await this.prisma.$queryRaw`SELECT 1`;
    const storage = await this.minio.getStorageStatus();
    const auth = this.getAuthHealth();

    return {
      status: storage.available && auth.configured ? 'ok' : 'degraded',
      service: 'api',
      version: 'v1',
      database: 'up',
      storage,
      auth,
      rateLimit: {
        globalLimit: parseInt(process.env.GLOBAL_RATE_LIMIT ?? '600', 10),
        globalWindowMs: parseInt(
          process.env.GLOBAL_RATE_WINDOW_MS ?? '60000',
          10,
        ),
        tokenLimit: parseInt(process.env.TOKEN_RATE_LIMIT ?? '20', 10),
        tokenWindowMs: parseInt(
          process.env.TOKEN_RATE_WINDOW_MS ?? '60000',
          10,
        ),
      },
      timestamp: new Date().toISOString(),
    };
  }

  private getAuthHealth() {
    const mode = process.env.AUTH_MODE ?? 'dev';
    const missing =
      mode === 'entra'
        ? ['ENTRA_TENANT_ID', 'ENTRA_CLIENT_ID'].filter(
            (key) => !process.env[key]?.trim(),
          )
        : [];

    return {
      mode,
      configured: missing.length === 0,
      missing,
      entraAudienceConfigured: Boolean(process.env.ENTRA_AUDIENCE?.trim()),
      internalServerAuthConfigured: Boolean(
        process.env.API_INTERNAL_AUTH_TOKEN?.trim(),
      ),
    };
  }
}
