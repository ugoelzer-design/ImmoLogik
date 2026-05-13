import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  const healthResponse = {
    status: 'ok',
    service: 'api',
    version: 'v1',
    database: 'up',
    authMode: 'dev',
    timestamp: '2026-03-12T00:00:00.000Z',
  };

  const appServiceMock = {
    getHealth: jest.fn().mockResolvedValue(healthResponse),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: appServiceMock,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return the health response', async () => {
      await expect(appController.getHealth()).resolves.toEqual(healthResponse);
      expect(appServiceMock.getHealth).toHaveBeenCalledTimes(1);
    });
  });
});
