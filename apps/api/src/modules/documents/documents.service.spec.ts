/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import sharp from 'sharp';
import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: {
    tenant: {
      findUnique: jest.Mock;
    };
    document: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    rentUnit: {
      findUnique: jest.Mock;
    };
    propertyObject: {
      findUnique: jest.Mock;
    };
  };
  let minio: {
    uploadFile: jest.Mock;
    getPresignedUrl: jest.Mock;
    deleteFile: jest.Mock;
    getFileStream: jest.Mock;
    moveFile: jest.Mock;
    getPhysicalPath: jest.Mock;
    fileExists: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
      },
      document: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      rentUnit: {
        findUnique: jest.fn(),
      },
      propertyObject: {
        findUnique: jest.fn(),
      },
    };
    minio = {
      uploadFile: jest.fn(),
      getPresignedUrl: jest.fn(),
      deleteFile: jest.fn(),
      getFileStream: jest.fn(),
      moveFile: jest.fn(),
      getPhysicalPath: jest.fn().mockReturnValue(null),
      fileExists: jest.fn().mockResolvedValue(true),
    };

    service = new DocumentsService(prisma as never, minio as never);
  });

  it('maps documents to API shape with ISO dates and defaults', async () => {
    prisma.document.findMany.mockResolvedValueOnce([
      {
        id: 'doc-1',
        title: 'Beleg',
        fileName: 'beleg.pdf',
        mimeType: 'application/pdf',
        size: 123,
        storageKey: 'docs/beleg.pdf',
        objectId: null,
        objectName: null,
        rentUnitId: null,
        unitLabel: null,
        reportYear: null,
        category: null,
        status: null,
        uploadedBy: null,
        createdAt: new Date('2026-03-22T10:00:00.000Z'),
        updatedAt: new Date('2026-03-22T11:00:00.000Z'),
      },
    ]);
    const result = await service.findAll();

    expect(result).toEqual([
      {
        id: 'doc-1',
        title: 'Beleg',
        fileName: 'beleg.pdf',
        mimeType: 'application/pdf',
        size: 123,
        storageKey: 'docs/beleg.pdf',
        objectId: null,
        objectName: 'Allgemein',
        rentUnitId: null,
        unitLabel: null,
        reportYear: null,
        category: 'Sonstiges',
        status: 'Vorhanden',
        uploadedBy: null,
        downloadUrl: null,
        storagePath: null,
        fileAvailable: true,
        openIssues: ['Keine Objektzuordnung hinterlegt'],
        actionState: 'assignment_missing',
        createdAt: '2026-03-22T10:00:00.000Z',
        updatedAt: '2026-03-22T11:00:00.000Z',
      },
    ]);
    expect(minio.fileExists).not.toHaveBeenCalled();
    expect(minio.getPresignedUrl).not.toHaveBeenCalled();
  });

  it('exports the document inventory as csv for backup and stock checks', async () => {
    prisma.document.findMany.mockResolvedValueOnce([
      {
        id: 'doc-1',
        title: 'Abrechnung 2025',
        fileName: 'abrechnung-2025.pdf',
        mimeType: 'application/pdf',
        size: 456,
        storageKey:
          'wegs/WEG-001_Sonnenhof/historie/2025/Nebenkostenabrechnung/abrechnung-2025.pdf',
        objectId: 'obj-1',
        objectName: 'WEG-001 · Sonnenhof',
        rentUnitId: null,
        unitLabel: null,
        reportYear: 2025,
        category: 'Nebenkostenabrechnung',
        status: 'Fehlt',
        uploadedBy: 'Sachbearbeitung',
        createdAt: new Date('2026-03-22T10:00:00.000Z'),
        updatedAt: new Date('2026-03-22T11:00:00.000Z'),
      },
    ]);
    minio.fileExists.mockResolvedValueOnce(false);
    minio.getPhysicalPath.mockReturnValueOnce(
      'C:\\Users\\ugoel\\OneDrive\\immologik\\Dokumente\\wegs\\WEG-001_Sonnenhof\\historie\\2025\\Nebenkostenabrechnung\\abrechnung-2025.pdf',
    );

    const result = await service.exportInventoryCsv();

    expect(result.fileName).toBe('dokumentenbestand.csv');
    expect(result.content).toContain('"Dokument-ID";"Titel"');
    expect(result.content).toContain('"doc-1"');
    expect(result.content).toContain('"Nebenkostenabrechnung"');
    expect(result.content).toContain('"Nein"');
    expect(result.content).toContain('"file_missing"');
    expect(result.content).toContain(
      '"Datei fehlt in der Ablage | Dokument ist fachlich als fehlend markiert"',
    );
    expect(result.content).toContain(
      '"C:\\Users\\ugoel\\OneDrive\\immologik\\Dokumente\\wegs\\WEG-001_Sonnenhof\\historie\\2025\\Nebenkostenabrechnung\\abrechnung-2025.pdf"',
    );
  });

  it('filters document loading by object and rent unit when provided', async () => {
    prisma.document.findMany.mockResolvedValueOnce([]);

    await service.findAll({
      objectId: 'object-1',
      rentUnitId: 'unit-7',
      category: 'Mietvertrag',
      status: 'In Prüfung',
      reportYear: '2025',
    });

    expect(prisma.document.findMany).toHaveBeenCalledWith({
      where: {
        appTenantId: 'tenant-1',
        objectId: 'object-1',
        rentUnitId: 'unit-7',
        category: 'Mietvertrag',
        status: 'In Prüfung',
        reportYear: 2025,
      },
      orderBy: [{ reportYear: 'desc' }, { createdAt: 'desc' }],
    });
  });

  it('filters mapped documents by missing file state when requested', async () => {
    prisma.document.findMany.mockResolvedValueOnce([
      {
        id: 'doc-available',
        title: 'Vorhanden',
        fileName: 'vorhanden.pdf',
        mimeType: 'application/pdf',
        size: 123,
        storageKey: 'docs/vorhanden.pdf',
        objectId: null,
        objectName: null,
        rentUnitId: null,
        unitLabel: null,
        reportYear: null,
        category: null,
        status: null,
        uploadedBy: null,
        createdAt: new Date('2026-03-22T10:00:00.000Z'),
        updatedAt: new Date('2026-03-22T11:00:00.000Z'),
      },
      {
        id: 'doc-missing-filter',
        title: 'Fehlt',
        fileName: 'fehlt.pdf',
        mimeType: 'application/pdf',
        size: 123,
        storageKey: 'docs/fehlt.pdf',
        objectId: null,
        objectName: null,
        rentUnitId: null,
        unitLabel: null,
        reportYear: null,
        category: null,
        status: 'Fehlt',
        uploadedBy: null,
        createdAt: new Date('2026-03-22T10:00:00.000Z'),
        updatedAt: new Date('2026-03-22T11:00:00.000Z'),
      },
    ]);
    const result = await service.findAll({ fileState: 'missing' });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('doc-missing-filter');
    expect(minio.fileExists).not.toHaveBeenCalled();
    expect(minio.getPresignedUrl).not.toHaveBeenCalled();
  });

  it('includes search conditions when loading documents', async () => {
    prisma.document.findMany.mockResolvedValueOnce([]);

    await service.findAll({
      search: 'WEG-001',
    });

    expect(prisma.document.findMany).toHaveBeenCalledWith({
      where: {
        appTenantId: 'tenant-1',
        OR: [
          { title: { contains: 'WEG-001', mode: 'insensitive' } },
          { fileName: { contains: 'WEG-001', mode: 'insensitive' } },
          { category: { contains: 'WEG-001', mode: 'insensitive' } },
          { status: { contains: 'WEG-001', mode: 'insensitive' } },
          { uploadedBy: { contains: 'WEG-001', mode: 'insensitive' } },
          { objectName: { contains: 'WEG-001', mode: 'insensitive' } },
          { unitLabel: { contains: 'WEG-001', mode: 'insensitive' } },
        ],
      },
      orderBy: [{ reportYear: 'desc' }, { createdAt: 'desc' }],
    });
  });

  it('uploads a document and persists metadata', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1710000000000);
    minio.getPresignedUrl.mockResolvedValueOnce(
      'https://download.test/uploaded',
    );
    prisma.document.create.mockResolvedValueOnce({
      id: 'doc-2',
      title: 'Vertrag',
      fileName: 'vertrag.pdf',
      mimeType: 'application/pdf',
      size: 456,
      storageKey:
        'wegs/WEG-001_Musterhaus/wohnungen/WE_07/historie/2025/Mietvertrag/1710000000000_vertrag.pdf',
      objectId: 'object-1',
      objectName: 'WEG-001 · Musterhaus',
      rentUnitId: 'unit-7',
      unitLabel: 'WE 07',
      reportYear: 2025,
      category: 'Mietvertrag',
      status: 'Vorhanden',
      uploadedBy: 'Tester',
      createdAt: new Date('2026-03-22T12:00:00.000Z'),
      updatedAt: new Date('2026-03-22T12:00:00.000Z'),
    });

    const file = {
      originalname: 'vertrag.pdf',
      mimetype: 'application/pdf',
      size: 456,
      buffer: Buffer.from('pdf'),
    } as Express.Multer.File;

    prisma.rentUnit.findUnique.mockResolvedValueOnce({
      id: 'unit-7',
      objectId: 'object-1',
      unitLabel: 'WE 07',
      object: {
        id: 'object-1',
        displayId: 'WEG-001',
        name: 'Musterhaus',
      },
    });

    const result = await service.upload(
      file,
      'object-1',
      'unit-7',
      '2025',
      'Mietvertrag',
      'Vertrag',
      'Tester',
    );

    expect(minio.uploadFile).toHaveBeenCalledWith(
      'wegs/WEG-001_Musterhaus/wohnungen/WE_07/historie/2025/Mietvertrag/1710000000000_vertrag.pdf',
      file.buffer,
      'application/pdf',
      {
        'x-category': 'Mietvertrag',
        'x-object-id': 'object-1',
        'x-rent-unit-id': 'unit-7',
        'x-report-year': '2025',
      },
    );
    expect(prisma.document.create).toHaveBeenCalled();
    expect(result.downloadUrl).toBe('https://download.test/uploaded');

    jest.restoreAllMocks();
  });

  it('compresses image uploads before storing them', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1710000000004);
    minio.getPresignedUrl.mockResolvedValueOnce(
      'https://download.test/photo',
    );
    prisma.document.create.mockImplementationOnce(async ({ data }) => ({
      id: 'doc-photo',
      ...data,
      objectName: null,
      unitLabel: null,
      createdAt: new Date('2026-03-22T12:00:00.000Z'),
      updatedAt: new Date('2026-03-22T12:00:00.000Z'),
    }));

    const originalBuffer = await sharp({
      create: {
        width: 3200,
        height: 1800,
        channels: 3,
        background: '#d97706',
      },
    })
      .jpeg({ quality: 100 })
      .toBuffer();
    const file = {
      originalname: 'foto.jpg',
      mimetype: 'image/jpeg',
      size: originalBuffer.length,
      buffer: originalBuffer,
    } as Express.Multer.File;

    await service.upload(
      file,
      undefined,
      undefined,
      undefined,
      'Foto',
      'Foto',
      undefined,
    );

    const storedBuffer = minio.uploadFile.mock.calls[0][1] as Buffer;
    const storedMetadata = await sharp(storedBuffer).metadata();

    expect(storedBuffer).not.toBe(originalBuffer);
    expect(storedMetadata.width).toBeLessThanOrEqual(2000);
    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mimeType: 'image/jpeg',
          size: storedBuffer.length,
        }),
      }),
    );

    jest.restoreAllMocks();
  });

  it('rejects duplicate uploads for the same assignment', async () => {
    const file = {
      originalname: 'vertrag.pdf',
      mimetype: 'application/pdf',
      size: 456,
      buffer: Buffer.from('pdf'),
    } as Express.Multer.File;

    prisma.rentUnit.findUnique.mockResolvedValueOnce({
      id: 'unit-7',
      objectId: 'object-1',
      unitLabel: 'WE 07',
      object: {
        id: 'object-1',
        displayId: 'WEG-001',
        name: 'Musterhaus',
      },
    });
    prisma.document.findFirst.mockResolvedValueOnce({ id: 'doc-duplicate' });

    await expect(
      service.upload(
        file,
        'object-1',
        'unit-7',
        '2025',
        'Mietvertrag',
        'Vertrag',
        'Tester',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(minio.uploadFile).not.toHaveBeenCalled();
    expect(prisma.document.create).not.toHaveBeenCalled();
  });

  it('creates missing documents without uploading a file', async () => {
    prisma.propertyObject.findUnique.mockResolvedValueOnce({
      id: 'object-1',
      displayId: 'WEG-001',
      name: 'Musterhaus',
    });
    prisma.document.create.mockResolvedValueOnce({
      id: 'doc-missing-1',
      title: 'Jahresreport 2025 fehlt',
      fileName: 'fehlend_Jahresreport_2025_fehlt.missing',
      mimeType: 'application/x-immologik-missing-document',
      size: 0,
      storageKey:
        'wegs/WEG-001_Musterhaus/historie/2025/Jahresreport_WEG/fehlend_Jahresreport_2025_fehlt.missing',
      objectId: 'object-1',
      objectName: 'WEG-001 · Musterhaus',
      rentUnitId: null,
      unitLabel: null,
      reportYear: 2025,
      category: 'Jahresreport WEG',
      status: 'Fehlt',
      uploadedBy: 'Tester',
      createdAt: new Date('2026-03-22T12:00:00.000Z'),
      updatedAt: new Date('2026-03-22T12:00:00.000Z'),
    });
    minio.fileExists.mockResolvedValueOnce(false);

    const result = await service.createMissing({
      objectId: 'object-1',
      reportYear: '2025',
      category: 'Jahresreport WEG',
      title: 'Jahresreport 2025 fehlt',
      uploadedBy: 'Tester',
    });

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Jahresreport 2025 fehlt',
        fileName: 'fehlend_Jahresreport_2025_fehlt.missing',
        mimeType: 'application/x-immologik-missing-document',
        size: 0,
        status: 'Fehlt',
        reportYear: 2025,
        objectId: 'object-1',
      }),
    });
    expect(minio.uploadFile).not.toHaveBeenCalled();
    expect(result.fileAvailable).toBe(false);
    expect(result.actionState).toBe('file_missing');
  });

  it('requires a title when creating a missing document', async () => {
    await expect(
      service.createMissing({
        category: 'Sonstiges',
        title: '   ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sanitizes Windows-unsafe filenames for storage keys', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1710000000002);
    minio.getPresignedUrl.mockResolvedValueOnce(
      'https://download.test/uploaded-safe',
    );
    prisma.document.create.mockResolvedValueOnce({
      id: 'doc-safe',
      title: 'Con report',
      fileName: 'CON?.pdf',
      mimeType: 'application/pdf',
      size: 111,
      storageKey: 'allgemein/Sonstiges/1710000000002_CON_.pdf',
      objectId: null,
      objectName: null,
      rentUnitId: null,
      unitLabel: null,
      reportYear: null,
      category: 'Sonstiges',
      status: 'Vorhanden',
      uploadedBy: null,
      createdAt: new Date('2026-03-22T12:00:00.000Z'),
      updatedAt: new Date('2026-03-22T12:00:00.000Z'),
    });

    const file = {
      originalname: 'CON?.pdf',
      mimetype: 'application/pdf',
      size: 111,
      buffer: Buffer.from('pdf'),
    } as Express.Multer.File;

    await service.upload(
      file,
      undefined,
      undefined,
      undefined,
      'Sonstiges',
      'Con report',
      undefined,
    );

    expect(minio.uploadFile).toHaveBeenCalledWith(
      'allgemein/Sonstiges/1710000000002_CON_.pdf',
      file.buffer,
      'application/pdf',
      {
        'x-category': 'Sonstiges',
        'x-object-id': '',
        'x-rent-unit-id': '',
        'x-report-year': '',
      },
    );

    jest.restoreAllMocks();
  });

  it('throws when requesting a missing document', async () => {
    prisma.document.findUnique.mockResolvedValueOnce(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('loads a document stream for direct downloads', async () => {
    const fileStream = { pipe: jest.fn() };
    prisma.document.findUnique.mockResolvedValueOnce({
      id: 'doc-3',
      fileName: 'vertrag.pdf',
      mimeType: 'application/pdf',
      storageKey: 'docs/vertrag.pdf',
    });
    minio.getFileStream.mockResolvedValueOnce(fileStream);

    const result = await service.getFileContent('doc-3');

    expect(minio.getFileStream).toHaveBeenCalledWith('docs/vertrag.pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.fileName).toBe('vertrag.pdf');
    expect(result.file).toBeDefined();
  });

  it('attaches a file to an existing missing document', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1710000000010);
    prisma.document.findUnique.mockResolvedValueOnce({
      id: 'doc-attach',
      title: 'Jahresreport 2025 fehlt',
      fileName: 'fehlend_Jahresreport_2025_fehlt.missing',
      mimeType: 'application/x-immologik-missing-document',
      size: 0,
      storageKey:
        'wegs/WEG-001_Musterhaus/historie/2025/Jahresreport_WEG/fehlend_Jahresreport_2025_fehlt.missing',
      objectId: 'object-1',
      objectName: 'WEG-001 · Musterhaus',
      rentUnitId: null,
      unitLabel: null,
      reportYear: 2025,
      category: 'Jahresreport WEG',
      status: 'Fehlt',
      uploadedBy: null,
      createdAt: new Date('2026-03-22T12:00:00.000Z'),
      updatedAt: new Date('2026-03-22T12:00:00.000Z'),
    });
    prisma.propertyObject.findUnique.mockResolvedValueOnce({
      id: 'object-1',
      displayId: 'WEG-001',
      name: 'Musterhaus',
    });
    minio.fileExists.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    minio.getPresignedUrl.mockResolvedValueOnce(
      'https://download.test/attached',
    );
    prisma.document.update.mockResolvedValueOnce({
      id: 'doc-attach',
      title: 'Jahresreport 2025 fehlt',
      fileName: 'jahresreport-2025.pdf',
      mimeType: 'application/pdf',
      size: 999,
      storageKey:
        'wegs/WEG-001_Musterhaus/historie/2025/Jahresreport_WEG/1710000000010_jahresreport-2025.pdf',
      objectId: 'object-1',
      objectName: 'WEG-001 · Musterhaus',
      rentUnitId: null,
      unitLabel: null,
      reportYear: 2025,
      category: 'Jahresreport WEG',
      status: 'Vorhanden',
      uploadedBy: 'Tester',
      createdAt: new Date('2026-03-22T12:00:00.000Z'),
      updatedAt: new Date('2026-03-23T12:00:00.000Z'),
    });

    const file = {
      originalname: 'jahresreport-2025.pdf',
      mimetype: 'application/pdf',
      size: 999,
      buffer: Buffer.from('pdf'),
    } as Express.Multer.File;

    const result = await service.attachFile('doc-attach', file, 'Tester');

    expect(minio.uploadFile).toHaveBeenCalledWith(
      'wegs/WEG-001_Musterhaus/historie/2025/Jahresreport_WEG/1710000000010_jahresreport-2025.pdf',
      file.buffer,
      'application/pdf',
      expect.objectContaining({
        'x-category': 'Jahresreport WEG',
        'x-object-id': 'object-1',
      }),
    );
    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-attach' },
      data: expect.objectContaining({
        fileName: 'jahresreport-2025.pdf',
        mimeType: 'application/pdf',
        size: 999,
        status: 'Vorhanden',
      }),
    });
    expect(result.downloadUrl).toBe('https://download.test/attached');
    expect(result.fileAvailable).toBe(true);

    jest.restoreAllMocks();
  });

  it('rejects direct download urls when the physical file is missing', async () => {
    prisma.document.findUnique.mockResolvedValueOnce({
      id: 'doc-4',
      storageKey: 'docs/fehlt.pdf',
    });
    minio.fileExists.mockResolvedValueOnce(false);

    await expect(service.getDownloadUrl('doc-4')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects direct file content when the physical file is missing', async () => {
    prisma.document.findUnique.mockResolvedValueOnce({
      id: 'doc-5',
      fileName: 'fehlt.pdf',
      mimeType: 'application/pdf',
      storageKey: 'docs/fehlt.pdf',
    });
    minio.fileExists.mockResolvedValueOnce(false);

    await expect(service.getFileContent('doc-5')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns the active storage status', async () => {
    (minio as { getStorageStatus?: jest.Mock }).getStorageStatus = jest
      .fn()
      .mockReturnValue({
        mode: 'filesystem',
        rootPath: 'C:\\Users\\ugoel\\OneDrive\\immologik\\Dokumente',
        available: true,
      });

    await expect(service.getStorageStatus()).resolves.toEqual({
      mode: 'filesystem',
      rootPath: 'C:\\Users\\ugoel\\OneDrive\\immologik\\Dokumente',
      available: true,
    });
  });

  it('includes the physical filesystem path when document storage runs via OneDrive', async () => {
    prisma.document.findMany.mockResolvedValueOnce([
      {
        id: 'doc-path',
        title: 'Beleg',
        fileName: 'beleg.pdf',
        mimeType: 'application/pdf',
        size: 123,
        storageKey: 'allgemein/Sonstiges/beleg.pdf',
        objectId: null,
        objectName: null,
        rentUnitId: null,
        unitLabel: null,
        reportYear: null,
        category: null,
        status: null,
        uploadedBy: null,
        createdAt: new Date('2026-03-22T10:00:00.000Z'),
        updatedAt: new Date('2026-03-22T11:00:00.000Z'),
      },
    ]);
    minio.getPresignedUrl.mockResolvedValueOnce(
      'https://download.test/doc-path',
    );
    minio.getPhysicalPath.mockReturnValueOnce(
      'C:\\Users\\ugoel\\OneDrive\\immologik\\Dokumente\\allgemein\\Sonstiges\\beleg.pdf',
    );

    const result = await service.findAll();

    expect(result[0]?.storagePath).toBe(
      'C:\\Users\\ugoel\\OneDrive\\immologik\\Dokumente\\allgemein\\Sonstiges\\beleg.pdf',
    );
  });

  it('marks list documents as missing when they are fachlich missing', async () => {
    prisma.document.findMany.mockResolvedValueOnce([
      {
        id: 'doc-missing',
        title: 'Fehlender Beleg',
        fileName: 'fehlt.pdf',
        mimeType: 'application/pdf',
        size: 123,
        storageKey: 'allgemein/Sonstiges/fehlt.pdf',
        objectId: null,
        objectName: null,
        rentUnitId: null,
        unitLabel: null,
        reportYear: null,
        category: null,
        status: 'Fehlt',
        uploadedBy: null,
        createdAt: new Date('2026-03-22T10:00:00.000Z'),
        updatedAt: new Date('2026-03-22T11:00:00.000Z'),
      },
    ]);
    const result = await service.findAll();

    expect(result[0]?.fileAvailable).toBe(false);
    expect(result[0]?.downloadUrl).toBeNull();
    expect(result[0]?.actionState).toBe('file_missing');
    expect(result[0]?.openIssues).toContain('Datei fehlt in der Ablage');
    expect(minio.fileExists).not.toHaveBeenCalled();
    expect(minio.getPresignedUrl).not.toHaveBeenCalled();
  });

  it('marks documents without object assignment as open assignment cases', async () => {
    prisma.document.findMany.mockResolvedValueOnce([
      {
        id: 'doc-unassigned',
        title: 'Allgemeines Schreiben',
        fileName: 'brief.pdf',
        mimeType: 'application/pdf',
        size: 123,
        storageKey: 'allgemein/Sonstiges/brief.pdf',
        objectId: null,
        objectName: null,
        rentUnitId: null,
        unitLabel: null,
        reportYear: null,
        category: 'Sonstiges',
        status: 'Vorhanden',
        uploadedBy: null,
        createdAt: new Date('2026-03-22T10:00:00.000Z'),
        updatedAt: new Date('2026-03-22T11:00:00.000Z'),
      },
    ]);
    const result = await service.findAll();

    expect(result[0]?.actionState).toBe('assignment_missing');
    expect(result[0]?.openIssues).toContain('Keine Objektzuordnung hinterlegt');
  });

  it('filters mapped documents by open action state when requested', async () => {
    prisma.document.findMany.mockResolvedValueOnce([
      {
        id: 'doc-review',
        title: 'Prüfung',
        fileName: 'review.pdf',
        mimeType: 'application/pdf',
        size: 123,
        storageKey: 'docs/review.pdf',
        objectId: 'object-1',
        objectName: 'WEG-001 · Musterhaus',
        rentUnitId: null,
        unitLabel: null,
        reportYear: 2025,
        category: 'Protokoll',
        status: 'In Prüfung',
        uploadedBy: null,
        createdAt: new Date('2026-03-22T10:00:00.000Z'),
        updatedAt: new Date('2026-03-22T11:00:00.000Z'),
      },
      {
        id: 'doc-ok',
        title: 'Vorhanden',
        fileName: 'ok.pdf',
        mimeType: 'application/pdf',
        size: 123,
        storageKey: 'docs/ok.pdf',
        objectId: 'object-1',
        objectName: 'WEG-001 · Musterhaus',
        rentUnitId: null,
        unitLabel: null,
        reportYear: 2025,
        category: 'Protokoll',
        status: 'Vorhanden',
        uploadedBy: null,
        createdAt: new Date('2026-03-22T10:00:00.000Z'),
        updatedAt: new Date('2026-03-22T11:00:00.000Z'),
      },
    ]);
    minio.getPresignedUrl
      .mockResolvedValueOnce('https://download.test/doc-review')
      .mockResolvedValueOnce('https://download.test/doc-ok');

    const result = await service.findAll({ actionState: 'review_pending' });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('doc-review');
    expect(result[0]?.openIssues).toContain('Dokument wartet auf Prüfung');
  });

  it('requires an uploaded file', async () => {
    await expect(
      service.upload(
        undefined as unknown as Express.Multer.File,
        'object-1',
        undefined,
        '',
        'Foto',
        'Foto',
        'Tester',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires a report year for annual reports and utility statements', async () => {
    const file = {
      originalname: 'report.pdf',
      mimetype: 'application/pdf',
      size: 100,
      buffer: Buffer.from('pdf'),
    } as Express.Multer.File;

    await expect(
      service.upload(
        file,
        'object-1',
        undefined,
        '',
        'Jahresreport WEG',
        'Jahresreport WEG',
        'Tester',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('removes the uploaded file again when document persistence fails', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1710000000003);
    prisma.document.create.mockRejectedValueOnce(new Error('db failed'));

    const file = {
      originalname: 'vertrag.pdf',
      mimetype: 'application/pdf',
      size: 456,
      buffer: Buffer.from('pdf'),
    } as Express.Multer.File;

    await expect(
      service.upload(
        file,
        undefined,
        undefined,
        undefined,
        'Sonstiges',
        'Vertrag',
        undefined,
      ),
    ).rejects.toThrow('db failed');

    expect(minio.uploadFile).toHaveBeenCalledWith(
      'allgemein/Sonstiges/1710000000003_vertrag.pdf',
      file.buffer,
      'application/pdf',
      {
        'x-category': 'Sonstiges',
        'x-object-id': '',
        'x-rent-unit-id': '',
        'x-report-year': '',
      },
    );
    expect(minio.deleteFile).toHaveBeenCalledWith(
      'allgemein/Sonstiges/1710000000003_vertrag.pdf',
    );

    jest.restoreAllMocks();
  });

  it('derives object metadata from the selected rent unit', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1710000000001);
    minio.getPresignedUrl.mockResolvedValueOnce(
      'https://download.test/derived',
    );
    prisma.rentUnit.findUnique.mockResolvedValueOnce({
      id: 'unit-8',
      objectId: 'object-2',
      unitLabel: 'WE 08',
      object: {
        id: 'object-2',
        displayId: 'WEG-002',
        name: 'Nebenhaus',
      },
    });
    prisma.document.create.mockResolvedValueOnce({
      id: 'doc-3',
      title: 'Foto',
      fileName: 'foto.jpg',
      mimeType: 'image/jpeg',
      size: 321,
      storageKey:
        'wegs/WEG-002_Nebenhaus/wohnungen/WE_08/Foto/1710000000001_foto.jpg',
      objectId: 'object-2',
      objectName: 'WEG-002 · Nebenhaus',
      rentUnitId: 'unit-8',
      unitLabel: 'WE 08',
      reportYear: null,
      category: 'Foto',
      status: 'Vorhanden',
      uploadedBy: null,
      createdAt: new Date('2026-03-22T13:00:00.000Z'),
      updatedAt: new Date('2026-03-22T13:00:00.000Z'),
    });

    const file = {
      originalname: 'foto.jpg',
      mimetype: 'image/jpeg',
      size: 321,
      buffer: Buffer.from('img'),
    } as Express.Multer.File;

    const result = await service.upload(
      file,
      undefined,
      'unit-8',
      undefined,
      'Foto',
      'Foto',
      undefined,
    );

    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          objectId: 'object-2',
          objectName: 'WEG-002 · Nebenhaus',
          rentUnitId: 'unit-8',
          unitLabel: 'WE 08',
        }),
      }),
    );
    expect(result.objectId).toBe('object-2');

    jest.restoreAllMocks();
  });

  it('updates a document status only for allowed values and returns mapped data', async () => {
    prisma.document.findUnique.mockResolvedValueOnce({
      id: 'doc-4',
      status: 'Vorhanden',
    });
    prisma.document.update.mockResolvedValueOnce({
      id: 'doc-4',
      title: 'Protokoll',
      fileName: 'protokoll.pdf',
      mimeType: 'application/pdf',
      size: 789,
      storageKey: 'docs/protokoll.pdf',
      objectId: 'object-1',
      objectName: 'WEG-001 · Musterhaus',
      rentUnitId: null,
      unitLabel: null,
      reportYear: 2025,
      category: 'Protokoll',
      status: 'In Prüfung',
      uploadedBy: 'Tester',
      createdAt: new Date('2026-03-22T12:00:00.000Z'),
      updatedAt: new Date('2026-03-23T08:30:00.000Z'),
    });
    minio.getPresignedUrl.mockResolvedValueOnce(
      'https://download.test/protokoll',
    );

    const result = await service.updateStatus('doc-4', ' In Prüfung ');

    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-4' },
      data: { status: 'In Prüfung' },
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'doc-4',
        status: 'In Prüfung',
        updatedAt: '2026-03-23T08:30:00.000Z',
        downloadUrl: 'https://download.test/protokoll',
      }),
    );
  });

  it('rejects invalid document statuses', async () => {
    await expect(
      service.updateStatus('doc-4', 'Archiviert'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.document.findUnique).not.toHaveBeenCalled();
  });

  it('updates document metadata including object and unit relation', async () => {
    prisma.document.findUnique.mockResolvedValueOnce({
      id: 'doc-5',
      title: 'Altes Dokument',
      fileName: 'nk.pdf',
      mimeType: 'application/pdf',
      size: 900,
      storageKey: 'allgemein/Sonstiges/1710000000005_nk.pdf',
      category: 'Sonstiges',
      reportYear: null,
      objectId: null,
      objectName: null,
      rentUnitId: null,
      unitLabel: null,
      uploadedBy: null,
      status: 'Vorhanden',
      createdAt: new Date('2026-03-22T12:00:00.000Z'),
      updatedAt: new Date('2026-03-22T12:00:00.000Z'),
    });
    prisma.rentUnit.findUnique.mockResolvedValueOnce({
      id: 'unit-9',
      objectId: 'object-3',
      unitLabel: 'WE 09',
      object: {
        id: 'object-3',
        displayId: 'WEG-003',
        name: 'Hofgarten',
      },
    });
    prisma.document.update.mockResolvedValueOnce({
      id: 'doc-5',
      title: 'Nebenkosten 2025',
      fileName: 'nk.pdf',
      mimeType: 'application/pdf',
      size: 900,
      storageKey:
        'wegs/WEG-003_Hofgarten/wohnungen/WE_09/historie/2025/Nebenkostenabrechnung/1710000000005_nk.pdf',
      objectId: 'object-3',
      objectName: 'WEG-003 · Hofgarten',
      rentUnitId: 'unit-9',
      unitLabel: 'WE 09',
      reportYear: 2025,
      category: 'Nebenkostenabrechnung',
      status: 'Vorhanden',
      uploadedBy: 'Clara Beispiel',
      createdAt: new Date('2026-03-22T12:00:00.000Z'),
      updatedAt: new Date('2026-03-24T08:30:00.000Z'),
    });
    minio.getPresignedUrl.mockResolvedValueOnce('https://download.test/nk');

    const result = await service.updateMetadata('doc-5', {
      objectId: 'object-3',
      rentUnitId: 'unit-9',
      reportYear: '2025',
      category: 'Nebenkostenabrechnung',
      title: 'Nebenkosten 2025',
      uploadedBy: ' Clara Beispiel ',
    });

    expect(minio.moveFile).toHaveBeenCalledWith(
      'allgemein/Sonstiges/1710000000005_nk.pdf',
      'wegs/WEG-003_Hofgarten/wohnungen/WE_09/historie/2025/Nebenkostenabrechnung/1710000000005_nk.pdf',
    );

    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-5' },
      data: {
        title: 'Nebenkosten 2025',
        category: 'Nebenkostenabrechnung',
        uploadedBy: 'Clara Beispiel',
        reportYear: 2025,
        objectId: 'object-3',
        objectName: 'WEG-003 · Hofgarten',
        rentUnitId: 'unit-9',
        unitLabel: 'WE 09',
        storageKey:
          'wegs/WEG-003_Hofgarten/wohnungen/WE_09/historie/2025/Nebenkostenabrechnung/1710000000005_nk.pdf',
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'doc-5',
        objectName: 'WEG-003 · Hofgarten',
        unitLabel: 'WE 09',
        uploadedBy: 'Clara Beispiel',
        reportYear: 2025,
        downloadUrl: 'https://download.test/nk',
      }),
    );
  });

  it('rejects metadata updates that would create a duplicate assignment', async () => {
    prisma.document.findUnique.mockResolvedValueOnce({
      id: 'doc-6',
      title: 'Nebenkosten 2025',
      fileName: 'nk.pdf',
      storageKey: 'allgemein/Sonstiges/1710000000005_nk.pdf',
      category: 'Sonstiges',
      reportYear: null,
      objectId: null,
      objectName: null,
      rentUnitId: null,
      unitLabel: null,
      uploadedBy: null,
    });
    prisma.rentUnit.findUnique.mockResolvedValueOnce({
      id: 'unit-9',
      objectId: 'object-3',
      unitLabel: 'WE 09',
      object: {
        id: 'object-3',
        displayId: 'WEG-003',
        name: 'Hofgarten',
      },
    });
    prisma.document.findFirst.mockResolvedValueOnce({ id: 'doc-existing' });

    await expect(
      service.updateMetadata('doc-6', {
        title: 'Nebenkosten 2025',
        category: 'Nebenkostenabrechnung',
        objectId: 'object-3',
        rentUnitId: 'unit-9',
        reportYear: '2025',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(minio.moveFile).not.toHaveBeenCalled();
    expect(prisma.document.update).not.toHaveBeenCalled();
  });

  it('rejects metadata updates without a valid report year for required categories', async () => {
    prisma.document.findUnique.mockResolvedValueOnce({
      id: 'doc-6',
      title: 'Altes Dokument',
      category: 'Sonstiges',
      reportYear: null,
    });

    await expect(
      service.updateMetadata('doc-6', {
        category: 'Jahresreport WEG',
        reportYear: '25',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.document.update).not.toHaveBeenCalled();
  });

  it('updates metadata for missing documents without moving a non-existing file', async () => {
    prisma.document.findUnique.mockResolvedValueOnce({
      id: 'doc-7a',
      title: 'Jahresreport fehlt',
      fileName: 'fehlend_Jahresreport_fehlt.missing',
      mimeType: 'application/x-immologik-missing-document',
      size: 0,
      storageKey:
        'wegs/WEG-001_Musterhaus/Jahresreport_WEG/fehlend_Jahresreport_fehlt.missing',
      category: 'Jahresreport WEG',
      reportYear: null,
      objectId: 'object-1',
      objectName: 'WEG-001 · Musterhaus',
      rentUnitId: null,
      unitLabel: null,
      uploadedBy: 'Tester',
      status: 'Fehlt',
      createdAt: new Date('2026-03-22T12:00:00.000Z'),
      updatedAt: new Date('2026-03-22T12:00:00.000Z'),
    });
    prisma.propertyObject.findUnique.mockResolvedValueOnce({
      id: 'object-1',
      displayId: 'WEG-001',
      name: 'Musterhaus',
    });
    minio.fileExists.mockResolvedValueOnce(false).mockResolvedValueOnce(false);
    prisma.document.update.mockResolvedValueOnce({
      id: 'doc-7a',
      title: 'Jahresreport fehlt',
      fileName: 'fehlend_Jahresreport_fehlt.missing',
      mimeType: 'application/x-immologik-missing-document',
      size: 0,
      storageKey:
        'wegs/WEG-001_Musterhaus/historie/2025/Jahresreport_WEG/fehlend_Jahresreport_fehlt.missing',
      category: 'Jahresreport WEG',
      reportYear: 2025,
      objectId: 'object-1',
      objectName: 'WEG-001 · Musterhaus',
      rentUnitId: null,
      unitLabel: null,
      uploadedBy: 'Tester',
      status: 'Fehlt',
      createdAt: new Date('2026-03-22T12:00:00.000Z'),
      updatedAt: new Date('2026-03-23T12:00:00.000Z'),
    });

    const result = await service.updateMetadata('doc-7a', {
      objectId: 'object-1',
      category: 'Jahresreport WEG',
      reportYear: '2025',
      title: 'Jahresreport fehlt',
    });

    expect(minio.moveFile).not.toHaveBeenCalled();
    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-7a' },
      data: expect.objectContaining({
        storageKey:
          'wegs/WEG-001_Musterhaus/historie/2025/Jahresreport_WEG/fehlend_Jahresreport_fehlt.missing',
        reportYear: 2025,
      }),
    });
    expect(result.fileAvailable).toBe(false);
  });

  it('moves the file back when metadata persistence fails after a storage move', async () => {
    prisma.document.findUnique.mockResolvedValueOnce({
      id: 'doc-7',
      title: 'Altes Dokument',
      fileName: 'nk.pdf',
      mimeType: 'application/pdf',
      size: 900,
      storageKey: 'allgemein/Sonstiges/1710000000007_nk.pdf',
      category: 'Sonstiges',
      reportYear: null,
      objectId: null,
      objectName: null,
      rentUnitId: null,
      unitLabel: null,
      uploadedBy: null,
      status: 'Vorhanden',
      createdAt: new Date('2026-03-22T12:00:00.000Z'),
      updatedAt: new Date('2026-03-22T12:00:00.000Z'),
    });
    prisma.rentUnit.findUnique.mockResolvedValueOnce({
      id: 'unit-9',
      objectId: 'object-3',
      unitLabel: 'WE 09',
      object: {
        id: 'object-3',
        displayId: 'WEG-003',
        name: 'Hofgarten',
      },
    });
    prisma.document.update.mockRejectedValueOnce(new Error('db update failed'));

    await expect(
      service.updateMetadata('doc-7', {
        objectId: 'object-3',
        rentUnitId: 'unit-9',
        reportYear: '2025',
        category: 'Nebenkostenabrechnung',
        title: 'Nebenkosten 2025',
      }),
    ).rejects.toThrow('db update failed');

    expect(minio.moveFile).toHaveBeenNthCalledWith(
      1,
      'allgemein/Sonstiges/1710000000007_nk.pdf',
      'wegs/WEG-003_Hofgarten/wohnungen/WE_09/historie/2025/Nebenkostenabrechnung/1710000000007_nk.pdf',
    );
    expect(minio.moveFile).toHaveBeenNthCalledWith(
      2,
      'wegs/WEG-003_Hofgarten/wohnungen/WE_09/historie/2025/Nebenkostenabrechnung/1710000000007_nk.pdf',
      'allgemein/Sonstiges/1710000000007_nk.pdf',
    );
  });
});
