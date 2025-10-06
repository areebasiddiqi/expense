/*
  # Add charger_type column to profiles table

  ## Overview
  Adds the charger_type column to the profiles table to store electric vehicle charger information.

  ## Changes
    1. Column Addition
      - Add `charger_type` (text, nullable) column to profiles table
      - Allowed values: 'home', 'workplace', or null
      - This field is only relevant for users with vehicle_type = 'electric'

  ## Important Notes
    - Column is nullable since not all users have electric vehicles
    - Only relevant when vehicle_type is 'electric'
*/

-- Add charger_type column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'charger_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN charger_type text;
  END IF;
END $$;
