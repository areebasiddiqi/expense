/*
  # Email Notification Triggers

  1. Functions
    - `trigger_claim_submitted_email()` - Sends email when claim status changes to 'submitted'
    - `trigger_claim_approved_email()` - Sends email when claim is approved
    - `trigger_claim_rejected_email()` - Sends email when claim is rejected

  2. Triggers
    - Automatically sends emails on status changes
    - Identifies appropriate recipients (approvers or admins)

  3. Notes
    - Uses Supabase Edge Function for email sending
    - Emails sent to claimant and approver/admin based on action
*/

CREATE OR REPLACE FUNCTION trigger_claim_submitted_email()
RETURNS TRIGGER AS $$
DECLARE
  claim_user_email text;
  claim_user_name text;
  approver_email text;
  approver_name text;
  admin_email text;
  admin_name text;
BEGIN
  IF NEW.status = 'submitted' AND OLD.status = 'draft' THEN
    SELECT email, full_name INTO claim_user_email, claim_user_name
    FROM auth.users
    JOIN profiles ON profiles.id = auth.users.id
    WHERE auth.users.id = NEW.user_id;

    SELECT email, full_name INTO approver_email, approver_name
    FROM auth.users
    JOIN profiles ON profiles.id = auth.users.id
    WHERE profiles.id = NEW.approver_id
    LIMIT 1;

    IF approver_email IS NULL THEN
      SELECT email, full_name INTO admin_email, admin_name
      FROM auth.users
      JOIN profiles ON profiles.id = auth.users.id
      WHERE profiles.role = 'admin'
      LIMIT 1;
      
      approver_email := admin_email;
      approver_name := admin_name;
    END IF;

    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-email-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'template_type', 'claim_submitted',
        'claim_id', NEW.id,
        'recipient_email', claim_user_email,
        'recipient_name', claim_user_name
      )
    );

    IF approver_email IS NOT NULL THEN
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-email-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'template_type', 'claim_submitted',
          'claim_id', NEW.id,
          'recipient_email', approver_email,
          'recipient_name', approver_name
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_claim_approved_email()
RETURNS TRIGGER AS $$
DECLARE
  claim_user_email text;
  claim_user_name text;
  reviewer_name text;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    SELECT email, full_name INTO claim_user_email, claim_user_name
    FROM auth.users
    JOIN profiles ON profiles.id = auth.users.id
    WHERE auth.users.id = NEW.user_id;

    SELECT full_name INTO reviewer_name
    FROM profiles
    WHERE profiles.id = NEW.reviewed_by;

    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-email-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'template_type', 'claim_approved',
        'claim_id', NEW.id,
        'recipient_email', claim_user_email,
        'recipient_name', claim_user_name,
        'reviewer_name', COALESCE(reviewer_name, 'Administrator'),
        'review_notes', COALESCE(NEW.review_notes, '')
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_claim_rejected_email()
RETURNS TRIGGER AS $$
DECLARE
  claim_user_email text;
  claim_user_name text;
  reviewer_name text;
BEGIN
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    SELECT email, full_name INTO claim_user_email, claim_user_name
    FROM auth.users
    JOIN profiles ON profiles.id = auth.users.id
    WHERE auth.users.id = NEW.user_id;

    SELECT full_name INTO reviewer_name
    FROM profiles
    WHERE profiles.id = NEW.reviewed_by;

    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-email-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'template_type', 'claim_rejected',
        'claim_id', NEW.id,
        'recipient_email', claim_user_email,
        'recipient_name', claim_user_name,
        'reviewer_name', COALESCE(reviewer_name, 'Administrator'),
        'review_notes', COALESCE(NEW.review_notes, 'No reason provided')
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_claim_submitted ON expense_claims;
CREATE TRIGGER on_claim_submitted
  AFTER UPDATE ON expense_claims
  FOR EACH ROW
  EXECUTE FUNCTION trigger_claim_submitted_email();

DROP TRIGGER IF EXISTS on_claim_approved ON expense_claims;
CREATE TRIGGER on_claim_approved
  AFTER UPDATE ON expense_claims
  FOR EACH ROW
  EXECUTE FUNCTION trigger_claim_approved_email();

DROP TRIGGER IF EXISTS on_claim_rejected ON expense_claims;
CREATE TRIGGER on_claim_rejected
  AFTER UPDATE ON expense_claims
  FOR EACH ROW
  EXECUTE FUNCTION trigger_claim_rejected_email();
