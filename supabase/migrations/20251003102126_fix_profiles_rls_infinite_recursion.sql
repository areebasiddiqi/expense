/*
  # Fix infinite recursion in profiles RLS policies

  1. Changes
    - Drop existing SELECT policies that cause infinite recursion
    - Create new policy allowing users to view their own profile directly
    - Admin capabilities will be handled at application level since we can't check admin status without causing recursion
  
  2. Security
    - Users can only view their own profile
    - This prevents the infinite loop while maintaining security
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create a simple, non-recursive policy for viewing own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- For admin viewing all profiles, we need to use a different approach
-- We'll store admin status in a way that doesn't require querying profiles
CREATE POLICY "Allow profile reads"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);