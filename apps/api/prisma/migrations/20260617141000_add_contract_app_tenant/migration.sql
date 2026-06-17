ALTER TABLE "vertraege"
ADD COLUMN "appTenantId" TEXT;

UPDATE "vertraege" v
SET "appTenantId" = o."appTenantId"
FROM "objects" o
WHERE v."objectId" = o."id"
  AND v."appTenantId" IS NULL;

ALTER TABLE "vertraege"
ALTER COLUMN "appTenantId" SET NOT NULL;

CREATE INDEX "vertraege_appTenantId_idx" ON "vertraege"("appTenantId");

ALTER TABLE "vertraege"
ADD CONSTRAINT "vertraege_appTenantId_fkey"
FOREIGN KEY ("appTenantId") REFERENCES "Tenant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
