import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const contracts = await this.prisma.vertrag.findMany({
      include: {
        object: true,
        tenant: {
          include: {
            rentUnit: true,
          },
        },
        rentUnit: true,
      },
      orderBy: [{ endDate: 'asc' }, { createdAt: 'asc' }],
    });

    return contracts.map((contract) => this.toResponse(contract));
  }

  async findOne(id: string) {
    const contract = await this.prisma.vertrag.findUnique({
      where: { id },
      include: {
        object: true,
        tenant: {
          include: {
            rentUnit: true,
          },
        },
        rentUnit: true,
      },
    });

    if (!contract) {
      throw new NotFoundException('Vertrag nicht gefunden.');
    }

    return this.toResponse(contract);
  }

  async create(dto: CreateContractDto) {
    const resolvedRentUnitId = await this.assertRelationConsistency(
      dto.objectId,
      dto.tenantId,
      dto.rentUnitId,
    );

    const contract = await this.prisma.vertrag.create({
      data: {
        objectId: dto.objectId,
        tenantId: dto.tenantId,
        rentUnitId: resolvedRentUnitId,
        title: dto.title,
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: this.persistStatus(dto.status),
      },
      include: {
        object: true,
        tenant: {
          include: {
            rentUnit: true,
          },
        },
        rentUnit: true,
      },
    });

    return this.toResponse(contract);
  }

  async update(id: string, dto: Partial<CreateContractDto>) {
    const existing = await this.prisma.vertrag.findUnique({
      where: { id },
      include: {
        tenant: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Vertrag nicht gefunden.');
    }

    const nextObjectId = dto.objectId ?? existing.objectId;
    const nextTenantId = dto.tenantId ?? existing.tenantId;
    const nextRentUnitId =
      dto.rentUnitId !== undefined ? dto.rentUnitId : existing.rentUnitId;
    const resolvedRentUnitId = await this.assertRelationConsistency(
      nextObjectId,
      nextTenantId,
      nextRentUnitId,
    );

    const contract = await this.prisma.vertrag.update({
      where: { id },
      data: {
        ...(dto.objectId !== undefined ? { objectId: dto.objectId } : {}),
        ...(dto.tenantId !== undefined ? { tenantId: dto.tenantId } : {}),
        ...(dto.rentUnitId !== undefined ||
        dto.tenantId !== undefined ||
        dto.objectId !== undefined
          ? { rentUnitId: resolvedRentUnitId }
          : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.startDate !== undefined ? { startDate: dto.startDate } : {}),
        ...(dto.endDate !== undefined ? { endDate: dto.endDate } : {}),
        ...(dto.status !== undefined
          ? { status: this.persistStatus(dto.status) }
          : {}),
      },
      include: {
        object: true,
        tenant: {
          include: {
            rentUnit: true,
          },
        },
        rentUnit: true,
      },
    });

    return this.toResponse(contract);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.vertrag.delete({ where: { id } });
  }

  private async assertRelationConsistency(
    objectId: string,
    tenantId: string,
    rentUnitId?: string | null,
  ) {
    const tenant = await this.prisma.mieter.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new BadRequestException('Mieter nicht gefunden.');
    }

    if (tenant.objectId !== objectId) {
      throw new BadRequestException(
        'Mieter gehört nicht zum gewählten Objekt.',
      );
    }

    const resolvedRentUnitId = rentUnitId ?? tenant.rentUnitId;

    if (resolvedRentUnitId) {
      const rentUnit = await this.prisma.rentUnit.findUnique({
        where: { id: resolvedRentUnitId },
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

    return resolvedRentUnitId ?? null;
  }

  private toResponse(contract: {
    id: string;
    objectId: string;
    tenantId: string;
    rentUnitId: string | null;
    title: string;
    startDate: string;
    endDate: string;
    status: string;
    object: { id: string; name: string; displayId: string };
    tenant: {
      id: string;
      fullName: string;
      rentUnit: { id: string; unitLabel: string };
    };
    rentUnit: { id: string; unitLabel: string } | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    return {
      id: contract.id,
      objectId: contract.objectId,
      tenantId: contract.tenantId,
      rentUnitId: contract.rentUnitId,
      title: contract.title,
      objectName: contract.object.name,
      objectDisplayId: contract.object.displayId,
      tenantName: contract.tenant.fullName,
      unit: contract.rentUnit?.unitLabel ?? contract.tenant.rentUnit.unitLabel,
      startDate: contract.startDate,
      endDate: contract.endDate,
      status: this.normalizeStatus(contract.status),
    };
  }

  /**
   * Normalisiert alte DB-Werte ohne Umlaute auf die kanonische Form.
   * Kann entfernt werden, sobald alle bestehenden Datensätze migriert sind.
   */
  private normalizeStatus(status: string) {
    switch (status) {
      case 'In Pruefung':
        return 'In Prüfung';
      case 'Laeuft aus':
        return 'Läuft aus';
      default:
        return status;
    }
  }

  /**
   * Speichert Status mit korrekten Umlauten (ab sofort direkt in DB).
   * Bestehende Altdaten ('In Pruefung', 'Laeuft aus') werden durch normalizeStatus()
   * beim Lesen weiterhin korrekt angezeigt.
   */
  private persistStatus(status?: string) {
    switch (status) {
      case undefined:
      case null:
      case '':
        return 'Aktiv';
      default:
        return status;
    }
  }
}
