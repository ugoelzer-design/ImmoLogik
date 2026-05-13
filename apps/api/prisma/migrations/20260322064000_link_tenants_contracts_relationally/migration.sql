ALTER TABLE "mieter"
  ADD COLUMN IF NOT EXISTS "objectId" TEXT,
  ADD COLUMN IF NOT EXISTS "rentUnitId" TEXT;

UPDATE "mieter" AS m
SET "objectId" = o."id"
FROM "objects" AS o
WHERE m."objectId" IS NULL
  AND m."objectName" = o."name";

UPDATE "mieter" AS m
SET "rentUnitId" = ru."id"
FROM "rent_units" AS ru
JOIN "objects" AS o ON o."id" = ru."objectId"
WHERE m."rentUnitId" IS NULL
  AND m."objectId" = o."id"
  AND m."unit" = ru."unitLabel";

ALTER TABLE "vertraege"
  ADD COLUMN IF NOT EXISTS "objectId" TEXT,
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT,
  ADD COLUMN IF NOT EXISTS "rentUnitId" TEXT;

UPDATE "vertraege" AS v
SET "objectId" = o."id"
FROM "objects" AS o
WHERE v."objectId" IS NULL
  AND v."objectName" = o."name";

UPDATE "vertraege" AS v
SET "tenantId" = m."id",
    "rentUnitId" = m."rentUnitId"
FROM "mieter" AS m
WHERE v."tenantId" IS NULL
  AND v."objectId" = m."objectId"
  AND v."tenantName" = m."fullName";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "mieter" WHERE "objectId" IS NULL OR "rentUnitId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Migration abgebrochen: Nicht alle Mieter konnten mit Objekt und Einheit verknuepft werden.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "vertraege" WHERE "objectId" IS NULL OR "tenantId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Migration abgebrochen: Nicht alle Vertraege konnten mit Objekt und Mieter verknuepft werden.';
  END IF;
END $$;

ALTER TABLE "mieter"
  ALTER COLUMN "objectId" SET NOT NULL,
  ALTER COLUMN "rentUnitId" SET NOT NULL;

ALTER TABLE "vertraege"
  ALTER COLUMN "objectId" SET NOT NULL,
  ALTER COLUMN "tenantId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'mieter_objectId_fkey'
  ) THEN
    ALTER TABLE "mieter"
      ADD CONSTRAINT "mieter_objectId_fkey"
      FOREIGN KEY ("objectId") REFERENCES "objects"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'mieter_rentUnitId_fkey'
  ) THEN
    ALTER TABLE "mieter"
      ADD CONSTRAINT "mieter_rentUnitId_fkey"
      FOREIGN KEY ("rentUnitId") REFERENCES "rent_units"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vertraege_objectId_fkey'
  ) THEN
    ALTER TABLE "vertraege"
      ADD CONSTRAINT "vertraege_objectId_fkey"
      FOREIGN KEY ("objectId") REFERENCES "objects"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vertraege_tenantId_fkey'
  ) THEN
    ALTER TABLE "vertraege"
      ADD CONSTRAINT "vertraege_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "mieter"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vertraege_rentUnitId_fkey'
  ) THEN
    ALTER TABLE "vertraege"
      ADD CONSTRAINT "vertraege_rentUnitId_fkey"
      FOREIGN KEY ("rentUnitId") REFERENCES "rent_units"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "mieter_objectId_idx" ON "mieter"("objectId");
CREATE INDEX IF NOT EXISTS "mieter_rentUnitId_idx" ON "mieter"("rentUnitId");
CREATE UNIQUE INDEX IF NOT EXISTS "mieter_objectId_rentUnitId_key" ON "mieter"("objectId", "rentUnitId");
CREATE INDEX IF NOT EXISTS "vertraege_objectId_idx" ON "vertraege"("objectId");
CREATE INDEX IF NOT EXISTS "vertraege_tenantId_idx" ON "vertraege"("tenantId");
CREATE INDEX IF NOT EXISTS "vertraege_rentUnitId_idx" ON "vertraege"("rentUnitId");
