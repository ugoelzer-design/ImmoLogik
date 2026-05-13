import { RentUnitsModule } from './modules/rent-units/rent-units.module';
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ObjectsModule } from './modules/objects/objects.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { MeterReadingsModule } from './modules/meter-readings/meter-readings.module';
import { UtilityStatementsModule } from './modules/utility-statements/utility-statements.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    AuthModule,
    RentUnitsModule,
    PrismaModule,
    ObjectsModule,
    DocumentsModule,
    TenantsModule,
    ContractsModule,
    MeterReadingsModule,
    UtilityStatementsModule,
  ],
})
export class AppModule {}
