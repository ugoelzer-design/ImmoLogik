import { MinioService } from '../documents/minio.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateObjectDto } from './dto/create-object.dto';

@Injectable()
export class ObjectsService {
  constructor(private readonly prisma: PrismaService, private readonly minio: MinioService) {}

  findAll() {
    return this.prisma.propertyObject.findMany({
      orderBy: {
        displayId: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const object = await this.prisma.propertyObject.findUnique({
      where: { id },
    });

    if (!object) {
      throw new NotFoundException('Objekt nicht gefunden.');
    }

    return object;
  }

  async create(createObjectDto: CreateObjectDto) {
    const name = createObjectDto.name?.trim();
    const address = createObjectDto.address?.trim();
    const unitsRaw = Number(createObjectDto.units);
    const units = Number.isInteger(unitsRaw) && unitsRaw >= 1 ? unitsRaw : NaN;

    if (!name || !address) {
      throw new BadRequestException('Name und Adresse sind erforderlich.');
    }

    if (!Number.isInteger(units) || units < 1) {
      throw new BadRequestException(
        'Einheiten mÃ¼ssen als ganze Zahl ab 1 Ã¼bergeben werden.',
      );
    }

    const displayId = await this.getNextDisplayId();

    return this.prisma.propertyObject.create({
      data: {
        displayId,
        name,
        address,
        type: 'Wohnobjekt',
        status: 'Neu',
        units,
        occupancy: '0%',
        monthlyTargetRent: '0 â‚¬',
        note: 'Neu angelegtes Objekt. Weitere Daten folgen im nÃ¤chsten Schritt.',
      },
    });
  }

  async remove(id: string) {
    const object = await this.prisma.propertyObject.findUnique({
      where: { id },
    });

    if (!object) {
      throw new NotFoundException('Objekt nicht gefunden.');
    }

    return this.prisma.propertyObject.delete({
      where: { id },
    });
  }

  private async getNextDisplayId() {
    const objects = await this.prisma.propertyObject.findMany({
      select: {
        displayId: true,
      },
    });

    let maxNumber = 0;

    for (const object of objects) {
      const match = object.displayId?.match(/^WEG-(\d+)$/);

      if (!match) {
        continue;
      }

      const currentNumber = Number(match[1]);

      if (Number.isFinite(currentNumber) && currentNumber > maxNumber) {
        maxNumber = currentNumber;
      }
    }

    return `WEG-${String(maxNumber + 1).padStart(3, '0')}`;
  }
}
