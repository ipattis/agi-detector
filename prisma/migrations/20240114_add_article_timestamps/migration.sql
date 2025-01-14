-- AlterTable
ALTER TABLE "CrawlResult" ADD COLUMN "firstCaptured" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         ADD COLUMN "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         ADD COLUMN "isNew" BOOLEAN NOT NULL DEFAULT true,
                         ADD COLUMN "source" TEXT NOT NULL DEFAULT '',
                         ADD CONSTRAINT "CrawlResult_url_key" UNIQUE ("url");
