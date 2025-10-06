// Debug script to check Xero settings in database
// Run in browser console or as Node.js script

// If running in browser console:
async function checkXeroSettings() {
  try {
    console.log('🔍 Checking Xero settings in database...');
    
    const { data: settings, error } = await supabase
      .from('xero_settings')
      .select('*');
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log('📊 All Xero settings records:', settings);
    
    if (!settings || settings.length === 0) {
      console.log('⚠️ No Xero settings found in database');
      console.log('💡 Try saving settings in the admin panel first');
      return;
    }
    
    settings.forEach((setting, index) => {
      console.log(`\n📝 Record ${index + 1}:`);
      console.log('  - ID:', setting.id);
      console.log('  - Client ID:', setting.client_id ? '✓ Set (' + setting.client_id.substring(0, 8) + '...)' : '❌ Missing');
      console.log('  - Client Secret:', setting.client_secret ? '✓ Set' : '❌ Missing');
      console.log('  - Tenant ID:', setting.tenant_id ? '✓ Set (' + setting.tenant_id + ')' : '❌ Missing');
      console.log('  - Refresh Token:', setting.refresh_token ? '✓ Set' : '❌ Missing');
      console.log('  - Is Connected:', setting.is_connected ? '✅ Yes' : '❌ No');
      console.log('  - Created:', setting.created_at);
      console.log('  - Updated:', setting.updated_at);
    });
    
    // Check what the Edge Function query would return
    const { data: singleSetting, error: singleError } = await supabase
      .from('xero_settings')
      .select('*')
      .maybeSingle();
    
    console.log('\n🔍 What Edge Function sees (.maybeSingle() query):');
    if (singleError) {
      console.error('❌ Error:', singleError);
    } else if (!singleSetting) {
      console.log('❌ No record returned by .maybeSingle()');
    } else {
      console.log('✅ Record found:', {
        id: singleSetting.id,
        has_client_id: !!singleSetting.client_id,
        has_client_secret: !!singleSetting.client_secret,
        client_id_length: singleSetting.client_id?.length || 0,
        client_secret_length: singleSetting.client_secret?.length || 0
      });
    }
    
  } catch (err) {
    console.error('❌ Script error:', err);
  }
}

// Run the check
checkXeroSettings();
