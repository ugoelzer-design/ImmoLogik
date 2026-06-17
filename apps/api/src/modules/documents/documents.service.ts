import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StreamableFile } from '@nestjs/common';
import { Prisma, type Document } from '@prisma/client';
import * as path from 'path';
import sharp from 'sharp';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from './minio.service';

const DOCUMENT_STATUSES = ['Vorhanden', 'In Prüfung', 'Fehlt'] as const;
const INVALID_STORAGE_NAME_CHARS = '<>:"/\\|?*';
const COMPRESSIBLE_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png'] as const;
const IMAGE_MAX_EDGE_PX = 2000;
const IMAGE_JPEG_QUALITY = 82;
const IMAGE_PNG_QUALITY = 82;

type FindAllFilters = {
  objectId?: string;
  rentUnitId?: string;
  category?: string;
  status?: string;
  reportYear?: string;
  search?: string;
  fileState?: string;
  actionState?: string;
  skip?: number;
  take?: number;
};

const DOCUMENT_ACTION_STATES = [
  'file_missing',
  'assignment_missing',
  'review_pending',
  'status_missing',
] as const;

type DocumentActionState = (typeof DOCUMENT_ACTION_STATES)[number];

type UpdateMetadataInput = {
  objectId?: string;
  rentUnitId?: string;
  reportYear?: string;
  category?: string;
  title?: string;
  uploadedBy?: string;
};

type CreateMissingInput = {
  objectId?: string;
  rentUnitId?: string;
  reportYear?: string;
  category?: string;
  title?: string;
  uploadedBy?: string;
};

type PreparedUploadFile = {
  buffer: Buffer;
  mimeType: string;
  size: number;
};

type DuplicateCheckInput = {
  excludeId?: string;
  appTenantId: string;
  title: string;
  fileName: string;
  category: string;
  reportYear: number | null;
  objectId: string | null;
  rentUnitId: string | null;
};

