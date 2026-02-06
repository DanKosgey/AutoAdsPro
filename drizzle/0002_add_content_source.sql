ALTER TABLE "marketing_campaigns" ADD COLUMN IF NOT EXISTS "content_source" varchar(20) DEFAULT 'ai';
