CREATE TABLE "affiliate_products" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'SHOPEE',
    "title" TEXT NOT NULL,
    "product_url" TEXT NOT NULL,
    "affiliate_url" TEXT,
    "image_url" TEXT,
    "category" TEXT,
    "price" DECIMAL(12,2),
    "commission_rate" DECIMAL(5,2),
    "sales_count" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION,
    "benefits" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "affiliate_products_user_id_product_url_key" ON "affiliate_products"("user_id", "product_url");
CREATE INDEX "affiliate_products_user_id_updated_at_idx" ON "affiliate_products"("user_id", "updated_at" DESC);

ALTER TABLE "affiliate_products" ADD CONSTRAINT "affiliate_products_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
