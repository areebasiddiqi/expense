import { createClient } from 'npm:@supabase/supabase-js@2';

interface MicrosoftUser {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
  accountEnabled: boolean;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

class MicrosoftGraphClient {
  private baseUrl = 'https://graph.microsoft.com/v1.0';
  private tokenUrl = 'https://login.microsoftonline.com';

  async getAccessToken(
    tenantId: string,
    clientId: string,
    clientSecret: string
  ): Promise<TokenResponse> {
    const url = `${this.tokenUrl}/${tenantId}/oauth2/v2.0/token`;

    const body = new URLSearchParams();
    body.append('grant_type', 'client_credentials');
    body.append('scope', 'https://graph.microsoft.com/.default');
    body.append('client_id', clientId);
    body.append('client_secret', clientSecret);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get access token: ${error}`);
    }

    return response.json();
  }

  async getAllUsers(accessToken: string): Promise<MicrosoftUser[]> {
    let allUsers: MicrosoftUser[] = [];
    let nextLink: string | undefined = `${this.baseUrl}/users?$select=id,displayName,mail,userPrincipalName,jobTitle,department,accountEnabled`;

    do {
      const response = await fetch(nextLink, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to fetch users: ${error}`);
      }

      const data = await response.json();
      allUsers = allUsers.concat(data.value || []);
      nextLink = data['@odata.nextLink'];
    } while (nextLink);

    return allUsers;
  }

  async getUserGroups(accessToken: string, userId: string): Promise<Array<{ id: string; displayName: string }>> {
    const response = await fetch(
      `${this.baseUrl}/users/${userId}/memberOf?$select=id,displayName`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.value || [];
  }
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

    const { organization_id, sync_type = 'manual' } = await req.json();

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: 'organization_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const logEntry = await supabase
      .from('user_sync_log')
      .insert({
        organization_id,
        sync_type,
        status: 'running',
        users_created: 0,
        users_updated: 0,
        users_deactivated: 0,
      })
      .select()
      .single();

    if (logEntry.error) {
      throw new Error(`Failed to create sync log: ${logEntry.error.message}`);
    }

    const { data: config, error: configError } = await supabase
      .from('microsoft_tenant_config')
      .select('*')
      .eq('organization_id', organization_id)
      .eq('is_enabled', true)
      .single();

    if (configError || !config) {
      await supabase
        .from('user_sync_log')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          errors: [{ message: 'Microsoft tenant configuration not found or disabled' }],
        })
        .eq('id', logEntry.data.id);

      return new Response(
        JSON.stringify({ error: 'Microsoft tenant configuration not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const graphClient = new MicrosoftGraphClient();
    const errors: Array<{ message: string }> = [];
    let usersCreated = 0;
    let usersUpdated = 0;
    let usersDeactivated = 0;

    const tokenResponse = await graphClient.getAccessToken(
      config.tenant_id,
      config.client_id,
      config.client_secret
    );

    await supabase
      .from('microsoft_tenant_config')
      .update({
        access_token: tokenResponse.access_token,
        token_expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', config.id);

    const microsoftUsers = await graphClient.getAllUsers(tokenResponse.access_token);

    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('id, email, microsoft_user_id')
      .eq('organization_id', organization_id);

    const existingMap = new Map(
      existingProfiles?.map(p => [p.microsoft_user_id, p]) || []
    );

    const { data: groupMappings } = await supabase
      .from('azure_group_mappings')
      .select('*')
      .eq('organization_id', organization_id)
      .eq('is_active', true);

    for (const msUser of microsoftUsers) {
      try {
        const email = msUser.mail || msUser.userPrincipalName;
        const existingProfile = existingMap.get(msUser.id);

        if (!msUser.accountEnabled) {
          if (existingProfile) {
            usersDeactivated++;
          }
          continue;
        }

        let role: 'staff' | 'admin' = 'staff';

        if (groupMappings && groupMappings.length > 0) {
          try {
            const userGroups = await graphClient.getUserGroups(tokenResponse.access_token, msUser.id);
            const userGroupIds = userGroups.map(g => g.id);

            const matchingMapping = groupMappings.find(mapping =>
              userGroupIds.includes(mapping.azure_group_id)
            );

            if (matchingMapping && (matchingMapping.application_role === 'admin' || matchingMapping.application_role === 'staff')) {
              role = matchingMapping.application_role;
            }
          } catch (err) {
            console.error(`Error fetching groups for user ${msUser.id}:`, err);
          }
        }

        const profileData = {
          email,
          full_name: msUser.displayName,
          microsoft_user_id: msUser.id,
          azure_upn: msUser.userPrincipalName,
          sync_source: 'microsoft',
          is_synced_user: true,
          department: msUser.department || null,
          job_title: msUser.jobTitle || null,
          last_synced_at: new Date().toISOString(),
          organization_id: organization_id,
          role,
        };

        if (existingProfile) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update(profileData)
            .eq('id', existingProfile.id);

          if (updateError) {
            errors.push({ message: `Failed to update user ${msUser.displayName}: ${updateError.message}` });
          } else {
            usersUpdated++;
          }
        } else {
          usersCreated++;
        }
      } catch (err) {
        const error = err as Error;
        errors.push({ message: `Error processing user ${msUser.displayName}: ${error.message}` });
      }
    }

    await supabase
      .from('microsoft_tenant_config')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_status: errors.length > 0 ? 'failed' : 'active',
      })
      .eq('id', config.id);

    await supabase
      .from('user_sync_log')
      .update({
        status: errors.length > 0 ? 'partial' : 'success',
        completed_at: new Date().toISOString(),
        users_created: usersCreated,
        users_updated: usersUpdated,
        users_deactivated: usersDeactivated,
        errors: errors.length > 0 ? errors : null,
      })
      .eq('id', logEntry.data.id);

    return new Response(
      JSON.stringify({
        success: true,
        usersCreated,
        usersUpdated,
        usersDeactivated,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    const error = err as Error;
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
