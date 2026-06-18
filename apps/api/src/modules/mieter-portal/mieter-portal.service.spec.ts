import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Readable } from 'stream';
import { MieterPortalService } from './mieter-portal.service';

describe('MieterPortalService', () => {
  let prisma: {
    mieterPortalAccess: { findUnique: jest.Mock; upsert: jest.Mock };
    mieter: { findUnique: jest.Mock };
    document: { findMany: jest.Mock; findFirst: jest.Mock };
    readingCampaign: { findMany: jest.Mock };
    tenant: { findUnique: jest.Mock };
  };
  let minio: { getFileStream: jest.Mock };
  let service: MieterPortalService;

  beforeEach(() => {
    prisma = {
      mieterPortalAccess: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      mieter: {
        findUnique: jest.fn(),
      },
      document: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      readingCampaign: {
        findMany: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
      },
    };
    minio = {
      getFileStream: jest.fn(),
    };
    service = new MieterPortalService(prisma as never, minio as never);
  });

  it('streams only documents assigned to the portal tenant unit', async () => {
    prisma.mieterPortalAccess.findUnique.mockResolvedValueOnce({
      appTenantId: 'tenant-1',
      mieterId: 'mieter-1',
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.mieter.findUnique.mockResolvedValueOnce({
      objectId: 'obj-1',
      rentUnitId: 'unit-1',
    });
    prisma.document.findFirst.mockResolvedValueOnce({
      id: 'doc-1',
      fileName: 'vertrag.pdf',
      mimeType: 'application/pdf',
      storageKey: 'wegs/doc.pdf',
    });
    minio.getFileStream.mockResolvedValueOnce(Readable.from(['pdf']));
    const response = { set: jest.fn() };

    await expect(
      service.streamDocument('token-1', 'doc-1', response as never),
    ).resolves.toBeDefined();
    expect(prisma.document.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'doc-1',
        appTenantId: 'tenant-1',
        objectId: 'obj-1',
        rentUnitId: 'unit-1',
      },
    });
    expect(minio.getFileStream).toHaveBeenCalledWith('wegs/doc.pdf');
  });

  it('rejects expired portal tokens before document lookup', async () => {
    prisma.mieterPortalAccess.findUnique.mockResolvedValueOnce({
      appTenantId: 'tenant-1',
      mieterId: 'mieter-1',
      expiresAt: new Date(Date.now() - 60_000),
    });

    await expect(
      service.streamDocument('token-1', 'doc-1', { set: jest.fn() } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.document.findFirst).not.toHaveBeenCalled();
  });

  it('rejects documents from other units', async () => {
    prisma.mieterPortalAccess.findUnique.mockResolvedValueOnce({
      appTenantId: 'tenant-1',
      mieterId: 'mieter-1',
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.mieter.findUnique.mockResolvedValueOnce({
      objectId: 'obj-1',
      rentUnitId: 'unit-1',
    });
    prisma.document.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.streamDocument('token-1', 'other-doc', {
        set: jest.fn(),
      } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
