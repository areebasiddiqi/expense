import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Database } from '../../lib/database.types';
import { Cloud, CloudOff, RefreshCw, Settings as SettingsIcon, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

type MicrosoftConfig = Database['public']['Tables']['microsoft_tenant_config']['Row'];
type SyncLog = Database['public']['Tables']['user_sync_log']['Row'];
type GroupMapping = Database['public']['Tables']['azure_group_mappings']['Row'];

export function Microsoft365Settings() {
  const { profile } = useAuth();
  const [config, setConfig] = useState<MicrosoftConfig | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [groupMappings, setGroupMappings] = useState<GroupMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    tenant_id: '',
    client_id: '',
    client_secret: '',
    sync_frequency_minutes: 15,
    is_enabled: true,
  });

  useEffect(() => {
    if (profile?.organization_id) {
      loadConfig();
      loadSyncLogs();
      loadGroupMappings();
    }
  }, [profile?.organization_id]);

  async function loadConfig() {
    if (!profile?.organization_id) return;

    try {
      const { data, error } = await supabase
        .from('microsoft_tenant_config')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig(data);
        setFormData({
          tenant_id: data.tenant_id,
          client_id: data.client_id,
          client_secret: '',
          sync_frequency_minutes: data.sync_frequency_minutes,
          is_enabled: data.is_enabled,
        });
      }
    } catch (err) {
      console.error('Error loading config:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadSyncLogs() {
    if (!profile?.organization_id) return;

    const { data } = await supabase
      .from('user_sync_log')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('started_at', { ascending: false })
      .limit(10);

    if (data) setSyncLogs(data);
  }

  async function loadGroupMappings() {
    if (!profile?.organization_id) return;

    const { data } = await supabase
      .from('azure_group_mappings')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });

    if (data) setGroupMappings(data);
  }

  async function handleSave() {
    if (!profile?.organization_id) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (!formData.tenant_id || !formData.client_id) {
        throw new Error('Tenant ID and Client ID are required');
      }

      const configData = {
        organization_id: profile.organization_id,
        tenant_id: formData.tenant_id,
        client_id: formData.client_id,
        client_secret: formData.client_secret || config?.client_secret || '',
        sync_frequency_minutes: formData.sync_frequency_minutes,
        is_enabled: formData.is_enabled,
        updated_at: new Date().toISOString(),
      };

      if (config) {
        const { error } = await supabase
          .from('microsoft_tenant_config')
          .update(configData)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('microsoft_tenant_config')
          .insert(configData);

        if (error) throw error;
      }

      await supabase
        .from('organizations')
        .update({
          is_microsoft_connected: true,
          microsoft_sync_enabled: formData.is_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.organization_id);

      setSuccess('Microsoft 365 configuration saved successfully');
      await loadConfig();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    if (!profile?.organization_id) return;

    setError('');
    setSuccess('');
    setSyncing(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/microsoft-user-sync`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_id: profile.organization_id,
          sync_type: 'manual',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync users');
      }

      const result = await response.json();
      setSuccess(`Sync completed: ${result.usersCreated} created, ${result.usersUpdated} updated, ${result.usersDeactivated} deactivated`);
      await loadSyncLogs();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!profile?.organization_id || !config) return;
    if (!confirm('Are you sure you want to disconnect Microsoft 365?')) return;

    try {
      await supabase
        .from('microsoft_tenant_config')
        .update({ is_enabled: false })
        .eq('id', config.id);

      await supabase
        .from('organizations')
        .update({
          is_microsoft_connected: false,
          microsoft_sync_enabled: false,
        })
        .eq('id', profile.organization_id);

      setSuccess('Microsoft 365 disconnected successfully');
      await loadConfig();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'partial':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cloud className="w-8 h-8 text-slate-900" />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Microsoft 365 Integration</h2>
            <p className="text-sm text-slate-600">Connect your Microsoft 365 tenant for SSO and automatic user sync</p>
          </div>
        </div>
        {config && config.is_enabled && (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Connected
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
        <div className="flex items-center gap-2 text-slate-900 font-semibold">
          <SettingsIcon className="w-5 h-5" />
          <h3>Configuration</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Azure Tenant ID
            </label>
            <input
              type="text"
              value={formData.tenant_id}
              onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Application (Client) ID
            </label>
            <input
              type="text"
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Client Secret {config && '(leave blank to keep existing)'}
            </label>
            <input
              type="password"
              value={formData.client_secret}
              onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              placeholder={config ? '••••••••' : 'Enter client secret'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Sync Frequency (minutes)
            </label>
            <input
              type="number"
              value={formData.sync_frequency_minutes}
              onChange={(e) => setFormData({ ...formData, sync_frequency_minutes: parseInt(e.target.value) })}
              min="5"
              max="1440"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_enabled"
              checked={formData.is_enabled}
              onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
              className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900"
            />
            <label htmlFor="is_enabled" className="text-sm font-medium text-slate-700">
              Enable automatic user synchronization
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition"
          >
            {saving ? 'Saving...' : config ? 'Update Configuration' : 'Save Configuration'}
          </button>

          {config && config.is_enabled && (
            <>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>

              <button
                onClick={handleDisconnect}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
              >
                <CloudOff className="w-4 h-4" />
                Disconnect
              </button>
            </>
          )}
        </div>
      </div>

      {config && syncLogs.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <Users className="w-5 h-5" />
            <h3>Recent Sync History</h3>
          </div>

          <div className="space-y-2">
            {syncLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(log.status)}
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {new Date(log.started_at).toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-600">
                      {log.sync_type.charAt(0).toUpperCase() + log.sync_type.slice(1)} sync
                    </div>
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  <span className="text-green-600 font-medium">{log.users_created} created</span>
                  {' • '}
                  <span className="text-blue-600 font-medium">{log.users_updated} updated</span>
                  {log.users_deactivated > 0 && (
                    <>
                      {' • '}
                      <span className="text-red-600 font-medium">{log.users_deactivated} deactivated</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Setup Instructions</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Go to Azure Portal and register a new application</li>
          <li>Add API permissions: User.Read.All, Group.Read.All (Application type)</li>
          <li>Create a client secret and copy the values here</li>
          <li>Grant admin consent for the permissions</li>
          <li>Save the configuration and click "Sync Now" to test</li>
        </ol>
      </div>
    </div>
  );
}
