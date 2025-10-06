/*
  # Add Expense Claims Structure

  1. New Tables
    - `clients`
      - `id` (uuid, PK) - Client identifier
      - `name` (text) - Client name
      - `is_active` (boolean) - Whether client is active
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `expense_claims`
      - `id` (uuid, PK) - Claim identifier
      - `user_id` (uuid, FK to profiles) - User who created the claim
      - `claimant_name` (text) - Name of person claiming (can be different from creator)
      - `start_date` (date) - Claim period start date
      - `end_date` (date) - Claim period end date
      - `description` (text) - Description of the claim
      - `is_chargeable` (boolean) - Whether chargeable to a client
      - `client_id` (uuid, FK to clients, nullable) - Client if chargeable
      - `status` (text) - Status: 'draft', 'submitted', 'approved', 'rejected', 'paid'
      - `submitted_at` (timestamptz, nullable) - Submission timestamp
      - `reviewed_by` (uuid, nullable, FK to profiles) - Approver who reviewed
      - `reviewed_at` (timestamptz, nullable) - Review timestamp
      - `review_notes` (text) - Notes from reviewer
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Changes to Existing Tables
    - Add `claim_id` (uuid, FK to expense_claims) to `expenses` table
    - Remove status fields from `expenses` (now managed at claim level)
    - Remove submission/review fields from `expenses` (now at claim level)

  3. Security
    - Enable RLS on new tables
    - Users can view/edit their own claims
    - Admins can view/edit all claims
    - Approvers can view submitted claims
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create expense_claims table
CREATE TABLE IF NOT EXISTS expense_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  claimant_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  description text DEFAULT '',
  is_chargeable boolean DEFAULT false,
  client_id uuid REFERENCES clients(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
  submitted_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  review_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Drop old expense policies that reference columns we want to remove
DROP POLICY IF EXISTS "Users can update own draft expenses" ON expenses;
DROP POLICY IF EXISTS "Approvers can view submitted expenses" ON expenses;
DROP POLICY IF EXISTS "Approvers can update submitted expenses" ON expenses;

-- Remove status-related columns from expenses (they're now at claim level)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'status'
  ) THEN
    ALTER TABLE expenses DROP COLUMN status CASCADE;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'submitted_at'
  ) THEN
    ALTER TABLE expenses DROP COLUMN submitted_at CASCADE;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE expenses DROP COLUMN reviewed_by CASCADE;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE expenses DROP COLUMN reviewed_at CASCADE;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'review_notes'
  ) THEN
    ALTER TABLE expenses DROP COLUMN review_notes CASCADE;
  END IF;
END $$;

-- Add claim_id to expenses table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'claim_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN claim_id uuid REFERENCES expense_claims(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expense_claims_user_id ON expense_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_status ON expense_claims(status);
CREATE INDEX IF NOT EXISTS idx_expense_claims_client_id ON expense_claims(client_id);
CREATE INDEX IF NOT EXISTS idx_expenses_claim_id ON expenses(claim_id);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_claims ENABLE ROW LEVEL SECURITY;

-- Clients policies
CREATE POLICY "Authenticated users can view active clients"
  ON clients FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage clients"
  ON clients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Expense claims policies
CREATE POLICY "Users can view own claims"
  ON expense_claims FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own claims"
  ON expense_claims FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own draft claims"
  ON expense_claims FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'draft')
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all claims"
  ON expense_claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all claims"
  ON expense_claims FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Approvers can view submitted claims"
  ON expense_claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM approvers
      WHERE approvers.user_id = auth.uid()
      AND approvers.is_active = true
    )
    AND status IN ('submitted', 'approved', 'rejected')
  );

CREATE POLICY "Approvers can update submitted claims"
  ON expense_claims FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM approvers
      WHERE approvers.user_id = auth.uid()
      AND approvers.is_active = true
    )
    AND status = 'submitted'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM approvers
      WHERE approvers.user_id = auth.uid()
      AND approvers.is_active = true
    )
  );

-- Create new expense policies based on claim relationship
CREATE POLICY "Users can update expenses in own draft claims"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expense_claims
      WHERE expense_claims.id = expenses.claim_id
      AND expense_claims.user_id = auth.uid()
      AND expense_claims.status = 'draft'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expense_claims
      WHERE expense_claims.id = expenses.claim_id
      AND expense_claims.user_id = auth.uid()
    )
  );

CREATE POLICY "Approvers can view expenses in submitted claims"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM approvers
      WHERE approvers.user_id = auth.uid()
      AND approvers.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM expense_claims
      WHERE expense_claims.id = expenses.claim_id
      AND expense_claims.status IN ('submitted', 'approved', 'rejected')
    )
  );

-- Insert some example clients
INSERT INTO clients (name, is_active) VALUES
  ('Client A', true),
  ('Client B', true),
  ('Client C', true)
ON CONFLICT DO NOTHING;