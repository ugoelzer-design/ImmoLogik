import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ObjectsModule } from './modules/objects/objects.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { ContractsModule } from './modules/contracts/contracts.module';

@Module({
  imports: [
    PrismaModule,
    ObjectsModule,
    DocumentsModule,
    TenantsModule,
    ContractsModule,
  ],
})
export class AppModule {}
