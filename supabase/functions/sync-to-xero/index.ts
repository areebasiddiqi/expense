import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface XeroLineItem {
  Description: string;
  Quantity: number;
  UnitAmount: number;
  AccountCode: string;
  TaxType: string;
}

interface XeroBill {
  Type: 'ACCPAY';
  Contact: {
    Name: string;
  };
  Date: string;
  DueDate: string;
  LineItems: XeroLineItem[];
  Reference: string;
  Status: 'DRAFT';
  CurrencyCode?: string;
}

interface XeroTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
}

async function getXeroAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const tokenUrl = 'https://identity.xero.com/connect/token';
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Xero access token: ${errorText}`);
  }

  const data: XeroTokenResponse = await response.json();
  return data.access_token;
}

async function createXeroBill(
  accessToken: string,
  tenantId: string,
  bill: XeroBill
): Promise<string> {
  const response = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'xero-tenant-id': tenantId,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ Invoices: [bill] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Xero bill: ${errorText}`);
  }

  const data = await response.json();
  
  if (data.Invoices && data.Invoices.length > 0) {
    return data.Invoices[0].InvoiceID;
  }

  throw new Error('No invoice ID returned from Xero');
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

    const { claim_ids, test_connection } = await req.json();

    const { data: xeroSettings } = await supabase
      .from('xero_settings')
      .select('*')
      .maybeSingle();

    if (!xeroSettings || !xeroSettings.client_id || !xeroSettings.client_secret || !xeroSettings.refresh_token || !xeroSettings.tenant_id) {
      throw new Error('Xero integration not fully configured. Please ensure Client ID, Client Secret, Refresh Token, and Tenant ID are set.');
    }

    let accessToken: string;
    try {
      accessToken = await getXeroAccessToken(
        xeroSettings.client_id,
        xeroSettings.client_secret,
        xeroSettings.refresh_token
      );
    } catch (error) {
      throw new Error(`Failed to authenticate with Xero: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    if (test_connection) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Successfully authenticated with Xero',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (!claim_ids || !Array.isArray(claim_ids) || claim_ids.length === 0) {
      throw new Error('No claim IDs provided');
    }

    const results = [];

    for (const claimId of claim_ids) {
      try {
        const { data: claim, error: claimError } = await supabase
          .from('expense_claims')
          .select(`
            *,
            expenses(
              id,
              title,
              description,
              amount,
              vat_amount,
              category:expense_categories(name, xero_account_code)
            )
          `)
          .eq('id', claimId)
          .maybeSingle();

        if (claimError || !claim) {
          throw new Error(`Claim ${claimId} not found`);
        }

        if (claim.status !== 'approved') {
          throw new Error(`Claim ${claimId} is not approved`);
        }

        const lineItems: XeroLineItem[] = (claim.expenses || []).map((expense: any) => ({
          Description: `${expense.title || 'Expense'}${expense.description ? ' - ' + expense.description : ''}`,
          Quantity: 1,
          UnitAmount: Number(expense.amount) + Number(expense.vat_amount || 0),
          AccountCode: expense.category?.xero_account_code || '400',
          TaxType: expense.vat_amount > 0 ? 'INPUT2' : 'NONE', // UK tax codes for GBP
        }));

        if (lineItems.length === 0) {
          throw new Error(`Claim ${claimId} has no expenses`);
        }

        const xeroBill: XeroBill = {
          Type: 'ACCPAY',
          Contact: {
            Name: claim.claimant_name || 'Unknown',
          },
          Date: new Date(claim.start_date).toISOString().split('T')[0],
          DueDate: new Date(claim.end_date).toISOString().split('T')[0],
          LineItems: lineItems,
          Reference: `Claim-${claim.id.substring(0, 8)}`,
          Status: 'DRAFT',
          CurrencyCode: 'GBP', // Force GBP currency
        };

        const xeroBillId = await createXeroBill(
          accessToken,
          xeroSettings.tenant_id,
          xeroBill
        );

        await supabase
          .from('expense_claims')
          .update({
            xero_sync_status: 'synced',
            xero_bill_id: xeroBillId,
            xero_synced_at: new Date().toISOString(),
            xero_sync_error: null,
          })
          .eq('id', claimId);

        results.push({
          claim_id: claimId,
          success: true,
          xero_bill_id: xeroBillId,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        await supabase
          .from('expense_claims')
          .update({
            xero_sync_status: 'failed',
            xero_sync_error: errorMessage,
          })
          .eq('id', claimId);

        results.push({
          claim_id: claimId,
          success: false,
          error: errorMessage,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error syncing to Xero:', error);

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
