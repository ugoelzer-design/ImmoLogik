import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import type { Prisma } from '@prisma/client';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: Pick<Prisma.MieterFindManyArgs, 'skip' | 'take'> = {}) {
    const tenants = await this.prisma.mieter.findMany({
      ...pagination,
      include: {
        object: true,
        rentUnit: true,
      },
      orderBy: [{ fullName: 'asc' }, { createdAt: 'asc' }],
    });

    return tenants.map((tenant) => this.toResponse(tenant));
  }

  async findOne(id: string) {
    const tenant = await this.prisma.mieter.findUnique({
      where: { id },
      include: {
        object: true,
        rentUnit: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Mieter nicht gefunden.');
    }

    return this.toResponse(tenant);
  }

  async create(dto: CreateTenantDto) {
    await this.assertRelationConsistency(dto.objectId, dto.rentUnitId);

    const tenant = await this.prisma.mieter.create({
      data: {
        objectId: dto.objectId,
        rentUnitId: dto.rentUnitId,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        status: this.persistStatus(dto.status),
      },
      include: {
        object: true,
        rentUnit: true,
      },
    });

    return this.toResponse(tenant);
  }

  async update(id: string, dto: Partial<CreateTenantDto>) {
    const existing = await this.prisma.mieter.findUnique({
      where: { id },
      include: {
        object: true,
        rentUnit: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Mieter nicht gefunden.');
    }

    const nextObjectId = dto.objectId ?? existing.objectId;
    const nextRentUnitId = dto.rentUnitId ?? existing.rentUnitId;
    await this.assertRelationConsistency(nextObjectId, nextRentUnitId);

    const tenant = await this.prisma.mieter.update({
      where: { id },
      data: {
        ...(dto.objectId !== undefined ? { objectId: dto.objectId } : {}),
        ...(dto.rentUnitId !== undefined ? { rentUnitId: dto.rentUnitId } : {}),
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.status !== undefined
          ? { status: this.persistStatus(dto.status) }
          : {}),
      },
      include: {
        object: true,
        rentUnit: true,
      },
    });

    return this.toResponse(tenant);
  }

  async remove(id: string) {
    const tenant = await this.prisma.mieter.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            vertraege: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Mieter nicht gefunden.');
    }

    if (tenant._count.vertraege > 0) {
      throw new BadRequestException(
        'Mieter kann nicht gelöscht werden, solange noch Verträge verknüpft sind.',
      );
    }

    return this.prisma.mieter.delete({ where: { id } });
  }

  private async assertRelationConsistency(
    objectId: string,
    rentUnitId: string,
  ) {
    const rentUnit = await this.prisma.rentUnit.findUnique({
      where: { id: rentUnitId },
    });

    if (!rentUnit) {
      throw new BadRequestException('Mieteinheit nicht gefunden.');
    }

    if (rentUnit.objectId !== objectId) {
      throw new BadRequestException(
        'Mieteinheit gehört nicht zum gewählten Objekt.',
      );
    }
  }

  private toResponse(tenant: {
    id: string;
    objectId: string;
    rentUnitId: string;
    fullName: string;
    email: string;
    phone: string;
    status: string;
    object: { id: string; name: string; displayId: string };
    rentUnit: { id: string; unitLabel: string };
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    return {
      id: tenant.id,
      objectId: tenant.objectId,
      rentUnitId: tenant.rentUnitId,
      fullName: tenant.fullName,
      objectName: tenant.object.name,
      objectDisplayId: tenant.object.displayId,
      unit: tenant.rentUnit.unitLabel,
      email: tenant.email,
      phone: tenant.phone,
      status: this.normalizeStatus(tenant.status),
    };
  }

  private normalizeStatus(status: string) {
    switch (status) {
      case 'In Bearbeitung':
        return 'Ausstehend';
      default:
        return status;
    }
  }

  private persistStatus(status?: string) {
    switch (status) {
      case 'Ausstehend':
        return 'In Bearbeitung';
      case undefined:
      case null:
      case '':
        return 'Aktiv';
      default:
        return status;
    }
  }
}
