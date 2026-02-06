-- Add missing columns to marketing_campaigns table
ALTER TABLE "marketing_campaigns" ADD COLUMN IF NOT EXISTS "selected_product_id" integer;
ALTER TABLE "marketing_campaigns" ADD COLUMN IF NOT EXISTS "selected_shop_id" integer;
