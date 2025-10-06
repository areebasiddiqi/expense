import { useState, useEffect } from 'react';
import { Save, Link2, DollarSign, Tag, FileText, Mail, CheckCircle2, XCircle, Loader2, Cloud } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import { CategoryManagement } from './CategoryManagement';
import { EmailTemplates } from './EmailTemplates';
import { Microsoft365Settings } from './Microsoft365Settings';

type XeroSettings = Database['public']['Tables']['xero_settings']['Row'];
type MileageRate = Database['public']['Tables']['mileage_rates']['Row'];

export function Settings() {
  const [activeSection, setActiveSection] = useState<'microsoft' | 'xero' | 'categories' | 'mileage' | 'policy' | 'emails'>('microsoft');
  const [xeroSettings, setXeroSettings] = useState<XeroSettings | null>(null);
  const [mileageRates, setMileageRates] = useState<MileageRate[]>([]);
  const [policyDisclaimer, setPolicyDisclaimer] = useState('');
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [customRedirectUri, setCustomRedirectUri] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const { data: xero } = await supabase
      .from('xero_settings')
      .select('*')
      .maybeSingle();

    const { data: rates } = await supabase
      .from('mileage_rates')
      .select('*')
      .order('vehicle_type');

    const { data: policy } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'expense_policy_disclaimer')
      .maybeSingle();

    setXeroSettings(xero);
    setMileageRates(rates || []);
    setPolicyDisclaimer(policy?.value || '');

    // Only show connected if we have all required fields AND is_connected is true
    if (xero && xero.client_id && xero.client_secret && xero.tenant_id && xero.refresh_token && xero.is_connected) {
      setConnectionStatus('connected');
    } else if (xero && (xero.client_id || xero.client_secret || xero.tenant_id)) {
      setConnectionStatus('disconnected');
    } else {
      setConnectionStatus('unknown');
    }
  }

  function authorizeWithXero() {
    if (!xeroSettings?.client_id) {
      alert('Please enter your Xero Client ID first');
      return;
    }

    if (!customRedirectUri) {
      alert('Please enter your Redirect URI first. Use the suggested URI or paste the URL you see in your browser followed by /admin/xero-callback');
      return;
    }

    const state = Math.random().toString(36).substring(7);
    sessionStorage.setItem('xero_oauth_state', state);
    sessionStorage.setItem('xero_redirect_uri', customRedirectUri);

    const authUrl = new URL('https://login.xero.com/identity/connect/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', xeroSettings.client_id);
    authUrl.searchParams.append('redirect_uri', customRedirectUri);
    authUrl.searchParams.append('scope', 'offline_access accounting.transactions accounting.contacts');
    authUrl.searchParams.append('state', state);

    console.log('Starting Xero authorization with redirect URI:', customRedirectUri);
    console.log('Authorization URL:', authUrl.toString());

    window.location.href = authUrl.toString();
  }

  async function testXeroConnection() {
    if (!xeroSettings?.client_id || !xeroSettings?.client_secret || !xeroSettings?.tenant_id || !xeroSettings?.refresh_token) {
      alert('Please fill in all Xero credentials including the Refresh Token');
      return;
    }

    setTestingConnection(true);
    setConnectionStatus('unknown');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-to-xero`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ claim_ids: [], test_connection: true }),
      });

      const result = await response.json();

      if (response.ok && !result.error) {
        setConnectionStatus('connected');
        alert('Successfully connected to Xero!');
      } else {
        setConnectionStatus('disconnected');
        alert(`Connection failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      setConnectionStatus('disconnected');
      alert(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTestingConnection(false);
    }
  }

  async function saveXeroSettings() {
    setSaving(true);

    try {
      console.log('💾 Saving Xero settings:', {
        has_id: !!xeroSettings?.id,
        client_id: xeroSettings?.client_id ? 'Set (' + xeroSettings.client_id.substring(0, 8) + '...)' : 'Missing',
        client_secret: xeroSettings?.client_secret ? 'Set' : 'Missing',
        tenant_id: xeroSettings?.tenant_id || 'Not set'
      });

      let result;
      if (xeroSettings?.id) {
        result = await supabase
          .from('xero_settings')
          .update({
            client_id: xeroSettings.client_id,
            client_secret: xeroSettings.client_secret,
            tenant_id: xeroSettings.tenant_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', xeroSettings.id);
      } else {
        result = await supabase
          .from('xero_settings')
          .insert({
            client_id: xeroSettings?.client_id || '',
            client_secret: xeroSettings?.client_secret || '',
            tenant_id: xeroSettings?.tenant_id || '',
          });
      }

      if (result.error) {
        console.error('❌ Error saving Xero settings:', result.error);
        alert('Failed to save settings: ' + result.error.message);
      } else {
        console.log('✅ Xero settings saved successfully');
        alert('Settings saved successfully!');
      }
    } catch (error) {
      console.error('❌ Unexpected error saving settings:', error);
      alert('Failed to save settings: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    setSaving(false);
    loadSettings();
  }

  async function updateMileageRate(rate: MileageRate) {
    await supabase
      .from('mileage_rates')
      .update({
        rate_per_mile: rate.rate_per_mile,
      })
      .eq('id', rate.id);

    loadSettings();
  }

  async function savePolicyDisclaimer() {
    setSaving(true);

    await supabase
      .from('app_settings')
      .update({
        value: policyDisclaimer,
        updated_at: new Date().toISOString(),
      })
      .eq('key', 'expense_policy_disclaimer');

    setSaving(false);
    loadSettings();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-slate-600 mt-1">Configure integrations and system settings</p>
      </div>

      <div className="flex space-x-4 border-b border-slate-200">
        <button
          onClick={() => setActiveSection('microsoft')}
          className={`px-4 py-2 border-b-2 transition ${
            activeSection === 'microsoft'
              ? 'border-slate-900 text-slate-900 font-medium'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Cloud className="w-4 h-4" />
            <span>Microsoft 365</span>
          </div>
        </button>
        <button
          onClick={() => setActiveSection('xero')}
          className={`px-4 py-2 border-b-2 transition ${
            activeSection === 'xero'
              ? 'border-slate-900 text-slate-900 font-medium'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Link2 className="w-4 h-4" />
            <span>Xero Integration</span>
          </div>
        </button>
        <button
          onClick={() => setActiveSection('categories')}
          className={`px-4 py-2 border-b-2 transition ${
            activeSection === 'categories'
              ? 'border-slate-900 text-slate-900 font-medium'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4" />
            <span>Categories</span>
          </div>
        </button>
        <button
          onClick={() => setActiveSection('mileage')}
          className={`px-4 py-2 border-b-2 transition ${
            activeSection === 'mileage'
              ? 'border-slate-900 text-slate-900 font-medium'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4" />
            <span>Mileage Rates</span>
          </div>
        </button>
        <button
          onClick={() => setActiveSection('policy')}
          className={`px-4 py-2 border-b-2 transition ${
            activeSection === 'policy'
              ? 'border-slate-900 text-slate-900 font-medium'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Policy Disclaimer</span>
          </div>
        </button>
        <button
          onClick={() => setActiveSection('emails')}
          className={`px-4 py-2 border-b-2 transition ${
            activeSection === 'emails'
              ? 'border-slate-900 text-slate-900 font-medium'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Mail className="w-4 h-4" />
            <span>Email Templates</span>
          </div>
        </button>
      </div>

      {activeSection === 'microsoft' && <Microsoft365Settings />}

      {activeSection === 'xero' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Xero Connection</h3>
              <div className="flex items-center space-x-2">
                {connectionStatus === 'connected' && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Connected</span>
                  </div>
                )}
                {connectionStatus === 'disconnected' && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <XCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Not Connected</span>
                  </div>
                )}
                {connectionStatus === 'unknown' && (
                  <div className="flex items-center space-x-2 text-slate-400">
                    <XCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Unknown</span>
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Connect your Xero account to sync expense data automatically. You'll need your Xero API credentials.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-semibold text-amber-900 mb-2">Important: Redirect URI Configuration</h4>
              <p className="text-sm text-amber-800 mb-3">
                You need to manually create your Redirect URI using the URL from your browser's address bar.
              </p>
              <div className="space-y-3">
                <div className="p-3 bg-white rounded border border-amber-300">
                  <div className="text-xs font-semibold text-amber-900 mb-2">Instructions:</div>
                  <ol className="text-xs text-amber-900 space-y-1.5 list-decimal list-inside">
                    <li>Look at your browser's address bar (should be https://something.bolt.new)</li>
                    <li>Copy that URL</li>
                    <li>Add <code className="bg-amber-100 px-1 rounded">/admin/xero-callback</code> to the end</li>
                    <li>Paste it into the "Redirect URI" field below</li>
                  </ol>
                </div>
                <div className="p-3 bg-white rounded border border-amber-300">
                  <div className="text-xs font-semibold text-amber-900 mb-1">Example:</div>
                  <div className="text-xs text-amber-800">
                    If browser shows: <code className="bg-amber-100 px-1 rounded">https://abc123.bolt.new</code>
                  </div>
                  <div className="text-xs text-amber-800 mt-1">
                    Then use: <code className="bg-amber-100 px-1 rounded font-semibold">https://abc123.bolt.new/admin/xero-callback</code>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Setup Instructions:</h4>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>
                  Go to <a href="https://developer.xero.com/app/manage" target="_blank" rel="noopener noreferrer" className="underline font-medium">Xero Developer Portal</a>
                </li>
                <li>Select your app, click <strong>Configuration</strong> tab</li>
                <li>In <strong>OAuth 2.0 redirect URIs</strong>, add the URI from above</li>
                <li><strong>Save</strong> your Xero app configuration</li>
                <li>Copy your <strong>Client ID</strong> and generate a <strong>Client Secret</strong></li>
                <li>Enter them below, click <strong>Save Settings</strong>, then <strong>Authorize with Xero</strong></li>
              </ol>
            </div>

            {xeroSettings?.tenant_id && !xeroSettings?.refresh_token && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-red-900 mb-2">Connection Issue Detected</h4>
                <p className="text-sm text-red-800 mb-3">
                  Your Tenant ID was saved but the Refresh Token is missing. This usually means:
                </p>
                <ul className="text-sm text-red-800 space-y-1 list-disc list-inside ml-2">
                  <li>The <code className="bg-red-100 px-1 rounded">offline_access</code> scope wasn't included in your Xero app</li>
                  <li>The authorization flow was interrupted</li>
                </ul>
                <p className="text-sm text-red-800 mt-3">
                  Please verify the scopes in your Xero app and try authorizing again.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Redirect URI
              </label>
              <input
                type="text"
                value={customRedirectUri}
                onChange={(e) => setCustomRedirectUri(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="https://your-app-url.bolt.new/admin/xero-callback"
              />
              <p className="text-xs text-slate-500 mt-1">
                This must match exactly what you add to your Xero app's OAuth 2.0 redirect URIs
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Client ID
              </label>
              <input
                type="text"
                value={xeroSettings?.client_id || ''}
                onChange={(e) => setXeroSettings({ ...xeroSettings!, client_id: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="Your Xero Client ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Client Secret
              </label>
              <input
                type="password"
                value={xeroSettings?.client_secret || ''}
                onChange={(e) => setXeroSettings({ ...xeroSettings!, client_secret: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="Your Xero Client Secret"
              />
            </div>

            {!xeroSettings?.tenant_id || !xeroSettings?.refresh_token ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800 mb-3">
                  To get your Tenant ID and Refresh Token, click the button below to authorize this app with your Xero account.
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    authorizeWithXero();
                  }}
                  disabled={!xeroSettings?.client_id || !xeroSettings?.client_secret || !customRedirectUri}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Link2 className="w-4 h-4" />
                  <span>Authorize with Xero</span>
                </button>
                {(!xeroSettings?.client_id || !xeroSettings?.client_secret || !customRedirectUri) && (
                  <p className="text-xs text-amber-600 mt-2">
                    Please fill in Redirect URI, Client ID, and Client Secret first
                  </p>
                )}
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tenant ID
                  </label>
                  <input
                    type="text"
                    value={xeroSettings?.tenant_id || ''}
                    onChange={(e) => setXeroSettings({ ...xeroSettings!, tenant_id: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none bg-slate-50"
                    placeholder="Auto-filled after authorization"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Refresh Token
                  </label>
                  <input
                    type="password"
                    value={xeroSettings?.refresh_token || ''}
                    onChange={(e) => setXeroSettings({ ...xeroSettings!, refresh_token: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none bg-slate-50"
                    placeholder="Auto-filled after authorization"
                    readOnly
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Required for authenticating with Xero API
                  </p>
                </div>
              </>
            )}

            <div className="flex space-x-3 pt-2">
              <button
                onClick={saveXeroSettings}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Settings'}</span>
              </button>

              {xeroSettings?.tenant_id && xeroSettings?.refresh_token && (
                <button
                  onClick={testXeroConnection}
                  disabled={testingConnection}
                  className="flex items-center space-x-2 px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
                >
                  {testingConnection ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" />
                      <span>Test Connection</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'categories' && <CategoryManagement />}

      {activeSection === 'mileage' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Mileage Rates</h3>
            <p className="text-sm text-slate-600 mt-1">Configure mileage reimbursement rates by vehicle type and charger type</p>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Vehicle Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Charger Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Rate per Mile (£)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Effective From
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {mileageRates.map((rate) => (
                <tr key={rate.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 capitalize">
                    {rate.vehicle_type}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 capitalize">
                    {rate.charger_type ? rate.charger_type : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      step="0.01"
                      value={rate.rate_per_mile}
                      onChange={(e) => {
                        const updated = { ...rate, rate_per_mile: parseFloat(e.target.value) };
                        setMileageRates(rates => rates.map(r => r.id === rate.id ? updated : r));
                      }}
                      onBlur={() => updateMileageRate(rate)}
                      className="w-32 px-3 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(rate.effective_from).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSection === 'policy' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Expense Policy Disclaimer</h3>
            <p className="text-sm text-slate-600 mb-6">
              Customize the disclaimer text that users must agree to before submitting expense claims.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Disclaimer Text
              </label>
              <textarea
                value={policyDisclaimer}
                onChange={(e) => setPolicyDisclaimer(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="Enter the disclaimer text users must agree to..."
              />
              <p className="text-xs text-slate-500 mt-2">
                This text will be shown to users in a confirmation dialog when they submit expense claims.
              </p>
            </div>

            <button
              onClick={savePolicyDisclaimer}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Disclaimer'}</span>
            </button>
          </div>
        </div>
      )}

      {activeSection === 'emails' && <EmailTemplates />}
    </div>
  );
}
