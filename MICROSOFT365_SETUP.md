# Microsoft 365 Integration Setup Guide

This guide will walk you through setting up Microsoft 365 (Azure AD) integration for SSO and automatic user synchronization.

## Overview

The Microsoft 365 integration provides:
- **Single Sign-On (SSO)** - Users can sign in with their Microsoft 365 accounts
- **Automatic User Sync** - Users are automatically synced from your Microsoft 365 tenant every 15 minutes
- **Role Mapping** - Azure AD groups can be mapped to application roles (staff, admin, approver)
- **Profile Sync** - User details like name, email, department, and job title are automatically updated

## Prerequisites

- Microsoft 365 tenant with admin access
- Azure AD Premium P1 or higher (for group-based role mapping)
- Global Administrator or Application Administrator role in Azure AD

## Step 1: Register Application in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure the application:
   - **Name**: `Expense Management System` (or your app name)
   - **Supported account types**: Select "Accounts in this organizational directory only"
   - **Redirect URI**:
     - Type: `Web`
     - URL: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
   - Click **Register**

5. Note down the following values (you'll need these):
   - **Application (client) ID**
   - **Directory (tenant) ID**

## Step 2: Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Select **Application permissions** (not Delegated)
5. Add the following permissions:
   - `User.Read.All` - Read all users' full profiles
   - `Group.Read.All` - Read all groups
   - `Directory.Read.All` - Read directory data

6. Click **Add permissions**
7. Click **Grant admin consent** (requires admin privileges)
8. Confirm the consent

## Step 3: Create Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description: `Expense Management Sync`
4. Select expiration: `24 months` (or according to your security policy)
5. Click **Add**
6. **IMPORTANT**: Copy the secret **Value** immediately (it won't be shown again)

## Step 4: Enable Azure Provider in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Azure** in the provider list
5. Enable the Azure provider
6. Configure:
   - **Azure Tenant ID**: Enter your Directory (tenant) ID from Step 1
   - **Azure Client ID**: Enter your Application (client) ID from Step 1
   - **Azure Client Secret**: Enter the secret value from Step 3
7. Click **Save**

## Step 5: Configure Microsoft 365 in Application

1. Sign in to your application as an admin
2. Navigate to **Settings** > **Microsoft 365** tab
3. Enter the configuration:
   - **Azure Tenant ID**: Your Directory (tenant) ID
   - **Application (Client) ID**: Your Application (client) ID
   - **Client Secret**: The secret value from Step 3
   - **Sync Frequency**: 15 minutes (recommended)
   - **Enable automatic user synchronization**: Check this box
4. Click **Save Configuration**
5. Click **Sync Now** to test the connection

## Step 6: Configure Group-Based Role Mapping (Optional)

If you want to automatically assign roles based on Azure AD group membership:

1. Create security groups in Azure AD:
   - `ExpenseManagement-Admins` - For admin users
   - `ExpenseManagement-Approvers` - For expense approvers
   - `ExpenseManagement-Staff` - For regular staff users

2. Add users to the appropriate groups

3. In your application, go to **Settings** > **Microsoft 365**
4. For each group, note the Group Object ID from Azure AD
5. Create mappings in the application database or UI (when implemented)

## Testing the Integration

### Test SSO Login

1. Sign out of the application
2. On the login page, click **Sign in with Microsoft**
3. You should be redirected to Microsoft login
4. Sign in with a user from your tenant
5. You should be redirected back and logged in

### Test User Sync

1. As an admin, go to **Settings** > **Microsoft 365**
2. Click **Sync Now**
3. Wait for the sync to complete
4. Check the sync log for results:
   - Number of users created
   - Number of users updated
   - Any errors

### Verify Automatic Sync

1. The sync will run automatically every 15 minutes (or your configured frequency)
2. Check the **Recent Sync History** section to see automatic syncs
3. Add a new user in Azure AD and wait 15 minutes - they should appear automatically

## Troubleshooting

### "Failed to get access token"
- Verify that the Tenant ID, Client ID, and Client Secret are correct
- Ensure the client secret hasn't expired
- Check that admin consent was granted for API permissions

### "Failed to fetch users"
- Verify API permissions are granted and admin consent given
- Check that `User.Read.All` permission is present
- Ensure the application has Application-type permissions (not Delegated)

### Users not syncing
- Check the sync log for errors
- Verify that users in Azure AD have the `accountEnabled` flag set to true
- Ensure users have email addresses in Azure AD
- Check that sync is enabled in the configuration

### SSO not working
- Verify the redirect URI in Azure matches exactly: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
- Check that the Azure provider is enabled in Supabase
- Ensure the Tenant ID, Client ID, and Secret are correctly configured in Supabase

### Role mapping not working
- Verify that users are members of the Azure AD groups
- Check that group mappings are correctly configured
- Ensure `Group.Read.All` permission is granted

## Security Best Practices

1. **Rotate client secrets regularly** - Set a reminder to rotate secrets before they expire
2. **Use least privilege** - Only grant the minimum required API permissions
3. **Monitor sync logs** - Regularly review sync logs for anomalies
4. **Audit group memberships** - Regularly review who has admin/approver access
5. **Enable MFA** - Require multi-factor authentication in Azure AD
6. **Review access regularly** - Conduct periodic access reviews

## Scheduled Sync Setup

The user sync runs automatically based on the configured frequency. For advanced scenarios:

### Manual Trigger via API

You can trigger a sync manually using the Edge Function:

```bash
curl -X POST "https://YOUR_PROJECT_ID.supabase.co/functions/v1/microsoft-user-sync" \\
  -H "Authorization: Bearer YOUR_ANON_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"organization_id": "your-org-id", "sync_type": "manual"}'
```

### Monitoring Sync Status

Check the sync status programmatically:

```sql
SELECT * FROM user_sync_log
WHERE organization_id = 'your-org-id'
ORDER BY started_at DESC
LIMIT 10;
```

## Cost Considerations

- **Azure AD**: Free tier supports basic directory features
- **API Calls**: Microsoft Graph API calls are free within rate limits
- **Supabase Edge Functions**: Included in Supabase plans (2M invocations/month on Pro)

## Support

For issues or questions:
1. Check the sync logs in the application
2. Review the troubleshooting section above
3. Check Azure AD audit logs for authentication issues
4. Contact support with sync log details if problems persist

## Next Steps

- Configure group-based role mappings
- Set up conditional access policies in Azure AD
- Enable MFA for all users
- Configure device compliance policies
- Set up monitoring and alerting for failed syncs
