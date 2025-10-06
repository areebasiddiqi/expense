# Xero Connection - Quick Fix Guide

## The 3 Most Common Issues (and How to Fix Them)

### Issue #1: "redirect_uri_mismatch" ⚠️ MOST COMMON

**What you see:**
- Error from Xero saying redirect URI doesn't match
- Can't complete authorization

**The Fix (2 minutes):**

1. Look at your browser's address bar right now
2. Copy the FULL URL (example: `https://abc123xyz.bolt.new`)
3. Add `/admin/xero-callback` to the end
4. Go to https://developer.xero.com/app/manage
5. Click your app → Configuration
6. In "OAuth 2.0 redirect URIs", make sure EXACTLY this is listed:
   ```
   https://abc123xyz.bolt.new/admin/xero-callback
   ```
7. Save in Xero
8. Back in your app Settings, paste the SAME URL in "Redirect URI" field
9. Save settings
10. Try "Authorize with Xero" again

**Pro Tip:** The URLs must match EXACTLY - including `https://`, no trailing slash, same domain.

---

### Issue #2: "No refresh token received" 🔴 CRITICAL

**What you see:**
- Successfully authorized with Xero
- But connection still shows "Not Connected"
- Red warning box about missing refresh token

**The Fix (1 minute):**

1. Go to https://developer.xero.com/app/manage
2. Click your app → Configuration
3. Scroll down to "OAuth 2.0 scopes"
4. ✅ **CHECK THE BOX FOR:** `offline_access`
5. Click Save
6. Go back to your app
7. Click "Authorize with Xero" again
8. Should work now!

**Why this happens:** Without `offline_access` scope, Xero won't give you a refresh token, which is needed to stay connected.

---

### Issue #3: Callback Page Stuck on Loading

**What you see:**
- Click "Allow" in Xero
- Redirected back to app
- See "Connecting to Xero..." spinner
- Never finishes

**The Fix (30 seconds):**

1. Press F12 to open browser console
2. Look for red error messages
3. Most common fixes:

**If you see "Invalid state parameter":**
```javascript
// Run this in console:
sessionStorage.clear();
// Then refresh page and try again
```

**If you see "No active session":**
- You got logged out
- Sign in again
- Try authorizing again

**If you see "Failed to exchange authorization code":**
- Code expired (they expire in 30 seconds)
- Just click "Authorize with Xero" again

---

## The 5-Minute Setup (If Starting Fresh)

**Step 1: Get Your URL (30 seconds)**
- Look at browser address bar
- Example: `https://abc123.bolt.new`
- Your redirect URI: `https://abc123.bolt.new/admin/xero-callback`

**Step 2: Configure Xero (2 minutes)**
- Go to https://developer.xero.com/app/manage
- Your app → Configuration
- Add redirect URI: `https://abc123.bolt.new/admin/xero-callback`
- Enable scopes:
  - ✅ `offline_access`
  - ✅ `accounting.transactions`
  - ✅ `accounting.contacts`
- Click Save
- Copy: Client ID and Client Secret

**Step 3: Configure App (1 minute)**
- Settings → Xero Integration
- Paste: Redirect URI, Client ID, Client Secret
- Click "Save Settings"

**Step 4: Authorize (1 minute)**
- Click "Authorize with Xero"
- Sign in to Xero
- Select organization
- Click "Allow"
- Should see success message

**Step 5: Verify (30 seconds)**
- Should see "Connected" status with green checkmark
- Click "Test Connection"
- Should get success message

**Done! 🎉**

---

## Quick Debug Commands

Run these in browser console (F12) when things aren't working:

### Check Current Configuration
```javascript
// What URL is the app using?
console.log('App URL:', window.location.origin);
console.log('Redirect URI:', window.location.origin + '/admin/xero-callback');
```

### Check Saved State (Before Authorization)
```javascript
// Is state saved properly?
console.log('Saved state:', sessionStorage.getItem('xero_oauth_state'));
console.log('Saved redirect URI:', sessionStorage.getItem('xero_redirect_uri'));
```

### Check Callback (After Xero Redirects Back)
```javascript
// Did we get the authorization code?
const params = new URLSearchParams(window.location.search);
console.log('Code:', params.get('code') ? 'Yes' : 'No');
console.log('State:', params.get('state') ? 'Yes' : 'No');
console.log('Error:', params.get('error'));
```

### Force Clear Everything and Start Over
```javascript
// Nuclear option - clears all saved data
sessionStorage.clear();
localStorage.clear();
location.reload();
```

---

## Quick Checklist

Before asking for help, verify:

- [ ] Redirect URI matches in both Xero and app settings
- [ ] `offline_access` scope is enabled in Xero
- [ ] Client ID and Client Secret are correct
- [ ] You saved settings in the app before authorizing
- [ ] You're using the same browser window throughout
- [ ] No JavaScript errors in console (F12)

---

## Still Not Working?

### Check These in Order:

1. **Browser Console (F12)**
   - Any red error messages?
   - Copy them

2. **Network Tab (F12)**
   - Filter: "xero"
   - Look at "xero-oauth-callback" request
   - Status should be 200
   - If not, check response

3. **Database Check**
   - Go to Supabase → SQL Editor
   - Run: `SELECT * FROM xero_settings;`
   - Check if `refresh_token` has a value

4. **Edge Function Logs**
   - Go to Supabase → Edge Functions
   - Click "xero-oauth-callback"
   - Check logs for errors

---

## Success Indicators

You know it's working when you see ALL of these:

✅ "Connected" status with green checkmark
✅ Tenant ID field has a value
✅ Test Connection succeeds
✅ No errors in browser console
✅ Database shows refresh_token is set

---

## Emergency Reset

If completely stuck, reset everything:

1. **Clear Browser:**
```javascript
sessionStorage.clear();
localStorage.clear();
```

2. **Reset Database:**
```sql
-- Run in Supabase SQL Editor
UPDATE xero_settings
SET
  tenant_id = '',
  refresh_token = NULL,
  is_connected = false
WHERE id = 'your-settings-id';
```

3. **Start Over:**
- Refresh the page
- Enter credentials again
- Follow 5-minute setup above

---

## One-Liner Fixes

**Problem: redirect_uri_mismatch**
→ Make redirect URI match EXACTLY in both Xero and app

**Problem: No refresh token**
→ Enable `offline_access` scope in Xero app

**Problem: Invalid state**
→ Run `sessionStorage.clear()` and try again

**Problem: Authorization code expired**
→ Just click "Authorize with Xero" again

**Problem: Not logged in**
→ Sign in, then authorize

**Problem: Callback stuck**
→ Check F12 console for errors

---

For complete step-by-step instructions, see:
- `XERO_DEBUG_GUIDE.md` - Detailed explanations
- `XERO_DEBUGGING_CHECKLIST.md` - Interactive checklist

---

**Remember: 90% of issues are redirect URI mismatch or missing offline_access scope!**
