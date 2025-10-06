/*
  # Update Vehicle Types and Mileage Rates for Charger Types

  ## Overview
  Simplifies vehicle types to Standard and Electric, and adds charger type tracking
  for electric vehicles (home vs public charging).

  ## 1. Changes to `profiles` table
    - Update vehicle_type to only allow 'standard' or 'electric'
    - Migrate existing electric_home and electric_commercial to 'electric'

  ## 2. Changes to `mileage_rates` table
    - Add charger_type column: null for standard vehicles, 'home' or 'public' for electric
    - Migrate existing rates to new structure
    - Update constraint to allow standard, electric combinations

  ## 3. Changes to `mileage_expenses` table
    - Add charger_type column: null for standard vehicles, 'home' or 'public' for electric
    - Update existing records to set appropriate charger_type

  ## 4. Security
    - No RLS changes required
    - Existing policies remain valid

  ## Important Notes
    - Standard vehicles: vehicle_type='standard', charger_type=null
    - Electric vehicles: vehicle_type='electric', charger_type='home' or 'public'
    - Mileage rates now support different rates for home vs public charging
*/

-- Step 1: Drop existing constraints first
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_vehicle_type_check;

ALTER TABLE mileage_rates 
DROP CONSTRAINT IF EXISTS mileage_rates_vehicle_type_check;

ALTER TABLE mileage_expenses 
DROP CONSTRAINT IF EXISTS mileage_expenses_vehicle_type_check;

-- Step 2: Add charger_type columns
ALTER TABLE mileage_rates 
ADD COLUMN IF NOT EXISTS charger_type text;

ALTER TABLE mileage_expenses 
ADD COLUMN IF NOT EXISTS charger_type text;

-- Step 3: Migrate existing mileage_rates data
UPDATE mileage_rates 
SET charger_type = 'home' 
WHERE vehicle_type = 'electric_home';

UPDATE mileage_rates 
SET charger_type = 'public' 
WHERE vehicle_type = 'electric_commercial';

UPDATE mileage_rates 
SET vehicle_type = 'electric' 
WHERE vehicle_type IN ('electric_home', 'electric_commercial');

-- Step 4: Migrate existing mileage_expenses data
UPDATE mileage_expenses 
SET charger_type = 'home' 
WHERE vehicle_type = 'electric_home';

UPDATE mileage_expenses 
SET charger_type = 'public' 
WHERE vehicle_type = 'electric_commercial';

UPDATE mileage_expenses 
SET vehicle_type = 'electric' 
WHERE vehicle_type IN ('electric_home', 'electric_commercial');

-- Step 5: Update existing profiles
UPDATE profiles 
SET vehicle_type = 'electric' 
WHERE vehicle_type IN ('electric_home', 'electric_commercial');

-- Step 6: Add new constraints
ALTER TABLE profiles 
ADD CONSTRAINT profiles_vehicle_type_check 
CHECK (vehicle_type IN ('standard', 'electric'));

ALTER TABLE mileage_rates 
ADD CONSTRAINT mileage_rates_vehicle_type_check 
CHECK (vehicle_type IN ('standard', 'electric'));

ALTER TABLE mileage_rates 
ADD CONSTRAINT mileage_rates_charger_type_check 
CHECK (charger_type IN ('home', 'public'));

ALTER TABLE mileage_rates 
ADD CONSTRAINT mileage_rates_charger_type_required 
CHECK (
  (vehicle_type = 'standard' AND charger_type IS NULL) OR 
  (vehicle_type = 'electric' AND charger_type IS NOT NULL)
);

ALTER TABLE mileage_expenses 
ADD CONSTRAINT mileage_expenses_vehicle_type_check 
CHECK (vehicle_type IN ('standard', 'electric'));

ALTER TABLE mileage_expenses 
ADD CONSTRAINT mileage_expenses_charger_type_check 
CHECK (charger_type IN ('home', 'public'));

ALTER TABLE mileage_expenses 
ADD CONSTRAINT mileage_expenses_charger_type_required 
CHECK (
  (vehicle_type = 'standard' AND charger_type IS NULL) OR 
  (vehicle_type = 'electric' AND charger_type IS NOT NULL)
);
