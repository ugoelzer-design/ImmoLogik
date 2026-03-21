-- CreateTable
CREATE TABLE "mieter" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "objectName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Aktiv',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mieter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vertraege" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objectName" TEXT NOT NULL,
    "tenantName" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Aktiv',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vertraege_pkey" PRIMARY KEY ("id")
);
