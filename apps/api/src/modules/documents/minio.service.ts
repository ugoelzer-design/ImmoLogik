import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { createReadStream } from 'fs';
import { constants as fsConstants } from 'fs';
import {
  access,
  copyFile,
  mkdir,
  rename,
  rm,
  rmdir,
  stat,
  writeFile,
} from 'fs/promises';
import * as path from 'path';
import { Readable } from 'stream';

type StorageClient = {
  bucketExists(bucket: string): Promise<boolean>;
  makeBucket(bucket: string, region: string): Promise<void>;
  statObject(bucket: string, key: string): Promise<unknown>;
  putObject(
    bucket: string,
    key: string,
    data: Buffer,
    size?: number,
    metadata?: Record<string, string>,
  ): Promise<unknown>;
  presignedGetObject(
    bucket: string,
    key: string,
    expirySeconds: number,
  ): Promise<string>;
  copyObject(
    bucket: string,
    targetKey: string,
    sourcePath: string,
  ): Promise<unknown>;
  removeObject(bucket: string, key: string): Promise<void>;
  getObject(bucket: string, key: string): Promise<Readable>;
};

const INVALID_STORAGE_SEGMENT_CHARS = '<>:"/\\|?*';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: StorageClient | null = null;
  private bucket: string;
  private filesystemRoot: string | null = null;
  private publicApiBaseUrl: string | null = null;

  async onModuleInit() {
    this.filesystemRoot =
      process.env.DOCUMENTS_STORAGE_ROOT?.trim() ||
      process.env.ONEDRIVE_DOCUMENTS_ROOT?.trim() ||
      null;
    this.publicApiBaseUrl =
      process.env.DOCUMENTS_PUBLIC_API_BASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
      null;

    if (this.filesystemRoot) {
      await mkdir(this.filesystemRoot, { recursive: true });
      this.logger.log(
        `Dokumente werden über Dateisystem abgelegt: ${this.filesystemRoot}`,
      );
      return;
    }

    this.bucket = process.env.S3_BUCKET || 'immologik-local';
    const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
    const hostOnly = endpoint.replace(/^https?:\/\//, '').replace(/:\d+$/, '');
    const port = parseInt(process.env.MINIO_PORT || '9000');
    const useSSL = endpoint.startsWith('https');
    const minio = await import('minio');

    const client: StorageClient = new minio.Client({
      endPoint: hostOnly,
      port,
      useSSL,
      accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
    });
    this.client = client;

    try {
      const exists = await client.bucketExists(this.bucket);
      if (!exists) {
        await client.makeBucket(
          this.bucket,
          process.env.S3_REGION || 'us-east-1',
        );
        this.logger.log(`Bucket "${this.bucket}" erstellt.`);
      }
    } catch (err) {
      this.logger.warn(`MinIO nicht erreichbar: ${err}`);
    }
  }

  async getStorageStatus() {
    if (this.filesystemRoot) {
      const available = await this.isFilesystemStorageAvailable();

      return {
        mode: 'filesystem' as const,
        rootPath: this.filesystemRoot,
        available,
      };
    }

    return {
      mode: 's3' as const,
      rootPath: this.bucket || null,
      available: true,
    };
  }

  async ensureObjectFolder(
    objectId: string,
    displayId: string,
    objectName?: string,
  ): Promise<void> {
    const folderName = this.buildObjectFolderName(
      displayId,
      objectName,
      objectId,
    );

    if (this.filesystemRoot) {
      const folderPath = path.join(this.filesystemRoot, 'wegs', folderName);
      await mkdir(folderPath, { recursive: true });
      return;
    }

    const key = `wegs/${folderName}/.keep`;
    try {
      await this.getClient().statObject(this.bucket, key);
    } catch {
      await this.getClient().putObject(this.bucket, key, Buffer.from(''), 0);
      this.logger.log(`Ordner fuer WEG ${displayId} erstellt.`);
    }
  }

  async uploadFile(
    storageKey: string,
    buffer: Buffer,
    mimeType: string,
    metadata?: Record<string, string>,
  ): Promise<void> {
    if (this.filesystemRoot) {
      const storageAvailable = await this.isFilesystemStorageAvailable();
      if (!storageAvailable) {
        throw new Error(
          `Dokumentenablage nicht verfügbar: ${this.filesystemRoot}`,
        );
      }

      const targetPath = this.resolveFilesystemPath(storageKey);
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, buffer);
      return;
    }

    await this.getClient().putObject(
      this.bucket,
      storageKey,
      buffer,
      buffer.length,
      { 'Content-Type': mimeType, ...metadata },
    );
  }

  async getPresignedUrl(
    storageKey: string,
    expirySeconds = 3600,
    documentId?: string,
  ): Promise<string> {
    if (this.filesystemRoot) {
      const apiBaseUrl = (this.publicApiBaseUrl || '').replace(/\/$/, '');
      if (!documentId) {
        throw new Error('Dokument-ID für Dateisystem-Download fehlt.');
      }

      return `${apiBaseUrl}/documents/${documentId}/content`;
    }

    return this.getClient().presignedGetObject(
      this.bucket,
      storageKey,
      expirySeconds,
    );
  }

  async fileExists(storageKey: string): Promise<boolean> {
    if (this.filesystemRoot) {
      try {
        const targetPath = this.resolveFilesystemPath(storageKey);
        await stat(targetPath);
        return true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return false;
        }

        throw error;
      }
    }

    try {
      await this.getClient().statObject(this.bucket, storageKey);
      return true;
    } catch {
      return false;
    }
  }

  async deleteFile(storageKey: string): Promise<void> {
    if (this.filesystemRoot) {
      const targetPath = this.resolveFilesystemPath(storageKey);
      try {
        await rm(targetPath);
        await this.cleanupEmptyParents(path.dirname(targetPath));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
      return;
    }

    await this.getClient().removeObject(this.bucket, storageKey);
  }

  async moveFile(fromStorageKey: string, toStorageKey: string): Promise<void> {
    if (fromStorageKey === toStorageKey) {
      return;
    }

    if (this.filesystemRoot) {
      const fromPath = this.resolveFilesystemPath(fromStorageKey);
      const toPath = this.resolveFilesystemPath(toStorageKey);
      await mkdir(path.dirname(toPath), { recursive: true });

      try {
        await rename(fromPath, toPath);
        await this.cleanupEmptyParents(path.dirname(fromPath));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EXDEV') {
          await copyFile(fromPath, toPath);
          await rm(fromPath);
          await this.cleanupEmptyParents(path.dirname(fromPath));
          return;
        }

        throw error;
      }
      return;
    }

    await this.getClient().copyObject(
      this.bucket,
      toStorageKey,
      `/${this.bucket}/${fromStorageKey}`,
    );
    await this.getClient().removeObject(this.bucket, fromStorageKey);
  }

  async getFileStream(storageKey: string): Promise<Readable> {
    if (this.filesystemRoot) {
      const storageAvailable = await this.isFilesystemStorageAvailable();
      if (!storageAvailable) {
        throw new Error(
          `Dokumentenablage nicht verfügbar: ${this.filesystemRoot}`,
        );
      }

      const targetPath = this.resolveFilesystemPath(storageKey);
      await stat(targetPath);
      return createReadStream(targetPath);
    }

    return this.getClient().getObject(this.bucket, storageKey);
  }

  getPhysicalPath(storageKey: string): string | null {
    if (!this.filesystemRoot) {
      return null;
    }

    return this.resolveFilesystemPath(storageKey);
  }

  private resolveFilesystemPath(storageKey: string) {
    if (!this.filesystemRoot) {
      throw new Error('Dateisystemspeicher ist nicht aktiviert.');
    }

    const normalizedRoot = path.resolve(this.filesystemRoot);
    const normalizedKey = storageKey.replace(/[\\/]+/g, path.sep);
    const resolvedPath = path.resolve(normalizedRoot, normalizedKey);

    const relativePath = path.relative(normalizedRoot, resolvedPath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error('Ungültiger Speicherpfad außerhalb des Dokumentenroots.');
    }

    return resolvedPath;
  }

  private sanitizeSegment(value: string) {
    const sanitized = value
      .split('')
      .map((char) =>
        INVALID_STORAGE_SEGMENT_CHARS.includes(char) || char.charCodeAt(0) <= 31
          ? '_'
          : char,
      )
      .join('')
      .trim();

    return sanitized || 'unbekannt';
  }

  private buildObjectFolderName(
    displayId: string,
    objectName?: string,
    objectId?: string,
  ) {
    if (objectName?.trim()) {
      return this.sanitizeSegment(
        `${displayId} ${objectName}`.replace(/\s+/g, '_'),
      );
    }

    return this.sanitizeSegment(`${displayId}-${objectId ?? 'objekt'}`);
  }

  private getClient() {
    if (!this.client) {
      throw new Error('Objektspeicher ist nicht initialisiert.');
    }

    return this.client;
  }

  private async isFilesystemStorageAvailable() {
    if (!this.filesystemRoot) {
      return false;
    }

    try {
      await mkdir(this.filesystemRoot, { recursive: true });
      await access(this.filesystemRoot, fsConstants.R_OK | fsConstants.W_OK);
      return true;
    } catch (error) {
      this.logger.warn(
        `Dokumentenablage nicht verfügbar: ${this.filesystemRoot} (${error})`,
      );
      return false;
    }
  }

  private async cleanupEmptyParents(currentPath: string) {
    if (!this.filesystemRoot) {
      return;
    }

    const normalizedRoot = path.resolve(this.filesystemRoot);
    let candidatePath = currentPath;

    while (
      candidatePath.startsWith(normalizedRoot) &&
      candidatePath !== normalizedRoot
    ) {
      try {
        await rmdir(candidatePath);
      } catch (error) {
        const errorCode = (error as NodeJS.ErrnoException).code;
        if (errorCode === 'ENOTEMPTY' || errorCode === 'ENOENT') {
          return;
        }

        throw error;
      }

      candidatePath = path.dirname(candidatePath);
    }
  }
}
