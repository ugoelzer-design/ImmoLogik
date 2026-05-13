import { Module } from '@nestjs/common';
import { RentUnitsController } from './rent-units.controller';
import { RentUnitsService } from './rent-units.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RentUnitsController],
  providers: [RentUnitsService],
})
export class RentUnitsModule {}
