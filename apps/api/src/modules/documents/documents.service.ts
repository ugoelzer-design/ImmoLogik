import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MinioService } from "./minio.service";

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async findAll(objectId?: string) {
    const docs = await this.prisma.document.findMany({
      where: objectId ? { objectId } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return Promise.all(docs.map((d) => this.mapWithUrl(d)));
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException("Dokument nicht gefunden.");
    return this.mapWithUrl(doc);
  }

  async upload(
    file: Express.Multer.File,
    objectId: string | undefined,
    objectName: string | undefined,
    category: string,
    title: string,
    uploadedBy: string | undefined,
  ) {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const folder = objectId ? `wegs/${objectId}/${category}` : `allgemein/${category}`;
    const storageKey = `${folder}/${timestamp}_${safeName}`;

    await this.minio.uploadFile(storageKey, file.buffer, file.mimetype, {
      "x-category": category,
      "x-object-id": objectId || "",
    });

    const doc = await this.prisma.document.create({
      data: {
        title: title || file.originalname,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storageKey,
        objectId: objectId || null,
        objectName: objectName || null,
        category,
        status: "Vorhanden",
        uploadedBy: uploadedBy || null,
      },
    });

    return this.mapWithUrl(doc);
  }

  async getDownloadUrl(id: string): Promise<{ url: string }> {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException("Dokument nicht gefunden.");
    const url = await this.minio.getPresignedUrl(doc.storageKey);
    return { url };
  }

  async remove(id: string): Promise<void> {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException("Dokument nicht gefunden.");
    await this.minio.deleteFile(doc.storageKey);
    await this.prisma.document.delete({ where: { id } });
  }

  async updateStatus(id: string, status: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException("Dokument nicht gefunden.");
    return this.prisma.document.update({ where: { id }, data: { status } });
  }

  private async mapWithUrl(doc: any) {
    let downloadUrl: string | null = null;
    try {
      downloadUrl = await this.minio.getPresignedUrl(doc.storageKey, 3600);
    } catch {}
    return {
      id: doc.id,
      title: doc.title,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      size: doc.size,
      objectId: doc.objectId,
      objectName: doc.objectName || "Allgemein",
      category: doc.category || "Sonstiges",
      status: doc.status || "Vorhanden",
      uploadedBy: doc.uploadedBy,
      downloadUrl,
      createdAt: new Intl.DateTimeFormat("de-DE").format(new Date(doc.createdAt)),
      updatedAt: new Intl.DateTimeFormat("de-DE").format(new Date(doc.updatedAt)),
    };
  }
}