import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRentUnitDto } from './dto/create-rent-unit.dto';

@Injectable()
export class RentUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.rentUnit.findMany({ orderBy: { createdAt: 'asc' } });
  }

  findByObject(objectId: string) {
    return this.prisma.rentUnit.findMany({
      where: { objectId },
      orderBy: { unitLabel: 'asc' },
    });
  }

  async findOne(id: string) {
    const unit = await this.prisma.rentUnit.findUnique({ where: { id } });
    if (!unit) throw new NotFoundException('Mieteinheit nicht gefunden.');
    return unit;
  }

  create(dto: CreateRentUnitDto) {
    return this.prisma.rentUnit.create({
      data: {
        ...dto,
        istMiete: dto.istMiete ?? 0,
        zahlungsStatus: dto.zahlungsStatus ?? 'Offen',
      },
    });
  }

  async update(id: string, dto: Partial<CreateRentUnitDto>) {
    await this.findOne(id);
    return this.prisma.rentUnit.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
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

    if (!unit) {
      throw new NotFoundException('Mieteinheit nicht gefunden.');
    }

    if (unit._count.mieter > 0 || unit._count.vertraege > 0) {
      throw new BadRequestException(
        'Mieteinheit kann nicht gelöscht werden, solange noch Mieter oder Verträge verknüpft sind.',
      );
    }

    return this.prisma.rentUnit.delete({ where: { id } });
  }
}
