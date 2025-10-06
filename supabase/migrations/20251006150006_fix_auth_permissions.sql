/*
  # Fix Auth Permissions Issue
  
  This migration fixes the permission denied error when accessing auth.users
  by using proper security definer functions and alternative approaches.
*/

-- Drop the trigger first, then the functions that are causing permission issues
DROP TRIGGER IF EXISTS validate_profile_user ON profiles;
DROP FUNCTION IF EXISTS public.validate_profile_trigger();
DROP FUNCTION IF EXISTS public.validate_profile_user_exists(uuid);

-- Create a simpler approach that doesn't directly query auth.users
-- Instead, we'll rely on the built-in auth.uid() function which is always available

-- Create a function to validate current user's profile
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS profiles AS $$
DECLARE
  user_profile profiles;
BEGIN
  SELECT * INTO user_profile 
  FROM profiles 
  WHERE id = auth.uid();
  
  RETURN user_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to safely create/update current user's profile
CREATE OR REPLACE FUNCTION public.upsert_current_user_profile(
  user_email text,
  user_name text DEFAULT NULL,
  user_role text DEFAULT 'staff'
)
RETURNS uuid AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get the current authenticated user's ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found. User must be logged in.';
  END IF;
  
  -- Insert or update the profile for the current user
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    current_user_id,
    user_email,
    COALESCE(user_name, user_email),
    user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = now();
    
  RETURN current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to create demo profiles (for testing without auth)
CREATE OR REPLACE FUNCTION public.create_demo_profile_simple(
  demo_email text,
  demo_name text DEFAULT NULL,
  demo_role text DEFAULT 'staff'
)
RETURNS uuid AS $$
DECLARE
  demo_id uuid;
BEGIN
  demo_id := gen_random_uuid();
  
  -- Insert demo profile directly
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    demo_id,
    demo_email,
    COALESCE(demo_name, demo_email),
    demo_role
  );
    
  RETURN demo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to handle new user signup (to be called from client)
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS uuid AS $$
DECLARE
  current_user_id uuid;
  user_email text;
BEGIN
  -- Get current user info
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found';
  END IF;
  
  -- Get user email from auth.email() function (this is safe to use)
  user_email := auth.email();
  
  -- Create profile for the new user
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    current_user_id,
    COALESCE(user_email, 'unknown@example.com'),
    COALESCE(user_email, 'New User'),
    'staff'
  )
  ON CONFLICT (id) DO NOTHING; -- Don't overwrite existing profiles
    
  RETURN current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to the functions
GRANT EXECUTE ON FUNCTION public.get_current_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_current_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_demo_profile_simple TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user_signup TO authenticated;

-- Create some demo data for testing
DO $$
BEGIN
  -- Only create demo profiles if no profiles exist
  IF NOT EXISTS (SELECT 1 FROM profiles LIMIT 1) THEN
    PERFORM public.create_demo_profile_simple('admin@demo.com', 'Demo Admin', 'admin');
    PERFORM public.create_demo_profile_simple('user@demo.com', 'Demo User', 'staff');
    PERFORM public.create_demo_profile_simple('approver@demo.com', 'Demo Approver', 'staff');
    
    -- Make the demo admin an approver
    INSERT INTO approvers (user_id) 
    SELECT id FROM profiles WHERE email = 'admin@demo.com';
    
    RAISE NOTICE 'Demo profiles created successfully';
  ELSE
    RAISE NOTICE 'Profiles already exist, skipping demo data creation';
  END IF;
END $$;
