import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmailRequest {
  template_type: 'claim_submitted' | 'claim_approved' | 'claim_rejected';
  claim_id: string;
  recipient_email: string;
  recipient_name?: string;
  reviewer_name?: string;
  review_notes?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const emailRequest: EmailRequest = await req.json();
    const { template_type, claim_id, recipient_email, recipient_name, reviewer_name, review_notes } = emailRequest;

    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, body')
      .eq('template_type', template_type)
      .maybeSingle();

    if (templateError || !template) {
      throw new Error(`Template not found: ${template_type}`);
    }

    const { data: claim, error: claimError } = await supabase
      .from('expense_claims')
      .select(`
        *,
        expenses(amount)
      `)
      .eq('id', claim_id)
      .maybeSingle();

    if (claimError || !claim) {
      throw new Error('Claim not found');
    }

    const claimAmount = (claim.expenses || []).reduce(
      (sum: number, exp: { amount: number }) => sum + Number(exp.amount),
      0
    );

    const placeholders: Record<string, string> = {
      '{{claimant_name}}': claim.claimant_name || '',
      '{{claim_description}}': claim.description || '',
      '{{claim_amount}}': claimAmount.toFixed(2),
      '{{claim_start_date}}': new Date(claim.start_date).toLocaleDateString(),
      '{{claim_end_date}}': new Date(claim.end_date).toLocaleDateString(),
      '{{claim_status}}': claim.status || '',
      '{{recipient_name}}': recipient_name || 'there',
      '{{reviewer_name}}': reviewer_name || '',
      '{{review_notes}}': review_notes || '',
    };

    let subject = template.subject;
    let body = template.body;

    for (const [placeholder, value] of Object.entries(placeholders)) {
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      body = body.replace(new RegExp(placeholder, 'g'), value);
    }

    console.log('Email would be sent to:', recipient_email);
    console.log('Subject:', subject);
    console.log('Body:', body);

    const { error: logError } = await supabase.from('email_logs').insert({
      recipient_email,
      template_type,
      subject,
      body,
      claim_id,
      status: 'sent',
    });

    if (logError) {
      console.error('Error logging email:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email notification logged successfully',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error sending email notification:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
