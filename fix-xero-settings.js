// Manual fix for Xero settings
// Run this in browser console after opening your app

async function fixXeroSettings() {
  console.log('🔧 Fixing Xero settings...');
  
  try {
    // First, check current settings
    const { data: existing, error: checkError } = await supabase
      .from('xero_settings')
      .select('*');
    
    console.log('Current settings:', existing);
    
    if (checkError) {
      console.error('Error checking settings:', checkError);
      return;
    }
    
    // Your Xero credentials (replace with actual values)
    const CLIENT_ID = 'YOUR_CLIENT_ID_HERE';  // Replace with your actual Client ID
    const CLIENT_SECRET = 'YOUR_CLIENT_SECRET_HERE';  // Replace with your actual Client Secret
    
    if (CLIENT_ID === 'YOUR_CLIENT_ID_HERE' || CLIENT_SECRET === 'YOUR_CLIENT_SECRET_HERE') {
      console.error('❌ Please update CLIENT_ID and CLIENT_SECRET in the script first!');
      return;
    }
    
    let result;
    
    if (existing && existing.length > 0) {
      // Update existing record
      console.log('Updating existing record...');
      result = await supabase
        .from('xero_settings')
        .update({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id)
        .select();
    } else {
      // Insert new record
      console.log('Inserting new record...');
      result = await supabase
        .from('xero_settings')
        .insert({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        })
        .select();
    }
    
    if (result.error) {
      console.error('❌ Error saving:', result.error);
    } else {
      console.log('✅ Settings saved successfully:', result.data);
      
      // Verify the save
      const { data: verification } = await supabase
        .from('xero_settings')
        .select('*')
        .maybeSingle();
      
      console.log('✅ Verification - Edge Function will see:', {
        found: !!verification,
        has_client_id: !!verification?.client_id,
        has_client_secret: !!verification?.client_secret,
        client_id_preview: verification?.client_id?.substring(0, 8) + '...'
      });
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Instructions
console.log(`
🔧 XERO SETTINGS FIX SCRIPT
===========================

1. Update CLIENT_ID and CLIENT_SECRET in this script
2. Run: fixXeroSettings()

Your Client ID and Secret should be from:
https://developer.xero.com/app/manage
`);

// Uncomment the line below after updating credentials
// fixXeroSettings();
