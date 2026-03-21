/*
  Warnings:

  - You are about to drop the `mieter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `vertraege` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "mieter";

-- DropTable
DROP TABLE "vertraege";

-- CreateTable
CREATE TABLE "rent_units" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "tenant" TEXT NOT NULL,
    "sollMiete" DOUBLE PRECISION NOT NULL,
    "istMiete" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "zahlungsStatus" TEXT NOT NULL DEFAULT 'Offen',
    "faelligAm" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rent_units_pkey" PRIMARY KEY ("id")
);
