/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContractsService } from './contracts.service';

describe('ContractsService', () => {
  let service: ContractsService;
  let prisma: {
    vertrag: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    mieter: {
      findUnique: jest.Mock;
    };
    rentUnit: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      vertrag: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      mieter: {
        findUnique: jest.fn(),
      },
      rentUnit: {
        findUnique: jest.fn(),
      },
    };

    service = new ContractsService(prisma as never);
  });

  it('normalizes legacy contract status spellings from relational records', async () => {
    prisma.vertrag.findMany.mockResolvedValueOnce([
      {
        id: 'c-1',
        objectId: 'obj-1',
        tenantId: 't-1',
        rentUnitId: 'ru-1',
        title: 'MV 2026',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        status: 'In Prüfung',
        object: { id: 'obj-1', name: 'Bergstrasse 12', displayId: 'WEG-001' },
        tenant: {
          id: 't-1',
          fullName: 'Anna',
          rentUnit: { id: 'ru-1', unitLabel: 'WE 01' },
        },
        rentUnit: { id: 'ru-1', unitLabel: 'WE 01' },
      },
    ]);

    const result = await service.findAll();

    expect(result[0]).toMatchObject({
      id: 'c-1',
      objectId: 'obj-1',
      tenantId: 't-1',
      unit: 'WE 01',
      status: 'In Prüfung',
    });
  });

  it('throws for unknown contracts', async () => {
    prisma.vertrag.findUnique.mockResolvedValueOnce(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects contracts when the tenant does not belong to the object', async () => {
    prisma.mieter.findUnique.mockResolvedValueOnce({
      id: 't-1',
      objectId: 'obj-2',
      rentUnitId: 'ru-1',
    });

    await expect(
      service.create({
        objectId: 'obj-1',
        tenantId: 't-1',
        title: 'MV 2026',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        status: 'Aktiv',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('persists normalized contract statuses on create', async () => {
    prisma.mieter.findUnique.mockResolvedValueOnce({
      id: 't-1',
      objectId: 'obj-1',
      rentUnitId: 'ru-1',
    });
    prisma.rentUnit.findUnique.mockResolvedValueOnce({
      id: 'ru-1',
      objectId: 'obj-1',
    });
    prisma.vertrag.create.mockResolvedValueOnce({
      id: 'c-4',
      objectId: 'obj-1',
      tenantId: 't-1',
      rentUnitId: 'ru-1',
      title: 'MV 2026',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'Läuft aus',
      object: { id: 'obj-1', name: 'Bergstrasse 12', displayId: 'WEG-001' },
      tenant: {
        id: 't-1',
        fullName: 'Eva',
        rentUnit: { id: 'ru-1', unitLabel: 'WE 03' },
      },
      rentUnit: { id: 'ru-1', unitLabel: 'WE 03' },
    });

    const result = await service.create({
      objectId: 'obj-1',
      tenantId: 't-1',
      title: 'MV 2026',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'Läuft aus',
    });

    expect(prisma.vertrag.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        objectId: 'obj-1',
        tenantId: 't-1',
        rentUnitId: 'ru-1',
        status: 'Läuft aus',
      }),
      include: {
        object: true,
        tenant: {
          include: {
            rentUnit: true,
          },
        },
        rentUnit: true,
      },
    });
    expect(result).toMatchObject({
      id: 'c-4',
      status: 'Läuft aus',
      tenantName: 'Eva',
    });
  });

  it('updates contracts and keeps ui-friendly statuses', async () => {
    prisma.vertrag.findUnique.mockResolvedValueOnce({
      id: 'c-5',
      objectId: 'obj-1',
      tenantId: 't-1',
      rentUnitId: 'ru-1',
      tenant: { id: 't-1' },
    });
    prisma.mieter.findUnique.mockResolvedValueOnce({
      id: 't-1',
      objectId: 'obj-1',
      rentUnitId: 'ru-1',
    });
    prisma.rentUnit.findUnique.mockResolvedValueOnce({
      id: 'ru-1',
      objectId: 'obj-1',
    });
    prisma.vertrag.update.mockResolvedValueOnce({
      id: 'c-5',
      objectId: 'obj-1',
      tenantId: 't-1',
      rentUnitId: 'ru-1',
      title: 'MV 2027',
      startDate: '2027-01-01',
      endDate: '2027-12-31',
      status: 'In Prüfung',
      object: { id: 'obj-1', name: 'Bergstrasse 12', displayId: 'WEG-001' },
      tenant: {
        id: 't-1',
        fullName: 'Finn',
        rentUnit: { id: 'ru-1', unitLabel: 'WE 05' },
      },
      rentUnit: { id: 'ru-1', unitLabel: 'WE 05' },
    });

    const result = await service.update('c-5', { status: 'In Prüfung' });

    expect(prisma.vertrag.update).toHaveBeenCalledWith({
      where: { id: 'c-5' },
      data: { status: 'In Prüfung' },
      include: {
        object: true,
        tenant: {
          include: {
            rentUnit: true,
          },
        },
        rentUnit: true,
      },
    });
    expect(result).toMatchObject({ id: 'c-5', status: 'In Prüfung' });
  });
});
