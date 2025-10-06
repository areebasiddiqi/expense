import { supabase } from './supabase';

export interface MicrosoftUser {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
  accountEnabled: boolean;
}

export interface MicrosoftGroup {
  id: string;
  displayName: string;
  description?: string;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

export class MicrosoftGraphClient {
  private baseUrl = 'https://graph.microsoft.com/v1.0';
  private tokenUrl = 'https://login.microsoftonline.com';

  async getAccessToken(
    tenantId: string,
    clientId: string,
    clientSecret: string,
    refreshToken?: string
  ): Promise<TokenResponse> {
    const url = `${this.tokenUrl}/${tenantId}/oauth2/v2.0/token`;

    const body = new URLSearchParams();
    if (refreshToken) {
      body.append('grant_type', 'refresh_token');
      body.append('refresh_token', refreshToken);
    } else {
      body.append('grant_type', 'client_credentials');
      body.append('scope', 'https://graph.microsoft.com/.default');
    }
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

  async getUsers(accessToken: string, deltaLink?: string): Promise<{
    users: MicrosoftUser[];
    deltaLink?: string;
    nextLink?: string;
  }> {
    const url = deltaLink || `${this.baseUrl}/users/delta?$select=id,displayName,mail,userPrincipalName,jobTitle,department,accountEnabled`;

    const response = await fetch(url, {
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

    return {
      users: data.value || [],
      deltaLink: data['@odata.deltaLink'],
      nextLink: data['@odata.nextLink'],
    };
  }

  async getAllUsers(accessToken: string): Promise<MicrosoftUser[]> {
    let allUsers: MicrosoftUser[] = [];
    let nextLink: string | undefined;

    do {
      const result = await this.getUsers(accessToken, nextLink);
      allUsers = allUsers.concat(result.users);
      nextLink = result.nextLink;
    } while (nextLink);

    return allUsers;
  }

  async getUser(accessToken: string, userId: string): Promise<MicrosoftUser> {
    const response = await fetch(
      `${this.baseUrl}/users/${userId}?$select=id,displayName,mail,userPrincipalName,jobTitle,department,accountEnabled`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch user: ${error}`);
    }

    return response.json();
  }

  async getUserGroups(accessToken: string, userId: string): Promise<MicrosoftGroup[]> {
    const response = await fetch(
      `${this.baseUrl}/users/${userId}/memberOf?$select=id,displayName,description`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch user groups: ${error}`);
    }

    const data = await response.json();
    return data.value || [];
  }

  async getGroups(accessToken: string): Promise<MicrosoftGroup[]> {
    const response = await fetch(
      `${this.baseUrl}/groups?$select=id,displayName,description`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch groups: ${error}`);
    }

    const data = await response.json();
    return data.value || [];
  }

  async getGroupMembers(accessToken: string, groupId: string): Promise<MicrosoftUser[]> {
    const response = await fetch(
      `${this.baseUrl}/groups/${groupId}/members?$select=id,displayName,mail,userPrincipalName,jobTitle,department,accountEnabled`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch group members: ${error}`);
    }

    const data = await response.json();
    return data.value || [];
  }
}

export async function syncUsersFromMicrosoft(organizationId: string): Promise<{
  success: boolean;
  usersCreated: number;
  usersUpdated: number;
  usersDeactivated: number;
  errors: string[];
}> {
  const graphClient = new MicrosoftGraphClient();
  const errors: string[] = [];
  let usersCreated = 0;
  let usersUpdated = 0;
  let usersDeactivated = 0;

  try {
    const { data: config, error: configError } = await supabase
      .from('microsoft_tenant_config')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_enabled', true)
      .maybeSingle();

    if (configError || !config) {
      throw new Error('Microsoft tenant configuration not found');
    }

    const tokenResponse = await graphClient.getAccessToken(
      config.tenant_id,
      config.client_id,
      config.client_secret,
      config.refresh_token || undefined
    );

    if (tokenResponse.refresh_token) {
      await supabase
        .from('microsoft_tenant_config')
        .update({
          access_token: tokenResponse.access_token,
          refresh_token: tokenResponse.refresh_token,
          token_expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);
    }

    const microsoftUsers = await graphClient.getAllUsers(tokenResponse.access_token);

    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', organizationId);

    const existingMap = new Map(
      existingProfiles?.map(p => [p.microsoft_user_id, p]) || []
    );

    const { data: groupMappings } = await supabase
      .from('azure_group_mappings')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    for (const msUser of microsoftUsers) {
      try {
        const email = msUser.mail || msUser.userPrincipalName;
        const existingProfile = existingMap.get(msUser.id);

        if (!msUser.accountEnabled && existingProfile) {
          usersDeactivated++;
          continue;
        }

        if (!msUser.accountEnabled) {
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

            if (matchingMapping) {
              role = matchingMapping.application_role as 'staff' | 'admin';
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
          sync_source: 'microsoft' as const,
          is_synced_user: true,
          department: msUser.department || null,
          job_title: msUser.jobTitle || null,
          last_synced_at: new Date().toISOString(),
          organization_id: organizationId,
          role,
        };

        if (existingProfile) {
          await supabase
            .from('profiles')
            .update(profileData)
            .eq('id', existingProfile.id);
          usersUpdated++;
        } else {
          usersCreated++;
        }
      } catch (err) {
        const error = err as Error;
        errors.push(`Error processing user ${msUser.displayName}: ${error.message}`);
      }
    }

    await supabase
      .from('microsoft_tenant_config')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_status: errors.length > 0 ? 'partial' : 'active',
      })
      .eq('id', config.id);

    return {
      success: true,
      usersCreated,
      usersUpdated,
      usersDeactivated,
      errors,
    };
  } catch (err) {
    const error = err as Error;
    errors.push(error.message);
    return {
      success: false,
      usersCreated,
      usersUpdated,
      usersDeactivated,
      errors,
    };
  }
}

export const microsoftGraphClient = new MicrosoftGraphClient();
