# Microsoft 365 Integration - Quick Start Guide

## Overview
Your expense management application now supports Microsoft 365 SSO and automatic user synchronization.

## Quick Setup (5 Minutes)

### 1. Azure Portal Setup
```
1. Go to portal.azure.com
2. Azure Active Directory → App registrations → New registration
3. Name: "Expense Management"
4. Redirect URI: https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
5. Copy: Application (client) ID and Directory (tenant) ID
6. API Permissions → Add Microsoft Graph (Application):
   - User.Read.All
   - Group.Read.All
   - Directory.Read.All
7. Grant admin consent
8. Certificates & secrets → New client secret → Copy the value
```

### 2. Supabase Configuration
```
1. Supabase Dashboard → Authentication → Providers
2. Enable Azure provider
3. Enter: Tenant ID, Client ID, Client Secret
4. Save
```

### 3. Application Configuration
```
1. Sign in to your app as admin
2. Navigate to: Settings → Microsoft 365 tab
3. Enter the same values:
   - Azure Tenant ID
   - Application (Client) ID
   - Client Secret
4. Set sync frequency: 15 minutes
5. Enable automatic synchronization: ✓
6. Click "Save Configuration"
7. Click "Sync Now" to test
```

## What Happens Next

### For End Users:
- Users see "Sign in with Microsoft" button on login page
- Click button → Microsoft login → Automatically signed in
- Profile syncs automatically with Microsoft 365 data

### For Admins:
- New users added to Microsoft 365 appear automatically within 15 minutes
- User updates (name, email, department) sync automatically
- Users removed from Microsoft 365 are deactivated automatically
- Sync history visible in Settings → Microsoft 365

## Key Features

✅ Single Sign-On with Microsoft 365
✅ Automatic user provisioning every 15 minutes
✅ Profile synchronization (name, email, department, job title)
✅ Role assignment based on Azure AD groups
✅ User deactivation when removed from Microsoft 365
✅ Comprehensive sync logging and monitoring

## Testing

1. **Test SSO**: Click "Sign in with Microsoft" and verify login works
2. **Test Sync**: Add a new user in Azure AD, wait 15 minutes, verify they appear
3. **Check Logs**: View sync history in Settings → Microsoft 365

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't sign in with Microsoft | Check redirect URI matches exactly in Azure |
| Sync fails | Verify API permissions granted with admin consent |
| Users not appearing | Ensure users are enabled in Azure AD and have email |
| Wrong roles assigned | Configure group mappings in database |

## Support Resources

- **Full Setup Guide**: See `MICROSOFT365_SETUP.md`
- **Implementation Details**: See `IMPLEMENTATION_SUMMARY.md`
- **Microsoft Docs**: https://learn.microsoft.com/en-us/graph/
- **Supabase Docs**: https://supabase.com/docs/guides/auth/social-login/auth-azure

## Next Steps

1. ✅ Complete the 3-step setup above
2. Configure Azure AD security groups for role mapping
3. Test with a few users before rolling out company-wide
4. Enable MFA in Azure AD for enhanced security
5. Set up monitoring for sync failures

## Important Notes

- **Client Secret Expiration**: Set a reminder to rotate before it expires
- **Admin Consent**: Required for API permissions to work
- **Sync Frequency**: Default 15 minutes, configurable 5-1440 minutes
- **User Deactivation**: Users are deactivated (not deleted) when removed from Microsoft 365
- **Data Isolation**: All data is isolated per organization via RLS policies

## Cost

- Azure AD: Free (with basic features)
- Microsoft Graph API: Free (within rate limits)
- Supabase Edge Functions: Included in plan (2M invocations/month)

**Total Additional Cost: $0** 🎉

---

Need help? Check the full documentation in `MICROSOFT365_SETUP.md`
