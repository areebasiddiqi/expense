# Debugging Documentation Index

## Quick Access Guide

Choose the right document based on your needs:

### 🚀 I Need to Set Up Xero (First Time)
**Start here:** `XERO_QUICK_FIX.md`
- 5-minute setup guide
- Step-by-step with no fluff
- Visual and easy to follow

### 🔧 Something's Not Working
**Start here:** `XERO_DEBUGGING_CHECKLIST.md`
- Interactive checklist
- Check boxes as you go
- Covers every step of the process
- Decision trees for common issues

### 📚 I Want Detailed Explanations
**Start here:** `XERO_DEBUG_GUIDE.md`
- Complete technical documentation
- Every error explained
- Advanced debugging techniques
- Code examples and SQL queries

### 📊 I Want an Overview
**Start here:** `XERO_SETUP_SUMMARY.md`
- High-level architecture
- Flow diagrams
- What files are involved
- Success metrics

### 🆕 I Need to Set Up Microsoft 365
**Start here:** `MICROSOFT365_SETUP.md`
- Complete Azure AD integration guide
- SSO setup instructions
- User sync configuration

**Quick reference:** `QUICK_START.md`
- 5-minute Microsoft 365 setup
- Essential steps only

**Technical details:** `IMPLEMENTATION_SUMMARY.md`
- What was implemented
- Architecture overview
- Technical specifications

---

## Documents by Topic

### Xero Integration

| Document | Purpose | When to Use |
|----------|---------|-------------|
| `XERO_QUICK_FIX.md` | Fast setup & common fixes | First time setup or quick troubleshooting |
| `XERO_DEBUGGING_CHECKLIST.md` | Step-by-step interactive guide | Systematic debugging |
| `XERO_DEBUG_GUIDE.md` | Complete technical reference | Deep dive into issues |
| `XERO_SETUP_SUMMARY.md` | Overview and architecture | Understanding the system |

### Microsoft 365 Integration

| Document | Purpose | When to Use |
|----------|---------|-------------|
| `QUICK_START.md` | 5-minute setup | Quick start |
| `MICROSOFT365_SETUP.md` | Complete setup guide | First time setup |
| `IMPLEMENTATION_SUMMARY.md` | Technical implementation details | Understanding what was built |

---

## Decision Tree: Which Document Do I Need?

```
START HERE
    ↓
What are you trying to do?
    ↓
    ├─ Set up Xero for the FIRST TIME
    │   └─→ Read: XERO_QUICK_FIX.md (5 min)
    │
    ├─ Xero NOT WORKING
    │   ├─ Quick fix needed?
    │   │   └─→ Read: XERO_QUICK_FIX.md (2 min)
    │   └─ Systematic debugging?
    │       └─→ Read: XERO_DEBUGGING_CHECKLIST.md (15 min)
    │
    ├─ Understand HOW Xero works
    │   └─→ Read: XERO_SETUP_SUMMARY.md (10 min)
    │
    ├─ Deep technical issues with Xero
    │   └─→ Read: XERO_DEBUG_GUIDE.md (30 min)
    │
    ├─ Set up Microsoft 365 FIRST TIME
    │   └─→ Read: QUICK_START.md then MICROSOFT365_SETUP.md
    │
    └─ Understand Microsoft 365 implementation
        └─→ Read: IMPLEMENTATION_SUMMARY.md
```

---

## Common Scenarios

### Scenario 1: Brand New Setup
1. Read `XERO_QUICK_FIX.md` (5 minutes)
2. Follow the 5-step process
3. If stuck, use `XERO_DEBUGGING_CHECKLIST.md`

### Scenario 2: "It Was Working, Now It's Not"
1. Read "Common Issues" in `XERO_QUICK_FIX.md`
2. Check connection status in Settings
3. Try "Test Connection"
4. If fails, use `XERO_DEBUGGING_CHECKLIST.md`

### Scenario 3: "redirect_uri_mismatch" Error
1. Go to `XERO_QUICK_FIX.md` → Issue #1
2. Follow the fix (2 minutes)
3. Done!

### Scenario 4: "No refresh token received" Error
1. Go to `XERO_QUICK_FIX.md` → Issue #2
2. Enable `offline_access` scope
3. Try again

### Scenario 5: Complete Confusion
1. Start with `XERO_SETUP_SUMMARY.md`
2. Understand the big picture
3. Then use `XERO_DEBUGGING_CHECKLIST.md`
4. Go through each step systematically

---

## Quick Reference: Most Common Fixes

### Fix #1: Redirect URI Mismatch
```
1. Copy browser URL from address bar
2. Add "/admin/xero-callback" to end
3. Make sure this EXACT URL is in:
   - Xero Developer Portal
   - App Settings → Redirect URI field
4. Save both places
5. Try again
```

### Fix #2: Missing offline_access Scope
```
1. Go to developer.xero.com/app/manage
2. Your app → Configuration
3. Scroll to OAuth 2.0 scopes
4. Check: offline_access
5. Save
6. Try authorizing again
```

### Fix #3: Clear Everything and Start Over
```javascript
// Run in browser console (F12)
sessionStorage.clear();
localStorage.clear();
location.reload();
```

---

## Documents by Skill Level

### Beginner (Just Getting Started)
1. `XERO_QUICK_FIX.md` - Simple, visual, step-by-step
2. `QUICK_START.md` - Microsoft 365 quick start

### Intermediate (Know the Basics)
1. `XERO_DEBUGGING_CHECKLIST.md` - Systematic approach
2. `XERO_SETUP_SUMMARY.md` - Architecture overview
3. `MICROSOFT365_SETUP.md` - Complete M365 guide

### Advanced (Technical Details)
1. `XERO_DEBUG_GUIDE.md` - Deep technical reference
2. `IMPLEMENTATION_SUMMARY.md` - Implementation architecture
3. Edge function code in `supabase/functions/`

---

## Getting Help

### Before Asking for Help, Have This Ready:

1. **Which document did you follow?**
2. **Which step failed?**
3. **Error messages** (from browser console)
4. **Network tab** responses
5. **Database query** results (from checklist)
6. **Screenshots** of error pages

### Information to Gather:

Run these queries and copy results:

```sql
-- Xero configuration status
SELECT
  id,
  client_id,
  tenant_id,
  is_connected,
  CASE WHEN refresh_token IS NOT NULL THEN 'Set' ELSE 'Not Set' END as token_status
FROM xero_settings;
```

```sql
-- Microsoft 365 configuration status
SELECT
  organization_id,
  tenant_id,
  is_enabled,
  sync_status,
  last_sync_at
FROM microsoft_tenant_config;
```

---

## Document Updates

These documents were created: October 3, 2025

If you find issues or have suggestions:
1. Note the document name
2. Note the specific section
3. Describe what was unclear
4. Document can be updated

---

## Quick Navigation

**Xero:**
- Setup: `XERO_QUICK_FIX.md`
- Debug: `XERO_DEBUGGING_CHECKLIST.md`
- Reference: `XERO_DEBUG_GUIDE.md`
- Overview: `XERO_SETUP_SUMMARY.md`

**Microsoft 365:**
- Setup: `QUICK_START.md` & `MICROSOFT365_SETUP.md`
- Reference: `IMPLEMENTATION_SUMMARY.md`

**This Document:**
- `DEBUGGING_INDEX.md` (you are here)

---

**Remember: 90% of Xero issues are redirect URI mismatch or missing offline_access scope!**

**Start with the Quick Fix documents - they solve most problems in under 5 minutes!**
