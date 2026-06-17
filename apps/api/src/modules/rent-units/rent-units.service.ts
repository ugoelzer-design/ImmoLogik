import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRentUnitDto } from './dto/create-rent-unit.dto';
import type { Prisma } from '@prisma/client';

@Injectable()
export class RentUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    pagination: Pick<Prisma.RentUnitFindManyArgs, 'skip' | 'take'> = {},
    appTenantSlug = 'default',
  ) {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);

    return this.prisma.rentUnit.findMany({
      ...pagination,
      where: { appTenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByObject(objectId: string, appTenantSlug = 'default') {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);

    return this.prisma.rentUnit.findMany({
      where: { objectId, appTenantId },
      orderBy: { unitLabel: 'asc' },
    });
  }

  async findOne(id: string, appTenantSlug = 'default') {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const unit = await this.prisma.rentUnit.findUnique({ where: { id } });
    if (!unit || unit.appTenantId !== appTenantId)
      throw new NotFoundException('Mieteinheit nicht gefunden.');
    return unit;
  }

  async create(dto: CreateRentUnitDto, appTenantSlug = 'default') {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    await this.assertObjectBelongsToAppTenant(dto.objectId, appTenantId);

    return this.prisma.rentUnit.create({
      data: {
        appTenantId,
        ...dto,
        istMiete: dto.istMiete ?? 0,
        zahlungsStatus: dto.zahlungsStatus ?? 'Offen',
      },
    });
  }

  async update(
    id: string,
    dto: Partial<CreateRentUnitDto>,
    appTenantSlug = 'default',
  ) {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    await this.findOne(id, appTenantSlug);
    if (dto.objectId !== undefined) {
      await this.assertObjectBelongsToAppTenant(dto.objectId, appTenantId);
    }

    return this.prisma.rentUnit.update({ where: { id }, data: dto });
  }

  async remove(id: string, appTenantSlug = 'default') {
    const appTenantId = await this.resolveAppTenantId(appTenantSlug);
    const unit = await this.prisma.rentUnit.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            mieter: true,
            vertraege: true,
          },
        },
      },
    });

    if (!unit || unit.appTenantId !== appTenantId) {
      throw new NotFoundException('Mieteinheit nicht gefunden.');
    }

    if (unit._count.mieter > 0 || unit._count.vertraege > 0) {
      throw new BadRequestException(
        'Mieteinheit kann nicht gelöscht werden, solange noch Mieter oder Verträge verknüpft sind.',
      );
    }

    return this.prisma.rentUnit.delete({ where: { id } });
  }

  private async assertObjectBelongsToAppTenant(
    objectId: string,
    appTenantId: string,
  ) {
    const object = await this.prisma.propertyObject.findUnique({
      where: { id: objectId },
      select: { id: true, appTenantId: true },
    });

    if (!object || object.appTenantId !== appTenantId) {
      throw new BadRequestException('Objekt nicht gefunden.');
    }
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
