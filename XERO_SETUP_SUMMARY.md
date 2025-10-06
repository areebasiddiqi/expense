# Xero Connection - Setup Summary

## What You Have

Your expense management application is already set up with:
- ✅ Xero OAuth 2.0 integration code
- ✅ Edge function for token exchange
- ✅ Callback page for handling authorization
- ✅ Settings UI for configuration
- ✅ Database table for storing credentials

**Current Status:**
- Client ID is configured in database
- Not yet connected (missing tenant_id and refresh_token)
- Ready to complete authorization flow

## What You Need to Do

### Quick Version (5 Steps)

1. **Get your app's URL** from browser address bar
2. **Configure Xero Developer app** with redirect URI
3. **Enable `offline_access` scope** in Xero app (CRITICAL!)
4. **Enter credentials** in app Settings
5. **Click "Authorize with Xero"** and allow access

### Detailed Version

#### Current Configuration
```
Client ID: 50D3D853C0B44CF78608F60FC0F2A06E (Already set ✓)
Client Secret: [Need to get from Xero]
Tenant ID: [Will be set automatically after authorization]
Refresh Token: [Will be set automatically after authorization]
```

## The Authorization Flow

```
[Your App] → [Xero Login] → [Allow Access] → [Callback] → [Connected!]
     ↓              ↓              ↓              ↓              ↓
  Start Flow   User Signs In   User Consents  Token Exchange  Success
```

### Detailed Flow:

1. **User Clicks "Authorize with Xero"**
   - App saves state in session storage
   - Redirects to Xero authorization URL
   - URL includes: client_id, redirect_uri, scopes, state

2. **Xero Authorization Page**
   - User signs in (if not already)
   - User selects organization
   - User clicks "Allow access"
   - Xero redirects back with authorization code

3. **Callback Page**
   - Validates state parameter (security check)
   - Extracts authorization code from URL
   - Calls edge function with code

4. **Edge Function**
   - Exchanges authorization code for tokens
   - Gets access token and refresh token
   - Fetches connected organizations
   - Saves tenant_id and refresh_token to database

5. **Success!**
   - User redirected back to Settings
   - Connection status shows "Connected"
   - Ready to sync expenses

## Configuration Reference

### Xero Developer Portal Settings

**OAuth 2.0 Redirect URIs:**
```
https://YOUR-APP-URL.bolt.new/admin/xero-callback
```

**OAuth 2.0 Scopes (Must Include):**
- ✅ `offline_access` (Required for refresh token)
- ✅ `accounting.transactions` (For expense data)
- ✅ `accounting.contacts` (For contact information)
- ✅ `accounting.settings` (For account codes)

### Application Settings

**Location:** Settings → Xero Integration

**Required Fields:**
1. Redirect URI: `https://YOUR-APP-URL.bolt.new/admin/xero-callback`
2. Client ID: From Xero Developer Portal
3. Client Secret: From Xero Developer Portal

## Troubleshooting Decision Tree

```
Start Here
    ↓
Can't click "Authorize"?
    ├─ No → Is redirect URI filled in? → Fill it and save
    └─ Yes → Click button
        ↓
Redirected to Xero?
    ├─ No → Check console errors
    └─ Yes → Sign in and allow
        ↓
Redirected back to app?
    ├─ No → Check redirect URI matches exactly
    └─ Yes → See loading spinner?
        ↓
        ├─ No → Check for error message
        └─ Yes → Does it finish?
            ↓
            ├─ No → Check browser console (F12)
            └─ Yes → See success message?
                ↓
                ├─ No → See error details
                └─ Yes → Connected! ✅
```

## Files Involved

### Frontend:
- `/src/components/admin/Settings.tsx` - Settings UI with authorization button
- `/src/components/admin/XeroCallback.tsx` - Handles callback after Xero redirect
- `/src/App.tsx` - Routes callback page

### Backend:
- `/supabase/functions/xero-oauth-callback/index.ts` - Exchanges code for tokens
- `/supabase/functions/sync-to-xero/index.ts` - Syncs expenses to Xero

### Database:
- `xero_settings` table - Stores configuration and tokens

## Key URLs

**Xero Developer Portal:**
https://developer.xero.com/app/manage

