ALTER TABLE "documents"
ADD COLUMN IF NOT EXISTS "objectId" TEXT,
ADD COLUMN IF NOT EXISTS "objectName" TEXT,
ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'Sonstiges',
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'Vorhanden',
ADD COLUMN IF NOT EXISTS "uploadedBy" TEXT;

CREATE INDEX IF NOT EXISTS "documents_objectId_idx" ON "documents"("objectId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'documents_objectId_fkey'
  ) THEN
    ALTER TABLE "documents"
    ADD CONSTRAINT "documents_objectId_fkey"
    FOREIGN KEY ("objectId") REFERENCES "objects"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "rent_units_objectId_idx" ON "rent_units"("objectId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'rent_units_objectId_fkey'
  ) THEN
    ALTER TABLE "rent_units"
    ADD CONSTRAINT "rent_units_objectId_fkey"
    FOREIGN KEY ("objectId") REFERENCES "objects"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;
