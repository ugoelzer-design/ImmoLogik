import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RentUnitsService } from './rent-units.service';

describe('RentUnitsService', () => {
  let service: RentUnitsService;
  let prisma: {
    tenant: {
      findUnique: jest.Mock;
    };
    propertyObject: {
      findUnique: jest.Mock;
    };
    rentUnit: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
      },
      propertyObject: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'obj-1',
          appTenantId: 'tenant-1',
        }),
      },
      rentUnit: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    service = new RentUnitsService(prisma as never);
  });

  it('applies default payment values when creating a rent unit', async () => {
    prisma.rentUnit.create.mockResolvedValueOnce({ id: 'ru-1' });

    await service.create({
      objectId: 'obj-1',
      unitLabel: 'WE 01',
      tenant: 'Anna',
      sollMiete: 1000,
      faelligAm: '2026-04-01',
    });

    expect(prisma.rentUnit.create).toHaveBeenCalledWith({
      data: {
        appTenantId: 'tenant-1',
        objectId: 'obj-1',
        unitLabel: 'WE 01',
        tenant: 'Anna',
        sollMiete: 1000,
        faelligAm: '2026-04-01',
        istMiete: 0,
        zahlungsStatus: 'Offen',
      },
    });
  });

  it('throws when updating a missing rent unit', async () => {
    prisma.rentUnit.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.update('missing', { tenant: 'Neu' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents deleting rent units with dependent tenants or contracts', async () => {
    prisma.rentUnit.findUnique.mockResolvedValueOnce({
      id: 'ru-1',
      appTenantId: 'tenant-1',
      _count: {
        mieter: 1,
        vertraege: 0,
      },
    });

    await expect(service.remove('ru-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.rentUnit.delete).not.toHaveBeenCalled();
  });
});
