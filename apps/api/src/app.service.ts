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

    return {
      status: storage.available ? 'ok' : 'degraded',
      service: 'api',
      version: 'v1',
      database: 'up',
      storage,
      authMode: process.env.AUTH_MODE ?? 'dev',
      timestamp: new Date().toISOString(),
    };
  }
}
