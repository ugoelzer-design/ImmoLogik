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
});
