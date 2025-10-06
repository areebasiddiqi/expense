/*
  # Debug and Fix Profile Foreign Key Issues
  
  This migration helps identify and fix the specific foreign key constraint violations.
*/

-- First, let's see what's in auth.users
DO $$
BEGIN
  RAISE NOTICE 'Current auth.users count: %', (SELECT COUNT(*) FROM auth.users);
  RAISE NOTICE 'Current profiles count: %', (SELECT COUNT(*) FROM profiles);
END $$;

-- Check for orphaned profiles (profiles without corresponding auth.users)
DO $$
DECLARE
  orphaned_count integer;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM profiles p
  WHERE p.id NOT IN (SELECT id FROM auth.users);
  
  RAISE NOTICE 'Orphaned profiles found: %', orphaned_count;
  
  IF orphaned_count > 0 THEN
    RAISE NOTICE 'Deleting orphaned profiles...';
    DELETE FROM profiles WHERE id NOT IN (SELECT id FROM auth.users);
    RAISE NOTICE 'Deleted % orphaned profiles', orphaned_count;
  END IF;
END $$;

-- Temporarily disable the foreign key constraint to fix data issues
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Clean up any invalid data
DELETE FROM profiles WHERE id IS NULL;
DELETE FROM profiles WHERE id NOT IN (SELECT id FROM auth.users WHERE id IS NOT NULL);

-- Re-add the foreign key constraint
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create a safe insert function that checks constraints first
CREATE OR REPLACE FUNCTION public.safe_insert_profile(
  profile_id uuid,
  profile_email text,
  profile_name text DEFAULT NULL,
  profile_role text DEFAULT 'staff'
)
RETURNS boolean AS $$
DECLARE
  user_exists boolean := false;
BEGIN
  -- Check if user exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = profile_id) INTO user_exists;
  
  IF NOT user_exists THEN
    RAISE NOTICE 'User with ID % does not exist in auth.users. Cannot create profile.', profile_id;
    RETURN false;
  END IF;
  
  -- Insert the profile
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    profile_id,
    profile_email,
    COALESCE(profile_name, profile_email),
    profile_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = EXCLUDED.role,
    updated_at = now();
    
  RAISE NOTICE 'Profile created/updated successfully for user %', profile_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to list current auth users (for debugging)
CREATE OR REPLACE FUNCTION public.list_auth_users()
RETURNS TABLE(user_id uuid, user_email text, created_at timestamptz) AS $$
BEGIN
  RETURN QUERY
  SELECT id, email, auth.users.created_at
  FROM auth.users
  ORDER BY auth.users.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.safe_insert_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_auth_users TO authenticated;
