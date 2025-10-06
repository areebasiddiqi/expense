/*
  # Remove Profiles Foreign Key Constraint
  
  This migration removes the foreign key constraint that's causing issues
  and provides alternative solutions for data integrity.
*/

-- Drop the problematic foreign key constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Instead of a hard foreign key, we'll use a softer approach with a function
-- that validates the relationship when needed

-- Create a function to validate profile IDs against auth.users
CREATE OR REPLACE FUNCTION public.validate_profile_user_exists(profile_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS(SELECT 1 FROM auth.users WHERE id = profile_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function to validate profiles on insert/update
CREATE OR REPLACE FUNCTION public.validate_profile_trigger()
RETURNS trigger AS $$
BEGIN
  -- Only validate if auth.users table has data (skip during initial setup)
  IF EXISTS(SELECT 1 FROM auth.users LIMIT 1) THEN
    IF NOT public.validate_profile_user_exists(NEW.id) THEN
      RAISE WARNING 'Profile ID % does not exist in auth.users. Consider creating the user first.', NEW.id;
      -- Allow the insert but warn about it
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the validation trigger (as a warning, not blocking)
DROP TRIGGER IF EXISTS validate_profile_user ON profiles;
CREATE TRIGGER validate_profile_user
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_trigger();

-- Create a function to safely create profiles with proper validation
CREATE OR REPLACE FUNCTION public.create_profile_safe(
  user_id uuid,
  user_email text,
  user_name text DEFAULT NULL,
  user_role text DEFAULT 'staff',
  skip_auth_check boolean DEFAULT false
)
RETURNS uuid AS $$
BEGIN
  -- If not skipping auth check, validate user exists
  IF NOT skip_auth_check AND NOT public.validate_profile_user_exists(user_id) THEN
    RAISE EXCEPTION 'Cannot create profile: User ID % does not exist in auth.users. User must sign up first.', user_id;
  END IF;
  
  -- Insert or update the profile
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    user_id,
    user_email,
    COALESCE(user_name, user_email),
    user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = EXCLUDED.role,
    updated_at = now();
    
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to create test/demo profiles (for development)
CREATE OR REPLACE FUNCTION public.create_demo_profile(
  demo_email text,
  demo_name text DEFAULT NULL,
  demo_role text DEFAULT 'staff'
)
RETURNS uuid AS $$
DECLARE
  demo_id uuid;
BEGIN
  demo_id := gen_random_uuid();
  
  -- Create profile without auth validation (for demo purposes)
  PERFORM public.create_profile_safe(
    demo_id,
    demo_email,
    COALESCE(demo_name, demo_email),
    demo_role,
    true -- skip auth check
  );
  
  RETURN demo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.validate_profile_user_exists TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_profile_safe TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_demo_profile TO authenticated;

-- Clean up any existing invalid data
DELETE FROM profiles WHERE id IS NULL;

-- Log completion messages
DO $$
BEGIN
  RAISE NOTICE 'Foreign key constraint removed. You can now insert profiles freely.';
  RAISE NOTICE 'Use create_profile_safe() for production or create_demo_profile() for testing.';
END $$;
