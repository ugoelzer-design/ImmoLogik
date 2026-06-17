import { validate } from 'class-validator';
import { CreateTenantDto } from './create-tenant.dto';

function createValidDto(status?: string) {
  const dto = new CreateTenantDto();
  dto.objectId = 'obj-1';
  dto.rentUnitId = 'ru-1';
  dto.fullName = 'Max Mustermann';
  dto.email = 'max@example.com';
  dto.phone = '+49 170 1234567';
  dto.status = status;
  return dto;
}

describe('CreateTenantDto', () => {
  it.each(['Aktiv', 'Ausstehend', 'Beendet'])(
    'accepts UI tenant status %s',
    async (status) => {
      await expect(validate(createValidDto(status))).resolves.toHaveLength(0);
    },
  );

  it('rejects legacy english tenant statuses', async () => {
    const errors = await validate(createValidDto('active'));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'status' }),
      ]),
    );
  });
});
