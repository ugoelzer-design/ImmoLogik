import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.propertyObject.createMany({
    data: [
      { displayId: 'WEG-001', name: 'Bergstrasse 12', address: 'Bergstrasse 12, 10115 Berlin', type: 'Wohnobjekt', status: 'Aktiv', units: 4, occupancy: '75%', monthlyTargetRent: '3200 EUR', note: '' },
      { displayId: 'WEG-002', name: 'Rheinallee 5', address: 'Rheinallee 5, 50668 Koeln', type: 'Wohnobjekt', status: 'Aktiv', units: 6, occupancy: '100%', monthlyTargetRent: '5400 EUR', note: '' },
      { displayId: 'WEG-003', name: 'Hafenstrasse 21', address: 'Hafenstrasse 21, 20359 Hamburg', type: 'Wohnobjekt', status: 'Aktiv', units: 3, occupancy: '67%', monthlyTargetRent: '2700 EUR', note: '' },
    ],
    skipDuplicates: true,
  });

  const objects = await prisma.propertyObject.findMany({
    orderBy: { displayId: 'asc' },
  });

  const objectByDisplayId = new Map(objects.map((object) => [object.displayId, object]));

  const rentUnitsToCreate = [
    { objectDisplayId: 'WEG-001', unitLabel: '1.OG rechts', tenant: 'Thomas Mueller', sollMiete: 800, istMiete: 800, zahlungsStatus: 'Bezahlt', faelligAm: '2026-04-03' },
    { objectDisplayId: 'WEG-001', unitLabel: '2.OG links', tenant: 'Anna Becker', sollMiete: 820, istMiete: 820, zahlungsStatus: 'Bezahlt', faelligAm: '2026-04-03' },
    { objectDisplayId: 'WEG-002', unitLabel: 'A-03', tenant: 'Markus Klein', sollMiete: 950, istMiete: 0, zahlungsStatus: 'Rückstand', faelligAm: '2026-04-03' },
    { objectDisplayId: 'WEG-002', unitLabel: 'B-01', tenant: 'Maria Schmidt', sollMiete: 910, istMiete: 910, zahlungsStatus: 'Bezahlt', faelligAm: '2026-04-03' },
    { objectDisplayId: 'WEG-003', unitLabel: 'EG', tenant: 'Sabine Jaeger', sollMiete: 900, istMiete: 900, zahlungsStatus: 'Bezahlt', faelligAm: '2026-04-03' },
  ];

  for (const unit of rentUnitsToCreate) {
    const object = objectByDisplayId.get(unit.objectDisplayId);

    if (!object) {
      continue;
    }

    const existing = await prisma.rentUnit.findFirst({
      where: {
        objectId: object.id,
        unitLabel: unit.unitLabel,
      },
    });

    if (!existing) {
      await prisma.rentUnit.create({
        data: {
          objectId: object.id,
          unitLabel: unit.unitLabel,
          tenant: unit.tenant,
          sollMiete: unit.sollMiete,
          istMiete: unit.istMiete,
          zahlungsStatus: unit.zahlungsStatus,
          faelligAm: unit.faelligAm,
        },
      });
    }
  }

  const rentUnits = await prisma.rentUnit.findMany({
    include: { object: true },
  });

  const rentUnitByObjectAndLabel = new Map(
    rentUnits.map((unit) => [`${unit.object.displayId}:${unit.unitLabel}`, unit]),
  );

  const tenantsToCreate = [
    { fullName: 'Anna Becker', objectDisplayId: 'WEG-001', unitLabel: '2.OG links', email: 'anna.becker@example.com', phone: '0151 11111111', status: 'Aktiv' },
    { fullName: 'Markus Klein', objectDisplayId: 'WEG-002', unitLabel: 'A-03', email: 'markus.klein@example.com', phone: '0151 22222222', status: 'Ausstehend' },
    { fullName: 'Sabine Jaeger', objectDisplayId: 'WEG-003', unitLabel: 'EG', email: 'sabine.jaeger@example.com', phone: '0151 33333333', status: 'Aktiv' },
    { fullName: 'Thomas Mueller', objectDisplayId: 'WEG-001', unitLabel: '1.OG rechts', email: 'thomas.mueller@example.com', phone: '0151 44444444', status: 'Aktiv' },
    { fullName: 'Maria Schmidt', objectDisplayId: 'WEG-002', unitLabel: 'B-01', email: 'maria.schmidt@example.com', phone: '0151 55555555', status: 'Aktiv' },
  ];

  for (const tenant of tenantsToCreate) {
    const object = objectByDisplayId.get(tenant.objectDisplayId);
    const rentUnit = rentUnitByObjectAndLabel.get(`${tenant.objectDisplayId}:${tenant.unitLabel}`);

    if (!object || !rentUnit) {
      continue;
    }

    const existing = await prisma.mieter.findFirst({
      where: {
        objectId: object.id,
        rentUnitId: rentUnit.id,
      },
    });

    if (!existing) {
      await prisma.mieter.create({
        data: {
          objectId: object.id,
          rentUnitId: rentUnit.id,
          fullName: tenant.fullName,
          email: tenant.email,
          phone: tenant.phone,
          status: tenant.status,
        },
      });
    }
  }

  const tenants = await prisma.mieter.findMany({
    include: {
      object: true,
      rentUnit: true,
    },
  });

  const tenantByObjectAndName = new Map(
    tenants.map((tenant) => [`${tenant.object.displayId}:${tenant.fullName}`, tenant]),
  );

  const contractsToCreate = [
    { title: 'Wohnraummietvertrag', objectDisplayId: 'WEG-001', tenantName: 'Anna Becker', startDate: '01.04.2024', endDate: '31.03.2027', status: 'Aktiv' },
    { title: 'Gewerbemietvertrag', objectDisplayId: 'WEG-002', tenantName: 'Markus Klein', startDate: '01.06.2023', endDate: '31.05.2026', status: 'In Prüfung' },
    { title: 'Wohnraummietvertrag', objectDisplayId: 'WEG-003', tenantName: 'Sabine Jaeger', startDate: '01.01.2023', endDate: '31.12.2025', status: 'Läuft aus' },
    { title: 'Wohnraummietvertrag', objectDisplayId: 'WEG-001', tenantName: 'Thomas Mueller', startDate: '01.03.2024', endDate: '28.02.2027', status: 'Aktiv' },
    { title: 'Wohnraummietvertrag', objectDisplayId: 'WEG-002', tenantName: 'Maria Schmidt', startDate: '01.09.2023', endDate: '31.08.2026', status: 'Aktiv' },
  ];

  for (const contract of contractsToCreate) {
    const object = objectByDisplayId.get(contract.objectDisplayId);
    const tenant = tenantByObjectAndName.get(`${contract.objectDisplayId}:${contract.tenantName}`);

    if (!object || !tenant) {
      continue;
    }

    const existing = await prisma.vertrag.findFirst({
      where: {
        objectId: object.id,
        tenantId: tenant.id,
        title: contract.title,
      },
    });

    if (!existing) {
      await prisma.vertrag.create({
        data: {
          objectId: object.id,
          tenantId: tenant.id,
          rentUnitId: tenant.rentUnitId,
          title: contract.title,
          startDate: contract.startDate,
          endDate: contract.endDate,
          status: contract.status,
        },
      });
    }
  }

  console.log('Seed erfolgreich');
}

main().catch(console.error).finally(() => process.exit(0));
