import { Injectable, NotFoundException } from '@nestjs/common';

type TenantRecord = {
  id: string;
  fullName: string;
  objectName: string;
  unit: string;
  email: string;
  phone: string;
  status: 'Aktiv' | 'Ausstehend' | 'Beendet';
};

@Injectable()
export class TenantsService {
  private readonly tenants: TenantRecord[] = [
    {
      id: 'tenant-1',
      fullName: 'Anna Becker',
      objectName: 'Bergstraße 12',
      unit: '2.OG links',
      email: 'anna.becker@example.com',
      phone: '0151 11111111',
      status: 'Aktiv',
    },
    {
      id: 'tenant-2',
      fullName: 'Markus Klein',
      objectName: 'Rheinallee 5',
      unit: 'A-03',
      email: 'markus.klein@example.com',
      phone: '0151 22222222',
      status: 'Ausstehend',
    },
    {
      id: 'tenant-3',
      fullName: 'Sabine Jäger',
      objectName: 'Hafenstraße 21',
      unit: 'EG',
      email: 'sabine.jaeger@example.com',
      phone: '0151 33333333',
      status: 'Aktiv',
    },
  ];

  findAll() {
    return this.tenants;
  }

  findOne(id: string) {
    const tenant = this.tenants.find((item) => item.id === id);

    if (!tenant) {
      throw new NotFoundException('Mieter nicht gefunden.');
    }

    return tenant;
  }
}
