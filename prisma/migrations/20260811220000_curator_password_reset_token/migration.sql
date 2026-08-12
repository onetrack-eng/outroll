-- AlterTable
ALTER TABLE "Curator" ADD COLUMN     "passwordResetToken" TEXT,
ADD COLUMN     "passwordResetTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Curator_passwordResetToken_key" ON "Curator"("passwordResetToken");
