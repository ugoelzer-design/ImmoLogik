import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Objekte
  const obj1 = await prisma.propertyObject.create({ data: { displayId: "WEG-001", name: "Bergstrasse 12", address: "Bergstrasse 12, 10115 Berlin", type: "Wohnobjekt", status: "Aktiv", units: 4, occupancy: "75%", monthlyTargetRent: "3200 EUR", note: "" } });
  const obj2 = await prisma.propertyObject.create({ data: { displayId: "WEG-002", name: "Rheinallee 5", address: "Rheinallee 5, 50668 Koeln", type: "Wohnobjekt", status: "Aktiv", units: 6, occupancy: "100%", monthlyTargetRent: "5400 EUR", note: "" } });
  const obj3 = await prisma.propertyObject.create({ data: { displayId: "WEG-003", name: "Hafenstrasse 21", address: "Hafenstrasse 21, 20359 Hamburg", type: "Wohnobjekt", status: "Aktiv", units: 3, occupancy: "67%", monthlyTargetRent: "2700 EUR", note: "" } });


  await prisma.mieter.createMany({
    data: [
      { fullName: "Anna Becker", objectName: "Bergstrasse 12", unit: "2.OG links", email: "anna.becker@example.com", phone: "0151 11111111", status: "Aktiv" },
      { fullName: "Markus Klein", objectName: "Rheinallee 5", unit: "A-03", email: "markus.klein@example.com", phone: "0151 22222222", status: "Ausstehend" },
      { fullName: "Sabine Jaeger", objectName: "Hafenstrasse 21", unit: "EG", email: "sabine.jaeger@example.com", phone: "0151 33333333", status: "Aktiv" },
      { fullName: "Thomas Mueller", objectName: "Bergstrasse 12", unit: "1.OG rechts", email: "thomas.mueller@example.com", phone: "0151 44444444", status: "Aktiv" },
      { fullName: "Maria Schmidt", objectName: "Rheinallee 5", unit: "B-01", email: "maria.schmidt@example.com", phone: "0151 55555555", status: "Aktiv" },
    ],
  });

  await prisma.vertrag.createMany({
    data: [
      { title: "Wohnraummietvertrag", objectName: "Bergstrasse 12", tenantName: "Anna Becker", startDate: "01.04.2024", endDate: "31.03.2027", status: "Aktiv" },
      { title: "Gewerbemietvertrag", objectName: "Rheinallee 5", tenantName: "Markus Klein", startDate: "01.06.2023", endDate: "31.05.2026", status: "In Pruefung" },
      { title: "Wohnraummietvertrag", objectName: "Hafenstrasse 21", tenantName: "Sabine Jaeger", startDate: "01.01.2023", endDate: "31.12.2025", status: "Laeuft aus" },
      { title: "Wohnraummietvertrag", objectName: "Bergstrasse 12", tenantName: "Thomas Mueller", startDate: "01.03.2024", endDate: "28.02.2027", status: "Aktiv" },
      { title: "Wohnraummietvertrag", objectName: "Rheinallee 5", tenantName: "Maria Schmidt", startDate: "01.09.2023", endDate: "31.08.2026", status: "Aktiv" },
    ],
  });

  console.log("Seed erfolgreich");
}

main().catch(console.error).finally(() => process.exit(0));