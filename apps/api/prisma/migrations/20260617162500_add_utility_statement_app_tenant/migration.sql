ALTER TABLE "utility_statements"
ADD COLUMN "appTenantId" TEXT;

UPDATE "utility_statements" us
SET "appTenantId" = o."appTenantId"
FROM "objects" o
WHERE us."objectId" = o."id"
  AND us."appTenantId" IS NULL;

UPDATE "utility_statements"
SET "appTenantId" = (
  SELECT "id"
  FROM "Tenant"
  WHERE "slug" = 'default'
  LIMIT 1
)
WHERE "appTenantId" IS NULL;

ALTER TABLE "utility_statements"
ALTER COLUMN "appTenantId" SET NOT NULL;

CREATE INDEX "utility_statements_appTenantId_idx" ON "utility_statements"("appTenantId");

ALTER TABLE "utility_statements"
ADD CONSTRAINT "utility_statements_appTenantId_fkey"
FOREIGN KEY ("appTenantId") REFERENCES "Tenant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
