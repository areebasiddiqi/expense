// Get available tax types from your Xero organization
// Run in browser console to see what tax codes are available

async function getXeroTaxTypes() {
  console.log('🔍 Fetching available tax types from Xero...');
  
  try {
    // Get Xero settings
    const { data: xeroSettings } = await supabase
      .from('xero_settings')
      .select('*')
      .maybeSingle();
    
    if (!xeroSettings?.refresh_token) {
      console.error('❌ No valid Xero connection');
      return;
    }
    
    // Get access token
    const accessToken = await getXeroAccessToken(
      xeroSettings.client_id,
      xeroSettings.client_secret,
      xeroSettings.refresh_token
    );
    
    // Fetch tax rates from Xero
    const response = await fetch('https://api.xero.com/api.xro/2.0/TaxRates', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-Id': xeroSettings.tenant_id,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch tax rates: ${errorText}`);
    }
    
    const data = await response.json();
    const taxRates = data.TaxRates || [];
    
    console.log(`📋 Found ${taxRates.length} tax types:`);
    
    // Filter for purchase/input tax types (for bills)
    const inputTaxTypes = taxRates.filter(tax => 
      tax.TaxType && (
        tax.TaxType.includes('INPUT') || 
        tax.TaxType.includes('PURCHASE') ||
        tax.TaxType === 'NONE' ||
        tax.TaxType === 'EXEMPTINPUT'
      )
    );
    
    console.log('\n🛒 Tax types suitable for bills (ACCPAY):');
    inputTaxTypes.forEach(tax => {
      console.log(`  - ${tax.TaxType}: ${tax.Name} (${tax.DisplayTaxRate || 0}%)`);
    });
    
    // Show all tax types for reference
    console.log('\n📊 All available tax types:');
    taxRates.forEach(tax => {
      console.log(`  - ${tax.TaxType}: ${tax.Name} (${tax.DisplayTaxRate || 0}%) - ${tax.Status}`);
    });
    
    return { inputTaxTypes, allTaxTypes: taxRates };
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Helper function to get access token
async function getXeroAccessToken(clientId, clientSecret, refreshToken) {
  const tokenUrl = 'https://identity.xero.com/connect/token';
  const credentials = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  
  const data = await response.json();
  return data.access_token;
}

console.log(`
🔍 XERO TAX TYPES CHECKER
=========================

Your Xero org uses PKR currency, so UK tax codes (INPUT2/OUTPUT2) don't work.

Run: getXeroTaxTypes() to see available tax codes for Pakistan.

Common tax types by country:
- UK: INPUT2, OUTPUT2, NONE
- Pakistan: May use different codes
- Generic: NONE (always works)
`);

// Auto-run to show available tax types
getXeroTaxTypes();
