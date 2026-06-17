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
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.tenantsService.findAll(
      getPaginationOptions({ page, pageSize }),
      user?.appTenantSlug,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.tenantsService.findOne(id, user?.appTenantSlug);
  }

  @Post()
  create(
    @Body() dto: CreateTenantDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.tenantsService.create(dto, user?.appTenantSlug);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTenantDto>,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.tenantsService.update(id, dto, user?.appTenantSlug);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.tenantsService.remove(id, user?.appTenantSlug);
  }
}
