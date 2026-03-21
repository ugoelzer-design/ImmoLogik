import {
  Controller, Get, Post, Delete, Patch,
  Param, Query, Body, UploadedFile, UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { DocumentsService } from "./documents.service";

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findAll(@Query("objectId") objectId?: string) {
    return this.documentsService.findAll(objectId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.documentsService.findOne(id);
  }

  @Get(":id/download")
  getDownloadUrl(@Param("id") id: string) {
    return this.documentsService.getDownloadUrl(id);
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body("objectId") objectId: string,
    @Body("objectName") objectName: string,
    @Body("category") category: string,
    @Body("title") title: string,
    @Body("uploadedBy") uploadedBy: string,
  ) {
    return this.documentsService.upload(file, objectId, objectName, category || "Sonstiges", title, uploadedBy);
  }

  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body("status") status: string) {
    return this.documentsService.updateStatus(id, status);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.documentsService.remove(id);
  }
}