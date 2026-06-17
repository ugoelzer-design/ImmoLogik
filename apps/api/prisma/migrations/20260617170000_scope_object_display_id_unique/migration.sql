DROP INDEX IF EXISTS "objects_displayId_key";

CREATE UNIQUE INDEX "objects_appTenantId_displayId_key"
ON "objects"("appTenantId", "displayId");
