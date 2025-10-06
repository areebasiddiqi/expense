/*
  # Add Admin Users as Approvers

  ## Overview
  Ensures all admin users are automatically added to the approvers table so they can see and approve submitted claims.

  ## Changes
    1. Add all existing admin users to the approvers table
    2. Only adds if they don't already exist
  
  ## Security
    - Maintains existing RLS policies
    - No data modifications to existing approvers
*/

-- Add all admin users as approvers if they aren't already
INSERT INTO approvers (user_id, is_active)
SELECT p.id, true
FROM profiles p
WHERE p.role = 'admin'
AND NOT EXISTS (
  SELECT 1 FROM approvers a WHERE a.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;
