import { MinioService } from '../documents/minio.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateObjectDto } from './dto/create-object.dto';
import type { Prisma } from '@prisma/client';

@Injectable()
export class ObjectsService {
  private readonly logger = new Logger(ObjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async findAll(
    pagination: Pick<Prisma.PropertyObjectFindManyArgs, 'skip' | 'take'> = {},
    appTenantSlug = 'default',
  ) {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);

    return this.prisma.propertyObject.findMany({
      ...pagination,
      where: { appTenantId },
      orderBy: { displayId: 'asc' },
    });
  }

  async getNextDisplayIdPreview(appTenantSlug = 'default') {
    return {
      displayId: await this.getNextDisplayId(appTenantSlug),
    };
  }

  async findOne(id: string, appTenantSlug = 'default') {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const object = await this.prisma.propertyObject.findFirst({
      where: { id, appTenantId },
    });
    if (!object) throw new NotFoundException('Objekt nicht gefunden.');
    return object;
  }

  async create(createObjectDto: CreateObjectDto, appTenantSlug = 'default') {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const name = createObjectDto.name?.trim();
    const address = createObjectDto.address?.trim();
    const unitsRaw = Number(createObjectDto.units);
    const units = Number.isInteger(unitsRaw) && unitsRaw >= 1 ? unitsRaw : NaN;

    if (!name || !address)
      throw new BadRequestException('Name und Adresse sind erforderlich.');
    if (!Number.isInteger(units) || units < 1)
      throw new BadRequestException(
        'Einheiten müssen als ganze Zahl ab 1 übergeben werden.',
      );

    const displayId = await this.getNextDisplayId(appTenantSlug);

    const obj = await this.prisma.propertyObject.create({
      data: {
        appTenantId,
        displayId,
        name,
        address,
        type: 'Wohnobjekt',
        status: 'Neu',
        units,
        occupancy: '0%',
        monthlyTargetRent: '0 €',
        note: 'Neu angelegtes Objekt. Weitere Daten folgen im nächsten Schritt.',
      },
    });

    try {
      await this.minio.ensureObjectFolder(obj.id, obj.displayId, obj.name);
    } catch (err) {
      this.logger.warn(
        `MinIO Ordner konnte nicht erstellt werden für Objekt ${obj.displayId}: ${err}`,
      );
    }

    return obj;
  }

  async remove(id: string, appTenantSlug = 'default') {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const object = await this.prisma.propertyObject.findFirst({
      where: { id, appTenantId },
      include: {
        _count: {
          select: {
            documents: true,
            rentUnits: true,
            mieter: true,
            vertraege: true,
          },
        },
      },
    });
    if (!object) throw new NotFoundException('Objekt nicht gefunden.');

    if (
      object._count.documents > 0 ||
      object._count.rentUnits > 0 ||
      object._count.mieter > 0 ||
      object._count.vertraege > 0
    ) {
      throw new BadRequestException(
        'Objekt kann nicht gelöscht werden, solange noch Dokumente, Einheiten, Mieter oder Verträge verknüpft sind.',
      );
    }

    return this.prisma.propertyObject.delete({ where: { id } });
  }

  private async getNextDisplayId(appTenantSlug = 'default') {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const objects = await this.prisma.propertyObject.findMany({
      where: { appTenantId },
      select: { displayId: true },
    });
    let maxNumber = 0;
    for (const object of objects) {
      const match = object.displayId?.match(/^WEG-(\d+)$/);
      if (!match) continue;
      const currentNumber = Number(match[1]);
      if (Number.isFinite(currentNumber) && currentNumber > maxNumber)
        maxNumber = currentNumber;
    }
    return `WEG-${String(maxNumber + 1).padStart(3, '0')}`;
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
