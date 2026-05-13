import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      service: 'api',
      version: 'v1',
      database: 'up',
      authMode: process.env.AUTH_MODE ?? 'dev',
      timestamp: new Date().toISOString(),
    };
  }
}
