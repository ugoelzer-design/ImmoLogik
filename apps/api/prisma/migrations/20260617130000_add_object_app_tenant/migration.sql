INSERT INTO "Tenant" ("id", "name", "slug", "isActive", "createdAt", "updatedAt")
VALUES ('default', 'Default', 'default', true, NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;

ALTER TABLE "objects"
ADD COLUMN "appTenantId" TEXT;

UPDATE "objects"
SET "appTenantId" = (
  SELECT "id"
  FROM "Tenant"
  WHERE "slug" = 'default'
  LIMIT 1
)
WHERE "appTenantId" IS NULL;

ALTER TABLE "objects"
ALTER COLUMN "appTenantId" SET NOT NULL;

CREATE INDEX "objects_appTenantId_idx" ON "objects"("appTenantId");

ALTER TABLE "objects"
ADD CONSTRAINT "objects_appTenantId_fkey"
FOREIGN KEY ("appTenantId") REFERENCES "Tenant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
