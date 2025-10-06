# Xero Connection - Step-by-Step Debugging Guide

## Current Status

✅ Client ID is configured: `50D3D853C0B44CF78608F60FC0F2A06E`
❌ Not connected (no tenant_id or refresh_token)
❌ Connection status: `is_connected: false`

## Complete Step-by-Step Setup and Debug Process

### Step 1: Verify Your Current Browser URL

1. Open your application in the browser
2. Look at the address bar
3. Copy the FULL URL (e.g., `https://abc123xyz.bolt.new`)
4. **This is your base URL** - you'll need it for the redirect URI

Example:
```
If your browser shows: https://stackblitz-xyz-123.bolt.new
Then your redirect URI should be: https://stackblitz-xyz-123.bolt.new/admin/xero-callback
```

### Step 2: Configure Xero Developer App

1. Go to [Xero Developer Portal](https://developer.xero.com/app/manage)
2. Select your app (or create a new one)
3. Click the **Configuration** tab
4. Scroll to **OAuth 2.0 redirect URIs**

**CRITICAL: Add Your Redirect URI**
```
https://YOUR-ACTUAL-URL.bolt.new/admin/xero-callback
```

5. **CRITICAL: Configure Scopes**
   - Make sure these scopes are selected:
     - ✅ `accounting.transactions` (for expense data)
     - ✅ `accounting.contacts.read` (for contact information)
     - ✅ `accounting.settings` (for account codes)
     - ✅ `offline_access` (REQUIRED for refresh token)

6. Click **Save**

7. Copy your **Client ID** and **Client Secret**

### Step 3: Configure Application Settings

1. Sign in to your application as an admin
2. Navigate to **Settings** → **Xero Integration** tab
3. Fill in the fields:

**Redirect URI:**
```
https://YOUR-ACTUAL-URL.bolt.new/admin/xero-callback
```
(Must match EXACTLY what you added in Step 2)

**Client ID:**
```
Paste from Xero Developer Portal
```

**Client Secret:**
```
Paste from Xero Developer Portal
```

4. Click **Save Settings**
5. The page should reload

### Step 4: Authorize with Xero

1. After saving settings, click the **Authorize with Xero** button
2. You should be redirected to Xero's login page
3. Sign in with your Xero account
4. **Select the Xero organization** you want to connect
5. Click **Allow access**
6. You should be redirected back to your app with a success message

### Step 5: Verify Connection

1. Check that the connection status shows "Connected" (green checkmark)
2. Verify that the Tenant ID field now shows a value
3. Try the **Test Connection** button

## Common Issues and Solutions

### Issue 1: "Redirect URI Mismatch" Error

**Symptoms:**
- Error message from Xero: "redirect_uri_mismatch"
- Redirected back to Xero without authorization

**Solution:**
1. Check browser console (F12) for the exact redirect URI being used
2. Compare with what's configured in Xero Developer Portal
3. They must match EXACTLY (including https://, path, no trailing slash)
4. Update the Redirect URI field in your app settings to match exactly
5. Save settings and try again

**Debug Command:**
```javascript
// Run in browser console
console.log('Current URL:', window.location.origin);
console.log('Expected redirect URI:', window.location.origin + '/admin/xero-callback');
```

### Issue 2: "No Refresh Token Received"

**Symptoms:**
- Successfully authorized but connection shows as "Not Connected"
- Error message: "No refresh token received from Xero"
- Red warning box about missing refresh token

**Solution:**
1. Go to Xero Developer Portal
2. Click your app → Configuration
3. Scroll to **Scopes**
4. **CRITICAL:** Ensure `offline_access` scope is checked
5. Save the app configuration
6. Try authorizing again

### Issue 3: "Invalid State Parameter"

**Symptoms:**
- Error: "Invalid state parameter"
- Authorization fails during callback

**Solution:**
1. This is a security check - the state parameter must match
2. Clear your browser's session storage:
   ```javascript
   // Run in browser console
   sessionStorage.clear();
   ```
3. Refresh the page
4. Try authorizing again
5. Make sure you don't have multiple tabs/windows trying to authorize

### Issue 4: Callback Page Shows Loading Forever

**Symptoms:**
- After clicking "Allow" in Xero, redirected to callback page
- Page shows "Connecting to Xero" spinner indefinitely
- No success or error message

**Debug Steps:**

1. **Check Browser Console (F12 → Console tab)**
   Look for:
   - "XeroCallback component mounted" message
   - Any error messages in red
   - Network requests to the edge function

2. **Check Network Tab (F12 → Network tab)**
   - Filter by "xero-oauth-callback"
   - Check if the request was made
   - Look at the response
   - Status should be 200

3. **Check URL Parameters**
   ```javascript
   // Run in browser console
   const params = new URLSearchParams(window.location.search);
   console.log('Code:', params.get('code'));
   console.log('State:', params.get('state'));
   console.log('Error:', params.get('error'));
   ```

4. **Manual Edge Function Test**
   ```javascript
   // Run in browser console after getting redirected back
   const params = new URLSearchParams(window.location.search);
   const code = params.get('code');
   const redirectUri = sessionStorage.getItem('xero_redirect_uri');

   console.log('Testing edge function with:', {
     code: code?.substring(0, 10),
     redirect_uri: redirectUri
   });
   ```

### Issue 5: "Failed to Exchange Authorization Code"

**Symptoms:**
- Error message about token exchange failing
- 400 or 401 error from Xero

**Solution:**

1. **Verify Client Credentials**
   - Double-check Client ID and Client Secret in app settings
   - Ensure no extra spaces or characters
   - Regenerate Client Secret in Xero if needed

2. **Check Authorization Code**
   - Authorization codes expire after 30 seconds
   - If debugging takes too long, get a new code by authorizing again

3. **Verify Redirect URI Match**
   - The redirect URI used in authorization must EXACTLY match
   - The one sent in token exchange
   - Check session storage for saved redirect URI

### Issue 6: Edge Function Errors

**Symptoms:**
- 500 error from edge function
- "Failed to save tokens" error

**Debug Steps:**

1. **Check Supabase Dashboard**
   - Go to Supabase Dashboard → Edge Functions
   - Click on `xero-oauth-callback` function
   - Check logs for errors

2. **Check Database Access**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT * FROM xero_settings LIMIT 1;
   ```

3. **Verify Environment Variables**
   - Edge function needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - These are automatically configured in Supabase

## Testing the Connection Step-by-Step

### Test 1: Save Settings
```
Expected: Settings saved successfully, page reloads
Result: ✅/❌
```

### Test 2: Click Authorize with Xero
```
Expected: Redirected to Xero login page
Result: ✅/❌
```

### Test 3: Xero Authorization
```
Expected: See Xero organization selection page
Result: ✅/❌
```

### Test 4: Return to App
```
Expected: Redirected to /admin/xero-callback with success message
Result: ✅/❌
```

### Test 5: Connection Status
```
Expected: Status shows "Connected" with green checkmark
Result: ✅/❌
```

### Test 6: Tenant ID Saved
```sql
-- Check in Supabase SQL Editor
SELECT tenant_id, is_connected FROM xero_settings;
```
```
Expected: tenant_id has a value, is_connected = true
Result: ✅/❌
```

## Advanced Debugging

### Check Full OAuth Flow

1. **Authorization URL Construction**
```javascript
// Check what URL is being constructed
// Look in Network tab for redirect to identity.xero.com
// Should include:
// - client_id
// - redirect_uri
// - scope (including offline_access)
// - state
// - response_type=code
```

2. **State Parameter**
```javascript
// Before clicking Authorize
const state = sessionStorage.getItem('xero_oauth_state');
console.log('Saved state:', state);

// After being redirected back
const params = new URLSearchParams(window.location.search);
console.log('Returned state:', params.get('state'));
// These should match!
```

3. **Token Exchange**
```javascript
// Check the edge function logs
// Should see:
// - "Received authorization code"
// - "Exchanging authorization code for tokens..."
// - "Token data received"
// - "Fetching Xero connections..."
// - "Successfully saved Xero credentials"
```

### Manual Token Exchange Test

If automated flow fails, test the edge function directly:

```bash
# Replace with your actual values
curl -X POST "https://YOUR-PROJECT.supabase.co/functions/v1/xero-oauth-callback" \
  -H "Authorization: Bearer YOUR-ANON-KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "YOUR-AUTH-CODE",
    "redirect_uri": "https://your-app.bolt.new/admin/xero-callback"
  }'
```

## Checklist Before Requesting Help

Before asking for help, verify:

- [ ] Redirect URI in app settings matches EXACTLY what's in Xero Developer Portal
- [ ] Browser URL is correct and accessible
- [ ] Client ID and Client Secret are correct
- [ ] `offline_access` scope is enabled in Xero app
- [ ] Browser console shows no JavaScript errors
- [ ] Network tab shows edge function request completed
- [ ] Session storage is not cleared between steps
- [ ] You're using the same browser window throughout the flow
- [ ] Tried in incognito mode to rule out extension conflicts

## Database Schema Reference

```sql
-- Xero settings table structure
CREATE TABLE xero_settings (
  id uuid PRIMARY KEY,
  client_id text,           -- From Xero Developer Portal
  client_secret text,       -- From Xero Developer Portal
  tenant_id text,           -- Populated after successful auth
  access_token text,        -- Short-lived token (not stored)
  refresh_token text,       -- Long-lived token for getting new access tokens
  token_expires_at timestamptz,
  is_connected boolean,     -- Should be true after successful connection
  created_at timestamptz,
  updated_at timestamptz
);
```

## Quick Status Check

Run these queries to check current status:

```sql
-- Check configuration
SELECT
  id,
  client_id,
  CASE WHEN client_secret IS NOT NULL AND client_secret != '' THEN 'Set' ELSE 'Not Set' END as client_secret_status,
  tenant_id,
  CASE WHEN refresh_token IS NOT NULL AND refresh_token != '' THEN 'Set' ELSE 'Not Set' END as refresh_token_status,
  is_connected,
  updated_at
FROM xero_settings;

-- Expected after successful connection:
-- client_id: Your actual client ID
-- client_secret_status: 'Set'
-- tenant_id: UUID from Xero
-- refresh_token_status: 'Set'
-- is_connected: true
```

## Success Criteria

You know the connection is successful when:

1. ✅ Settings page shows "Connected" with green checkmark
2. ✅ Tenant ID field shows a UUID value
3. ✅ Test Connection button shows success message
4. ✅ Database query shows `is_connected = true` and refresh_token is set
5. ✅ You can sync expenses to Xero without errors

## Next Steps After Successful Connection

Once connected:

1. Test syncing a sample expense to Xero
2. Verify it appears in Xero correctly
3. Check account code mappings in Categories settings
4. Set up automatic sync schedule if needed
5. Train users on the expense submission process

## Support Resources

- Xero API Documentation: https://developer.xero.com/documentation/
- Xero OAuth 2.0 Guide: https://developer.xero.com/documentation/guides/oauth2/auth-flow/
- Supabase Edge Functions: https://supabase.com/docs/guides/functions

## Common Error Messages Decoded

| Error Message | Meaning | Solution |
|--------------|---------|----------|
| "redirect_uri_mismatch" | Redirect URI doesn't match | Update Xero app config or app settings |
| "invalid_grant" | Authorization code expired or invalid | Try authorizing again |
| "invalid_client" | Client ID or Secret wrong | Verify credentials in Xero portal |
| "No refresh token received" | offline_access scope missing | Add scope in Xero app config |
| "Invalid state parameter" | Security check failed | Clear session storage, try again |
| "No active session" | Not logged in | Log in to app first |

---

**Remember:** The most common issue is redirect URI mismatch. Double-check this first!
