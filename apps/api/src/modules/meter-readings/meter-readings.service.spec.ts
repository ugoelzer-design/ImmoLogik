/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MeterReadingsService } from './meter-readings.service';

describe('MeterReadingsService', () => {
  let service: MeterReadingsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      propertyObject: { findUnique: jest.fn() },
      mieter: { findMany: jest.fn() },
      readingCampaign: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
      readingAccess: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      meter: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      meterReading: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new MeterReadingsService(prisma);
  });

  it('creates a campaign with recipients for active tenants', async () => {
    prisma.propertyObject.findUnique.mockResolvedValue({
      id: 'object-1',
      displayId: 'WEG-001',
      name: 'Musterhaus',
    });
    prisma.mieter.findMany.mockResolvedValue([
      {
        id: 'tenant-1',
        fullName: 'Max Mieter',
        email: 'max@example.com',
        rentUnitId: 'unit-1',
        rentUnit: { id: 'unit-1', unitLabel: 'Wohnung 1' },
      },
    ]);
    prisma.readingCampaign.upsert.mockResolvedValue({
      id: 'campaign-1',
    });
    prisma.readingCampaign.findUnique.mockResolvedValue({
      id: 'campaign-1',
      objectId: 'object-1',
      reportYear: 2025,
      status: 'offen',
      createdAt: new Date('2026-03-22T10:00:00.000Z'),
      expiresAt: new Date('2026-01-31T22:59:59.000Z'),
      object: { id: 'object-1', displayId: 'WEG-001', name: 'Musterhaus' },
      access: [
        {
          id: 'access-1',
          token: 'token-1',
          status: 'offen',
          sentAt: new Date('2026-03-22T10:00:00.000Z'),
          submittedAt: null,
          expiresAt: new Date('2026-01-31T22:59:59.000Z'),
          tenant: {
            id: 'tenant-1',
            fullName: 'Max Mieter',
            email: 'max@example.com',
          },
          rentUnit: { id: 'unit-1', unitLabel: 'Wohnung 1' },
        },
      ],
    });

    const result = await service.createCampaign({
      objectId: 'object-1',
      reportYear: 2025,
    });

    expect(prisma.meter.upsert).toHaveBeenCalledTimes(3);
    expect(prisma.readingAccess.upsert).toHaveBeenCalledTimes(1);
    expect(result.recipients).toHaveLength(1);
    expect(result.recipients[0].unitLabel).toBe('Wohnung 1');
  });

  it('rejects campaigns without active tenants', async () => {
    prisma.propertyObject.findUnique.mockResolvedValue({
      id: 'object-1',
    });
    prisma.mieter.findMany.mockResolvedValue([]);

    await expect(
      service.createCampaign({
        objectId: 'object-1',
        reportYear: 2025,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns access data including meters', async () => {
    prisma.readingAccess.findUnique.mockResolvedValue({
      token: 'token-1',
      status: 'offen',
      campaignId: 'campaign-1',
      rentUnitId: 'unit-1',
      tenantId: 'tenant-1',
      expiresAt: null,
      tenant: {
        id: 'tenant-1',
        fullName: 'Max Mieter',
        email: 'max@example.com',
      },
      rentUnit: { id: 'unit-1', unitLabel: 'Wohnung 1' },
      campaign: {
        reportYear: 2025,
        objectId: 'object-1',
        object: { id: 'object-1', displayId: 'WEG-001', name: 'Musterhaus' },
      },
    });
    prisma.meter.findMany.mockResolvedValue([
      {
        id: 'meter-1',
        type: 'heizung',
        label: 'Heizung',
        unit: 'kWh',
        meterNumber: null,
        readings: [],
      },
    ]);

    const result = await service.getAccess('token-1');

    expect(result.meters[0].label).toBe('Heizung');
    expect(result.tenant.fullName).toBe('Max Mieter');
  });

  it('submits readings for the matching campaign', async () => {
    prisma.readingAccess.findUnique.mockResolvedValue({
      id: 'access-1',
      token: 'token-1',
      campaignId: 'campaign-1',
      tenantId: 'tenant-1',
      rentUnitId: 'unit-1',
      expiresAt: null,
      campaign: {
        objectId: 'object-1',
      },
    });
    prisma.meter.findMany.mockResolvedValue([
      {
        id: 'meter-1',
        objectId: 'object-1',
        rentUnitId: 'unit-1',
      },
    ]);
    prisma.meterReading.findFirst.mockResolvedValue(null);
    jest.spyOn(service, 'getAccess').mockResolvedValue({
      token: 'token-1',
      status: 'eingereicht',
      reportYear: 2025,
      expiresAt: null,
      object: { id: 'object-1', displayId: 'WEG-001', name: 'Musterhaus' },
      tenant: {
        id: 'tenant-1',
        fullName: 'Max Mieter',
        email: 'max@example.com',
      },
      rentUnit: { id: 'unit-1', unitLabel: 'Wohnung 1' },
      meters: [],
    });

    const result = await service.submitReadings('token-1', {
      readerName: 'Max Mieter',
      readings: [{ meterId: 'meter-1', value: 123.45, date: '2026-01-12' }],
    });

    expect(prisma.meterReading.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          meterId: 'meter-1',
          campaignId: 'campaign-1',
          value: 123.45,
        }),
      }),
    );
    expect(prisma.readingAccess.update).toHaveBeenCalled();
    expect(result.status).toBe('eingereicht');
  });

  it('rejects unknown access tokens', async () => {
    prisma.readingAccess.findUnique.mockResolvedValue(null);

    await expect(service.getAccess('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
