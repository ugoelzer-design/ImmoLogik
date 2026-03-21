import { MinioService } from '../documents/minio.service';
import { Module } from '@nestjs/common';
import { ObjectsController } from './objects.controller';
import { ObjectsService } from './objects.service';

@Module({
  controllers: [ObjectsController],
  providers: [MinioService, ObjectsService],
  exports: [ObjectsService],
})
export class ObjectsModule {}
