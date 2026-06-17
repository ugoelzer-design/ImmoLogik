import { validate } from 'class-validator';
import { CreateContractDto } from './create-contract.dto';

function createValidDto(status?: string) {
  const dto = new CreateContractDto();
  dto.objectId = 'obj-1';
  dto.tenantId = 'tenant-1';
  dto.rentUnitId = 'unit-1';
  dto.title = 'Mietvertrag EG links';
  dto.startDate = '2024-01-01';
  dto.endDate = '2025-12-31';
  dto.status = status;
  return dto;
}

describe('CreateContractDto', () => {
  it.each(['Aktiv', 'In Prüfung', 'Läuft aus'])(
    'accepts UI contract status %s',
    async (status) => {
      await expect(validate(createValidDto(status))).resolves.toHaveLength(0);
    },
  );

  it('rejects legacy english contract statuses', async () => {
    const errors = await validate(createValidDto('active'));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'status' }),
      ]),
    );
  });
});
