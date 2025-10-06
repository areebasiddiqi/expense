// Fix OAuth Flow Script
// Run in browser console to restart the OAuth process

async function fixOAuthFlow() {
  console.log('🔧 Fixing OAuth flow...');
  
  try {
    // Clear any existing session storage
    console.log('1. Clearing session storage...');
    sessionStorage.clear();
    
    // Check current Xero settings
    console.log('2. Checking Xero settings...');
    const { data: settings } = await supabase
      .from('xero_settings')
      .select('*')
      .maybeSingle();
    
    if (!settings || !settings.client_id || !settings.client_secret) {
      console.error('❌ Xero settings not configured. Please fill in Client ID and Secret first.');
      console.log('Go to Settings → Xero Integration and enter your credentials.');
      return;
    }
    
    console.log('✅ Xero settings found');
    console.log('   - Client ID:', settings.client_id ? 'Set' : 'Missing');
    console.log('   - Client Secret:', settings.client_secret ? 'Set' : 'Missing');
    
    // Clear any existing tokens to force re-auth
    console.log('3. Clearing existing tokens...');
    await supabase
      .from('xero_settings')
      .update({
        refresh_token: null,
        tenant_id: null,
        is_connected: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', settings.id);
    
    console.log('✅ OAuth flow reset complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Go to Settings → Xero Integration');
    console.log('2. Make sure Client ID and Secret are filled');
    console.log('3. Make sure Redirect URI is: http://localhost:5173/admin/xero-callback');
    console.log('4. Click "Authorize with Xero"');
    console.log('5. Complete the authorization quickly (within 30 seconds)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Check authorization code expiry
function checkAuthCodeExpiry() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  
  if (code) {
    console.log('⚠️ Authorization code found in URL');
    console.log('Authorization codes expire after 30 seconds and can only be used once.');
    console.log('If you see "invalid_grant" error, the code has expired.');
    console.log('Run fixOAuthFlow() to start fresh.');
  } else {
    console.log('No authorization code in current URL');
  }
}

console.log(`
🔧 OAUTH FLOW FIXER
===================

The "invalid_grant" error means:
- Authorization code expired (30 second limit)
- Code was already used
- Code is invalid

Run: fixOAuthFlow() to restart the process
Run: checkAuthCodeExpiry() to check current URL
`);

// Auto-check if we're on callback page
if (window.location.pathname === '/admin/xero-callback') {
  checkAuthCodeExpiry();
}
