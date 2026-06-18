import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import { getPaginationOptions } from '../../common/pagination';
import { CreateObjectDto } from './dto/create-object.dto';
import { ObjectsService } from './objects.service';

@ApiTags('objects')
@Controller('objects')
export class ObjectsController {
  constructor(private readonly objectsService: ObjectsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.objectsService.findAll(
      getPaginationOptions({ page, pageSize }),
      user?.appTenantSlug,
    );
  }

  @Get('next-display-id')
  getNextDisplayIdPreview(@CurrentUser() user: AuthenticatedUser | undefined) {
    return this.objectsService.getNextDisplayIdPreview(user?.appTenantSlug);
  }

  @Get(':id/module-data')
  getModuleData(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.objectsService.getModuleData(id, user?.appTenantSlug);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.objectsService.findOne(id, user?.appTenantSlug);
  }

  @Post()
  create(
    @Body() createObjectDto: CreateObjectDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.objectsService.create(createObjectDto, user?