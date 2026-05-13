CREATE TABLE IF NOT EXISTS "meters" (
  "id" TEXT NOT NULL,
  "objectId" TEXT NOT NULL,
  "rentUnitId" TEXT,
  "scope" TEXT NOT NULL DEFAULT 'apartment',
  "type" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "meterNumber" TEXT,
  "unit" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "meters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "reading_campaigns" (
  "id" TEXT NOT NULL,
  "objectId" TEXT NOT NULL,
  "reportYear" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'offen',
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "reading_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "reading_access" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "rentUnitId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'offen',
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "reading_access_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "meter_readings" (
  "id" TEXT NOT NULL,
  "meterId" TEXT NOT NULL,
  "campaignId" TEXT,
  "readingDate" TIMESTAMP(3) NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "readerName" TEXT,
  "source" TEXT NOT NULL DEFAULT 'tenant',
  "status" TEXT NOT NULL DEFAULT 'eingereicht',
  "submittedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "meter_readings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "meters_objectId_rentUnitId_type_label_key"
ON "meters"("objectId", "rentUnitId", "type", "label");

CREATE INDEX IF NOT EXISTS "meters_objectId_idx" ON "meters"("objectId");
CREATE INDEX IF NOT EXISTS "meters_rentUnitId_idx" ON "meters"("rentUnitId");

CREATE UNIQUE INDEX IF NOT EXISTS "reading_campaigns_objectId_reportYear_key"
ON "reading_campaigns"("objectId", "reportYear");

CREATE INDEX IF NOT EXISTS "reading_campaigns_objectId_idx"
ON "reading_campaigns"("objectId");

CREATE UNIQUE INDEX IF NOT EXISTS "reading_access_token_key"
ON "reading_access"("token");

CREATE UNIQUE INDEX IF NOT EXISTS "reading_access_campaignId_tenantId_key"
ON "reading_access"("campaignId", "tenantId");

CREATE INDEX IF NOT EXISTS "reading_access_tenantId_idx"
ON "reading_access"("tenantId");

CREATE INDEX IF NOT EXISTS "reading_access_rentUnitId_idx"
ON "reading_access"("rentUnitId");

CREATE INDEX IF NOT EXISTS "meter_readings_meterId_idx"
ON "meter_readings"("meterId");

CREATE INDEX IF NOT EXISTS "meter_readings_campaignId_idx"
ON "meter_readings"("campaignId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meters_objectId_fkey'
  ) THEN
    ALTER TABLE "meters"
      ADD CONSTRAINT "meters_objectId_fkey"
      FOREIGN KEY ("objectId") REFERENCES "objects"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meters_rentUnitId_fkey'
  ) THEN
    ALTER TABLE "meters"
      ADD CONSTRAINT "meters_rentUnitId_fkey"
      FOREIGN KEY ("rentUnitId") REFERENCES "rent_units"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reading_campaigns_objectId_fkey'
  ) THEN
    ALTER TABLE "reading_campaigns"
      ADD CONSTRAINT "reading_campaigns_objectId_fkey"
      FOREIGN KEY ("objectId") REFERENCES "objects"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reading_access_campaignId_fkey'
  ) THEN
    ALTER TABLE "reading_access"
      ADD CONSTRAINT "reading_access_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "reading_campaigns"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reading_access_tenantId_fkey'
  ) THEN
    ALTER TABLE "reading_access"
      ADD CONSTRAINT "reading_access_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "mieter"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reading_access_rentUnitId_fkey'
  ) THEN
    ALTER TABLE "reading_access"
      ADD CONSTRAINT "reading_access_rentUnitId_fkey"
      FOREIGN KEY ("rentUnitId") REFERENCES "rent_units"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meter_readings_meterId_fkey'
  ) THEN
    ALTER TABLE "meter_readings"
      ADD CONSTRAINT "meter_readings_meterId_fkey"
      FOREIGN KEY ("meterId") REFERENCES "meters"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meter_readings_campaignId_fkey'
  ) THEN
    ALTER TABLE "meter_readings"
      ADD CONSTRAINT "meter_readings_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "reading_campaigns"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
