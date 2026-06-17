import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import { getPaginationOptions } from '../../common/pagination';
import { CreateReadingCampaignDto } from './dto/create-reading-campaign.dto';
import { SubmitMeterReadingsDto } from './dto/submit-meter-readings.dto';
import { MeterReadingsService } from './meter-readings.service';
import { Public } from '../../auth/public.decorator';

@ApiTags('meter-readings')
@Controller('meter-readings')
export class MeterReadingsController {
  constructor(private readonly meterReadingsService: MeterReadingsService) {}

  @Get('meters')
  findMeters(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('objectId') objectId?: string,
  ) {
    return this.meterReadingsService.findMeters(objectId, user?.appTenantSlug);
  }

  @Get('campaigns')
  findCampaigns(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('objectId') objectId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.meterReadingsService.findCampaigns(
      objectId,
      getPaginationOptions({ page, pageSize }),
      user?.appTenantSlug,
    );
  }

  @Post('campaigns')
  createCampaign(
    @Body() dto: CreateReadingCampaignDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.meterReadingsService.createCampaign(dto, user?.appTenantSlug);
  }

  /** Öffentlicher Endpunkt: Mieter ruft seinen Ablese-Zugang per Token ab. */
  @Public()
  @Get('access/:token')
  getAccess(@Param('token') token: string) {
    return this.meterReadingsService.getAccess(token);
  }

  /** Öffentlicher Endpunkt: Mieter reicht Zählerstände per Token ein. */
  @Public()
  @Post('access/:token/readings')
  submitReadings(
    @Param('token') token: string,
    @Body() dto: SubmitMeterReadingsDto,
  ) {
    return this.meterReadingsService.submitReadings(token, dto);
  }
}
