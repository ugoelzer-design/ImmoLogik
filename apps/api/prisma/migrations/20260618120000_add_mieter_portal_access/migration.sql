-- CreateTable
CREATE TABLE "mieter_portal_access" (
    "id" TEXT NOT NULL,
    "appTenantId" TEXT NOT NULL,
    "mieterId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mieter_portal_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mieter_portal_access_mieterId_key" ON "mieter_portal_access"("mieterId");

-- CreateIndex
CREATE UNIQUE INDEX "mieter_portal_access_token_key" ON "mieter_portal_access"("token");

-- CreateIndex
CREATE INDEX "mieter_portal_access_appTenantId_idx" ON "mieter_portal_access"("appTenantId");

-- CreateIndex
CREATE INDEX "mieter_portal_access_token_idx" ON "mieter_portal_access"("token");

-- AddForeignKey
ALTER TABLE "mieter_portal_access" ADD CONSTRAINT "mieter_portal_access_appTenantId_fkey"
    FOREIGN KEY ("appTenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mieter_portal_access" ADD CONSTRAINT "mieter_portal_access_mieterId_fkey"
    FOREIGN KEY ("mieterId") REFERENCES "mieter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
