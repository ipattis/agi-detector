-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR', 'COMPLETED');

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "contentHints" TEXT,
    "structure" JSONB,
    "crawlSchedule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "SourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastError" TEXT,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "metadata" JSONB NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hash" TEXT NOT NULL,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_url_key" ON "Source"("url");

-- CreateIndex
CREATE INDEX "Source_status_idx" ON "Source"("status");

-- CreateIndex
CREATE INDEX "Entry_createdAt_idx" ON "Entry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_sourceId_hash_key" ON "Entry"("sourceId", "hash");

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
