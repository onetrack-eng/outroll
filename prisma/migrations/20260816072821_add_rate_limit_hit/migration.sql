-- CreateTable
CREATE TABLE "RateLimitHit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitHit_key_windowStart_key" ON "RateLimitHit"("key", "windowStart");
