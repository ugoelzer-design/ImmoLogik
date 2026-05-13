import { INestApplication } from '@nestjs/common';
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { MinioService } from '../src/modules/documents/minio.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('ImmoLogik API (e2e)', () => {
  let app: INestApplication;
  const originalAuthMode = process.env.AUTH_MODE;

  const prismaMock = {
    $queryRaw: jest.fn(),
    propertyObject: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    readingAccess: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    meter: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    meterReading: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    readingCampaign: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    mieter: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const minioMock = {
    ensureObjectFolder: jest.fn(),
    uploadFile: jest.fn(),
    getPresignedUrl: jest.fn(),
    deleteFile: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(MinioService)
      .useValue(minioMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    process.env.AUTH_MODE = originalAuthMode;
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AUTH_MODE = 'dev';
  });

  it('serves protected object routes under the api/v1 prefix in dev auth mode', async () => {
    prismaMock.propertyObject.findMany.mockResolvedValueOnce([
      {
        id: 'obj-1',
        displayId: 'WEG-001',
        name: 'Sonnenhof',
        address: 'Testweg 1',
      },
    ]);

    await request(app.getHttpServer())
      .get('/api/v1/objects')
      .expect(200)
      .expect([
        {
          id: 'obj-1',
          displayId: 'WEG-001',
          name: 'Sonnenhof',
          address: 'Testweg 1',
        },
      ]);
  });

  it('blocks protected routes when AUTH_MODE is entra', async () => {
    process.env.AUTH_MODE = 'entra';

    const response = await request(app.getHttpServer()).get('/api/v1/objects');

    expect([401, 500]).toContain(response.status);
  });

  it('keeps public token endpoints reachable even when AUTH_MODE is entra', async () => {
    process.env.AUTH_MODE = 'entra';
    prismaMock.readingAccess.findUnique.mockResolvedValueOnce({
      id: 'access-1',
      token: 'public-token',
      status: 'offen',
      campaignId: 'campaign-1',
      tenantId: 'tenant-1',
      rentUnitId: 'unit-1',
      expiresAt: new Date(Date.now() + 60_000),
      tenant: {
        id: 'tenant-1',
        fullName: 'Anna Weber',
        email: 'anna@example.com',
      },
      rentUnit: {
        id: 'unit-1',
        unitLabel: 'WE 01',
      },
      campaign: {
        id: 'campaign-1',
        objectId: 'obj-1',
        reportYear: 2026,
        object: {
          id: 'obj-1',
          displayId: 'WEG-001',
          name: 'Sonnenhof',
        },
      },
    });
    prismaMock.meter.findMany.mockResolvedValueOnce([
      {
        id: 'meter-1',
        type: 'heizung',
        label: 'Heizung',
        unit: 'kWh',
        meterNumber: 'HZ-01',
        readings: [],
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/api/v1/meter-readings/access/public-token')
      .expect(200);

    expect(response.body).toMatchObject({
      token: 'public-token',
      status: 'offen',
      reportYear: 2026,
      object: {
        id: 'obj-1',
        displayId: 'WEG-001',
        name: 'Sonnenhof',
      },
      tenant: {
        id: 'tenant-1',
        fullName: 'Anna Weber',
      },
      rentUnit: {
        id: 'unit-1',
        unitLabel: 'WE 01',
      },
    });
    expect(response.body.meters).toEqual([
      expect.objectContaining({
        id: 'meter-1',
        type: 'heizung',
        label: 'Heizung',
        unit: 'kWh',
        lastSubmittedValue: null,
      }),
    ]);
  });
});
