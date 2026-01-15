-- CreateEnum
CREATE TYPE "PlaceType" AS ENUM ('PETROL_PUMP', 'EV_CHARGER', 'HOSPITAL', 'TOILET', 'ATM', 'PARKING', 'RESTAURANT', 'CAFE', 'HOTEL', 'POLICE', 'FIRE_STATION', 'OTHER');

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PlaceType" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "externalId" TEXT,
    "source" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,

    CONSTRAINT "PlaceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSyncLog" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "DataSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PlaceCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PlaceCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Place_externalId_key" ON "Place"("externalId");

-- CreateIndex
CREATE INDEX "Place_latitude_longitude_idx" ON "Place"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Place_city_state_idx" ON "Place"("city", "state");

-- CreateIndex
CREATE UNIQUE INDEX "PlaceCategory_slug_key" ON "PlaceCategory"("slug");

-- CreateIndex
CREATE INDEX "_PlaceCategories_B_index" ON "_PlaceCategories"("B");

-- AddForeignKey
ALTER TABLE "_PlaceCategories" ADD CONSTRAINT "_PlaceCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlaceCategories" ADD CONSTRAINT "_PlaceCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "PlaceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
