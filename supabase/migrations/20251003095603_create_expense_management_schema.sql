/*
  # Expense Management System Schema

  ## Overview
  Complete expense management system with staff/admin roles, expense tracking,
  approval workflows, mileage rates, and Xero integration.

  ## 1. New Tables

  ### `profiles`
  User profile information extending auth.users
  - `id` (uuid, FK to auth.users) - User identifier
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `role` (text) - User role: 'staff' or 'admin'
  - `vehicle_type` (text) - Vehicle type for mileage: 'standard', 'electric_home', 'electric_commercial'
  - `created_at` (timestamptz) - Profile creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `expense_categories`
  Categories for expenses that map to Xero
  - `id` (uuid, PK) - Category identifier
  - `name` (text) - Category name
  - `xero_account_code` (text) - Xero account code mapping
  - `description` (text) - Category description
  - `is_active` (boolean) - Whether category is active
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `mileage_rates`
  Configurable mileage rates per vehicle type
  - `id` (uuid, PK) - Rate identifier
  - `vehicle_type` (text) - Vehicle type: 'standard', 'electric_home', 'electric_commercial'
  - `rate_per_mile` (numeric) - Rate per mile in currency
  - `effective_from` (date) - Date rate becomes effective
  - `effective_to` (date, nullable) - Date rate expires
  - `created_at` (timestamptz) - Creation timestamp

  ### `approvers`
  Users who can approve expenses
  - `id` (uuid, PK) - Approver identifier
  - `user_id` (uuid, FK to profiles) - User who is an approver
  - `is_active` (boolean) - Whether approver is active
  - `created_at` (timestamptz) - Creation timestamp

  ### `expenses`
  Individual expense claims
  - `id` (uuid, PK) - Expense identifier
  - `user_id` (uuid, FK to profiles) - User who submitted expense
  - `category_id` (uuid, FK to expense_categories) - Expense category
  - `title` (text) - Expense title
  - `description` (text) - Expense description
  - `amount` (numeric) - Expense amount
  - `expense_date` (date) - Date expense was incurred
  - `receipt_url` (text, nullable) - URL to receipt image
  - `notes` (text) - Additional notes
  - `status` (text) - Status: 'draft', 'submitted', 'approved', 'rejected', 'paid'
  - `submitted_at` (timestamptz, nullable) - Submission timestamp
  - `reviewed_by` (uuid, nullable, FK to profiles) - Approver who reviewed
  - `reviewed_at` (timestamptz, nullable) - Review timestamp
  - `review_notes` (text) - Notes from reviewer
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `mileage_expenses`
  Mileage-specific expense details
  - `id` (uuid, PK) - Mileage expense identifier
  - `expense_id` (uuid, FK to expenses) - Related expense
  - `start_location` (text) - Journey start location
  - `end_location` (text) - Journey end location
  - `distance_miles` (numeric) - Distance in miles
  - `vehicle_type` (text) - Vehicle type used
  - `rate_applied` (numeric) - Rate per mile applied
  - `created_at` (timestamptz) - Creation timestamp

  ### `xero_settings`
  Xero integration configuration
  - `id` (uuid, PK) - Settings identifier
  - `client_id` (text) - Xero OAuth client ID
  - `client_secret` (text) - Xero OAuth client secret
  - `tenant_id` (text) - Xero tenant ID
  - `access_token` (text, nullable) - OAuth access token
  - `refresh_token` (text, nullable) - OAuth refresh token
  - `token_expires_at` (timestamptz, nullable) - Token expiration
  - `is_connected` (boolean) - Connection status
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## 2. Security
  - Enable RLS on all tables
  - Staff can view/edit their own expenses
  - Admins can view/edit all data
  - Approvers can view expenses assigned to them
  - Public cannot access any data

  ## 3. Indexes
  - Index on expense status for filtering
  - Index on user_id for user queries
  - Index on expense dates for reporting
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'admin')),
  vehicle_type text DEFAULT 'standard' CHECK (vehicle_type IN ('standard', 'electric_home', 'electric_commercial')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  xero_account_code text,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create mileage_rates table
CREATE TABLE IF NOT EXISTS mileage_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('standard', 'electric_home', 'electric_commercial')),
  rate_per_mile numeric(10, 4) NOT NULL,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  created_at timestamptz DEFAULT now()
);

-- Create approvers table
CREATE TABLE IF NOT EXISTS approvers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES expense_categories(id),
  title text NOT NULL,
  description text DEFAULT '',
  amount numeric(10, 2) NOT NULL,
  expense_date date NOT NULL,
  receipt_url text,
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
  submitted_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  review_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create mileage_expenses table
CREATE TABLE IF NOT EXISTS mileage_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  start_location text NOT NULL,
  end_location text NOT NULL,
  distance_miles numeric(10, 2) NOT NULL,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('standard', 'electric_home', 'electric_commercial')),
  rate_applied numeric(10, 4) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create xero_settings table
CREATE TABLE IF NOT EXISTS xero_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text DEFAULT '',
  client_secret text DEFAULT '',
  tenant_id text DEFAULT '',
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  is_connected boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_mileage_expense_id ON mileage_expenses(expense_id);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
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

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Expense categories policies
CREATE POLICY "Authenticated users can view active categories"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage categories"
  ON expense_categories FOR ALL
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

-- Mileage rates policies
CREATE POLICY "Authenticated users can view current rates"
  ON mileage_rates FOR SELECT
  TO authenticated
  USING (
    effective_from <= CURRENT_DATE
    AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
  );

CREATE POLICY "Admins can manage mileage rates"
  ON mileage_rates FOR ALL
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

-- Approvers policies
CREATE POLICY "Authenticated users can view approvers"
  ON approvers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage approvers"
  ON approvers FOR ALL
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

-- Expenses policies
CREATE POLICY "Users can view own expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own draft expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'draft')
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all expenses"
  ON expenses FOR ALL
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

CREATE POLICY "Approvers can view submitted expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM approvers
      WHERE approvers.user_id = auth.uid()
      AND approvers.is_active = true
    )
    AND status IN ('submitted', 'approved', 'rejected')
  );

CREATE POLICY "Approvers can update submitted expenses"
  ON expenses FOR UPDATE
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

-- Mileage expenses policies
CREATE POLICY "Users can view own mileage expenses"
  ON mileage_expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = mileage_expenses.expense_id
      AND expenses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create mileage for own expenses"
  ON mileage_expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = mileage_expenses.expense_id
      AND expenses.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all mileage expenses"
  ON mileage_expenses FOR ALL
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

-- Xero settings policies
CREATE POLICY "Admins can manage xero settings"
  ON xero_settings FOR ALL
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

-- Insert default expense categories
INSERT INTO expense_categories (name, description, is_active) VALUES
  ('Travel', 'Transportation and travel expenses', true),
  ('Accommodation', 'Hotel and lodging expenses', true),
  ('Meals', 'Food and beverage expenses', true),
  ('Office Supplies', 'Stationery and office materials', true),
  ('Equipment', 'Tools and equipment purchases', true),
  ('Mileage', 'Vehicle mileage claims', true),
  ('Training', 'Professional development and training', true),
  ('Other', 'Miscellaneous expenses', true)
ON CONFLICT DO NOTHING;

-- Insert default mileage rates
INSERT INTO mileage_rates (vehicle_type, rate_per_mile, effective_from) VALUES
  ('standard', 0.45, CURRENT_DATE),
  ('electric_home', 0.05, CURRENT_DATE),
  ('electric_commercial', 0.08, CURRENT_DATE)
ON CONFLICT DO NOTHING;