-- CreateTable
CREATE TABLE "product_units" (
    "id" SERIAL NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "unit_name" VARCHAR(20) NOT NULL,

    CONSTRAINT "product_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "barcode" VARCHAR(50),
    "product_name" VARCHAR(100) NOT NULL,
    "sale_price" DECIMAL(10,2) NOT NULL,
    "stock_quantity" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_price_comparison" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "competitor_name" VARCHAR(50) NOT NULL,
    "competitor_price" DECIMAL(10,2) NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_price_comparison_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_units_shop_id_unit_name_key" ON "product_units"("shop_id", "unit_name");

-- CreateIndex
CREATE UNIQUE INDEX "products_shop_id_barcode_key" ON "products"("shop_id", "barcode");

-- CreateIndex
CREATE UNIQUE INDEX "product_price_comparison_product_id_competitor_name_key" ON "product_price_comparison"("product_id", "competitor_name");

-- AddForeignKey
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "product_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_comparison" ADD CONSTRAINT "product_price_comparison_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
