import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import * as Minio from "minio";

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private bucket: string;

  async onModuleInit() {
    this.bucket = process.env.S3_BUCKET || "immologik-local";
    this.client = new Minio.Client({
      endPoint: (process.env.S3_ENDPOINT || "http://localhost:9000").replace(/^https?:\/\//, ""),
      port: parseInt(process.env.MINIO_PORT || "9000"),
      useSSL: false,
      accessKey: process.env.S3_ACCESS_KEY || "minioadmin",
      secretKey: process.env.S3_SECRET_KEY || "minioadmin",
    });

    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket, process.env.S3_REGION || "us-east-1");
      this.logger.log(`Bucket "${this.bucket}" erstellt.`);
    }
  }

  async ensureObjectFolder(objectId: string, displayId: string): Promise<void> {
    const key = `wegs/${displayId}-${objectId}/.keep`;
    try {
      await this.client.statObject(this.bucket, key);
    } catch {
      await this.client.putObject(this.bucket, key, Buffer.from(""), 0);
      this.logger.log(`Ordner fuer WEG ${displayId} erstellt.`);
    }
  }

  async uploadFile(
    storageKey: string,
    buffer: Buffer,
    mimeType: string,
    metadata?: Record<string, string>,
  ): Promise<void> {
    await this.client.putObject(this.bucket, storageKey, buffer, buffer.length, {
      "Content-Type": mimeType,
      ...metadata,
    });
  }

  async getPresignedUrl(storageKey: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, storageKey, expirySeconds);
  }

  async deleteFile(storageKey: string): Promise<void> {
    await this.client.removeObject(this.bucket, storageKey);
  }

  async listObjectFiles(objectId: string): Promise<string[]> {
    const keys: string[] = [];
    const stream = this.client.listObjectsV2(this.bucket, `wegs/`, true);
    return new Promise((resolve, reject) => {
      stream.on("data", (obj) => {
        if (obj.name && obj.name.includes(objectId)) keys.push(obj.name);
      });
      stream.on("end", () => resolve(keys));
      stream.on("error", reject);
    });
  }
}