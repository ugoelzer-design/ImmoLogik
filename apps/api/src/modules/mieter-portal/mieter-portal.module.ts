import { Module } from '@nestjs/common';
import { MinioService } from '../documents/minio.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { MieterPortalController } from './mieter-portal.controller';
import { MieterPortalService } from './mieter-portal.service';

@Module({
  imports: [PrismaModule],
  controllers: [MieterPortalController],
  providers: [MieterPortalService, MinioService],
})
export class MieterPortalModule {}
