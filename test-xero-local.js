// Test script for local Xero integration
// Run with: node test-xero-local.js

const { createClient } = require('@supabase/supabase-js');

// Replace with your local Supabase URL and anon key
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testXeroConnection() {
  console.log('🔍 Testing Xero connection...');
  
  try {
    // Check Xero settings
    const { data: xeroSettings, error } = await supabase
      .from('xero_settings')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('❌ Database error:', error);
      return;
    }

    if (!xeroSettings) {
      console.log('⚠️  No Xero settings found. Please configure in the admin panel.');
      return;
    }

    console.log('✅ Xero settings found:');
    console.log('  - Client ID:', xeroSettings.client_id ? '✓ Set' : '❌ Missing');
    console.log('  - Client Secret:', xeroSettings.client_secret ? '✓ Set' : '❌ Missing');
    console.log('  - Tenant ID:', xeroSettings.tenant_id ? '✓ Set' : '❌ Missing');
    console.log('  - Refresh Token:', xeroSettings.refresh_token ? '✓ Set' : '❌ Missing');
    console.log('  - Connected:', xeroSettings.is_connected ? '✅ Yes' : '❌ No');

    if (xeroSettings.client_id && xeroSettings.client_secret && xeroSettings.tenant_id && xeroSettings.refresh_token) {
      console.log('🎉 Xero integration is fully configured!');
    } else {
      console.log('⚠️  Xero integration needs configuration. Missing fields above.');
    }

  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

// Run the test
testXeroConnection();
