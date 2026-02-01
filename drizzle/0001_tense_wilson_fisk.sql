CREATE TABLE IF NOT EXISTS "system_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD COLUMN "business_description" text;--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD COLUMN "company_link" text;