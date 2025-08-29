-- Migration: Add effective_date column to pricing_settings table
-- Run this script on existing Supabase databases to add the new field

-- Add effective_date column to pricing_settings table
ALTER TABLE pricing_settings 
ADD COLUMN IF NOT EXISTS effective_date DATE DEFAULT CURRENT_DATE;

-- Update existing records to have current date as effective date
UPDATE pricing_settings 
SET effective_date = CURRENT_DATE 
WHERE effective_date IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE pricing_settings 
ALTER COLUMN effective_date SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN pricing_settings.effective_date IS 'Date when these pricing rates become effective';
