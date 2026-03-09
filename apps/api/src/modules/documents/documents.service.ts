import { Injectable } from '@nestjs/common';

@Injectable()
export class DocumentsService {
  private readonly documents = [
    {
      id: 'doc-1',
      title: 'Mietvertrag Muster',
      fileName: 'mietvertrag-muster.pdf',
      mimeType: 'application/pdf',
      size: 245760,
      storageKey: 'documents/mietvertrag-muster.pdf',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  findAll() {
    return this.documents;
  }

  findOne(id: string) {
    return this.documents.find((document) => document.id === id) ?? null;
  }
}