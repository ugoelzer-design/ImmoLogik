import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapDocument(document: {
    id: string;
    title: string;
    updatedAt: Date;
  }) {
    return {
      id: document.id,
      title: document.title,
      objectName: 'Allgemein',
      category: 'Sonstiges',
      status: 'Vorhanden',
      updatedAt: new Intl.DateTimeFormat('de-DE').format(
        new Date(document.updatedAt),
      ),
    };
  }

  async findAll() {
    const documents = await this.prisma.document.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return documents.map((document) => this.mapDocument(document));
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Dokument nicht gefunden.');
    }

    return this.mapDocument(document);
  }
}