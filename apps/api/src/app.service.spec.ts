import { AppService } from './app.service';
import { MinioService } from './modules/documents/minio.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppService', () => {
  const prisma = {
    $queryRaw: jest.fn(),
  } as unknown as PrismaService;

  const minio = {
    getStorageStatus: jest.fn(),
  } as unknown as MinioService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.AUTH_MODE;
    delete process.env.ENTRA_TENANT_ID;
    delete process.env.ENTRA_CLIENT_ID;
    delete process.env.ENTRA_AUDIENCE;
    delete process.env.API_INTERNAL_AUTH_TOKEN;
  });

  it('returns ok health when database and storage are available', async () => {
    (minio.getStorageStatus as jest.Mock).mockResolvedValue({
      mode: 'filesystem',
      rootPath: '/data/documents',
      available: true,
    });

    const service = new AppService(prisma, minio);

    await expect(service.getHealth()).resolves.toMatchObject({
      status: 'ok',
      database: 'up',
      auth: {
        mode: 'dev',
        configured: true,
      },
      storage: {
        mode: 'filesystem',
        rootPath: '/data/documents',
        available: true,
      },
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(minio.getStorageStatus).toHaveBeenCalledTimes(1);
  });

  it('returns degraded health when storage is unavailable', async () => {
    (minio.getStorageStatus as jest.Mock).mockResolvedValue({
      mode: 'filesystem',
      rootPath: '/data/documents',
      available: false,
    });

    const service = new AppService(prisma, minio);

    await expect(service.getHealth()).resolves.toMatchObject({
      status: 'degraded',
      database: 'up',
      storage: {
        available: false,
      },
    });
  });

  it('marks health degraded when entra auth is incomplete', async () => {
    process.env.AUTH_MODE = 'entra';
    process.env.ENTRA_TENANT_ID = 'tenant-1';
    (minio.getStorageStatus as jest.Mock).mockResolvedValue({
      mode: 'filesystem',
      rootPath: '/data/documents',
      available: true,
    });

    const service = new AppService(prisma, minio);

    await expect(service.getHealth()).resolves.toMatchObject({
      status: 'degraded',
      auth: {
        mode: 'entra',
        configured: false,
        missing: ['ENTRA_CLIENT_ID'],
      },
    });
  });

  it('reports entra and internal server auth as configured', async () => {
    process.env.AUTH_MODE = 'entra';
    process.env.ENTRA_TENANT_ID = 'tenant-1';
    process.env.ENTRA_CLIENT_ID = 'client-1';
    process.env.ENTRA_AUDIENCE = 'api://client-1';
    process.env.API_INTERNAL_AUTH_TOKEN = 'internal-secret';
    (minio.getStorageStatus as jest.Mock).mockResolvedValue({
      mode: 'filesystem',
      rootPath: '/data/documents',
      available: true,
    });

    const service = new AppService(prisma, minio);

    await expect(service.getHealth()).resolves.toMatchObject({
      status: 'ok',
      auth: {
        mode: 'entra',
        configured: true,
        missing: [],
        entraAudienceConfigured: true,
        internalServerAuthConfigured: true,
      },
    });
  });
});
