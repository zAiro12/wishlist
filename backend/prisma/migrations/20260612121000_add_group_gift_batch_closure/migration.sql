ALTER TABLE "GroupGiftBatch"
ADD COLUMN "closedAt" TIMESTAMP(3),
ADD COLUMN "closedByUserId" TEXT;

CREATE INDEX "GroupGiftBatch_closedAt_idx" ON "GroupGiftBatch"("closedAt");

ALTER TABLE "GroupGiftBatch"
ADD CONSTRAINT "GroupGiftBatch_closedByUserId_fkey"
FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
