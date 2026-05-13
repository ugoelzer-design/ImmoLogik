import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RentUnitsService } from './rent-units.service';
import { CreateRentUnitDto } from './dto/create-rent-unit.dto';

@ApiTags('rent-units')
@Controller('rent-units')
export class RentUnitsController {
  constructor(private readonly rentUnitsService: RentUnitsService) {}

  @Get()
  findAll() {
    return this.rentUnitsService.findAll();
  }

  @Get('by-object/:objectId')
  findByObject(@Param('objectId') objectId: string) {
    return this.rentUnitsService.findByObject(objectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rentUnitsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRentUnitDto) {
    return this.rentUnitsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateRentUnitDto>) {
    return this.rentUnitsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rentUnitsService.remove(id);
  }
}
