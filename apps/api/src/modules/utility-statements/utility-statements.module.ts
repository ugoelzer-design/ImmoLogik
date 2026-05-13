import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UtilityStatementsController } from './utility-statements.controller';
import { UtilityStatementsService } from './utility-statements.service';

@Module({
  imports: [PrismaModule],
  controllers: [UtilityStatementsController],
  providers: [UtilityStatementsService],
  exports: [UtilityStatementsService],
})
export class UtilityStatementsModule {}
