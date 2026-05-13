import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { UtilityStatementsService } from './utility-statements.service';

@Controller('utility-statements')
export class UtilityStatementsController {
  constructor(
    private readonly utilityStatementsService: UtilityStatementsService,
  ) {}

  @Get()
  listSettlements(
    @Query('q') q?: string,
    @Query('objectId') objectId?: string,
    @Query('objectDisplayId') objectDisplayId?: string,
    @Query('status') status?: string,
    @Query('reportYear') reportYear?: string,
  ) {
    return this.utilityStatementsService.listSettlements({
      q,
      objectId,
      objectDisplayId,
      status,
      reportYear,
    });
  }

  @Get(':id/validation')
  validateSettlement(@Param('id') id: string) {
    return this.utilityStatementsService.validateSettlement(id);
  }

  @Get('workspace')
  getWorkspace() {
    return this.utilityStatementsService.getWorkspace();
  }

  @Put('workspace')
  syncWorkspace(
    @Body() body: { settlements?: Array<Record<string, unknown>> },
  ) {
    return this.utilityStatementsService.syncWorkspace(body as any);
  }

  @Post(':id/approve')
  approveSettlement(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.utilityStatementsService.approveSettlement(id, body as any);
  }
}
