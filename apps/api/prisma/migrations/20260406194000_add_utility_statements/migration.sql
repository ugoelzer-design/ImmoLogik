CREATE TABLE "utility_statements" (
    "id" TEXT NOT NULL,
    "objectId" TEXT,
    "objectDisplayId" TEXT NOT NULL,
    "objectName" TEXT NOT NULL,
    "reportYear" INTEGER,
    "periodFrom" TEXT NOT NULL,
    "periodTo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'In Arbeit',
    "settlementCreatedOn" TEXT NOT NULL,
    "settlementUpdatedOn" TEXT NOT NULL,
    "approvedOn" TEXT,
    "positions" JSONB NOT NULL,
    "units" JSONB NOT NULL,
    "finalReportSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utility_statements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "utility_statements_objectId_idx" ON "utility_statements"("objectId");
CREATE INDEX "utility_statements_objectDisplayId_idx" ON "utility_statements"("objectDisplayId");
CREATE INDEX "utility_statements_reportYear_idx" ON "utility_statements"("reportYear");

ALTER TABLE "utility_statements"
ADD CONSTRAINT "utility_statements_objectId_fkey"
FOREIGN KEY ("objectId") REFERENCES "objects"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
