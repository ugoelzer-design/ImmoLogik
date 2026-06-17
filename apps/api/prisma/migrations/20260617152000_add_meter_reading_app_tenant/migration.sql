ALTER TABLE "meters"
ADD COLUMN "appTenantId" TEXT;

UPDATE "meters" m
SET "appTenantId" = o."appTenantId"
FROM "objects" o
WHERE m."objectId" = o."id"
  AND m."appTenantId" IS NULL;

ALTER TABLE "meters"
ALTER COLUMN "appTenantId" SET NOT NULL;

CREATE INDEX "meters_appTenantId_idx" ON "meters"("appTenantId");

ALTER TABLE "meters"
ADD CONSTRAINT "meters_appTenantId_fkey"
FOREIGN KEY ("appTenantId") REFERENCES "Tenant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reading_campaigns"
ADD COLUMN "appTenantId" TEXT;

UPDATE "reading_campaigns" rc
SET "appTenantId" = o."appTenantId"
FROM "objects" o
WHERE rc."objectId" = o."id"
  AND rc."appTenantId" IS NULL;

ALTER TABLE "reading_campaigns"
ALTER COLUMN "appTenantId" SET NOT NULL;

CREATE INDEX "reading_campaigns_appTenantId_idx" ON "reading_campaigns"("appTenantId");

ALTER TABLE "reading_campaigns"
ADD CONSTRAINT "reading_campaigns_appTenantId_fkey"
FOREIGN KEY ("appTenantId") REFERENCES "Tenant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reading_access"
ADD COLUMN "appTenantId" TEXT;

UPDATE "reading_access" ra
SET "appTenantId" = rc."appTenantId"
FROM "reading_campaigns" rc
WHERE ra."campaignId" = rc."id"
  AND ra."appTenantId" IS NULL;

ALTER TABLE "reading_access"
ALTER COLUMN "appTenantId" SET NOT NULL;

CREATE INDEX "reading_access_appTenantId_idx" ON "reading_access"("appTenantId");

ALTER TABLE "reading_access"
ADD CONSTRAINT "reading_access_appTenantId_fkey"
FOREIGN KEY ("appTenantId") REFERENCES "Tenant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "meter_readings"
ADD COLUMN "appTenantId" TEXT;

UPDATE "meter_readings" mr
SET "appTenantId" = m."appTenantId"
FROM "meters" m
WHERE mr."meterId" = m."id"
  AND mr."appTenantId" IS NULL;

UPDATE "meter_readings" mr
SET "appTenantId" = rc."appTenantId"
FROM "reading_campaigns" rc
WHERE mr."campaignId" = rc."id"
  AND mr."appTenantId" IS NULL;

ALTER TABLE "meter_readings"
ALTER COLUMN "appTenantId" SET NOT NULL;

CREATE INDEX "meter_readings_appTenantId_idx" ON "meter_readings"("appTenantId");

ALTER TABLE "meter_readings"
ADD CONSTRAINT "meter_readings_appTenantId_fkey"
FOREIGN KEY ("appTenantId") REFERENCES "Tenant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
