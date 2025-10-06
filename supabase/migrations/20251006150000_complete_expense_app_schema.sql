/*
  # Complete Expense Management System Schema
  
  ## Overview
  This migration creates a complete expense management system from scratch for an empty Supabase project.
  It includes all tables, functions, policies, and default data needed for the expense app.

  ## Features Included
  - User profiles with role-based access (staff/admin/approver)
  - Expense categories and mileage rates
  - Individual expenses and mileage tracking
  - Expense claims with client billing
  - VAT support for expenses
  - Storage bucket for receipts
  - Email templates and notifications
  - Microsoft 365 integration
  - Xero integration settings
  - Complete RLS policies
  - Performance indexes
*/

-- ============================================================================
-- 1. ORGANIZATIONS AND USER MANAGEMENT
-- ============================================================================

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text,
  is_active boolean DEFAULT true,
  microsoft_tenant_id text,
  is_microsoft_connected boolean DEFAULT false,
  microsoft_sync_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'admin')),
  vehicle_type text DEFAULT 'standard' CHECK (vehicle_type IN ('standard', 'electric_home', 'electric_commercial')),
  charger_type text,
  organization_id uuid REFERENCES organizations(id),
  microsoft_user_id text,
  sync_source text DEFAULT 'local' CHECK (sync_source IN ('local', 'microsoft', 'both')),
  last_synced_at timestamptz,
  azure_upn text,
  is_synced_user boolean DEFAULT false,
  department text,
  job_title text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create approvers table
CREATE TABLE IF NOT EXISTS approvers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- ============================================================================
-- 2. EXPENSE CATEGORIES AND RATES
-- ============================================================================

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  xero_account_code text,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create mileage_rates table
CREATE TABLE IF NOT EXISTS mileage_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('standard', 'electric_home', 'electric_commercial')),
  rate_per_mile numeric(10, 4) NOT NULL,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 3. CLIENTS AND EXPENSE CLAIMS
-- ============================================================================

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create expense_claims table
CREATE TABLE IF NOT EXISTS expense_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  claimant_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  description text DEFAULT '',
  is_chargeable boolean DEFAULT false,
  client_id uuid REFERENCES clients(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
  submitted_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  review_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 4. EXPENSES AND MILEAGE
-- ============================================================================

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES expense_categories(id),
  claim_id uuid REFERENCES expense_claims(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  amount numeric(10, 2) NOT NULL,
  amount_before_vat numeric(10, 2) DEFAULT 0,
  vat_amount numeric(10, 2) DEFAULT 0,
  expense_date date NOT NULL,
  receipt_url text,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create mileage_expenses table
CREATE TABLE IF NOT EXISTS mileage_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  start_location text NOT NULL,
  end_location text NOT NULL,
  distance_miles numeric(10, 2) NOT NULL,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('standard', 'electric_home', 'electric_commercial')),
  rate_applied numeric(10, 4) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 5. EMAIL SYSTEM
-- ============================================================================

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text UNIQUE NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  template_type text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  claim_id uuid REFERENCES expense_claims(id) ON DELETE CASCADE,
  sent_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'sent',
  error_message text
);

-- ============================================================================
-- 6. MICROSOFT 365 INTEGRATION
-- ============================================================================

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

-- ============================================================================
-- 7. XERO INTEGRATION
-- ============================================================================

-- Create xero_settings table
CREATE TABLE IF NOT EXISTS xero_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text DEFAULT '',
  client_secret text DEFAULT '',
  tenant_id text DEFAULT '',
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  is_connected boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 8. STORAGE BUCKET FOR RECEIPTS
-- ============================================================================

-- Create the receipts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_microsoft_id ON profiles(microsoft_user_id) WHERE microsoft_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_claim_id ON expenses(claim_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expense_claims_user_id ON expense_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_status ON expense_claims(status);
CREATE INDEX IF NOT EXISTS idx_expense_claims_client_id ON expense_claims(client_id);
CREATE INDEX IF NOT EXISTS idx_mileage_expense_id ON mileage_expenses(expense_id);

-- Microsoft integration indexes
CREATE INDEX IF NOT EXISTS idx_microsoft_config_org_id ON microsoft_tenant_config(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_sync_log_org_id ON user_sync_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_sync_log_started ON user_sync_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_azure_mappings_org_id ON azure_group_mappings(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_microsoft_tenant ON organizations(microsoft_tenant_id) WHERE microsoft_tenant_id IS NOT NULL;

-- ============================================================================
-- 10. ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE microsoft_tenant_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE azure_group_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_settings ENABLE ROW LEVEL SECURITY;
