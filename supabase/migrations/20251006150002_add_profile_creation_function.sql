/*
  # Add Profile Creation Function and Trigger
  
  This migration adds a function and trigger to automatically create profiles
  when users sign up through Supabase Auth, preventing foreign key constraint violations.
*/

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'staff'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to handle profile updates from auth changes
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
  SET 
    email = new.email,
    updated_at = now()
  WHERE id = new.id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update profile when auth user is updated
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_update();

-- Create function to safely insert or update profiles
CREATE OR REPLACE FUNCTION public.upsert_profile(
  user_id uuid,
  user_email text,
  user_full_name text DEFAULT NULL,
  user_role text DEFAULT 'staff'
)
RETURNS void AS $$
BEGIN
  -- First check if the user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
    RAISE EXCEPTION 'User with ID % does not exist in auth.users', user_id;
  END IF;
  
  -- Insert or update the profile
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    user_id,
    user_email,
    COALESCE(user_full_name, user_email),
    user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = COALESCE(EXCLUDED.role, profiles.role),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_profile TO authenticated;
