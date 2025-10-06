import { useEffect, useState } from 'react';
import { Eye, ChevronDown, ChevronUp, Filter, X as ClearIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import { ReceiptModal } from '../modals/ReceiptModal';

type Claim = Database['public']['Tables']['expense_claims']['Row'] & {
  client: { name: string } | null;
  profiles: { full_name: string; email: string } | null;
  reviewer: { full_name: string } | null;
};

type Expense = Database['public']['Tables']['expenses']['Row'] & {
  expense_categories: { name: string } | null;
};

interface Profile {
  id: string;
  full_name: string;
}

interface Category {
  id: string;
  name: string;
}

export function ClaimsHistory() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);
  const [claimExpenses, setClaimExpenses] = useState<Record<string, Expense[]>>({});
  const [receiptModalUrl, setReceiptModalUrl] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [approvers, setApprovers] = useState<Profile[]>([]);

  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'rejected'>('all');
  const [claimantFilter, setClaimantFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [approverFilter, setApproverFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  useEffect(() => {
    loadProfiles();
    loadCategories();
    loadApprovers();
  }, []);

  useEffect(() => {
    loadClaims();
  }, [statusFilter, claimantFilter, approverFilter, startDateFilter, endDateFilter]);

  async function loadProfiles() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name');
    setProfiles(data || []);
  }

  async function loadCategories() {
    const { data } = await supabase
      .from('expense_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setCategories(data || []);
  }

  async function loadApprovers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .or('role.eq.admin,role.eq.approver')
      .order('full_name');
    setApprovers(data || []);
  }

  async function loadClaims() {
    let query = supabase
      .from('expense_claims')
      .select('*, client:clients(name), profiles!user_id(full_name, email), reviewer:profiles!reviewed_by(full_name)')
      .in('status', statusFilter === 'all' ? ['approved', 'rejected'] : [statusFilter])
      .order('reviewed_at', { ascending: false });

    if (claimantFilter) {
      query = query.eq('user_id', claimantFilter);
    }

    if (approverFilter) {
      query = query.eq('reviewed_by', approverFilter);
    }

    if (startDateFilter) {
      query = query.gte('reviewed_at', startDateFilter);
    }

    if (endDateFilter) {
      query = query.lte('reviewed_at', endDateFilter);
    }

    const { data } = await query;

    let filteredData = data || [];

    if (categoryFilter && filteredData.length > 0) {
      const claimIdsWithCategory = new Set<string>();

      for (const claim of filteredData) {
        const { data: expenses } = await supabase
          .from('expenses')
          .select('id')
          .eq('claim_id', claim.id)
          .eq('category_id', categoryFilter);

        if (expenses && expenses.length > 0) {
          claimIdsWithCategory.add(claim.id);
        }
      }

      filteredData = filteredData.filter(claim => claimIdsWithCategory.has(claim.id));
    }

    setClaims(filteredData);
    setLoading(false);
  }

  async function loadClaimExpenses(claimId: string) {
    if (claimExpenses[claimId]) {
      return;
    }

    const { data } = await supabase
      .from('expenses')
      .select('*, expense_categories(name)')
      .eq('claim_id', claimId)
      .order('expense_date', { ascending: false });

    setClaimExpenses(prev => ({ ...prev, [claimId]: data || [] }));
  }

  function toggleExpandClaim(claimId: string) {
    if (expandedClaim === claimId) {
      setExpandedClaim(null);
    } else {
      setExpandedClaim(claimId);
      loadClaimExpenses(claimId);
    }
  }

  function calculateTotal(claimId: string): number {
    const expenses = claimExpenses[claimId] || [];
    return expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  }

  function clearFilters() {
    setStatusFilter('all');
    setClaimantFilter('');
    setCategoryFilter('');
    setApproverFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
  }

  const hasActiveFilters = statusFilter !== 'all' || claimantFilter || categoryFilter || approverFilter || startDateFilter || endDateFilter;

  function getStatusColor(status: string) {
    return status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  }

  function getStatusLabel(status: string) {
    return status === 'approved' ? 'Approved' : 'Rejected';
  }

  if (loading) {
    return <div className="text-slate-500">Loading claims history...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Claims History</h2>
        <p className="text-slate-600 mt-1">View all approved and rejected expense claims</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'approved' | 'rejected')}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            >
              <option value="all">All</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Claimant
            </label>
            <select
              value={claimantFilter}
              onChange={(e) => setClaimantFilter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            >
              <option value="">All Claimants</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Approved/Rejected By
            </label>
            <select
              value={approverFilter}
              onChange={(e) => setApproverFilter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            >
              <option value="">All Approvers</option>
              {approvers.map((approver) => (
                <option key={approver.id} value={approver.id}>
                  {approver.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              From Date
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
              To Date
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

      {claims.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <h3 className="text-lg font-medium text-slate-900 mb-2">No claims found</h3>
          <p className="text-slate-600">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {claims.map((claim) => (
            <div
              key={claim.id}
              className="bg-white rounded-lg border border-slate-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">{claim.claimant_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(claim.status)}`}>
                      {getStatusLabel(claim.status)}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm mb-2">{claim.description}</p>
                  <div className="text-sm text-slate-500">
                    <span className="font-medium">{claim.profiles?.email}</span>
                    <span className="mx-2">•</span>
                    <span>
                      {new Date(claim.start_date).toLocaleDateString()} - {new Date(claim.end_date).toLocaleDateString()}
                    </span>
                    {claim.client && (
                      <>
                        <span className="mx-2">•</span>
                        <span>Client: {claim.client.name}</span>
                      </>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    <span className="font-medium">{getStatusLabel(claim.status)} by {claim.reviewer?.full_name}</span>
                    <span className="mx-2">•</span>
                    <span>{claim.reviewed_at ? new Date(claim.reviewed_at).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  {claim.review_notes && (
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs font-medium text-slate-700">Review Notes:</span>
                      <p className="text-sm text-slate-600 mt-1">{claim.review_notes}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => toggleExpandClaim(claim.id)}
                  className="flex items-center space-x-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  <span>View Expenses</span>
                  {expandedClaim === claim.id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              {expandedClaim === claim.id && claimExpenses[claim.id] && (
                <div className="border-t border-slate-200 pt-4 mt-4 space-y-2">
                  {claimExpenses[claim.id].map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{expense.title}</div>
                        <div className="text-sm text-slate-600">{expense.description}</div>
                        <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                          <span>{new Date(expense.expense_date).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{expense.expense_categories?.name || 'Uncategorized'}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {expense.receipt_url && (
                          <button
                            onClick={() => setReceiptModalUrl(expense.receipt_url!)}
                            className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Receipt</span>
                          </button>
                        )}
                        <div className="font-semibold text-slate-900">
                          £{Number(expense.amount).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end pt-2 border-t border-slate-200">
                    <div className="text-lg font-bold text-slate-900">
                      Total: £{calculateTotal(claim.id).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {receiptModalUrl && (
        <ReceiptModal
          receiptUrl={receiptModalUrl}
          onClose={() => setReceiptModalUrl(null)}
        />
      )}
    </div>
  );
}
