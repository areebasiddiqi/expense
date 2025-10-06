/*
  # Add VAT fields to expenses table

  1. Changes
    - Add `amount_before_vat` (numeric) - Cost before VAT
    - Add `vat_amount` (numeric) - VAT amount
    - Rename `amount` to `net_cost` for clarity (or keep amount as calculated field)
    - The existing `amount` field will now represent net_cost (total including VAT)

  2. Notes
    - amount = amount_before_vat + vat_amount
    - These fields allow proper VAT tracking for expense claims
*/

-- Add VAT-related columns to expenses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'amount_before_vat'
  ) THEN
    ALTER TABLE expenses ADD COLUMN amount_before_vat numeric(10, 2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'vat_amount'
  ) THEN
    ALTER TABLE expenses ADD COLUMN vat_amount numeric(10, 2) DEFAULT 0;
  END IF;
END $$;

-- Update existing expenses to split their amounts (assuming 20% VAT rate for UK)
-- This is for backwards compatibility - new expenses will have these set explicitly
UPDATE expenses 
SET 
  amount_before_vat = ROUND(amount / 1.20, 2),
  vat_amount = ROUND(amount - (amount / 1.20), 2)
WHERE amount_before_vat = 0 AND vat_amount = 0;