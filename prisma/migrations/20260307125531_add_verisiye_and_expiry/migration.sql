-- AlterTable
ALTER TABLE "products" ADD COLUMN     "expiry_date" DATE;

-- AlterTable
ALTER TABLE "sales_transactions" ADD COLUMN     "customer_id" INTEGER,
ADD COLUMN     "payment_type" VARCHAR(20) NOT NULL DEFAULT 'nakit';

-- CreateTable
CREATE TABLE "verisiye_customers" (
    "id" SERIAL NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "home_no" VARCHAR(20),
    "tel_no" VARCHAR(20) NOT NULL,
    "phone_hash" VARCHAR(255),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verisiye_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verisiye_payments" (
    "id" SERIAL NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "note" VARCHAR(255),
    "recorded_by" INTEGER NOT NULL,
    "payment_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verisiye_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "verisiye_customers_shop_id_tel_no_key" ON "verisiye_customers"("shop_id", "tel_no");

-- AddForeignKey
ALTER TABLE "sales_transactions" ADD CONSTRAINT "sales_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "verisiye_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verisiye_customers" ADD CONSTRAINT "verisiye_customers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verisiye_payments" ADD CONSTRAINT "verisiye_payments_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verisiye_payments" ADD CONSTRAINT "verisiye_payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "verisiye_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verisiye_payments" ADD CONSTRAINT "verisiye_payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
