-- Renamed to reflect that this now accepts any secure cloud-storage folder link, not just
-- Google Drive.
ALTER TABLE "Hold" RENAME COLUMN "driveLink" TO "assetLink";
