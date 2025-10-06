/*
  # Complete Expense Management System - Part 2: Policies and Default Data
  
  This migration adds all RLS policies, storage policies, and default data
  for the complete expense management system.
*/

-- ============================================================================
-- 1. PROFILES POLICIES
-- ============================================================================

-- Users can view own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can insert profiles
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 2. ORGANIZATIONS POLICIES
-- ============================================================================

-- Users can view own organization
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM profiles
      WHERE profiles.id = auth.uid()
    )
  );

-- Admins can update own organization
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

-- ============================================================================
-- 3. EXPENSE CATEGORIES POLICIES
-- ============================================================================

-- Authenticated users can view active categories
CREATE POLICY "Authenticated users can view active categories"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can manage categories
CREATE POLICY "Admins can manage categories"
  ON expense_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 4. MILEAGE RATES POLICIES
-- ============================================================================

-- Authenticated users can view current rates
CREATE POLICY "Authenticated users can view current rates"
  ON mileage_rates FOR SELECT
  TO authenticated
  USING (
    effective_from <= CURRENT_DATE
    AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
  );

-- Admins can manage mileage rates
CREATE POLICY "Admins can manage mileage rates"
  ON mileage_rates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 5. APPROVERS POLICIES
-- ============================================================================

-- Authenticated users can view approvers
CREATE POLICY "Authenticated users can view approvers"
  ON approvers FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage approvers
CREATE POLICY "Admins can manage approvers"
  ON approvers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 6. CLIENTS POLICIES
-- ============================================================================

-- Authenticated users can view active clients
CREATE POLICY "Authenticated users can view active clients"
  ON clients FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can manage clients
CREATE POLICY "Admins can manage clients"
  ON clients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 7. EXPENSE CLAIMS POLICIES
-- ============================================================================

-- Users can view own claims
CREATE POLICY "Users can view own claims"
  ON expense_claims FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create own claims
CREATE POLICY "Users can create own claims"
  ON expense_claims FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update own draft claims
CREATE POLICY "Users can update own draft claims"
  ON expense_claims FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'draft')
  WITH CHECK (user_id = auth.uid());

-- Admins can view all claims
CREATE POLICY "Admins can view all claims"
  ON expense_claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can manage all claims
CREATE POLICY "Admins can manage all claims"
  ON expense_claims FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Approvers can view submitted claims
CREATE POLICY "Approvers can view submitted claims"
  ON expense_claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM approvers
      WHERE approvers.user_id = auth.uid()
      AND approvers.is_active = true
    )
    AND status IN ('submitted', 'approved', 'rejected')
  );

-- Approvers can update submitted claims
CREATE POLICY "Approvers can update submitted claims"
  ON expense_claims FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM approvers
      WHERE approvers.user_id = auth.uid()
      AND approvers.is_active = true
    )
    AND status = 'submitted'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM approvers
      WHERE approvers.user_id = auth.uid()
      AND approvers.is_active = true
    )
  );

-- ============================================================================
-- 8. EXPENSES POLICIES
-- ============================================================================

-- Users can view own expenses
CREATE POLICY "Users can view own expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create own expenses
CREATE POLICY "Users can create own expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update expenses in own draft claims
CREATE POLICY "Users can update expenses in own draft claims"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expense_claims
      WHERE expense_claims.id = expenses.claim_id
      AND expense_claims.user_id = auth.uid()
      AND expense_claims.status = 'draft'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expense_claims
      WHERE expense_claims.id = expenses.claim_id
      AND expense_claims.user_id = auth.uid()
    )
  );

-- Admins can view all expenses
CREATE POLICY "Admins can view all expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can manage all expenses
CREATE POLICY "Admins can manage all expenses"
  ON expenses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Approvers can view expenses in submitted claims
CREATE POLICY "Approvers can view expenses in submitted claims"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM approvers
      WHERE approvers.user_id = auth.uid()
      AND approvers.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM expense_claims
      WHERE expense_claims.id = expenses.claim_id
      AND expense_claims.status IN ('submitted', 'approved', 'rejected')
    )
  );

-- ============================================================================
-- 9. MILEAGE EXPENSES POLICIES
-- ============================================================================

