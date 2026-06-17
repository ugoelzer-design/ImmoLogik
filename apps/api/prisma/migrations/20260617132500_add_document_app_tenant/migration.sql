ALTER TABLE "documents"
ADD COLUMN "appTenantId" TEXT;

UPDATE "documents" d
SET "appTenantId" = o."appTenantId"
FROM "objects" o
WHERE d."objectId" = o."id"
  AND d."appTenantId" IS NULL;

UPDATE "documents"
SET "appTenantId" = (
  SELECT "id"
  FROM "Tenant"
  WHERE "slug" = 'default'
  LIMIT 1
)
WHERE "appTenantId" IS NULL;

ALTER TABLE "documents"
ALTER COLUMN "appTenantId" SET NOT NULL;

CREATE INDEX "documents_appTenantId_idx" ON "documents"("appTenantId");

ALTER TABLE "documents"
ADD CONSTRAINT "documents_appTenantId_fkey"
FOREIGN KEY ("appTenantId") REFERENCES "Tenant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
