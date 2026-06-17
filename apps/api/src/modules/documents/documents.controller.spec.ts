import { BadRequestException } from '@nestjs/common';
import {
  DOCUMENT_UPLOAD_ALLOWED_MIME_TYPES,
  DOCUMENT_UPLOAD_MAX_BYTES,
  documentUploadFileFilter,
} from './documents.controller';

function createFile(mimetype: string) {
  return {
    mimetype,
  } as Express.Multer.File;
}

describe('DocumentsController upload restrictions', () => {
  it('limits in-memory uploads to ten megabytes', () => {
    expect(DOCUMENT_UPLOAD_MAX_BYTES).toBe(10 * 1024 * 1024);
  });

  it.each(DOCUMENT_UPLOAD_ALLOWED_MIME_TYPES)(
    'accepts %s uploads',
    (mimetype) => {
      const callback = jest.fn();

      documentUploadFileFilter({}, createFile(mimetype), callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    },
  );

  it.each(['image/svg+xml', 'text/html', 'application/javascript'])(
    'rejects unsafe upload type %s',
    (mimetype) => {
      const callback = jest.fn();

      documentUploadFileFilter({}, createFile(mimetype), callback);

      expect(callback).toHaveBeenCalledWith(
        expect.any(BadRequestException),
        false,
      );
    },
  );
});
