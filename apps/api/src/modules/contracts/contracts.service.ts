import { Injectable, NotFoundException } from '@nestjs/common';

type ContractRecord = {
  id: string;
  title: string;
  objectName: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  status: 'Aktiv' | 'Läuft aus' | 'In Prüfung';
};

@Injectable()
export class ContractsService {
  private readonly contracts: ContractRecord[] = [
    {
      id: 'contract-1',
      title: 'Wohnraummietvertrag',
      objectName: 'Bergstraße 12',
      tenantName: 'Anna Becker',
      startDate: '01.04.2024',
      endDate: '31.03.2027',
      status: 'Aktiv',
    },
    {
      id: 'contract-2',
      title: 'Gewerbemietvertrag',
      objectName: 'Rheinallee 5',
      tenantName: 'Markus Klein',
      startDate: '01.06.2023',
      endDate: '31.05.2026',
      status: 'In Prüfung',
    },
    {
      id: 'contract-3',
      title: 'Wohnraummietvertrag',
      objectName: 'Hafenstraße 21',
      tenantName: 'Sabine Jäger',
      startDate: '01.01.2023',
      endDate: '31.12.2025',
      status: 'Läuft aus',
    },
  ];

  findAll() {
    return this.contracts;
  }

  findOne(id: string) {
    const contract = this.contracts.find((item) => item.id === id);

    if (!contract) {
      throw new NotFoundException('Vertrag nicht gefunden.');
    }

    return contract;
  }
}
