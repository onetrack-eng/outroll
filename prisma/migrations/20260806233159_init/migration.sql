-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('INSTAGRAM', 'TIKTOK', 'YOUTUBE_SHORTS', 'FACEBOOK_REELS');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "HoldStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REFUNDED', 'POSTED', 'DISPUTED', 'PAID');

-- CreateEnum
CREATE TYPE "DisputeResolution" AS ENUM ('CURATOR_PAID', 'ARTIST_REFUNDED');

-- CreateTable
CREATE TABLE "CuratorApplication" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "proposedUsername" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "genre" TEXT NOT NULL,
    "followerCount" INTEGER NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "signupToken" TEXT,
    "signupTokenUsed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "reviewedNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuratorApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Curator" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "genre" TEXT NOT NULL,
    "followerCount" INTEGER NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "stripeAccountId" TEXT,
    "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "applicationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Curator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "curatorId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "genre" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "artistEmail" TEXT NOT NULL,
    "artistName" TEXT,
    "magicLinkToken" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hold" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "curatorId" TEXT NOT NULL,
    "driveLink" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "platformFeeCents" INTEGER NOT NULL,
    "totalChargeCents" INTEGER NOT NULL,
    "status" "HoldStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentIntentId" TEXT,
    "stripeTransferId" TEXT,
    "acceptDeadline" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "postDeadline" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "postUrl" TEXT,
    "payoutReleaseAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "holdId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" "DisputeResolution",
    "adminNote" TEXT,
    "filedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CuratorApplication_signupToken_key" ON "CuratorApplication"("signupToken");

-- CreateIndex
CREATE UNIQUE INDEX "Curator_email_key" ON "Curator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Curator_username_key" ON "Curator"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Curator_applicationId_key" ON "Curator"("applicationId");

-- CreateIndex
CREATE INDEX "Listing_platform_genre_isPaused_idx" ON "Listing"("platform", "genre", "isPaused");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_magicLinkToken_key" ON "Campaign"("magicLinkToken");

-- CreateIndex
CREATE INDEX "Hold_status_idx" ON "Hold"("status");

-- CreateIndex
CREATE INDEX "Hold_acceptDeadline_idx" ON "Hold"("acceptDeadline");

-- CreateIndex
CREATE INDEX "Hold_postDeadline_idx" ON "Hold"("postDeadline");

-- CreateIndex
CREATE INDEX "Hold_payoutReleaseAt_idx" ON "Hold"("payoutReleaseAt");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_holdId_key" ON "Dispute"("holdId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- AddForeignKey
ALTER TABLE "Curator" ADD CONSTRAINT "Curator_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "CuratorApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "Curator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hold" ADD CONSTRAINT "Hold_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hold" ADD CONSTRAINT "Hold_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hold" ADD CONSTRAINT "Hold_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "Curator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_holdId_fkey" FOREIGN KEY ("holdId") REFERENCES "Hold"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
