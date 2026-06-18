import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { Vertrag } from '@prisma/client';
import type { Response } from 'express';

const PORTAL_TOKEN_DAYS = 90;

@Injectable()
export class MieterPortalService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Verwalter: Portal-Zugang erstellen / erneuern ─────────────────────────

  async createOrRenewAccess(mieterId: string, appTenantSlug: string) {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);

    const mieter = await this.prisma.mieter.findUnique({
      where: { id: mieterId },
      include: { object: true, rentUnit: true },
    });

    if (!mieter || mieter.appTenantId !== appTenantId) {
      throw new NotFoundException('Mieter nicht gefunden.');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + PORTAL_TOKEN_DAYS);

    const access = await this.prisma.mieterPortalAccess.upsert({
      where: { mieterId },
      create: { appTenantId, mieterId, token, expiresAt },
      update: { token, expiresAt },
    });

    return {
      token: access.token,
      expiresAt: access.expiresAt,
      mieterId,
      mieterName: mieter.fullName,
    };
  }

  // ── Öffentlich: Portal-Daten per Token abrufen ────────────────────────────

  async getPortalData(token: string) {
    const access = await this.prisma.mieterPortalAccess.findUnique({
      where: { token },
      include: {
        mieter: {
          include: {
            object: true,
            rentUnit: true,
            vertraege: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });

    if (!access) {
      throw new NotFoundException('Portal-Zugang nicht gefunden.');
    }

    if (access.expiresAt < new Date()) {
      throw new ForbiddenException('Portal-Link ist abgelaufen.');
    }

    const mieter = access.mieter;

    const dokumente = await this.prisma.document.findMany({
      where: {
        appTenantId: access.appTenantId,
        objectId: mieter.objectId,
        rentUnitId: mieter.rentUnitId,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        fileName: true,
        mimeType: true,
        size: true,
        category: true,
        status: true,
        createdAt: true,
      },
    });

    const campaigns = await this.prisma.readingCampaign.findMany({
      where: { appTenantId: access.appTenantId, objectId: mieter.objectId },
      orderBy: { reportYear: 'desc' },
      take: 5,
      include: {
        access: {
          where: { tenantId: mieter.id },
          select: { token: true, status: true, submittedAt: true, expiresAt: true },
        },
      },
    });

    return {
      portalAccess: {
        expiresAt: access.expiresAt,
      },
      mieter: {
        id: mieter.id,
        fullName: mieter.fullName,
        email: mieter.email,
        phone: mieter.phone,
        status: mieter.status,
        objectDisplayId: mieter.object.displayId,
        objectName: mieter.object.name,
        objectAddress: mieter.object.address,
        unit: mieter.rentUnit.unitLabel,
        sollMiete: mieter.rentUnit.sollMiete,
        zahlungsStatus: mieter.rentUnit.zahlungsStatus,
        faelligAm: mieter.rentUnit.faelligAm,
      },
      vertraege: mieter.vertraege.map((v: Vertrag) => ({
        id: v.id,
        title: v.title,
        startDate: v.startDate,
        endDate: v.endDate,
        status: v.status,
      })),
      dokumente,
      ablesungen: campaigns.map((c) => ({
        id: c.id,
        reportYear: c.reportYear,
        status: c.status,
        expiresAt: c.expiresAt,
        meinZugang: c.access[0] ?? null,
      })),
    };
  }

  // ── Öffentlich: Dokument-Datei per Token streamen ─────────────────────────

  async streamDocument(
    token: string,
    documentId: string,
    res: Response,
  ): Promise<StreamableFile> {
    const access = await this.prisma.mieterPortalAccess.findUnique({
      where: { token },
    });

    if (!access || access.expiresAt < new Date()) {
      throw new ForbiddenException('Portal-Link ungültig oder abgelaufen.');
    }

    const doc = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        appTenantId: access.appTenantId,
        objectId: {
          in: await this.prisma.mieter
            .findUnique({ where: { id: access.mieterId }, select: { objectId: true } })
            .then((m) => (m ? [m.objectId] : [])),
        },
      },
    });

    if (!doc) {
      throw new NotFoundException('Dokument nicht gefunden oder kein Zugriff.');
    }

    // MinIO / S3 — storageKey verwenden
    const minioEndpoint = process.env.S3_ENDPOINT ?? 'http://minio:9000';
    const bucket = process.env.S3_BUCKET ?? 'immologik';
    const fileUrl = `${minioEndpoint}/${bucket}/${doc.storageKey}`;

    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok || !fileResponse.body) {
      throw new NotFoundException('Datei nicht abrufbar.');
    }

    res.set({
      'Content-Type': doc.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(doc.fileName)}"`,
    });

    const { Readable } = await import('stream');
    const readable = Readable.fromWeb(fileResponse.body as import('stream/web').ReadableStream);
    return new StreamableFile(readable);
  }

  // ── Hilfsmethoden ─────────────────────────────────────────────────────────

  private async resolveAppTenantId(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new NotFoundException(`App-Tenant "${slug}" nicht gefunden.`);
    return tenant.id;
  }
}
