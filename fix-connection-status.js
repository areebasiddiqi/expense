// Fix Connection Status Script
// Run in browser console to properly reset connection status

async function fixConnectionStatus() {
  console.log('🔧 Fixing connection status...');
  
  try {
    // Check current status
    const { data: current } = await supabase
      .from('xero_settings')
      .select('*')
      .maybeSingle();
    
    if (!current) {
      console.log('❌ No Xero settings found');
      return;
    }
    
    console.log('📊 Current status:');
    console.log('   - Client ID:', current.client_id ? 'Set' : 'Missing');
    console.log('   - Client Secret:', current.client_secret ? 'Set' : 'Missing');
    console.log('   - Tenant ID:', current.tenant_id ? 'Set' : 'Missing');
    console.log('   - Refresh Token:', current.refresh_token ? 'Set' : 'Missing');
    console.log('   - Is Connected:', current.is_connected);
    
    // Since OAuth is failing, mark as disconnected
    console.log('\n🔄 Marking as disconnected due to OAuth failure...');
    
    const { error } = await supabase
      .from('xero_settings')
      .update({
        is_connected: false,
        refresh_token: null, // Clear invalid token
        tenant_id: null,     // Clear tenant ID
        updated_at: new Date().toISOString()
      })
      .eq('id', current.id);
    
    if (error) {
      console.error('❌ Error updating:', error);
    } else {
      console.log('✅ Connection status fixed!');
      console.log('   - Status: Disconnected');
      console.log('   - Invalid tokens cleared');
      
      // Refresh the page to update UI
      console.log('\n🔄 Refreshing page to update UI...');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function testActualConnection() {
  console.log('🧪 Testing actual Xero connection...');
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('❌ No active session');
      return;
    }
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-to-xero`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ claim_ids: [], test_connection: true }),
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Xero connection is working!');
      
      // Update database to reflect working connection
      await supabase
        .from('xero_settings')
        .update({ is_connected: true })
        .maybeSingle();
        
    } else {
      console.log('❌ Xero connection failed:', result.error);
      
      // Update database to reflect failed connection
      await supabase
        .from('xero_settings')
        .update({ is_connected: false })
        .maybeSingle();
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
}

console.log(`
🔧 CONNECTION STATUS FIXER
===========================

The UI shows "Connected" because it only checks if database fields exist,
not if the tokens actually work.

Available functions:
1. fixConnectionStatus() - Reset connection status properly
2. testActualConnection() - Test if Xero actually works

After fixing, you'll need to complete OAuth flow again.
`);

// Auto-run the fix
console.log('🚀 Auto-running connection status fix...');
fixConnectionStatus();
