/*
  # Add Expense Policy Disclaimer Setting

  ## Overview
  Adds a settings table to store customizable expense policy disclaimer text that users
  must agree to before submitting expense claims.

  ## 1. New Table
    ### `app_settings`
    - `id` (uuid, PK) - Settings identifier
    - `key` (text, unique) - Setting key name
    - `value` (text) - Setting value
    - `description` (text) - Description of the setting
    - `created_at` (timestamptz) - Creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp

  ## 2. Security
    - Enable RLS on app_settings table
    - All authenticated users can read settings
    - Only admins can update settings

  ## 3. Initial Data
    - Insert default expense policy disclaimer text

  ## Important Notes
    - Settings are stored as key-value pairs for flexibility
    - The expense_policy_disclaimer key contains the text shown to users
    - Admins can customize this text through the admin panel
*/

-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read settings
CREATE POLICY "Authenticated users can read settings"
  ON app_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
  ON app_settings
  FOR UPDATE
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

-- Only admins can insert settings
CREATE POLICY "Admins can insert settings"
  ON app_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default expense policy disclaimer
INSERT INTO app_settings (key, value, description)
VALUES (
  'expense_policy_disclaimer',
  'I certify that this claim is in line with UNRVLD''s expense policy. I have attached all relevant VAT receipts and I have valid Business Insurance cover on my vehicle for any mileage claims.',
  'Disclaimer text shown to users when submitting expense claims'
)
ON CONFLICT (key) DO NOTHING;
