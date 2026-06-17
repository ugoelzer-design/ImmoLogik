import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '@prisma/client';
import { CreateReadingCampaignDto } from './dto/create-reading-campaign.dto';
import { SubmitMeterReadingsDto } from './dto/submit-meter-readings.dto';

const STANDARD_APARTMENT_METERS = [
  { type: 'heizung', label: 'Heizung', unit: 'kWh' },
  { type: 'kaltwasser', label: 'Kaltwasser', unit: 'm³' },
  { type: 'warmwasser', label: 'Warmwasser', unit: 'm³' },
] as const;

@Injectable()
export class MeterReadingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMeters(objectId?: string, appTenantSlug = 'default') {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const meters = await this.prisma.meter.findMany({
      where: {
        appTenantId,
        ...(objectId ? { objectId } : {}),
      },
      include: {
        readings: {
          orderBy: { readingDate: 'desc' },
          take: 5,
        },
        rentUnit: true,
      },
      orderBy: [
        { objectId: 'asc' },
        { rentUnitId: 'asc' },
        { label: 'asc' },
      ],
    });

    return meters.map((meter) => ({
      id: meter.id,
      objectId: meter.objectId,
      rentUnitId: meter.rentUnitId,
      unitLabel: meter.rentUnit?.unitLabel ?? null,
      scope: meter.scope,
      type: meter.type,
      label: meter.label,
      meterNumber: meter.meterNumber,
      unit: meter.unit,
      readings: meter.readings.map((reading) => ({
        id: reading.id,
        date: reading.readingDate.toISOString(),
        value: reading.value,
        reader: reading.readerName,
      })),
    }));
  }

  async findCampaigns(
    objectId?: string,
    pagination: Pick<Prisma.ReadingCampaignFindManyArgs, 'skip' | 'take'> = {},
    appTenantSlug = 'default',
  ) {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const campaigns = await this.prisma.readingCampaign.findMany({
      where: {
        appTenantId,
        ...(objectId ? { objectId } : {}),
      },
      ...pagination,
      include: {
        object: true,
        access: {
          include: {
            tenant: true,
            rentUnit: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: [{ reportYear: 'desc' }, { createdAt: 'desc' }],
    });

    return campaigns.map((campaign) => this.toCampaignResponse(campaign));
  }

  async createCampaign(
    dto: CreateReadingCampaignDto,
    appTenantSlug = 'default',
  ) {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const reportYear = Number(dto.reportYear);

    if (
      !Number.isInteger(reportYear) ||
      reportYear < 2000 ||
      reportYear > 2100
    ) {
      throw new BadRequestException(
        'Berichtsjahr muss zwischen 2000 und 2100 liegen.',
      );
    }

    const object = await this.prisma.propertyObject.findUnique({
      where: { id: dto.objectId },
    });

    if (!object || object.appTenantId !== appTenantId) {
      throw new NotFoundException('Objekt nicht gefunden.');
    }

    const activeTenants = await this.prisma.mieter.findMany({
      where: {
        appTenantId,
        objectId: dto.objectId,
        status: {
          not: 'Beendet',
        },
      },
      include: {
        rentUnit: true,
      },
      orderBy: [{ fullName: 'asc' }],
    });

    if (activeTenants.length === 0) {
      throw new BadRequestException(
        'Für dieses Objekt sind keine aktiven Mieter vorhanden.',
      );
    }

    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : this.defaultExpiry(reportYear);

    if (Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('Ablaufdatum ist ungültig.');
    }

    const campaign = await this.prisma.readingCampaign.upsert({
      where: {
        objectId_reportYear: {
          objectId: dto.objectId,
          reportYear,
        },
      },
      update: {
        appTenantId,
        expiresAt,
        status: 'offen',
      },
      create: {
        appTenantId,
        objectId: dto.objectId,
        reportYear,
        expiresAt,
        status: 'offen',
      },
    });

    const sentAt = new Date();

    await this.ensureStandardMetersForUnits(
      dto.objectId,
      activeTenants.map((tenant) => tenant.rentUnitId),
      appTenantId,
    );

    await this.prisma.readingAccess.createMany({
      data: activeTenants.map((tenant) => ({
        appTenantId,
        campaignId: campaign.id,
        tenantId: tenant.id,
        rentUnitId: tenant.rentUnitId,
        token: this.createToken(),
        expiresAt,
        status: 'offen',
        sentAt,
      })),
      skipDuplicates: true,
    });

    await this.prisma.readingAccess.updateMany({
      where: {
        appTenantId,
        campaignId: campaign.id,
        tenantId: {
          in: activeTenants.map((tenant) => tenant.id),
        },
      },
      data: {
        expiresAt,
        status: 'offen',
        sentAt,
      },
    });

    const populatedCampaign = await this.prisma.readingCampaign.findUnique({
      where: { id: campaign.id },
      include: {
        object: true,
        access: {
          include: {
            tenant: true,
            rentUnit: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!populatedCampaign) {
      throw new NotFoundException('Kampagne konnte nicht geladen werden.');
    }

    return this.toCampaignResponse(populatedCampaign);
  }

  async getAccess(token: string) {
    const access = await this.prisma.readingAccess.findUnique({
      where: { token },
      include: {
        tenant: true,
        rentUnit: true,
        campaign: {
          include: {
            object: true,
          },
        },
      },
    });

    if (!access) {
      throw new NotFoundException('Zugang nicht gefunden.');
    }

    if (access.expiresAt && access.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Dieser Zugang ist abgelaufen.');
    }

    const meters = await this.prisma.meter.findMany({
      where: {
        appTenantId: access.appTenantId,
        objectId: access.campaign.objectId,
        rentUnitId: access.rentUnitId,
      },
      include: {
        readings: {
          where: {
            campaignId: access.campaignId,
          },
          orderBy: {
            readingDate: 'desc',
          },
          take: 1,
        },
      },
      orderBy: [{ label: 'asc' }],
    });

    return {
      token: access.token,
      status: access.status,
      reportYear: access.campaign.reportYear,
      expiresAt: access.expiresAt?.toISOString() ?? null,
      object: {
        id: access.campaign.object.id,
        displayId: access.campaign.object.displayId,
        name: access.campaign.object.name,
      },
      tenant: {
        id: access.tenant.id,
        fullName: access.tenant.fullName,
        email: access.tenant.email,
      },
      rentUnit: {
        id: access.rentUnit.id,
        unitLabel: access.rentUnit.unitLabel,
      },
      meters: meters.map((meter) => ({
        id: meter.id,
        type: meter.type,
        label: meter.label,
        unit: meter.unit,
        meterNumber: meter.meterNumber,
        lastSubmittedValue: meter.readings[0]?.value ?? null,
        lastSubmittedDate:
          meter.readings[0]?.readingDate?.toISOString() ?? null,
      })),
    };
  }

  async submitReadings(token: string, dto: SubmitMeterReadingsDto) {
    const access = await this.prisma.readingAccess.findUnique({
      where: { token },
      include: {
        campaign: true,
      },
    });

    if (!access) {
      throw new NotFoundException('Zugang nicht gefunden.');
    }

    if (access.expiresAt && access.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Dieser Zugang ist abgelaufen.');
    }

    if (!Array.isArray(dto.readings) || dto.readings.length === 0) {
      throw new BadRequestException(
        'Mindestens ein Zählerstand ist erforderlich.',
      );
    }

    const meters = await this.prisma.meter.findMany({
      where: {
        appTenantId: access.appTenantId,
        objectId: access.campaign.objectId,
        rentUnitId: access.rentUnitId,
      },
    });

    const meterById = new Map(meters.map((meter) => [meter.id, meter]));

    for (const item of dto.readings) {
      const meter = meterById.get(item.meterId);

      if (!meter) {
        throw new BadRequestException('Zähler gehört nicht zu diesem Zugang.');
      }

      const value = Number(item.value);

      if (!Number.isFinite(value) || value < 0) {
        throw new BadRequestException(
          'Zählerstand muss eine nicht-negative Zahl sein.',
        );
      }

      const readingDate = item.date ? new Date(item.date) : new Date();

      if (Number.isNaN(readingDate.getTime())) {
        throw new BadRequestException('Ablesedatum ist ungültig.');
      }

      const existingReading = await this.prisma.meterReading.findFirst({
        where: {
          meterId: item.meterId,
          appTenantId: access.appTenantId,
          campaignId: access.campaignId,
        },
      });

      if (existingReading) {
        await this.prisma.meterReading.update({
          where: { id: existingReading.id },
          data: {
            value,
            readingDate,
            readerName: dto.readerName?.trim() || access.tenantId,
            source: 'tenant',
            status: 'eingereicht',
            submittedById: access.tenantId,
          },
        });
      } else {
        await this.prisma.meterReading.create({
          data: {
            meterId: item.meterId,
            appTenantId: access.appTenantId,
            campaignId: access.campaignId,
            value,
            readingDate,
            readerName: dto.readerName?.trim() || access.tenantId,
            source: 'tenant',
            status: 'eingereicht',
            submittedById: access.tenantId,
          },
        });
      }
    }

    await this.prisma.readingAccess.update({
      where: { id: access.id },
      data: {
        status: 'eingereicht',
        submittedAt: new Date(),
      },
    });

    return this.getAccess(token);
  }

  private async ensureStandardMetersForUnits(
    objectId: string,
    rentUnitIds: string[],
    appTenantId: string,
  ) {
    const uniqueRentUnitIds = [...new Set(rentUnitIds)];

    await this.prisma.meter.createMany({
      data: uniqueRentUnitIds.flatMap((rentUnitId) =>
        STANDARD_APARTMENT_METERS.map((template) => ({
          appTenantId,
          objectId,
          rentUnitId,
          scope: 'apartment',
          type: template.type,
          label: template.label,
          unit: template.unit,
        })),
      ),
      skipDuplicates: true,
    });

    await Promise.all(
      STANDARD_APARTMENT_METERS.map((template) =>
        this.prisma.meter.updateMany({
          where: {
            appTenantId,
            objectId,
            rentUnitId: {
              in: uniqueRentUnitIds,
            },
            type: template.type,
            label: template.label,
          },
          data: {
            unit: template.unit,
            scope: 'apartment',
          },
        }),
      ),
    );
  }

  private createToken() {
    return randomBytes(18).toString('base64url');
  }

  private defaultExpiry(reportYear: number) {
    return new Date(Date.UTC(reportYear + 1, 0, 31, 22, 59, 59));
  }

  private toCampaignResponse(campaign: {
    id: string;
    appTenantId?: string | null;
    objectId: string;
    reportYear: number;
    status: string;
    expiresAt: Date | null;
    createdAt: Date;
    object: { id: string; displayId: string; name: string };
    access: Array<{
      id: string;
      appTenantId?: string | null;
      token: string;
      status: string;
      sentAt: Date;
      submittedAt: Date | null;
      expiresAt: Date | null;
      tenant: { id: string; fullName: string; email: string };
      rentUnit: { id: string; unitLabel: string };
    }>;
  }) {
    return {
      id: campaign.id,
      objectId: campaign.objectId,
      reportYear: campaign.reportYear,
      status: campaign.status,
      createdAt: campaign.createdAt.toISOString(),
      expiresAt: campaign.expiresAt?.toISOString() ?? null,
      object: campaign.object,
      recipients: campaign.access.map((access) => ({
        id: access.id,
        tenantId: access.tenant.id,
        tenantName: access.tenant.fullName,
        tenantEmail: access.tenant.email,
        rentUnitId: access.rentUnit.id,
        unitLabel: access.rentUnit.unitLabel,
        token: access.token,
        status: access.status,
        sentAt: access.sentAt.toISOString(),
        submittedAt: access.submittedAt?.toISOString() ?? null,
        expiresAt: access.expiresAt?.toISOString() ?? null,
      })),
    };
  }

  private async resolveAppTenantId(appTenantSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: appTenantSlug },
      select: { id: true },
    });

    if (!tenant) {
      throw new NotFoundException('Mandant nicht gefunden.');
    }

    return tenant.id;
  }
}
