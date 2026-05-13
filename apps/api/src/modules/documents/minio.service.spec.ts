import * as fsPromises from 'fs/promises';
import { mkdtemp, readFile, stat } from 'fs/promises';
import { tmpdir } from 'os';
import * as path from 'path';
/* eslint-disable @typescript-eslint/require-await */
import { MinioService } from './minio.service';

describe('MinioService filesystem mode', () => {
  let originalDocumentsRoot: string | undefined;
  let originalApiBaseUrl: string | undefined;
  let storageRoot: string;

  beforeEach(async () => {
    originalDocumentsRoot = process.env.DOCUMENTS_STORAGE_ROOT;
    originalApiBaseUrl = process.env.DOCUMENTS_PUBLIC_API_BASE_URL;
    storageRoot = await mkdtemp(path.join(tmpdir(), 'immologik-documents-'));
    process.env.DOCUMENTS_STORAGE_ROOT = storageRoot;
    process.env.DOCUMENTS_PUBLIC_API_BASE_URL = 'http://localhost:4000/api/v1';
  });

  afterEach(async () => {
    if (originalDocumentsRoot === undefined) {
      delete process.env.DOCUMENTS_STORAGE_ROOT;
    } else {
      process.env.DOCUMENTS_STORAGE_ROOT = originalDocumentsRoot;
    }

    if (originalApiBaseUrl === undefined) {
      delete process.env.DOCUMENTS_PUBLIC_API_BASE_URL;
    } else {
      process.env.DOCUMENTS_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    }
  });

  it('moves files and removes empty source folders in filesystem mode', async () => {
    const service = new MinioService();
    await service.onModuleInit();

    const sourceKey = 'wegs/WEG-001_Haus/wohnungen/WE_01/Foto/datei.pdf';
    const targetKey = 'wegs/WEG-001_Haus/wohnungen/WE_02/Foto/datei.pdf';

    await service.uploadFile(sourceKey, Buffer.from('pdf'), 'application/pdf');
    await service.moveFile(sourceKey, targetKey);

    await expect(
      readFile(path.join(storageRoot, targetKey), 'utf8'),
    ).resolves.toBe('pdf');
    await expect(
      stat(
        path.join(storageRoot, 'wegs', 'WEG-001_Haus', 'wohnungen', 'WE_01'),
      ),
    ).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('deletes files and cleans up now-empty parent folders', async () => {
    const service = new MinioService();
    await service.onModuleInit();

    const storageKey = 'allgemein/Foto/datei.pdf';
    await service.uploadFile(storageKey, Buffer.from('img'), 'image/jpeg');
    await service.deleteFile(storageKey);

    await expect(
      stat(path.join(storageRoot, 'allgemein')),
    ).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('rejects filesystem paths outside the configured storage root', async () => {
    const service = new MinioService();
    await service.onModuleInit();

    await expect(
      service.uploadFile('../escape.pdf', Buffer.from('x'), 'application/pdf'),
    ).rejects.toThrow('Ungültiger Speicherpfad außerhalb des Dokumentenroots.');
  });

  it('creates object folders with readable names in filesystem mode', async () => {
    const service = new MinioService();
    await service.onModuleInit();

    await service.ensureObjectFolder('obj-1', 'WEG-001', 'Musterhaus');

    await expect(
      stat(path.join(storageRoot, 'wegs', 'WEG-001_Musterhaus')),
    ).resolves.toBeDefined();
  });

  it('reports unavailable filesystem storage when the configured root cannot be created', async () => {
    const service = new MinioService();
    const blockedRoot = path.join(storageRoot, 'blocked-root');
    await fsPromises.writeFile(blockedRoot, 'blocked');
    (service as unknown as { filesystemRoot: string }).filesystemRoot =
      blockedRoot;

    await expect(service.getStorageStatus()).resolves.toEqual({
      mode: 'filesystem',
      rootPath: blockedRoot,
      available: false,
    });
  });
});
