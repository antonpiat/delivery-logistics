-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('PROOF_OF_DELIVERY', 'PICKUP_PHOTO', 'OTHER');

-- CreateTable
CREATE TABLE "ShipmentAttachment" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "type" "AttachmentType" NOT NULL DEFAULT 'OTHER',
    "path" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentAttachment_path_key" ON "ShipmentAttachment"("path");
CREATE INDEX "ShipmentAttachment_shipmentId_idx" ON "ShipmentAttachment"("shipmentId");
CREATE INDEX "ShipmentAttachment_uploadedBy_idx" ON "ShipmentAttachment"("uploadedBy");

-- AddForeignKey
ALTER TABLE "ShipmentAttachment" ADD CONSTRAINT "ShipmentAttachment_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShipmentAttachment" ADD CONSTRAINT "ShipmentAttachment_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
