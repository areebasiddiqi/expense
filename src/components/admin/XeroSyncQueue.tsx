import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, CheckCircle, XCircle, RefreshCw, Calendar, Banknote } from 'lucide-react';

interface Claim {
  id: string;
  claimant_name: string;
  start_date: string;
  end_date: string;
  description: string;
  status: string;
  xero_sync_status: string;
  xero_bill_id: string | null;
  xero_synced_at: string | null;
  xero_sync_error: string | null;
  expenses?: Array<{
    amount: number;
    vat_amount: number;
  }>;
}

export function XeroSyncQueue() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaims, setSelectedClaims] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadClaims();
  }, []);

  async function loadClaims() {
    setLoading(true);
    const { data, error } = await supabase
      .from('expense_claims')
      .select(`
        *,
        expenses(amount, vat_amount)
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setClaims(data);
    }
    setLoading(false);
  }

  function toggleClaim(claimId: string) {
    const newSelected = new Set(selectedClaims);
    if (newSelected.has(claimId)) {
      newSelected.delete(claimId);
    } else {
      newSelected.add(claimId);
    }
    setSelectedClaims(newSelected);
  }

  function toggleAll() {
    const pendingClaims = claims.filter(c => !c.xero_bill_id || c.xero_sync_status === 'failed');
    if (selectedClaims.size === pendingClaims.length) {
      setSelectedClaims(new Set());
    } else {
      setSelectedClaims(new Set(pendingClaims.map(c => c.id)));
    }
  }

  async function syncToXero() {
    if (selectedClaims.size === 0) return;

    setSyncing(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-to-xero`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          claim_ids: Array.from(selectedClaims),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSelectedClaims(new Set());
        await loadClaims();
      } else {
        alert('Failed to sync to Xero: ' + result.error);
      }
    } catch (error) {
      console.error('Error syncing to Xero:', error);
      alert('Error syncing to Xero. Please try again.');
    } finally {
      setSyncing(false);
    }
  }

  function calculateTotal(expenses: Array<{ amount: number; vat_amount: number }> = []) {
    return expenses.reduce((sum, exp) => sum + Number(exp.amount) + Number(exp.vat_amount || 0), 0);
  }

  const getSyncStatusIcon = (claim: Claim) => {
    if (claim.xero_bill_id && claim.xero_sync_status !== 'failed') {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    } else if (claim.xero_sync_status === 'failed') {
      return <XCircle className="w-5 h-5 text-red-600" />;
    } else {
      return <RefreshCw className="w-5 h-5 text-slate-400" />;
    }
  };

  const getSyncStatusText = (claim: Claim) => {
    if (claim.xero_bill_id && claim.xero_sync_status !== 'failed') {
      return 'Synced';
    } else if (claim.xero_sync_status === 'failed') {
      return 'Failed';
    } else {
      return 'Pending';
    }
  };

  const getSyncStatusColor = (claim: Claim) => {
    if (claim.xero_bill_id && claim.xero_sync_status !== 'failed') {
      return 'bg-green-100 text-green-800';
    } else if (claim.xero_sync_status === 'failed') {
      return 'bg-red-100 text-red-800';
    } else {
      return 'bg-slate-100 text-slate-800';
    }
  };

  // Since xero_sync_status field doesn't exist, treat all claims as pending unless they have xero_bill_id
  const pendingClaims = claims.filter(c => !c.xero_bill_id || c.xero_sync_status === 'failed');
  const syncedClaims = claims.filter(c => c.xero_bill_id && c.xero_sync_status !== 'failed');

  if (loading) {
    return <div className="text-center py-8">Loading claims...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Xero Sync Queue</h3>
          <p className="text-slate-600 mt-1">
            Send approved claims to Xero as draft bills
          </p>
        </div>
        {selectedClaims.size > 0 && (
          <button
            onClick={syncToXero}
            disabled={syncing}
            className="flex items-center space-x-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{syncing ? 'Syncing...' : `Send ${selectedClaims.size} to Xero`}</span>
          </button>
        )}
      </div>

      {pendingClaims.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h4 className="font-semibold text-slate-900">Pending Sync ({pendingClaims.length})</h4>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedClaims.size === pendingClaims.length && pendingClaims.length > 0}
                onChange={toggleAll}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span className="text-sm text-slate-700">Select All</span>
            </label>
          </div>

          <div className="divide-y divide-slate-200">
            {pendingClaims.map((claim) => (
              <div
                key={claim.id}
                className="p-4 hover:bg-slate-50 transition"
              >
                <div className="flex items-start space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedClaims.has(claim.id)}
                    onChange={() => toggleClaim(claim.id)}
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="font-semibold text-slate-900">{claim.claimant_name}</h5>
                        <p className="text-sm text-slate-600">{claim.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getSyncStatusIcon(claim)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSyncStatusColor(claim)}`}>
                          {getSyncStatusText(claim)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(claim.start_date).toLocaleDateString()} - {new Date(claim.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 font-semibold text-slate-900">
                        <Banknote className="w-4 h-4" />
                        <span>£{calculateTotal(claim.expenses).toFixed(2)}</span>
                      </div>
                    </div>
                    {claim.xero_sync_error && (
                      <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                        Error: {claim.xero_sync_error}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {syncedClaims.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-4 bg-green-50 border-b border-green-200">
            <h4 className="font-semibold text-slate-900">Synced to Xero ({syncedClaims.length})</h4>
          </div>

          <div className="divide-y divide-slate-200">
            {syncedClaims.map((claim) => (
              <div
                key={claim.id}
                className="p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="font-semibold text-slate-900">{claim.claimant_name}</h5>
                    <p className="text-sm text-slate-600">{claim.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Synced
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(claim.start_date).toLocaleDateString()} - {new Date(claim.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-semibold text-slate-900">
                    <Banknote className="w-4 h-4" />
                    <span>£{calculateTotal(claim.expenses).toFixed(2)}</span>
                  </div>
                  {claim.xero_bill_id && (
                    <div className="text-xs text-slate-500">
                      Xero Bill ID: {claim.xero_bill_id}
                    </div>
                  )}
                  {claim.xero_synced_at && (
                    <div className="text-xs text-slate-500">
                      Synced: {new Date(claim.xero_synced_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {claims.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <Send className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">No approved claims available for Xero sync</p>
        </div>
      )}
    </div>
  );
}
