ALTER TABLE "objects"
ADD COLUMN "displayId" TEXT;

WITH numbered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS seq
  FROM "objects"
)
UPDATE "objects" AS o
SET "displayId" = 'WEG-' || LPAD(numbered.seq::text, 3, '0')
FROM numbered
WHERE o."id" = numbered."id";

ALTER TABLE "objects"
ALTER COLUMN "displayId" SET NOT NULL;

CREATE UNIQUE INDEX "objects_displayId_key"
ON "objects"("displayId");