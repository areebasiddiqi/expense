# Xero Connection - Interactive Debugging Checklist

Use this checklist to debug your Xero connection step-by-step. Check each box as you complete it.

## Pre-Flight Check

- [ ] I am logged into the application as an admin
- [ ] I can access Settings → Xero Integration tab
- [ ] I have access to Xero Developer Portal
- [ ] I have admin access to a Xero organization

## Phase 1: Get Your Current URL

**Task:** Identify your application's actual URL

- [ ] Open application in browser
- [ ] Look at address bar
- [ ] Write down FULL URL: `_________________________________`
- [ ] Expected format: `https://something.bolt.new`

**Your Redirect URI will be:**
```
[Your URL from above]/admin/xero-callback
```

Example: If URL is `https://abc123.bolt.new`, then redirect URI is `https://abc123.bolt.new/admin/xero-callback`

My Redirect URI: `_________________________________`

## Phase 2: Configure Xero Developer App

- [ ] Go to https://developer.xero.com/app/manage
- [ ] Sign in with Xero account
- [ ] Select your app (or click "New app" if none exists)

### If Creating New App:
- [ ] Click "New app"
- [ ] App name: `Expense Management`
- [ ] Company/application URL: (your app URL)
- [ ] Click "Create app"

### Configure App Settings:
- [ ] Click "Configuration" tab
- [ ] Scroll to "OAuth 2.0 redirect URIs"
- [ ] Click "Add redirect URI"
- [ ] Paste your redirect URI: `[Your URL]/admin/xero-callback`
- [ ] Verify no typos, extra spaces, or trailing slashes

### Configure Scopes (CRITICAL):
- [ ] Scroll to "OAuth 2.0 scopes"
- [ ] Check: `offline_access` ⚠️ MUST BE CHECKED
- [ ] Check: `accounting.transactions`
- [ ] Check: `accounting.contacts`
- [ ] Check: `accounting.settings`
- [ ] Click "Save" at bottom of page

### Get Credentials:
- [ ] Copy Client ID: `_________________________________`
- [ ] Click "Generate a secret"
- [ ] Copy Client Secret immediately: `_________________________________`
- [ ] ⚠️ Secret shown only once - save it now!

## Phase 3: Configure Application Settings

- [ ] Go to application → Settings → Xero Integration
- [ ] Paste Redirect URI: `_________________________________`
- [ ] Paste Client ID: `_________________________________`
- [ ] Paste Client Secret: `_________________________________`
- [ ] Click "Save Settings"
- [ ] Page should reload
- [ ] Settings should still be filled in after reload

### Verify Settings Saved:
- [ ] Open browser console (F12)
- [ ] Run this command:
```javascript
// This should show your configuration
fetch('/api/xero/settings').then(r => r.json()).then(console.log);
```

## Phase 4: Authorize with Xero

### Before Clicking Authorize:
- [ ] All three fields above are filled in
- [ ] Settings have been saved
- [ ] You're logged into Xero in another tab (recommended)

### Click "Authorize with Xero" Button:

**Expected:** Redirected to Xero authorization page

- [ ] I was redirected to `login.xero.com`
- [ ] I see "Authorize [Your App Name]" page
- [ ] I see the correct scopes listed

**If NOT redirected:**
- [ ] Check browser console for errors (F12)
- [ ] Check that redirect URI is filled in
- [ ] Check that Client ID is filled in
- [ ] Try refreshing the page and clicking again

### On Xero Authorization Page:

- [ ] Sign in to Xero (if not already)
- [ ] Select the correct Xero organization from dropdown
- [ ] Click "Allow access" or "Authorise"

**Expected:** Redirected back to your app at `/admin/xero-callback`

## Phase 5: Callback Processing

### After Clicking "Allow" in Xero:

**Expected:** See loading spinner with "Connecting to Xero"

- [ ] I see the callback page with spinner
- [ ] URL contains `?code=` parameter
- [ ] URL contains `&state=` parameter

**If seeing error immediately:**
- [ ] Check what error message says
- [ ] Common: "Invalid state parameter"
  - Solution: Clear session storage, try again
- [ ] Common: "No authorization code received"
  - Solution: Check Xero redirect URI configuration

### Check Browser Console:

- [ ] Open console (F12 → Console)
- [ ] Should see: "XeroCallback component mounted!"
- [ ] Should see: "Xero callback params: {code: '...', state: '...'}"
- [ ] Should see: "Calling edge function: ..."

**Copy any error messages here:**
```
Error: _________________________________________
```

### Check Network Tab:

- [ ] F12 → Network tab
- [ ] Filter by: "xero-oauth-callback"
- [ ] Should see POST request to edge function
- [ ] Status should be: 200
- [ ] Response should contain: `{"success": true}`

**If status is NOT 200:**
- [ ] Click on the request
- [ ] Go to "Response" tab
- [ ] Copy error message: `_________________________________`

## Phase 6: Verify Success

### Expected After Successful Callback:

- [ ] Success message: "Successfully connected to Xero!"
- [ ] Green checkmark icon
- [ ] Auto-redirect back to Settings after 2 seconds

### Back on Settings Page:

- [ ] Connection status shows: "Connected" (green)
- [ ] Tenant ID field shows a UUID value
- [ ] "Test Connection" button is available
- [ ] "Authorize with Xero" button is hidden

