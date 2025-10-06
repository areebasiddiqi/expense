import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface XeroTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token: string;
}

interface XeroConnection {
  id: string;
  tenantId: string;
  tenantType: string;
  tenantName: string;
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

    const { code, redirect_uri } = await req.json();
    console.log('Received authorization code (first 10 chars):', code?.substring(0, 10));
    console.log('Received redirect URI:', redirect_uri);

    if (!code) {
      throw new Error('Authorization code is required');
    }

    if (!redirect_uri) {
      throw new Error('Redirect URI is required');
    }

    const { data: xeroSettings } = await supabase
      .from('xero_settings')
      .select('*')
      .maybeSingle();

    console.log('Xero settings found:', {
      has_client_id: !!xeroSettings?.client_id,
      has_client_secret: !!xeroSettings?.client_secret,
      id: xeroSettings?.id
    });

    if (!xeroSettings || !xeroSettings.client_id || !xeroSettings.client_secret) {
      throw new Error('Xero Client ID and Client Secret must be configured first');
    }

    console.log('Using redirect URI for token exchange:', redirect_uri);

    const tokenUrl = 'https://identity.xero.com/connect/token';
    const credentials = btoa(`${xeroSettings.client_id}:${xeroSettings.client_secret}`);

    console.log('Exchanging authorization code for tokens...');
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error(`Failed to exchange authorization code: ${errorText}`);
    }

    const tokenData: XeroTokenResponse = await tokenResponse.json();
    console.log('Token data received:', {
      has_access_token: !!tokenData.access_token,
      has_refresh_token: !!tokenData.refresh_token,
      expires_in: tokenData.expires_in
    });

    if (!tokenData.refresh_token) {
      throw new Error('No refresh token received from Xero. Make sure offline_access scope is included.');
    }

    console.log('Fetching Xero connections...');
    const connectionsResponse = await fetch('https://api.xero.com/connections', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!connectionsResponse.ok) {
      const errorText = await connectionsResponse.text();
      console.error('Connections fetch failed:', errorText);
      throw new Error('Failed to fetch Xero connections');
    }

    const connections: XeroConnection[] = await connectionsResponse.json();
    console.log('Connections received:', connections.length);

    if (connections.length === 0) {
      throw new Error('No Xero organizations found');
    }

    const tenantId = connections[0].tenantId;
    console.log('Using tenant ID:', tenantId);

    console.log('Updating database...');
    const { error: updateError } = await supabase
      .from('xero_settings')
      .update({
        refresh_token: tokenData.refresh_token,
        tenant_id: tenantId,
        is_connected: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', xeroSettings.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error(`Failed to save tokens: ${updateError.message}`);
    }

    console.log('Successfully saved Xero credentials');

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id: tenantId,
        tenant_name: connections[0].tenantName,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in Xero OAuth callback:', error);

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