**Xero Authorization Endpoint:**
https://login.xero.com/identity/connect/authorize

**Xero Token Exchange:**
https://identity.xero.com/connect/token

**Xero API:**
https://api.xero.com/

## Security Notes

### What We Store:
- ✅ Client ID (public identifier)
- ✅ Client Secret (encrypted in database)
- ✅ Refresh Token (long-lived, encrypted)
- ✅ Tenant ID (Xero organization identifier)
- ❌ Access Token (short-lived, not stored - regenerated as needed)

### Security Measures:
- State parameter prevents CSRF attacks
- Tokens stored encrypted in database
- Row Level Security policies on xero_settings table
- Only admins can view/modify settings
- Session storage cleared after successful authorization

## Testing Your Connection

### After Connection:

1. **Visual Check:**
   - Settings page shows "Connected" (green)
   - Tenant ID field has a value

2. **Test Connection Button:**
   - Click "Test Connection"
   - Should see success alert

3. **Database Check:**
   ```sql
   SELECT
     client_id,
     tenant_id,
     is_connected,
     CASE WHEN refresh_token IS NOT NULL THEN 'Set' ELSE 'Not Set' END as token_status
   FROM xero_settings;
   ```
   Expected: tenant_id has value, is_connected = true, token_status = 'Set'

4. **Real Sync Test:**
   - Create a test expense
   - Try syncing to Xero
   - Check Xero to confirm it appears

## Common Errors Explained

| Error | Cause | Fix |
|-------|-------|-----|
| "redirect_uri_mismatch" | URI doesn't match Xero config | Update Xero app or app settings |
| "invalid_grant" | Code expired or used twice | Get new code (authorize again) |
| "invalid_client" | Wrong Client ID or Secret | Verify credentials in Xero |
| "No refresh token received" | Missing offline_access scope | Add scope in Xero app |
| "Invalid state parameter" | Security check failed | Clear session storage, try again |
| "Failed to exchange code" | Various token exchange issues | Check edge function logs |

## Success Metrics

After successful setup, you should be able to:

✅ See "Connected" status in Settings
✅ Test connection successfully
✅ Sync expenses to Xero
✅ View synced expenses in Xero
✅ Connection persists after logout/login
✅ Refresh token automatically refreshes access

## Next Steps After Connection

1. **Configure Category Mappings**
   - Map expense categories to Xero account codes
   - Settings → Categories

2. **Test Expense Sync**
   - Create sample expense
   - Submit and approve it
   - Sync to Xero
   - Verify in Xero

3. **Train Users**
   - How to create expense claims
   - How to attach receipts
   - Approval process
   - Sync timing

4. **Monitor Sync Queue**
   - Check sync logs regularly
   - Handle any failed syncs
   - Review sync patterns

## Support Resources

### Documentation:
- `XERO_QUICK_FIX.md` - Fast fixes for common issues
- `XERO_DEBUG_GUIDE.md` - Detailed debugging steps
- `XERO_DEBUGGING_CHECKLIST.md` - Interactive checklist

### External Resources:
- Xero API Docs: https://developer.xero.com/documentation/
- OAuth 2.0 Guide: https://developer.xero.com/documentation/guides/oauth2/
- Xero Developer Forum: https://central.xero.com/s/topic/0TO1N000000MeKzWAK/

### Tools:
- Browser Console (F12) - Check for errors
- Network Tab (F12) - Monitor API calls
- Supabase Dashboard - Check edge function logs
- Supabase SQL Editor - Check database state

## Maintenance

### Regular Tasks:
- Monitor sync success rate
- Handle failed syncs promptly
- Review expense data in Xero
- Keep Xero account codes updated
- Update category mappings as needed

### When Things Break:
- Check connection status first
- Test connection to verify credentials
- Check edge function logs
- Review recent Xero API changes
- Verify account codes still exist

### Token Refresh:
- Refresh tokens are long-lived (typically 60 days)
- App automatically refreshes access tokens as needed
- If refresh token expires, need to re-authorize
- Monitor for authorization errors

---

**Quick Start: See `XERO_QUICK_FIX.md` for the 5-minute setup!**

**Having Issues? See `XERO_DEBUGGING_CHECKLIST.md` for step-by-step troubleshooting!**
