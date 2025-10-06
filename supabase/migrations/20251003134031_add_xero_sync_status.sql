/*
  # Add Xero Sync Status to Expense Claims

  1. Changes
    - Add `xero_sync_status` column to expense_claims table
      - Values: 'pending', 'synced', 'failed'
      - Default: 'pending'
    - Add `xero_bill_id` column to store Xero bill ID after sync
    - Add `xero_synced_at` timestamp
    - Add `xero_sync_error` for error messages

  2. Notes
    - Claims that are approved will be available for Xero sync
    - Tracks sync status and Xero bill reference
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expense_claims' AND column_name = 'xero_sync_status'
  ) THEN
    ALTER TABLE expense_claims ADD COLUMN xero_sync_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expense_claims' AND column_name = 'xero_bill_id'
  ) THEN
    ALTER TABLE expense_claims ADD COLUMN xero_bill_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expense_claims' AND column_name = 'xero_synced_at'
  ) THEN
    ALTER TABLE expense_claims ADD COLUMN xero_synced_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expense_claims' AND column_name = 'xero_sync_error'
  ) THEN
    ALTER TABLE expense_claims ADD COLUMN xero_sync_error text;
  END IF;
END $$;
