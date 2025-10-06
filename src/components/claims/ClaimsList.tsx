import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, FileText, Banknote, Calendar, Filter, X as ClearIcon } from 'lucide-react';

interface Claim {
  id: string;
  claimant_name: string;
  start_date: string;
  end_date: string;
  description: string;
  is_chargeable: boolean;
  client_id: string | null;
  status: string;
  created_at: string;
  client?: {
    name: string;
  };
  expenses?: Array<{
    amount: number;
  }>;
}

interface ClaimsListProps {
  onSelectClaim: (claimId: string) => void;
  onCreateClaim: () => void;
}

interface ClaimStats {
  status: string;
  count: number;
  total: number;
}

export default function ClaimsList({ onSelectClaim, onCreateClaim }: ClaimsListProps) {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'submitted' | 'approved'>('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  useEffect(() => {
    if (user) {
      loadClaims();
    }
  }, [user]);

  async function loadClaims() {
    const { data, error } = await supabase
      .from('expense_claims')
      .select(`
        *,
        client:clients(name),
        expenses(amount)
      `)
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading claims:', error);
    } else {
      setClaims(data || []);
    }
    setLoading(false);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'paid':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateTotal = (expenses: Array<{ amount: number }> = []) => {
    return expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  };

  const claimStats: ClaimStats[] = [
    {
      status: 'draft',
      count: claims.filter(c => c.status === 'draft').length,
      total: claims
        .filter(c => c.status === 'draft')
        .reduce((sum, c) => sum + calculateTotal(c.expenses), 0),
    },
    {
      status: 'submitted',
      count: claims.filter(c => c.status === 'submitted').length,
      total: claims
        .filter(c => c.status === 'submitted')
        .reduce((sum, c) => sum + calculateTotal(c.expenses), 0),
    },
    {
      status: 'approved',
      count: claims.filter(c => c.status === 'approved').length,
      total: claims
        .filter(c => c.status === 'approved')
        .reduce((sum, c) => sum + calculateTotal(c.expenses), 0),
    },
  ];

  const filteredClaims = claims.filter(claim => {
    if (statusFilter !== 'all' && claim.status !== statusFilter) {
      return false;
    }
    if (startDateFilter && claim.start_date < startDateFilter) {
      return false;
    }
    if (endDateFilter && claim.end_date > endDateFilter) {
      return false;
    }
    return true;
  });

  function clearFilters() {
    setStatusFilter('all');
    setStartDateFilter('');
    setEndDateFilter('');
  }

  const hasActiveFilters = statusFilter !== 'all' || startDateFilter || endDateFilter;

  if (loading) {
    return <div className="text-center py-8">Loading claims...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">My Expenses</h2>
        <button
          onClick={onCreateClaim}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Claim
        </button>
      </div>

      {claims.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {claimStats.map((stat) => (
              <div
                key={stat.status}
                className="bg-white rounded-lg border border-slate-200 p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600 uppercase tracking-wider">
                    {stat.status}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      stat.status
                    )}`}
                  >
                    {stat.count}
                  </span>
                </div>
                <div className="text-3xl font-bold text-slate-900">
                  £{stat.total.toFixed(2)}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {stat.count} claim{stat.count !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-700 font-medium">
                <Filter className="w-5 h-5" />
                <span>Filters</span>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center space-x-1 text-sm text-slate-600 hover:text-slate-900"
                >
                  <ClearIcon className="w-4 h-4" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('draft')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  statusFilter === 'draft'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Draft
              </button>
              <button
                onClick={() => setStatusFilter('submitted')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  statusFilter === 'submitted'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Submitted
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  statusFilter === 'approved'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Approved
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Start Date From
                </label>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  End Date To
                </label>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {claims.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 mb-4">No expense claims yet</p>
          <button
            onClick={onCreateClaim}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Create your first claim
          </button>
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-lg">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 mb-2">No claims match your filters</p>
          <button
            onClick={clearFilters}
            className="text-sm text-slate-600 hover:text-slate-900 underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredClaims.map((claim) => (
            <div
              key={claim.id}
              onClick={() => onSelectClaim(claim.id)}
              className="p-6 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {claim.claimant_name}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">{claim.description}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    claim.status
                  )}`}
                >
                  {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(claim.start_date).toLocaleDateString()} -{' '}
                    {new Date(claim.end_date).toLocaleDateString()}
                  </span>
                </div>
                {claim.is_chargeable && claim.client && (
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    <span>Client: {claim.client.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 font-semibold text-slate-900">
                  <Banknote className="w-4 h-4" />
                  <span>£{calculateTotal(claim.expenses).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