### Click "Test Connection":

- [ ] Button shows loading spinner
- [ ] After a few seconds, get success alert
- [ ] Connection status remains "Connected"

**If test fails:**
- [ ] Note error message: `_________________________________`
- [ ] Check that refresh token was saved in database

## Phase 7: Database Verification

### Run These Queries in Supabase SQL Editor:

```sql
-- Check current configuration
SELECT
  id,
  client_id,
  CASE
    WHEN client_secret IS NOT NULL AND client_secret != '' THEN 'Set'
    ELSE 'Not Set'
  END as client_secret_status,
  tenant_id,
  CASE
    WHEN refresh_token IS NOT NULL AND refresh_token != '' THEN 'Set'
    ELSE 'Not Set'
  END as refresh_token_status,
  is_connected,
  updated_at
FROM xero_settings;
```

### Expected Results:
- [ ] client_id: Shows your actual client ID
- [ ] client_secret_status: "Set"
- [ ] tenant_id: Shows a UUID (not empty)
- [ ] refresh_token_status: "Set" ⚠️ CRITICAL
- [ ] is_connected: true
- [ ] updated_at: Recent timestamp

**Actual Results:**
```
client_id: _________________________________
client_secret_status: _________________________________
tenant_id: _________________________________
refresh_token_status: _________________________________
is_connected: _________________________________
```

## Troubleshooting Decision Tree

### Problem: Not Redirected to Xero
- [ ] Is redirect URI filled in? → Fill it in and save
- [ ] Is Client ID filled in? → Fill it in and save
- [ ] See console errors? → Fix errors and try again

### Problem: "redirect_uri_mismatch" Error from Xero
- [ ] Copy exact redirect URI from error message
- [ ] Compare with Xero Developer Portal configuration
- [ ] Update to match EXACTLY (check for typos, trailing slashes)
- [ ] Save both places
- [ ] Try again

### Problem: "No refresh token received"
- [ ] Go to Xero Developer Portal
- [ ] Configuration → Scopes
- [ ] Is `offline_access` checked? → Check it and save
- [ ] Try authorizing again

### Problem: Callback Page Loading Forever
- [ ] Open browser console (F12)
- [ ] Are there errors? → Note them down
- [ ] Go to Network tab → Check edge function request
- [ ] Status 200? → Check response for errors
- [ ] Status 500? → Check Supabase edge function logs

### Problem: "Connection test failed"
- [ ] Check database: Is refresh_token set?
- [ ] If not set: Authorize again
- [ ] If set: Check edge function logs
- [ ] Check Xero API rate limits

### Problem: Success but Connection Status Still Shows "Not Connected"
- [ ] Refresh the page
- [ ] Check database: Is is_connected true?
- [ ] If false: Run update query:
```sql
UPDATE xero_settings
SET is_connected = true
WHERE tenant_id IS NOT NULL AND refresh_token IS NOT NULL;
```

## Common Issues Summary

| Symptom | Most Likely Cause | Quick Fix |
|---------|------------------|-----------|
| Not redirected to Xero | Missing redirect URI or Client ID | Fill in both fields, save |
| redirect_uri_mismatch | URI doesn't match Xero config | Update Xero app to match exactly |
| No refresh token | offline_access scope not enabled | Enable scope in Xero app |
| Callback stuck loading | Edge function error | Check browser console & network tab |
| Test connection fails | Refresh token not saved | Authorize again with offline_access |
| Already connected | Browser cached old state | Clear browser cache, try again |

## Success Criteria

✅ **You have successfully connected when:**

1. Settings page shows "Connected" status (green checkmark)
2. Tenant ID field has a UUID value
3. Test Connection succeeds
4. Database shows:
   - `tenant_id` has value
   - `refresh_token_status` shows "Set"
   - `is_connected` is true

## If Still Having Issues

### Information to Gather:

1. **Browser Console Errors:**
```
[Paste any red error messages here]
```

2. **Network Tab - Edge Function Response:**
```
[Paste the response from xero-oauth-callback request]
```

3. **Database Status:**
```
[Paste result of SELECT query from Phase 7]
```

4. **Xero Developer Portal Config:**
- Redirect URIs configured: `_________________________________`
- Scopes enabled: `_________________________________`

5. **URL Information:**
- Browser address bar shows: `_________________________________`
- Redirect URI used: `_________________________________`
- Callback URL after Xero redirect: `_________________________________`

### Debug Commands to Run:

```javascript
// In browser console - before authorizing
console.log('Base URL:', window.location.origin);
console.log('Redirect URI:', sessionStorage.getItem('xero_redirect_uri'));

// In browser console - on callback page
const params = new URLSearchParams(window.location.search);
console.log({
  hasCode: !!params.get('code'),
  hasState: !!params.get('state'),
  hasError: !!params.get('error'),
  errorDescription: params.get('error_description')
});
```

## Final Verification Steps

Once you think it's working:

- [ ] Log out and log back in
- [ ] Go to Settings → Xero Integration
- [ ] Status still shows "Connected"
- [ ] Create a test expense
- [ ] Try syncing it to Xero
- [ ] Check Xero to confirm it appears there

**Congratulations! Your Xero integration is working! 🎉**

---

For detailed explanations of each step, see `XERO_DEBUG_GUIDE.md`
