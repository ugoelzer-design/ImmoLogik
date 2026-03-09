import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateObjectDto } from './dto/create-object.dto';

@Injectable()
export class ObjectsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.propertyObject.findMany({
      orderBy: {
        createdAt: 'desc',
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

    if (!name || !address) {
      throw new BadRequestException('Name und Adresse sind erforderlich.');
    }

    return this.prisma.propertyObject.create({
      data: {
        name,
        address,
        type: 'Wohnobjekt',
        status: 'Neu',
        units: 1,
        occupancy: '0%',
        monthlyTargetRent: '0 €',
        note: 'Neu angelegtes Objekt. Weitere Daten folgen im nächsten Schritt.',
      },
    });
  }
}
