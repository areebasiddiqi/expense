/*
  # Microsoft 365 Integration Schema

  ## Overview
  Adds complete Microsoft 365 (Azure AD) integration support including OAuth SSO,
  automatic user provisioning, and scheduled synchronization.

  ## 1. New Tables

  ### `microsoft_tenant_config`
  Configuration for Microsoft 365 tenant connections
  - `id` (uuid, PK) - Configuration identifier
  - `organization_id` (uuid, FK to organizations) - Organization this config belongs to
  - `tenant_id` (text) - Azure AD tenant ID
  - `client_id` (text) - Azure app client ID for OAuth
  - `client_secret` (text) - Encrypted Azure app client secret
  - `refresh_token` (text, nullable) - Encrypted refresh token for Graph API
  - `access_token` (text, nullable) - Current access token (short-lived)
  - `token_expires_at` (timestamptz, nullable) - Token expiration timestamp
  - `last_sync_at` (timestamptz, nullable) - Last successful sync timestamp
  - `sync_status` (text) - Status: 'active', 'failed', 'disabled'
  - `sync_frequency_minutes` (integer) - Sync interval in minutes (default 15)
  - `group_filter` (jsonb, nullable) - Array of Azure group IDs to sync
  - `is_enabled` (boolean) - Whether sync is enabled
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `user_sync_log`
  Audit log for user synchronization operations
  - `id` (uuid, PK) - Log entry identifier
  - `organization_id` (uuid, FK to organizations) - Organization synced
  - `sync_type` (text) - Type: 'full', 'incremental', 'manual'
  - `users_created` (integer) - Number of users created
  - `users_updated` (integer) - Number of users updated
  - `users_deactivated` (integer) - Number of users deactivated
  - `errors` (jsonb, nullable) - Array of error messages
  - `started_at` (timestamptz) - Sync start timestamp
  - `completed_at` (timestamptz, nullable) - Sync completion timestamp
  - `status` (text) - Status: 'success', 'failed', 'partial'
  - `details` (jsonb, nullable) - Additional sync details

  ### `azure_group_mappings`
  Maps Azure AD groups to application roles
  - `id` (uuid, PK) - Mapping identifier
  - `organization_id` (uuid, FK to organizations) - Organization this mapping belongs to
  - `azure_group_id` (text) - Azure AD group object ID
  - `azure_group_name` (text) - Azure AD group display name
  - `application_role` (text) - Role: 'staff', 'admin', 'approver'
  - `is_active` (boolean) - Whether mapping is active
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## 2. Organizations Table Updates
  Add Microsoft 365 integration fields:
  - `microsoft_tenant_id` (text, nullable) - Linked Azure tenant ID
  - `is_microsoft_connected` (boolean) - Whether org is connected to Microsoft
  - `microsoft_sync_enabled` (boolean) - Whether auto-sync is enabled

  ## 3. Profiles Table Updates
  Add Microsoft user tracking fields:
  - `microsoft_user_id` (text, nullable) - Azure AD object ID
  - `sync_source` (text) - Source: 'local', 'microsoft', 'both'
  - `last_synced_at` (timestamptz, nullable) - Last sync timestamp
  - `azure_upn` (text, nullable) - Azure userPrincipalName
  - `is_synced_user` (boolean) - Whether user is synced from Microsoft
  - `department` (text, nullable) - User's department from Azure AD
  - `job_title` (text, nullable) - User's job title from Azure AD

  ## 4. Security
  - Enable RLS on all new tables
  - Only admins can view/manage Microsoft configurations
  - Organization-level data isolation for all tables
  - Audit logs viewable by admins only

  ## 5. Indexes
  - Index on organization_id for fast lookups
  - Index on microsoft_user_id for sync operations
  - Index on sync timestamps for reporting
*/

-- Create organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add Microsoft 365 fields to organizations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'microsoft_tenant_id'
  ) THEN
    ALTER TABLE organizations ADD COLUMN microsoft_tenant_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'is_microsoft_connected'
  ) THEN
    ALTER TABLE organizations ADD COLUMN is_microsoft_connected boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'microsoft_sync_enabled'
  ) THEN
    ALTER TABLE organizations ADD COLUMN microsoft_sync_enabled boolean DEFAULT false;
  END IF;
END $$;

-- Add Microsoft fields to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'microsoft_user_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN microsoft_user_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'sync_source'
  ) THEN
    ALTER TABLE profiles ADD COLUMN sync_source text DEFAULT 'local' CHECK (sync_source IN ('local', 'microsoft', 'both'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_synced_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_synced_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'azure_upn'
  ) THEN
    ALTER TABLE profiles ADD COLUMN azure_upn text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_synced_user'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_synced_user boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'department'
  ) THEN
    ALTER TABLE profiles ADD COLUMN department text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'job_title'
  ) THEN
    ALTER TABLE profiles ADD COLUMN job_title text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN organization_id uuid REFERENCES organizations(id);
  END IF;
END $$;

-- Create microsoft_tenant_config table
CREATE TABLE IF NOT EXISTS microsoft_tenant_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id text NOT NULL,
  client_id text NOT NULL,
  client_secret text NOT NULL,
  refresh_token text,
  access_token text,
  token_expires_at timestamptz,
  last_sync_at timestamptz,
  sync_status text DEFAULT 'active' CHECK (sync_status IN ('active', 'failed', 'disabled')),
  sync_frequency_minutes integer DEFAULT 15,
  group_filter jsonb,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

-- Create user_sync_log table
CREATE TABLE IF NOT EXISTS user_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sync_type text NOT NULL CHECK (sync_type IN ('full', 'incremental', 'manual')),
  users_created integer DEFAULT 0,
  users_updated integer DEFAULT 0,
  users_deactivated integer DEFAULT 0,
  errors jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL CHECK (status IN ('running', 'success', 'failed', 'partial')),
  details jsonb
);

-- Create azure_group_mappings table
CREATE TABLE IF NOT EXISTS azure_group_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  azure_group_id text NOT NULL,
  azure_group_name text NOT NULL,
  application_role text NOT NULL CHECK (application_role IN ('staff', 'admin', 'approver')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, azure_group_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_microsoft_config_org_id ON microsoft_tenant_config(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_sync_log_org_id ON user_sync_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_sync_log_started ON user_sync_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_azure_mappings_org_id ON azure_group_mappings(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_microsoft_id ON profiles(microsoft_user_id) WHERE microsoft_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_microsoft_tenant ON organizations(microsoft_tenant_id) WHERE microsoft_tenant_id IS NOT NULL;

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE microsoft_tenant_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE azure_group_mappings ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can update own organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Microsoft tenant config policies
CREATE POLICY "Admins can view own org Microsoft config"
  ON microsoft_tenant_config FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage own org Microsoft config"
  ON microsoft_tenant_config FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- User sync log policies
CREATE POLICY "Admins can view own org sync logs"
  ON user_sync_log FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert sync logs"
  ON user_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Azure group mappings policies
CREATE POLICY "Admins can view own org group mappings"
  ON azure_group_mappings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage own org group mappings"
  ON azure_group_mappings FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert a default organization for existing users
INSERT INTO organizations (name, is_active)
VALUES ('Default Organization', true)
ON CONFLICT DO NOTHING;