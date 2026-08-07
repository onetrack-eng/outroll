-- CreateEnum
CREATE TYPE "Genre" AS ENUM ('POP', 'HIP_HOP_RAP', 'RNB', 'ROCK', 'COUNTRY', 'ELECTRONIC_DANCE', 'LATIN', 'INDIE_ALTERNATIVE', 'KPOP', 'AFROBEATS', 'REGGAE', 'JAZZ', 'METAL', 'FOLK', 'CHRISTIAN_GOSPEL', 'OTHER');

-- AlterEnum
ALTER TYPE "Platform" ADD VALUE 'TWITTER_X';
ALTER TYPE "Platform" ADD VALUE 'SNAPCHAT';
ALTER TYPE "Platform" ADD VALUE 'THREADS';
ALTER TYPE "Platform" ADD VALUE 'TWITCH';
ALTER TYPE "Platform" ADD VALUE 'SOUNDCLOUD';
ALTER TYPE "Platform" ADD VALUE 'SPOTIFY_PLAYLIST';

-- Convert Curator.genre from free text to the Genre enum, mapping existing values.
ALTER TABLE "Curator" ADD COLUMN "genre_new" "Genre";
UPDATE "Curator" SET "genre_new" = CASE
  WHEN lower(genre) IN ('pop') THEN 'POP'
  WHEN lower(genre) IN ('hip-hop', 'hiphop', 'hip hop', 'rap') THEN 'HIP_HOP_RAP'
  WHEN lower(genre) IN ('r&b', 'rnb', 'r and b') THEN 'RNB'
  WHEN lower(genre) IN ('rock') THEN 'ROCK'
  WHEN lower(genre) IN ('country') THEN 'COUNTRY'
  WHEN lower(genre) IN ('electronic', 'dance', 'edm') THEN 'ELECTRONIC_DANCE'
  WHEN lower(genre) IN ('latin') THEN 'LATIN'
  WHEN lower(genre) IN ('indie', 'alternative') THEN 'INDIE_ALTERNATIVE'
  WHEN lower(genre) IN ('kpop', 'k-pop') THEN 'KPOP'
  WHEN lower(genre) IN ('afrobeats') THEN 'AFROBEATS'
  WHEN lower(genre) IN ('reggae') THEN 'REGGAE'
  WHEN lower(genre) IN ('jazz') THEN 'JAZZ'
  WHEN lower(genre) IN ('metal') THEN 'METAL'
  WHEN lower(genre) IN ('folk') THEN 'FOLK'
  WHEN lower(genre) IN ('christian', 'gospel') THEN 'CHRISTIAN_GOSPEL'
  ELSE 'OTHER'
END::"Genre";
ALTER TABLE "Curator" ALTER COLUMN "genre_new" SET NOT NULL;
ALTER TABLE "Curator" DROP COLUMN "genre";
ALTER TABLE "Curator" RENAME COLUMN "genre_new" TO "genre";

-- Convert CuratorApplication.genre the same way.
ALTER TABLE "CuratorApplication" ADD COLUMN "genre_new" "Genre";
UPDATE "CuratorApplication" SET "genre_new" = CASE
  WHEN lower(genre) IN ('pop') THEN 'POP'
  WHEN lower(genre) IN ('hip-hop', 'hiphop', 'hip hop', 'rap') THEN 'HIP_HOP_RAP'
  WHEN lower(genre) IN ('r&b', 'rnb', 'r and b') THEN 'RNB'
  WHEN lower(genre) IN ('rock') THEN 'ROCK'
  WHEN lower(genre) IN ('country') THEN 'COUNTRY'
  WHEN lower(genre) IN ('electronic', 'dance', 'edm') THEN 'ELECTRONIC_DANCE'
  WHEN lower(genre) IN ('latin') THEN 'LATIN'
  WHEN lower(genre) IN ('indie', 'alternative') THEN 'INDIE_ALTERNATIVE'
  WHEN lower(genre) IN ('kpop', 'k-pop') THEN 'KPOP'
  WHEN lower(genre) IN ('afrobeats') THEN 'AFROBEATS'
  WHEN lower(genre) IN ('reggae') THEN 'REGGAE'
  WHEN lower(genre) IN ('jazz') THEN 'JAZZ'
  WHEN lower(genre) IN ('metal') THEN 'METAL'
  WHEN lower(genre) IN ('folk') THEN 'FOLK'
  WHEN lower(genre) IN ('christian', 'gospel') THEN 'CHRISTIAN_GOSPEL'
  ELSE 'OTHER'
END::"Genre";
ALTER TABLE "CuratorApplication" ALTER COLUMN "genre_new" SET NOT NULL;
ALTER TABLE "CuratorApplication" DROP COLUMN "genre";
ALTER TABLE "CuratorApplication" RENAME COLUMN "genre_new" TO "genre";

-- Convert Listing.genre the same way.
ALTER TABLE "Listing" ADD COLUMN "genre_new" "Genre";
UPDATE "Listing" SET "genre_new" = CASE
  WHEN lower(genre) IN ('pop') THEN 'POP'
  WHEN lower(genre) IN ('hip-hop', 'hiphop', 'hip hop', 'rap') THEN 'HIP_HOP_RAP'
  WHEN lower(genre) IN ('r&b', 'rnb', 'r and b') THEN 'RNB'
  WHEN lower(genre) IN ('rock') THEN 'ROCK'
  WHEN lower(genre) IN ('country') THEN 'COUNTRY'
  WHEN lower(genre) IN ('electronic', 'dance', 'edm') THEN 'ELECTRONIC_DANCE'
  WHEN lower(genre) IN ('latin') THEN 'LATIN'
  WHEN lower(genre) IN ('indie', 'alternative') THEN 'INDIE_ALTERNATIVE'
  WHEN lower(genre) IN ('kpop', 'k-pop') THEN 'KPOP'
  WHEN lower(genre) IN ('afrobeats') THEN 'AFROBEATS'
  WHEN lower(genre) IN ('reggae') THEN 'REGGAE'
  WHEN lower(genre) IN ('jazz') THEN 'JAZZ'
  WHEN lower(genre) IN ('metal') THEN 'METAL'
  WHEN lower(genre) IN ('folk') THEN 'FOLK'
  WHEN lower(genre) IN ('christian', 'gospel') THEN 'CHRISTIAN_GOSPEL'
  ELSE 'OTHER'
END::"Genre";
ALTER TABLE "Listing" ALTER COLUMN "genre_new" SET NOT NULL;
ALTER TABLE "Listing" DROP COLUMN "genre";
ALTER TABLE "Listing" RENAME COLUMN "genre_new" TO "genre";

-- CreateIndex
CREATE INDEX "Listing_platform_genre_isPaused_idx" ON "Listing"("platform", "genre", "isPaused");
