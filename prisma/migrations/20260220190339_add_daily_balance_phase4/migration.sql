-- CreateTable
CREATE TABLE "daily_balance_records" (
    "id" SERIAL NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "record_date" DATE NOT NULL,
    "yesterday_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cash_count_manual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "credit_count_manual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "debt_count_manual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_system_selling" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_expense_sum" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "income_left" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "difference" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_balance_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_balance_records_shop_id_record_date_key" ON "daily_balance_records"("shop_id", "record_date");

-- AddForeignKey
ALTER TABLE "daily_balance_records" ADD CONSTRAINT "daily_balance_records_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
