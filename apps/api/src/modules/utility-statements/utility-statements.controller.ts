import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import { UtilityStatementsService } from './utility-statements.service';

@Controller('utility-statements')
export class UtilityStatementsController {
  constructor(
    private readonly utilityStatementsService: UtilityStatementsService,
  ) {}

  @Get()
  listSettlements(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('q') q?: string,
    @Query('objectId') objectId?: string,
    @Query('objectDisplayId') objectDisplayId?: string,
    @Query('status') status?: string,
    @Query('reportYear') reportYear?: string,
  ) {
    return this.utilityStatementsService.listSettlements(
      {
        q,
        objectId,
        objectDisplayId,
        status,
        reportYear,
      },
      user?.appTenantSlug,
    );
  }

  @Get(':id/validation')
  validateSettlement(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.utilityStatementsService.validateSettlement(
      id,
      undefined,
      user?.appTenantSlug,
    );
  }

  @Get('workspace')
  getWorkspace(@CurrentUser() user: AuthenticatedUser | undefined) {
    return this.utilityStatementsService.getWorkspace(user?.appTenantSlug);
  }

  @Put('workspace')
  syncWorkspace(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: { settlements?: Array<Record<string, unknown>> },
  ) {
    return this.utilityStatementsService.syncWorkspace(
      body as any,
      user?.appTenantSlug,
    );
  }

  @Post(':id/approve')
  approveSettlement(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.utilityStatementsService.approveSettlement(
      id,
      body as any,
      user?.appTenantSlug,
    );
  }
}
