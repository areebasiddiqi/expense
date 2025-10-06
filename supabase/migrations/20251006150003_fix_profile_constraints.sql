/*
  # Fix Profile Foreign Key Constraint Issues
  
  This migration fixes any existing data that violates the foreign key constraint
  between profiles and auth.users tables.
*/

-- Remove any profiles that don't have corresponding auth.users entries
DELETE FROM public.profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Create a temporary admin user function (use only if you need to create an admin manually)
CREATE OR REPLACE FUNCTION public.create_admin_profile(
  admin_email text,
  admin_name text
)
RETURNS uuid AS $$
DECLARE
  admin_id uuid;
BEGIN
  -- Check if user exists in auth.users first
  SELECT id INTO admin_id FROM auth.users WHERE email = admin_email;
  
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found with email %. User must sign up through Supabase Auth first.', admin_email;
  END IF;
  
  -- Insert or update the admin profile
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (admin_id, admin_email, admin_name, 'admin')
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    full_name = EXCLUDED.full_name,
    updated_at = now();
    
  RETURN admin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_admin_profile TO authenticated;
