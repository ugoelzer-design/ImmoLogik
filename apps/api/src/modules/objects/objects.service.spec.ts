import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ObjectsService } from './objects.service';

describe('ObjectsService', () => {
  let service: ObjectsService;
  let prisma: {
    tenant: {
      findUnique: jest.Mock;
    };
    propertyObject: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
  };
  let minio: {
    ensureObjectFolder: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
      },
      propertyObject: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };
    minio = {
      ensureObjectFolder: jest.fn(),
    };

    service = new ObjectsService(prisma as never, minio as never);
  });

  it('lists only objects for the current app tenant', async () => {
    prisma.propertyObject.findMany.mockResolvedValueOnce([]);

    await service.findAll({ skip: 10, take: 5 }, 'default');

    expect(prisma.propertyObject.findMany).toHaveBeenCalledWith({
      skip: 10,
      take: 5,
      where: { appTenantId: 'tenant-1' },
      orderBy: { displayId: 'asc' },
    });
  });

  it('creates a new object with the next display id and default fields', async () => {
    prisma.propertyObject.findMany.mockResolvedValueOnce([
      { displayId: 'WEG-001' },
      { displayId: 'WEG-007' },
      { displayId: 'ALT-IGNORE' },
    ]);
    prisma.propertyObject.create.mockResolvedValueOnce({
      id: 'obj-1',
      displayId: 'WEG-008',
      name: 'Musterhaus',
      address: 'Testweg 1',
      units: 3,
    });

    const result = await service.create({
      name: '  Musterhaus  ',
      address: ' Testweg 1 ',
      units: 3,
    });

    expect(prisma.propertyObject.create).toHaveBeenCalledWith({
      data: {
        appTenantId: 'tenant-1',
        displayId: 'WEG-008',
        name: 'Musterhaus',
        address: 'Testweg 1',
        type: 'Wohnobjekt',
        status: 'Neu',
        units: 3,
        occupancy: '0%',
        monthlyTargetRent: '0 €',
        note: 'Neu angelegtes Objekt. Weitere Daten folgen im nächsten Schritt.',
      },
    });
    expect(minio.ensureObjectFolder).toHaveBeenCalledWith(
      'obj-1',
      'WEG-008',
      'Musterhaus',
    );
    expect(result).toEqual({
      id: 'obj-1',
      displayId: 'WEG-008',
      name: 'Musterhaus',
      address: 'Testweg 1',
      units: 3,
    });
  });

  it('rejects invalid object payloads', async () => {
    await expect(
      service.create({ name: 'Haus', address: 'Testweg 1', units: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create({ name: ' ', address: 'Testweg 1', units: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns the next display id as preview', async () => {
    prisma.propertyObject.findMany.mockResolvedValueOnce([
      { displayId: 'WEG-002' },
      { displayId: 'WEG-014' },
    ]);

    await expect(service.getNextDisplayIdPreview()).resolves.toEqual({
      displayId: 'WEG-015',
    });
  });

  it('throws when removing an unknown object', async () => {
    prisma.propertyObject.findFirst.mockResolvedValueOnce(null);

    await expect(service.remove('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.propertyObject.delete).not.toHaveBeenCalled();
  });

  it('prevents removing objects with dependent records', async () => {
    prisma.propertyObject.findFirst.mockResolvedValueOnce({
      id: 'obj-1',
      _count: {
        documents: 1,
        rentUnits: 0,
        mieter: 0,
        vertraege: 0,
      },
    });

    await expect(service.remove('obj-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.propertyObject.delete).not.toHaveBeenCalled();
  });
});
