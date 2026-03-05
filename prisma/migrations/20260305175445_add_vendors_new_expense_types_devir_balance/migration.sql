/*
  Warnings:

  - You are about to drop the column `cash_count_manual` on the `daily_balance_records` table. All the data in the column will be lost.
  - You are about to drop the column `credit_count_manual` on the `daily_balance_records` table. All the data in the column will be lost.
  - You are about to drop the column `debt_count_manual` on the `daily_balance_records` table. All the data in the column will be lost.
  - You are about to drop the column `yesterday_balance` on the `daily_balance_records` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "daily_balance_records" DROP COLUMN "cash_count_manual",
DROP COLUMN "credit_count_manual",
DROP COLUMN "debt_count_manual",
DROP COLUMN "yesterday_balance",
ADD COLUMN     "devir_kalan" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "dun_devir" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "kasa_nakit" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "krediler" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_devir_gider" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_kart_gider" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_kasa_gider" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "verisiye" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "expense_items" ADD COLUMN     "vendor_id" INTEGER;

-- CreateTable
CREATE TABLE "vendors" (
    "id" SERIAL NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "vendor_name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendors_shop_id_vendor_name_key" ON "vendors"("shop_id", "vendor_name");

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
