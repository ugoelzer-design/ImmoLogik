import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import { getPaginationOptions } from '../../common/pagination';
import { RentUnitsService } from './rent-units.service';
import { CreateRentUnitDto } from './dto/create-rent-unit.dto';

@ApiTags('rent-units')
@Controller('rent-units')
export class RentUnitsController {
  constructor(private readonly rentUnitsService: RentUnitsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.rentUnitsService.findAll(
      getPaginationOptions({ page, pageSize }),
      user?.appTenantSlug,
    );
  }

  @Get('by-object/:objectId')
  findByObject(
    @Param('objectId') objectId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.rentUnitsService.findByObject(objectId, user?.appTenantSlug);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.rentUnitsService.findOne(id, user?.appTenantSlug);
  }

  @Post()
  create(
    @Body() dto: CreateRentUnitDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.rentUnitsService.create(dto, user?.appTenantSlug);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateRentUnitDto>,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.rentUnitsService.update(id, dto, user?.appTenantSlug);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.rentUnitsService.remove(id, user?.appTenantSlug);
  }
}
