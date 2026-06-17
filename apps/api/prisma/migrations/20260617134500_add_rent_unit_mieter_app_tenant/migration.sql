ALTER TABLE "rent_units"
ADD COLUMN "appTenantId" TEXT;

UPDATE "rent_units" ru
SET "appTenantId" = o."appTenantId"
FROM "objects" o
WHERE ru."objectId" = o."id"
  AND ru."appTenantId" IS NULL;

ALTER TABLE "rent_units"
ALTER COLUMN "appTenantId" SET NOT NULL;

CREATE INDEX "rent_units_appTenantId_idx" ON "rent_units"("appTenantId");

ALTER TABLE "rent_units"
ADD CONSTRAINT "rent_units_appTenantId_fkey"
FOREIGN KEY ("appTenantId") REFERENCES "Tenant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "mieter"
ADD COLUMN "appTenantId" TEXT;

UPDATE "mieter" m
SET "appTenantId" = o."appTenantId"
FROM "objects" o
WHERE m."objectId" = o."id"
  AND m."appTenantId" IS NULL;

ALTER TABLE "mieter"
ALTER COLUMN "appTenantId" SET NOT NULL;

CREATE INDEX "mieter_appTenantId_idx" ON "mieter"("appTenantId");

ALTER TABLE "mieter"
ADD CONSTRAINT "mieter_appTenantId_fkey"
FOREIGN KEY ("appTenantId") REFERENCES "Tenant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
