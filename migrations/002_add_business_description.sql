-- Add business_description column to marketing_campaigns table
-- This stores AI-enhanced comprehensive business context for better ad generation

ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS business_description TEXT;
