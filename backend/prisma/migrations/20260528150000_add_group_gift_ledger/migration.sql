CREATE TABLE "GroupGiftBatch" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "giftNames" TEXT[] NOT NULL,
    "note" TEXT,
    "totalAmountCents" INTEGER NOT NULL,
    "paidByUserId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "beneficiaryIds" TEXT[] NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupGiftBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GroupGiftSettlement" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "debtorUserId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "settledAt" TIMESTAMP(3),
    "settledByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupGiftSettlement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GroupGiftBatch_groupId_idx" ON "GroupGiftBatch"("groupId");
CREATE INDEX "GroupGiftBatch_paidByUserId_idx" ON "GroupGiftBatch"("paidByUserId");
CREATE INDEX "GroupGiftBatch_createdByUserId_idx" ON "GroupGiftBatch"("createdByUserId");
CREATE INDEX "GroupGiftBatch_paidAt_idx" ON "GroupGiftBatch"("paidAt");
CREATE INDEX "GroupGiftSettlement_batchId_idx" ON "GroupGiftSettlement"("batchId");
CREATE INDEX "GroupGiftSettlement_debtorUserId_idx" ON "GroupGiftSettlement"("debtorUserId");
CREATE INDEX "GroupGiftSettlement_settledAt_idx" ON "GroupGiftSettlement"("settledAt");

ALTER TABLE "GroupGiftBatch"
ADD CONSTRAINT "GroupGiftBatch_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GroupGiftBatch"
ADD CONSTRAINT "GroupGiftBatch_paidByUserId_fkey"
FOREIGN KEY ("paidByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GroupGiftBatch"
ADD CONSTRAINT "GroupGiftBatch_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GroupGiftSettlement"
ADD CONSTRAINT "GroupGiftSettlement_batchId_fkey"
FOREIGN KEY ("batchId") REFERENCES "GroupGiftBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupGiftSettlement"
ADD CONSTRAINT "GroupGiftSettlement_debtorUserId_fkey"
FOREIGN KEY ("debtorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GroupGiftSettlement"
ADD CONSTRAINT "GroupGiftSettlement_settledByUserId_fkey"
FOREIGN KEY ("settledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
