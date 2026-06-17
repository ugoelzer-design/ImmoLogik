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
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';

@ApiTags('contracts')
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.contractsService.findAll(
      getPaginationOptions({ page, pageSize }),
      user?.appTenantSlug,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.contractsService.findOne(id, user?.appTenantSlug);
  }

  @Post()
  create(
    @Body() dto: CreateContractDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.contractsService.create(dto, user?.appTenantSlug);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateContractDto>,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.contractsService.update(id, dto, user?.appTenantSlug);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.contractsService.remove(id, user?.appTenantSlug);
  }
}
