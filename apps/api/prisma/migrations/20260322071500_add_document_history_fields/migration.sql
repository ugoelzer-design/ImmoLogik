ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "rentUnitId" TEXT,
  ADD COLUMN IF NOT EXISTS "unitLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "reportYear" INTEGER;

CREATE INDEX IF NOT EXISTS "documents_rentUnitId_idx" ON "documents"("rentUnitId");
CREATE INDEX IF NOT EXISTS "documents_reportYear_idx" ON "documents"("reportYear");