type ResolvedDocumentRelations = {
  objectId: string | null;
  objectName: string | null;
  objectFolderName: string | null;
  rentUnitId: string | null;
  unitLabel: string | null;
  unitFolderName: string | null;
};

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async findAll(filters: FindAllFilters = {}, appTenantSlug = 'default') {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const normalizedObjectId = filters.objectId?.trim();
    const normalizedRentUnitId = filters.rentUnitId?.trim();
    const normalizedCategory = filters.category?.trim();
    const normalizedStatus = filters.status?.trim();
    const normalizedReportYear = filters.reportYear?.trim();
    const normalizedSearch = filters.search?.trim();
    const parsedReportYear =
      normalizedReportYear && /^\d{4}$/.test(normalizedReportYear)
        ? Number(normalizedReportYear)
        : undefined;
    const parsedSearchYear =
      normalizedSearch && /^\d{4}$/.test(normalizedSearch)
        ? Number(normalizedSearch)
        : undefined;

    const where: Prisma.DocumentWhereInput = {
      appTenantId,
      ...(normalizedObjectId ? { objectId: normalizedObjectId } : {}),
      ...(normalizedRentUnitId ? { rentUnitId: normalizedRentUnitId } : {}),
      ...(normalizedCategory ? { category: normalizedCategory } : {}),
      ...(normalizedStatus ? { status: normalizedStatus } : {}),
      ...(parsedReportYear ? { reportYear: parsedReportYear } : {}),
      ...(normalizedSearch
        ? {
            OR: [
              {
                title: {
                  contains: normalizedSearch,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                fileName: {
                  contains: normalizedSearch,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                category: {
                  contains: normalizedSearch,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                status: {
                  contains: normalizedSearch,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                uploadedBy: {
                  contains: normalizedSearch,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                objectName: {
                  contains: normalizedSearch,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                unitLabel: {
                  contains: normalizedSearch,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              ...(parsedSearchYear ? [{ reportYear: parsedSearchYear }] : []),
            ],
          }
        : {}),
    };

    const docs = await this.prisma.document.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      ...(filters.skip !== undefined ? { skip: filters.skip } : {}),
      ...(filters.take !== undefined ? { take: filters.take } : {}),
      orderBy: [{ reportYear: 'desc' }, { createdAt: 'desc' }],
    });
    const mappedDocuments = docs.map((doc) => this.mapForList(doc));

    const normalizedActionState = filters.actionState?.trim();
    const filteredByActionState =
      normalizedActionState &&
      DOCUMENT_ACTION_STATES.includes(
        normalizedActionState as DocumentActionState,
      )
        ? mappedDocuments.filter(
            (doc) => doc.actionState === normalizedActionState,
          )
        : mappedDocuments;

    if (filters.fileState === 'missing') {
      return filteredByActionState.filter((doc) => doc.fileAvailable === false);
    }

    if (filters.fileState === 'available') {
      return filteredByActionState.filter((doc) => doc.fileAvailable !== false);
    }

    return filteredByActionState;
  }

  async findOne(id: string, appTenantSlug = 'default') {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc || this.isDifferentAppTenant(doc, appTenantId))
      throw new NotFoundException('Dokument nicht gefunden.');
    return this.mapWithUrl(doc);
  }

  async exportInventoryCsv(appTenantSlug = 'default') {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const docs = await this.prisma.document.findMany({
      where: { appTenantId },
      orderBy: [
        { objectName: 'asc' },
        { unitLabel: 'asc' },
        { reportYear: 'desc' },
        { createdAt: 'desc' },
      ],
    });
    const mappedDocuments = await Promise.all(
      docs.map((doc) => this.mapWithUrl(doc)),
    );
    const header = [
      'Dokument-ID',
      'Titel',
      'Dateiname',
      'Kategorie',
      'Status',
      'Objekt',
      'Objekt-ID',
      'Einheit',
      'Einheit-ID',
      'Berichtsjahr',
      'Hochgeladen von',
      'Datei vorhanden',
      'Offener Fall',
      'Offene Punkte',
      'Storage-Key',
      'Physischer Pfad',
      'Erstellt am',
      'Aktualisiert am',
    ];
    const rows = mappedDocuments.map((doc) => [
      doc.id,
      doc.title,
      doc.fileName,
      doc.category,
      doc.status,
      doc.objectName,
      doc.objectId ?? '',
      doc.unitLabel ?? '',
      doc.rentUnitId ?? '',
      doc.reportYear ? String(doc.reportYear) : '',
      doc.uploadedBy ?? '',
      doc.fileAvailable === false ? 'Nein' : 'Ja',
      doc.actionState ?? '',
      doc.openIssues.join(' | '),
      doc.storageKey,
      doc.storagePath ?? '',
      doc.createdAt,
      doc.updatedAt,
    ]);

    const content = `\uFEFF${[header, ...rows].map((row) => row.map((value) => this.escapeCsvValue(value)).join(';')).join('\n')}`;

    return {
      fileName: 'dokumentenbestand.csv',
      content,
    };
  }

  async upload(
    file: Express.Multer.File,
    objectId: string | undefined,
    rentUnitId: string | undefined,
    reportYear: string | undefined,
    category: string,
    title: string,
    uploadedBy: string | undefined,
    appTenantSlug = 'default',
  ) {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    if (!file) {
      throw new BadRequestException('Bitte eine Datei hochladen.');
    }

    const normalizedCategory = category?.trim() || 'Sonstiges';
    const normalizedTitle = title?.trim() || file.originalname;
    const normalizedUploadedBy = uploadedBy?.trim() || null;
    const timestamp = Date.now();
    const safeName = this.sanitizeStorageFileName(file.originalname);
    const parsedReportYear = reportYear ? Number(reportYear) : null;
    const requiresReportYear =
      normalizedCategory === 'Jahresreport WEG' ||
      normalizedCategory === 'Jahresreport Wohnung' ||
      normalizedCategory === 'Nebenkostenabrechnung';

    if (
      requiresReportYear &&
      (!parsedReportYear ||
        !Number.isInteger(parsedReportYear) ||
        String(parsedReportYear).length !== 4)
    ) {
      throw new BadRequestException(
        'Für Jahresreports und Nebenkostenabrechnungen ist ein gültiges 4-stelliges Berichtsjahr erforderlich.',
      );
    }

    const relationMeta = await this.resolveDocumentRelations(
      objectId,
      rentUnitId,
      appTenantId,
    );
    await this.ensureNoDuplicateDocument({
      appTenantId,
      title: normalizedTitle,
      fileName: file.originalname,
      category: normalizedCategory,
      reportYear:
        parsedReportYear && Number.isInteger(parsedReportYear)
          ? parsedReportYear
          : null,
      objectId: relationMeta.objectId,
      rentUnitId: relationMeta.rentUnitId,
    });

    const storageKey = this.buildStorageKey(
      relationMeta,
      parsedReportYear && Number.isInteger(parsedReportYear)
        ? parsedReportYear
        : null,
      normalizedCategory,
      `${timestamp}_${safeName}`,
    );
    const preparedFile = await this.prepareUploadFile(file);

    await this.minio.uploadFile(
      storageKey,
      preparedFile.buffer,
      preparedFile.mimeType,
      {
        'x-category': normalizedCategory,
        'x-object-id': relationMeta.objectId || '',
        'x-rent-unit-id': relationMeta.rentUnitId || '',
        'x-report-year': parsedReportYear ? String(parsedReportYear) : '',
      },
    );

    let doc: Document;
    try {
      doc = await this.prisma.document.create({
        data: {
          appTenantId,
          title: normalizedTitle,
          fileName: file.originalname,
          mimeType: preparedFile.mimeType,
          size: preparedFile.size,
          storageKey,
          objectId: relationMeta.objectId,
          objectName: relationMeta.objectName,
          rentUnitId: relationMeta.rentUnitId,
          unitLabel: relationMeta.unitLabel,
          reportYear:
            parsedReportYear && Number.isInteger(parsedReportYear)
              ? parsedReportYear
              : null,
          category: normalizedCategory,
          status: 'Vorhanden',
          uploadedBy: normalizedUploadedBy,
        },
      });
    } catch (error) {
      try {
        await this.minio.deleteFile(storageKey);
      } catch (cleanupError) {
        this.logger.warn(
          `Upload-Rollback konnte Datei "${storageKey}" nicht löschen: ${cleanupError}`,
        );
      }

      throw error;
    }

    return this.mapWithUrl(doc);
  }

  async createMissing(input: CreateMissingInput, appTenantSlug = 'default') {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const normalizedCategory = input.category?.trim() || 'Sonstiges';
    const normalizedTitle = input.title?.trim();
    const normalizedUploadedBy = input.uploadedBy?.trim() || null;
    const parsedReportYear = this.parseReportYear(
      input.reportYear,
      normalizedCategory,
    );

    if (!normalizedTitle) {
      throw new BadRequestException(
        'Für fehlende Dokumente ist ein Titel erforderlich.',
      );
    }

    const relationMeta = await this.resolveDocumentRelations(
      input.objectId,
      input.rentUnitId,
      appTenantId,
    );
    const placeholderFileName =
      this.buildMissingPlaceholderFileName(normalizedTitle);

    await this.ensureNoDuplicateDocument({
      appTenantId,
      title: normalizedTitle,
      fileName: placeholderFileName,
      category: normalizedCategory,
      reportYear: parsedReportYear,
      objectId: relationMeta.objectId,
      rentUnitId: relationMeta.rentUnitId,
    });

    const storageKey = this.buildStorageKey(
      relationMeta,
      parsedReportYear,
      normalizedCategory,
      placeholderFileName,
    );

    const doc = await this.prisma.document.create({
      data: {
        appTenantId,
        title: normalizedTitle,
        fileName: placeholderFileName,
        mimeType: 'application/x-immologik-missing-document',
        size: 0,
        storageKey,
        objectId: relationMeta.objectId,
        objectName: relationMeta.objectName,
        rentUnitId: relationMeta.rentUnitId,
        unitLabel: relationMeta.unitLabel,
        reportYear: parsedReportYear,
        category: normalizedCategory,
        status: 'Fehlt',
        uploadedBy: normalizedUploadedBy,
      },
    });

    return this.mapWithUrl(doc);
  }

  async attachFile(
    id: string,
    file: Express.Multer.File,
    uploadedBy?: string,
    appTenantSlug = 'default',
  ) {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    if (!file) {
      throw new BadRequestException('Bitte eine Datei hochladen.');
    }

    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc || this.isDifferentAppTenant(doc, appTenantId)) {
      throw new NotFoundException('Dokument nicht gefunden.');
    }

    const relationMeta = await this.resolveDocumentRelations(
      doc.objectId ?? undefined,
      doc.rentUnitId ?? undefined,
      appTenantId,
    );
    const timestamp = Date.now();
    const safeName = this.sanitizeStorageFileName(file.originalname);
    const nextStorageKey = this.buildStorageKey(
      relationMeta,
      doc.reportYear,
      doc.category || 'Sonstiges',
      `${timestamp}_${safeName}`,
    );
    const normalizedUploadedBy = uploadedBy?.trim() || doc.uploadedBy || null;
    const previousFileExists = await this.minio.fileExists(doc.storageKey);
    const preparedFile = await this.prepareUploadFile(file);

    await this.minio.uploadFile(
      nextStorageKey,
      preparedFile.buffer,
      preparedFile.mimeType,
      {
        'x-category': doc.category || 'Sonstiges',
        'x-object-id': relationMeta.objectId || '',
        'x-rent-unit-id': relationMeta.rentUnitId || '',
        'x-report-year': doc.reportYear ? String(doc.reportYear) : '',
      },
    );

    let updated: Document;
    try {
      updated = await this.prisma.document.update({
        where: { id },
        data: {
          fileName: file.originalname,
          mimeType: preparedFile.mimeType,
          size: preparedFile.size,
          storageKey: nextStorageKey,
          uploadedBy: normalizedUploadedBy,
          status: 'Vorhanden',
        },
      });
    } catch (error) {
      try {
        await this.minio.deleteFile(nextStorageKey);
      } catch (cleanupError) {
        this.logger.warn(
          `Datei-Rollback konnte Datei "${nextStorageKey}" nicht löschen: ${cleanupError}`,
        );
      }

      throw error;
    }

    if (previousFileExists && doc.storageKey !== nextStorageKey) {
      try {
        await this.minio.deleteFile(doc.storageKey);
      } catch (cleanupError) {
        this.logger.warn(
          `Alte Dokumentdatei "${doc.storageKey}" konnte nach Ersetzung nicht gelöscht werden: ${cleanupError}`,
        );
      }
    }

    return this.mapWithUrl(updated);
  }

  private async prepareUploadFile(
    file: Express.Multer.File,
  ): Promise<PreparedUploadFile> {
    if (
      !COMPRESSIBLE_IMAGE_MIME_TYPES.includes(
        file.mimetype as (typeof COMPRESSIBLE_IMAGE_MIME_TYPES)[number],
      )
    ) {
      return {
        buffer: file.buffer,
        mimeType: file.mimetype,
        size: file.size,
      };
    }

    try {
      const image = sharp(file.buffer).rotate().resize({
        width: IMAGE_MAX_EDGE_PX,
        height: IMAGE_MAX_EDGE_PX,
        fit: 'inside',
        withoutEnlargement: true,
      });
      const buffer =
        file.mimetype === 'image/png'
          ? await image
              .png({ quality: IMAGE_PNG_QUALITY, compressionLevel: 9 })
              .toBuffer()
          : await image
              .jpeg({ quality: IMAGE_JPEG_QUALITY, mozjpeg: true })
              .toBuffer();

      return {
        buffer,
        mimeType: file.mimetype,
        size: buffer.length,
      };
    } catch (error) {
      this.logger.warn(
        `Bildkomprimierung fehlgeschlagen, Original wird gespeichert: ${error}`,
      );

      return {
        buffer: file.buffer,
        mimeType: file.mimetype,
        size: file.size,
      };
    }
  }

  private async resolveDocumentRelations(
    objectId?: string,
    rentUnitId?: string,
    appTenantId?: string,
  ): Promise<ResolvedDocumentRelations> {
    const normalizedObjectId = objectId?.trim() || null;
    const normalizedRentUnitId = rentUnitId?.trim() || null;

    let resolvedObjectId = normalizedObjectId;
    let resolvedObjectName: string | null = null;
    let resolvedObjectFolderName: string | null = null;
    const resolvedRentUnitId = normalizedRentUnitId;
    let resolvedUnitLabel: string | null = null;
    let resolvedUnitFolderName: string | null = null;

    if (resolvedRentUnitId) {
      const rentUnit = await this.prisma.rentUnit.findUnique({
        where: { id: resolvedRentUnitId },
        include: {
          object: true,
        },
      });

      if (!rentUnit) {
        throw new BadRequestException('Mieteinheit nicht gefunden.');
      }

      if (
        appTenantId &&
        this.isDifferentAppTenant(rentUnit.object, appTenantId)
      ) {
        throw new BadRequestException('Mieteinheit nicht gefunden.');
      }

      if (resolvedObjectId && rentUnit.objectId !== resolvedObjectId) {
        throw new BadRequestException(
          'Mieteinheit gehört nicht zum gewählten Objekt.',
        );
      }

      resolvedObjectId = rentUnit.objectId;
      resolvedObjectName = `${rentUnit.object.displayId} · ${rentUnit.object.name}`;
      resolvedObjectFolderName = this.buildObjectFolderName(
        rentUnit.object.displayId,
        rentUnit.object.name,
      );
      resolvedUnitLabel = rentUnit.unitLabel;
      resolvedUnitFolderName = this.buildUnitFolderName(rentUnit.unitLabel);
    }

    if (resolvedObjectId && !resolvedObjectName) {
      const object = await this.prisma.propertyObject.findUnique({
        where: { id: resolvedObjectId },
      });

      if (
        !object ||
        (appTenantId && this.isDifferentAppTenant(object, appTenantId))
      ) {
        throw new BadRequestException('Objekt nicht gefunden.');
      }

      resolvedObjectName = `${object.displayId} · ${object.name}`;
      resolvedObjectFolderName = this.buildObjectFolderName(
        object.displayId,
        object.name,
      );
    }

    return {
      objectId: resolvedObjectId,
      objectName: resolvedObjectName,
      objectFolderName: resolvedObjectFolderName,
      rentUnitId: resolvedRentUnitId,
      unitLabel: resolvedUnitLabel,
      unitFolderName: resolvedUnitFolderName,
    };
  }

  async getDownloadUrl(
    id: string,
    appTenantSlug = 'default',
  ): Promise<{ url: string }> {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc || this.isDifferentAppTenant(doc, appTenantId))
      throw new NotFoundException('Dokument nicht gefunden.');
    const fileAvailable = await this.minio.fileExists(doc.storageKey);
    if (!fileAvailable) {
      throw new NotFoundException('Datei fehlt in der Ablage.');
    }
    const url = await this.minio.getPresignedUrl(doc.storageKey, 3600, doc.id);
    return { url };
  }

  async getStorageStatus() {
    return this.minio.getStorageStatus();
  }

  async getFileContent(
    id: string,
    appTenantSlug = 'default',
  ): Promise<{
    file: StreamableFile;
    mimeType: string;
    fileName: string;
  }> {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc || this.isDifferentAppTenant(doc, appTenantId))
      throw new NotFoundException('Dokument nicht gefunden.');
    const fileAvailable = await this.minio.fileExists(doc.storageKey);
    if (!fileAvailable) {
      throw new NotFoundException('Datei fehlt in der Ablage.');
    }

    const stream = await this.minio.getFileStream(doc.storageKey);
    return {
      file: new StreamableFile(stream),
      mimeType: doc.mimeType || 'application/octet-stream',
      fileName: doc.fileName,
    };
  }

  async remove(id: string, appTenantSlug = 'default'): Promise<void> {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc || this.isDifferentAppTenant(doc, appTenantId))
      throw new NotFoundException('Dokument nicht gefunden.');
    await this.minio.deleteFile(doc.storageKey);
    await this.prisma.document.delete({ where: { id } });
  }

  async updateStatus(id: string, status: string, appTenantSlug = 'default') {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const normalizedStatus = status?.trim();
    if (
      !normalizedStatus ||
      !DOCUMENT_STATUSES.includes(
        normalizedStatus as (typeof DOCUMENT_STATUSES)[number],
      )
    ) {
      throw new BadRequestException('Ungültiger Dokumentstatus.');
    }

    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc || this.isDifferentAppTenant(doc, appTenantId))
      throw new NotFoundException('Dokument nicht gefunden.');
    const updated = await this.prisma.document.update({
      where: { id },
      data: { status: normalizedStatus },
    });
    return this.mapWithUrl(updated);
  }

  async updateMetadata(
    id: string,
    input: UpdateMetadataInput,
    appTenantSlug = 'default',
  ) {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc || this.isDifferentAppTenant(doc, appTenantId)) {
      throw new NotFoundException('Dokument nicht gefunden.');
    }

    const normalizedCategory =
      input.category?.trim() || doc.category || 'Sonstiges';
    const normalizedTitle = input.title?.trim() || doc.title;
    const normalizedUploadedBy = input.uploadedBy?.trim() || null;
    const normalizedReportYear = input.reportYear?.trim();
    const parsedReportYear = this.parseReportYear(
      normalizedReportYear === undefined ? undefined : normalizedReportYear,
      normalizedCategory,
      doc.reportYear,
    );

    const relationMeta = await this.resolveDocumentRelations(
      input.objectId,
      input.rentUnitId,
      appTenantId,
    );
    await this.ensureNoDuplicateDocument({
      excludeId: doc.id,
      appTenantId,
      title: normalizedTitle,
      fileName: doc.fileName,
      category: normalizedCategory,
      reportYear:
        parsedReportYear && Number.isInteger(parsedReportYear)
          ? parsedReportYear
          : null,
      objectId: relationMeta.objectId,
      rentUnitId: relationMeta.rentUnitId,
    });
    const nextStorageKey = this.buildStorageKey(
      relationMeta,
      parsedReportYear && Number.isInteger(parsedReportYear)
        ? parsedReportYear
        : null,
      normalizedCategory,
      this.sanitizeStorageFileName(path.posix.basename(doc.storageKey)),
    );

    const storageMoved = nextStorageKey !== doc.storageKey;
    const sourceFileExists = storageMoved
      ? await this.minio.fileExists(doc.storageKey)
      : false;

    if (storageMoved && sourceFileExists) {
      await this.minio.moveFile(doc.storageKey, nextStorageKey);
    }

    let updated: Document;
    try {
      updated = await this.prisma.document.update({
        where: { id },
        data: {
          title: normalizedTitle,
          category: normalizedCategory,
          uploadedBy: normalizedUploadedBy,
          reportYear:
            parsedReportYear && Number.isInteger(parsedReportYear)
              ? parsedReportYear
              : null,
          objectId: relationMeta.objectId,
          objectName: relationMeta.objectName,
          rentUnitId: relationMeta.rentUnitId,
          unitLabel: relationMeta.unitLabel,
          storageKey: nextStorageKey,
        },
      });
    } catch (error) {
      if (storageMoved && sourceFileExists) {
        try {
          await this.minio.moveFile(nextStorageKey, doc.storageKey);
        } catch (rollbackError) {
          this.logger.warn(
            `Metadaten-Rollback konnte Datei nicht zurück nach "${doc.storageKey}" verschieben: ${rollbackError}`,
          );
        }
      }

      throw error;
    }

    return this.mapWithUrl(updated);
  }

  private mapForList(doc: Document) {
    const fileAvailable = doc.status !== 'Fehlt';
    const openIssues = this.getOpenIssues(doc, fileAvailable);
    const actionState = this.getPrimaryActionState(doc, fileAvailable);

    return this.toResponse(doc, {
      downloadUrl: null,
      fileAvailable,
      openIssues,
      actionState,
    });
  }

  private async mapWithUrl(doc: Document) {
    let downloadUrl: string | null = null;
    let fileAvailable = true;

    try {
      fileAvailable = await this.minio.fileExists(doc.storageKey);
    } catch (err) {
      this.logger.warn(
        `Dateiverfügbarkeit konnte nicht geprüft werden für storageKey="${doc.storageKey}": ${err}`,
      );
      fileAvailable = false;
    }

    if (fileAvailable) {
      try {
        downloadUrl = await this.minio.getPresignedUrl(
          doc.storageKey,
          3600,
          doc.id,
        );
      } catch (err) {
        this.logger.warn(
          `Presigned URL konnte nicht erstellt werden für storageKey="${doc.storageKey}": ${err}`,
        );
      }
    }

    const openIssues = this.getOpenIssues(doc, fileAvailable);
    const actionState = this.getPrimaryActionState(doc, fileAvailable);

    return this.toResponse(doc, {
      downloadUrl,
      fileAvailable,
      openIssues,
      actionState,
    });
  }

  private toResponse(
    doc: Document,
    options: {
      downloadUrl: string | null;
      fileAvailable: boolean;
      openIssues: string[];
      actionState: DocumentActionState | null;
    },
  ) {
    return {
      id: doc.id,
      title: doc.title,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      size: doc.size,
      objectId: doc.objectId,
      objectName: doc.objectName || 'Allgemein',
      rentUnitId: doc.rentUnitId,
      unitLabel: doc.unitLabel,
      reportYear: doc.reportYear,
      category: doc.category || 'Sonstiges',
      status: doc.status || 'Vorhanden',
      uploadedBy: doc.uploadedBy,
      downloadUrl: options.downloadUrl,
      storageKey: doc.storageKey,
      storagePath: this.minio.getPhysicalPath(doc.storageKey),
      fileAvailable: options.fileAvailable,
      openIssues: options.openIssues,
      actionState: options.actionState,
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
    };
  }

  private getOpenIssues(doc: Document, fileAvailable: boolean) {
    const issues: string[] = [];

    if (fileAvailable === false) {
      issues.push('Datei fehlt in der Ablage');
    }

    if (!doc.objectId) {
      issues.push('Keine Objektzuordnung hinterlegt');
    }

    if (doc.status === 'In Prüfung') {
      issues.push('Dokument wartet auf Prüfung');
    }

    if (doc.status === 'Fehlt') {
      issues.push('Dokument ist fachlich als fehlend markiert');
    }

    return issues;
  }

  private getPrimaryActionState(
    doc: Document,
    fileAvailable: boolean,
  ): DocumentActionState | null {
    if (fileAvailable === false) {
      return 'file_missing';
    }

    if (!doc.objectId) {
      return 'assignment_missing';
    }

    if (doc.status === 'In Prüfung') {
      return 'review_pending';
    }

    if (doc.status === 'Fehlt') {
      return 'status_missing';
    }

    return null;
  }

  private async ensureNoDuplicateDocument(input: DuplicateCheckInput) {
    const duplicate = await this.prisma.document.findFirst({
      where: {
        ...(input.excludeId ? { NOT: { id: input.excludeId } } : {}),
        appTenantId: input.appTenantId,
        title: input.title,
        fileName: input.fileName,
        category: input.category,
        reportYear: input.reportYear,
        objectId: input.objectId,
        rentUnitId: input.rentUnitId,
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new BadRequestException(
        'Ein gleiches Dokument ist für dieselbe Zuordnung bereits vorhanden.',
      );
    }
  }

  private async resolveAppTenantId(appTenantSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: appTenantSlug },
      select: { id: true },
    });

    if (!tenant) {
      throw new NotFoundException('Mandant nicht gefunden.');
    }

    return tenant.id;
  }

  private isDifferentAppTenant(
    record: { appTenantId?: string | null },
    appTenantId: string,
  ) {
    return record.appTenantId !== undefined && record.appTenantId !== appTenantId;
  }

  private parseReportYear(
    reportYear: string | undefined,
    category: string,
    fallback?: number | null,
  ) {
    const normalizedReportYear = reportYear?.trim();
    const parsedReportYear =
      normalizedReportYear === undefined
        ? (fallback ?? null)
        : normalizedReportYear === ''
          ? null
          : Number(normalizedReportYear);

    const requiresReportYear =
      category === 'Jahresreport WEG' ||
      category === 'Jahresreport Wohnung' ||
      category === 'Nebenkostenabrechnung';

    if (
      requiresReportYear &&
      (!parsedReportYear ||
        !Number.isInteger(parsedReportYear) ||
        String(parsedReportYear).length !== 4)
    ) {
      throw new BadRequestException(
        'Für Jahresreports und Nebenkostenabrechnungen ist ein gültiges 4-stelliges Berichtsjahr erforderlich.',
      );
    }

    if (
      parsedReportYear !== null &&
      (!Number.isInteger(parsedReportYear) ||
        String(parsedReportYear).length !== 4)
    ) {
      throw new BadRequestException('Berichtsjahr muss 4-stellig sein.');
    }

    return parsedReportYear;
  }

  private buildMissingPlaceholderFileName(title: string) {
    const safeTitle = this.sanitizeStorageSegment(title);
    return `fehlend_${safeTitle}.missing`;
  }

  private buildObjectFolderName(displayId: string, name: string) {
    return this.sanitizeStorageSegment(`${displayId} ${name}`);
  }

  private buildUnitFolderName(unitLabel: string) {
    return this.sanitizeStorageSegment(unitLabel);
  }

  private buildStorageKey(
    relationMeta: ResolvedDocumentRelations,
    reportYear: number | null,
    category: string,
    fileName: string,
  ) {
    const yearSegment = reportYear ? String(reportYear) : 'ohne-jahr';
    const baseFolder = relationMeta.objectFolderName
      ? `wegs/${relationMeta.objectFolderName}`
      : 'allgemein';
    const unitFolder = relationMeta.unitFolderName
      ? `/wohnungen/${relationMeta.unitFolderName}`
      : '';
    const historyFolder = reportYear ? `/historie/${yearSegment}` : '';
    const categoryFolder = this.sanitizeStorageSegment(category);

    return `${baseFolder}${unitFolder}${historyFolder}/${categoryFolder}/${fileName}`;
  }

  private sanitizeStorageSegment(value: string) {
    const sanitized = this.normalizeStorageValue(value).replace(/\s+/g, '_');

    return this.ensureSafeStorageName(sanitized || 'unbekannt');
  }

  private sanitizeStorageFileName(value: string) {
    const parsedFileName = path.posix.parse(value);
    const baseName = this.ensureSafeStorageName(
      this.normalizeStorageValue(parsedFileName.name).replace(/\s+/g, '_') ||
        'datei',
    );
    const extension = this.normalizeStorageValue(parsedFileName.ext).replace(
      /\s+/g,
      '_',
    );

    return `${baseName}${extension}`;
  }

  private normalizeStorageValue(value: string) {
    return value
      .split('')
      .map((char) =>
        INVALID_STORAGE_NAME_CHARS.includes(char) || char.charCodeAt(0) <= 31
          ? '_'
          : char,
      )
      .join('')
      .replace(/\.+$/g, '')
      .trim();
  }

  private ensureSafeStorageName(value: string) {
    const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

    if (reservedNames.test(value)) {
      return `${value}_`;
    }

    return value;
  }

  private escapeCsvValue(value: string) {
    const normalizedValue = value.replaceAll('"', '""');
    return `"${normalizedValue}"`;
  }
}
