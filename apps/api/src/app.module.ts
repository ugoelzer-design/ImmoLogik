import { MiddlewareConsumer, Module } from '@nestjs/common';
import { RentUnitsModule } from './modules/rent-units/rent-units.module';
import { PrismaModule } from './prisma/prisma.module';
import { ObjectsModule } from './modules/objects/objects.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { MeterReadingsModule } from './modules/meter-readings/meter-readings.module';
import { UtilityStatementsModule } from './modules/utility-statements/utility-statements.module';
import { MieterPortalModule } from './modules/mieter-portal/mieter-portal.module';
import { AuthModule } from './auth/auth.module';
import { GlobalRateLimitMiddleware } from './common/global-rate-limit.middleware';
import { RequestLoggingMiddleware } from './common/request-logging.middleware';
import { AppController } from './app.controller';
import { AppService } from './app.service';

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
    MieterPortalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
 