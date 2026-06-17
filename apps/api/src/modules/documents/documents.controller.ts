import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  StreamableFile,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { getPaginationOptions } from '../../common/pagination';
import { DocumentsService } from './documents.service';

export const DOCUMENT_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_UPLOAD_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export function documentUploadFileFilter(
  _request: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (
    DOCUMENT_UPLOAD_ALLOWED_MIME_TYPES.includes(
      file.mimetype as (typeof DOCUMENT_UPLOAD_ALLOWED_MIME_TYPES)[number],
    )
  ) {
    callback(null, true);
    return;
  }

  callback(
    new BadRequestException(
      'Ungültiger Dateityp. Erlaubt sind PDF, JPEG und PNG.',
    ),
    false,
  );
}

const documentUploadInterceptorOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: DOCUMENT_UPLOAD_MAX_BYTES,
  },
  fileFilter: documentUploadFileFilter,
};

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('inventory/export')
  async exportInventory(@Res({ passthrough: true }) response: Response) {
    const exportFile = await this.documentsService.exportInventoryCsv();
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(exportFile.fileName)}`,
    );
    return exportFile.content;
  }

  @Get()
  findAll(
    @Query('objectId') objectId?: string,
    @Query('rentUnitId') rentUnitId?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('reportYear') reportYear?: string,
    @Query('search') search?: string,
    @Query('fileState') fileState?: string,
    @Query('actionState') actionState?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.documentsService.findAll({
      objectId,
      rentUnitId,
      category,
      status,
      reportYear,
      search,
      fileState,
      actionState,
      ...getPaginationOptions({ page, pageSize }),
    });
  }

  @Get('storage/status')
  async getStorageStatus() {
    return this.documentsService.getStorageStatus();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Get(':id/download')
  getDownloadUrl(@Param('id') id: string) {
    return this.documentsService.getDownloadUrl(id);
  }

  @Get(':id/content')
  async getContent(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const result = await this.documentsService.getFileContent(id);
    response.setHeader('Content-Type', result.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(result.fileName)}`,
    );
    return result.file;
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', documentUploadInterceptorOptions))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('objectId') objectId: string,
    @Body('rentUnitId') rentUnitId: string,
    @Body('reportYear') reportYear: string,
    @Body('category') category: string,
    @Body('title') title: string,
    @Body('uploadedBy') uploadedBy: string,
  ) {
    return this.documentsService.upload(
      file,
      objectId,
      rentUnitId,
      reportYear,
      category || 'Sonstiges',
      title,
      uploadedBy,
    );
  }

  @Post('missing')
  createMissing(
    @Body('objectId') objectId: string,
    @Body('rentUnitId') rentUnitId: string,
    @Body('reportYear') reportYear: string,
    @Body('category') category: string,
    @Body('title') title: string,
    @Body('uploadedBy') uploadedBy: string,
  ) {
    return this.documentsService.createMissing({
      objectId,
      rentUnitId,
      reportYear,
      category,
      title,
      uploadedBy,
    });
  }

  @Post(':id/file')
  @UseInterceptors(FileInterceptor('file', documentUploadInterceptorOptions))
  attachFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('uploadedBy') uploadedBy: string,
  ) {
    return this.documentsService.attachFile(id, file, uploadedBy);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.documentsService.updateStatus(id, status);
  }

  @Patch(':id')
  updateMetadata(
    @Param('id') id: string,
    @Body('objectId') objectId: string,
    @Body('rentUnitId') rentUnitId: string,
    @Body('reportYear') reportYear: string,
    @Body('category') category: string,
    @Body('title') title: string,
    @Body('uploadedBy') uploadedBy: string,
  ) {
    return this.documentsService.updateMetadata(id, {
      objectId,
      rentUnitId,
      reportYear,
      category,
      title,
      uploadedBy,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}
