import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { MieterPortalController } from './mieter-portal.controller';
import { MieterPortalService } from './mieter-portal.service';

@Module({
  imports: [PrismaModule, DocumentsModule],
  controllers: [MieterPortalController],
  providers: [MieterPortalService],
})
export class MieterPortalModule {}
