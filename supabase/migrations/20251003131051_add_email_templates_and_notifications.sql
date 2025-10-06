/*
  # Email Templates and Notifications System

  1. New Tables
    - `email_templates`
      - `id` (uuid, primary key)
      - `template_type` (text) - Type of email: 'claim_submitted', 'claim_approved', 'claim_rejected'
      - `subject` (text) - Email subject line with placeholder support
      - `body` (text) - Email body with placeholder support
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `email_logs`
      - `id` (uuid, primary key)
      - `recipient_email` (text)
      - `template_type` (text)
      - `subject` (text)
      - `body` (text)
      - `claim_id` (uuid, foreign key)
      - `sent_at` (timestamptz)
      - `status` (text) - 'sent', 'failed'
      - `error_message` (text, nullable)

  2. Available Placeholders
    - {{claimant_name}} - Name of the person who submitted the claim
    - {{claim_description}} - Description of the claim
    - {{claim_amount}} - Total amount of the claim
    - {{claim_start_date}} - Start date of the claim period
    - {{claim_end_date}} - End date of the claim period
    - {{claim_status}} - Current status of the claim
    - {{reviewer_name}} - Name of the person who reviewed (for approval/rejection)
    - {{review_notes}} - Notes from the reviewer

  3. Security
    - Enable RLS on both tables
    - Only admins can manage email templates
    - Email logs readable by admins only

  4. Default Templates
    - Creates default templates for all three email types
*/

CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text UNIQUE NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Admins can insert email templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update email templates"
  ON email_templates FOR UPDATE
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

CREATE POLICY "Admins can delete email templates"
  ON email_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

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
