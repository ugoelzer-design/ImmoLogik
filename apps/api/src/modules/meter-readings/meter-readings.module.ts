import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TokenRateLimitMiddleware } from '../../common/token-rate-limit.middleware';
import { MeterReadingsController } from './meter-readings.controller';
import { MeterReadingsService } from './meter-readings.service';

@Module({
  imports: [PrismaModule],
  controllers: [MeterReadingsController],
  providers: [MeterReadingsService],
  exports: [MeterReadingsService],
})
export class MeterReadingsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Rate Limiting nur für die öffentlichen Token-Endpunkte (ohne Auth)
    consumer.apply(TokenRateLimitMiddleware).forRoutes(
      { path: 'meter-readings/access/:token', method: RequestMethod.GET },
      {
        path: 'meter-readings/access/:token/readings',
        method: RequestMethod.POST,
      },
    );
  }
}
