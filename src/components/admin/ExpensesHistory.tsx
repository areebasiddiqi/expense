import { useEffect, useState } from 'react';
import { Eye, Filter, X as ClearIcon, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import { ReceiptModal } from '../modals/ReceiptModal';

type Expense = Database['public']['Tables']['expenses']['Row'] & {
  expense_categories: { name: string } | null;
  expense_claims: {
    claimant_name: string;
    status: string;
    reviewed_by: string | null;
    reviewed_at: string | null;
    profiles: { full_name: string } | null;
  } | null;
  reviewer: { full_name: string } | null;
};

interface Profile {
  id: string;
  full_name: string;
}

interface Category {
  id: string;
  name: string;
}

export function ExpensesHistory() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
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

  const [sortField, setSortField] = useState<'claimant' | 'title' | 'category' | 'amount' | 'date' | 'status' | 'reviewer'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadProfiles();
    loadCategories();
    loadApprovers();
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [statusFilter, claimantFilter, categoryFilter, approverFilter, startDateFilter, endDateFilter]);

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

  async function loadExpenses() {
    let query = supabase
      .from('expenses')
      .select(`
        *,
        expense_categories(name),
        expense_claims!inner(
          claimant_name,
          status,
          reviewed_by,
          reviewed_at,
          profiles:user_id(full_name)
        )
      `)
      .in('expense_claims.status', statusFilter === 'all' ? ['approved', 'rejected'] : [statusFilter])
      .order('expense_date', { ascending: false });

    const { data } = await query;

    let filteredData = data || [];

    if (claimantFilter) {
      filteredData = filteredData.filter(exp =>
        exp.expense_claims && exp.user_id === claimantFilter
      );
    }

    if (categoryFilter) {
      filteredData = filteredData.filter(exp => exp.category_id === categoryFilter);
    }

    if (approverFilter) {
      filteredData = filteredData.filter(exp =>
        exp.expense_claims && exp.expense_claims.reviewed_by === approverFilter
      );
    }

    if (startDateFilter) {
      filteredData = filteredData.filter(exp => exp.expense_date >= startDateFilter);
    }

    if (endDateFilter) {
      filteredData = filteredData.filter(exp => exp.expense_date <= endDateFilter);
    }

    const expensesWithReviewer = await Promise.all(
      filteredData.map(async (expense) => {
        if (expense.expense_claims?.reviewed_by) {
          const { data: reviewerData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', expense.expense_claims.reviewed_by)
            .maybeSingle();

          return {
            ...expense,
            reviewer: reviewerData,
          };
        }
        return {
          ...expense,
          reviewer: null,
        };
      })
    );

    setExpenses(expensesWithReviewer);
    setLoading(false);
  }

  function handleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  const sortedExpenses = [...expenses].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'claimant':
        aValue = a.expense_claims?.claimant_name || '';
        bValue = b.expense_claims?.claimant_name || '';
        break;
      case 'title':
        aValue = a.title;
        bValue = b.title;
        break;
      case 'category':
        aValue = a.expense_categories?.name || '';
        bValue = b.expense_categories?.name || '';
        break;
      case 'amount':
        aValue = Number(a.amount);
        bValue = Number(b.amount);
        break;
      case 'date':
        aValue = new Date(a.expense_date).getTime();
        bValue = new Date(b.expense_date).getTime();
        break;
      case 'status':
        aValue = a.expense_claims?.status || '';
        bValue = b.expense_claims?.status || '';
        break;
      case 'reviewer':
        aValue = a.reviewer?.full_name || '';
        bValue = b.reviewer?.full_name || '';
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  function SortIcon({ field }: { field: typeof sortField }) {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-slate-700" />
    ) : (
      <ArrowDown className="w-4 h-4 text-slate-700" />
    );
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
    return <div className="text-slate-500">Loading expenses history...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Expenses History</h2>
        <p className="text-slate-600 mt-1">View all individual expenses from approved and rejected claims</p>
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

      {sortedExpenses.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <h3 className="text-lg font-medium text-slate-900 mb-2">No expenses found</h3>
          <p className="text-slate-600">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => handleSort('claimant')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Claimant</span>
                      <SortIcon field="claimant" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Title</span>
                      <SortIcon field="title" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Category</span>
                      <SortIcon field="category" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Amount</span>
                      <SortIcon field="amount" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Date</span>
                      <SortIcon field="date" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      <SortIcon field="status" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => handleSort('reviewer')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Reviewed By</span>
                      <SortIcon field="reviewer" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Receipt
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-slate-900">
                        {expense.expense_claims?.claimant_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {expense.expense_claims?.profiles?.full_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{expense.title}</div>
                      {expense.description && (
                        <div className="text-xs text-slate-600 mt-1">{expense.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {expense.expense_categories?.name || 'Uncategorized'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      £{Number(expense.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(expense.expense_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {expense.expense_claims && (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(expense.expense_claims.status)}`}>
                          {getStatusLabel(expense.expense_claims.status)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900">
                        {expense.reviewer?.full_name || '-'}
                      </div>
                      {expense.expense_claims?.reviewed_at && (
                        <div className="text-xs text-slate-500">
                          {new Date(expense.expense_claims.reviewed_at).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {expense.receipt_url ? (
                        <button
                          onClick={() => setReceiptModalUrl(expense.receipt_url!)}
                          className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">
                Total: {sortedExpenses.length} expense{sortedExpenses.length !== 1 ? 's' : ''}
              </span>
              <span className="text-lg font-bold text-slate-900">
                £{sortedExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0).toFixed(2)}
              </span>
            </div>
          </div>
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
