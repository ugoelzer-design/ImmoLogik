/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';

describe('TenantsService', () => {
  let service: TenantsService;
  let prisma: {
    tenant: {
      findUnique: jest.Mock;
    };
    mieter: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    rentUnit: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
      },
      mieter: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      rentUnit: {
        findUnique: jest.fn(),
      },
    };

    service = new TenantsService(prisma as never);
  });

  it('normalizes tenant status values from relational records', async () => {
    prisma.mieter.findMany.mockResolvedValueOnce([
      {
        id: 't-1',
        appTenantId: 'tenant-1',
        objectId: 'obj-1',
        rentUnitId: 'ru-1',
        fullName: 'Anna',
        email: 'anna@example.com',
        phone: '123',
        status: 'In Bearbeitung',
        object: { id: 'obj-1', name: 'Bergstrasse 12', displayId: 'WEG-001' },
        rentUnit: { id: 'ru-1', unitLabel: 'WE 01' },
      },
    ]);

    const result = await service.findAll();

    expect(result[0]).toMatchObject({
      id: 't-1',
      objectId: 'obj-1',
      rentUnitId: 'ru-1',
      objectName: 'Bergstrasse 12',
      unit: 'WE 01',
      status: 'Ausstehend',
    });
  });

  it('throws for unknown tenants', async () => {
    prisma.mieter.findUnique.mockResolvedValueOnce(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects tenants when the selected unit does not belong to the object', async () => {
    prisma.rentUnit.findUnique.mockResolvedValueOnce({
      id: 'ru-1',
      appTenantId: 'tenant-1',
      objectId: 'obj-2',
      object: { appTenantId: 'tenant-1' },
    });

    await expect(
      service.create({
        objectId: 'obj-1',
        rentUnitId: 'ru-1',
        fullName: 'Carla',
        email: 'carla@example.com',
        phone: '123',
        status: 'Ausstehend',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('persists relation ids and display status values on create', async () => {
    prisma.rentUnit.findUnique.mockResolvedValueOnce({
      id: 'ru-1',
      appTenantId: 'tenant-1',
      objectId: 'obj-1',
      object: { appTenantId: 'tenant-1' },
    });
    prisma.mieter.create.mockResolvedValueOnce({
        id: 't-3',
        appTenantId: 'tenant-1',
        objectId: 'obj-1',
      rentUnitId: 'ru-1',
      fullName: 'Carla',
      email: 'carla@example.com',
      phone: '123',
      status: 'In Bearbeitung',
      object: { id: 'obj-1', name: 'Bergstrasse 12', displayId: 'WEG-001' },
      rentUnit: { id: 'ru-1', unitLabel: 'WE 03' },
    });

    const result = await service.create({
      objectId: 'obj-1',
      rentUnitId: 'ru-1',
      fullName: 'Carla',
      email: 'carla@example.com',
      phone: '123',
      status: 'Ausstehend',
    });

    expect(prisma.mieter.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        objectId: 'obj-1',
        rentUnitId: 'ru-1',
        status: 'In Bearbeitung',
      }),
      include: {
        object: true,
        rentUnit: true,
      },
    });
    expect(result).toMatchObject({
      id: 't-3',
      status: 'Ausstehend',
      unit: 'WE 03',
    });
  });

  it('updates tenants and normalizes the returned status', async () => {
    prisma.mieter.findUnique.mockResolvedValueOnce({
      id: 't-4',
      appTenantId: 'tenant-1',
      objectId: 'obj-1',
      rentUnitId: 'ru-1',
      fullName: 'Dora',
      email: 'dora@example.com',
      phone: '456',
      status: 'Aktiv',
      object: { id: 'obj-1', name: 'Bergstrasse 12', displayId: 'WEG-001' },
      rentUnit: { id: 'ru-1', unitLabel: 'WE 04' },
    });
    prisma.rentUnit.findUnique.mockResolvedValueOnce({
      id: 'ru-1',
      appTenantId: 'tenant-1',
      objectId: 'obj-1',
      object: { appTenantId: 'tenant-1' },
    });
    prisma.mieter.update.mockResolvedValueOnce({
      id: 't-4',
      appTenantId: 'tenant-1',
      objectId: 'obj-1',
      rentUnitId: 'ru-1',
      fullName: 'Dora',
      email: 'dora@example.com',
      phone: '456',
      status: 'In Bearbeitung',
      object: { id: 'obj-1', name: 'Bergstrasse 12', displayId: 'WEG-001' },
      rentUnit: { id: 'ru-1', unitLabel: 'WE 04' },
    });

    const result = await service.update('t-4', { status: 'Ausstehend' });

    expect(prisma.mieter.update).toHaveBeenCalledWith({
      where: { id: 't-4' },
      data: { status: 'In Bearbeitung' },
      include: {
        object: true,
        rentUnit: true,
      },
    });
    expect(result).toMatchObject({ id: 't-4', status: 'Ausstehend' });
  });

  it('prevents deleting tenants with linked contracts', async () => {
    prisma.mieter.findUnique.mockResolvedValueOnce({
      id: 't-5',
      appTenantId: 'tenant-1',
      _count: {
        vertraege: 1,
      },
    });

    await expect(service.remove('t-5')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.mieter.delete).not.toHaveBeenCalled();
  });
});