-- Users can view own mileage expenses
CREATE POLICY "Users can view own mileage expenses"
  ON mileage_expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = mileage_expenses.expense_id
      AND expenses.user_id = auth.uid()
    )
  );

-- Users can create mileage for own expenses
CREATE POLICY "Users can create mileage for own expenses"
  ON mileage_expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = mileage_expenses.expense_id
      AND expenses.user_id = auth.uid()
    )
  );

-- Admins can manage all mileage expenses
CREATE POLICY "Admins can manage all mileage expenses"
  ON mileage_expenses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 10. EMAIL TEMPLATES POLICIES
-- ============================================================================

-- Admins can view all email templates
CREATE POLICY "Admins can view all email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can manage email templates
CREATE POLICY "Admins can manage email templates"
  ON email_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 11. EMAIL LOGS POLICIES
-- ============================================================================

-- Admins can view email logs
CREATE POLICY "Admins can view email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 12. MICROSOFT 365 INTEGRATION POLICIES
-- ============================================================================

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

-- ============================================================================
-- 13. XERO SETTINGS POLICIES
-- ============================================================================

-- Admins can manage xero settings
CREATE POLICY "Admins can manage xero settings"
  ON xero_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 14. STORAGE POLICIES FOR RECEIPTS
-- ============================================================================

-- Allow authenticated users to upload receipts to their own folder
CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view their own receipts
CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to view all receipts
CREATE POLICY "Admins can view all receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Allow users to update their own receipts
CREATE POLICY "Users can update own receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own receipts
CREATE POLICY "Users can delete own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- 15. DEFAULT DATA
-- ============================================================================

-- Insert default organization
INSERT INTO organizations (name, is_active)
VALUES ('Default Organization', true)
ON CONFLICT DO NOTHING;

-- Insert default expense categories
INSERT INTO expense_categories (name, description, is_active) VALUES
  ('Travel', 'Transportation and travel expenses', true),
  ('Accommodation', 'Hotel and lodging expenses', true),
  ('Meals', 'Food and beverage expenses', true),
  ('Office Supplies', 'Stationery and office materials', true),
  ('Equipment', 'Tools and equipment purchases', true),
  ('Mileage', 'Vehicle mileage claims', true),
  ('Training', 'Professional development and training', true),
  ('Other', 'Miscellaneous expenses', true)
ON CONFLICT DO NOTHING;

-- Insert default mileage rates
INSERT INTO mileage_rates (vehicle_type, rate_per_mile, effective_from) VALUES
  ('standard', 0.45, CURRENT_DATE),
  ('electric_home', 0.05, CURRENT_DATE),
  ('electric_commercial', 0.08, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Insert example clients
INSERT INTO clients (name, is_active) VALUES
  ('Client A', true),
  ('Client B', true),
  ('Client C', true)
ON CONFLICT DO NOTHING;

-- Insert default email templates
INSERT INTO email_templates (template_type, subject, body) VALUES
(
  'claim_submitted',
  'Expense Claim Submitted - {{claimant_name}}',
  'Dear {{recipient_name}},

A new expense claim has been submitted and requires your review.

Claimant: {{claimant_name}}
Description: {{claim_description}}
Amount: £{{claim_amount}}
Period: {{claim_start_date}} to {{claim_end_date}}

Please log in to the expense management system to review and approve this claim.

Best regards,
Expense Management System'
),
(
  'claim_approved',
  'Your Expense Claim Has Been Approved',
  'Dear {{claimant_name}},

Good news! Your expense claim has been approved.

Description: {{claim_description}}
Amount: £{{claim_amount}}
Period: {{claim_start_date}} to {{claim_end_date}}
Approved by: {{reviewer_name}}

{{review_notes}}

Your claim will be processed for payment shortly.

Best regards,
Expense Management System'
),
(
  'claim_rejected',
  'Your Expense Claim Has Been Rejected',
  'Dear {{claimant_name}},

Your expense claim has been rejected.

Description: {{claim_description}}
Amount: £{{claim_amount}}
Period: {{claim_start_date}} to {{claim_end_date}}
Reviewed by: {{reviewer_name}}

Reason for rejection:
{{review_notes}}

If you have any questions, please contact your approver or administrator.

Best regards,
Expense Management System'
)
ON CONFLICT (template_type) DO NOTHING;
