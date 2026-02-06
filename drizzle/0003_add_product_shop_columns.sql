ALTER TABLE "marketing_campaigns" ADD COLUMN IF NOT EXISTS "selected_product_id" integer;--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD COLUMN IF NOT EXISTS "selected_shop_id" integer;
