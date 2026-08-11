-- AlterTable
ALTER TABLE "CuratorApplication" ADD COLUMN     "oauthPending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verifiedAccessToken" TEXT,
ADD COLUMN     "verifiedExternalHandle" TEXT,
ADD COLUMN     "verifiedExternalUserId" TEXT,
ADD COLUMN     "verifiedRefreshToken" TEXT,
ADD COLUMN     "verifiedTokenExpiresAt" TIMESTAMP(3),
ALTER COLUMN "followerCount" DROP NOT NULL,
ALTER COLUMN "profileUrl" DROP NOT NULL;
