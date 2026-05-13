import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateObjectDto } from './dto/create-object.dto';
import { ObjectsService } from './objects.service';

@ApiTags('objects')
@Controller('objects')
export class ObjectsController {
  constructor(private readonly objectsService: ObjectsService) {}

  @Get()
  findAll() {
    return this.objectsService.findAll();
  }

  @Get('next-display-id')
  getNextDisplayIdPreview() {
    return this.objectsService.getNextDisplayIdPreview();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.objectsService.findOne(id);
  }

  @Post()
  create(@Body() createObjectDto: CreateObjectDto) {
    return this.objectsService.create(createObjectDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.objectsService.remove(id);
  }
}
