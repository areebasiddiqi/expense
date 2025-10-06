import { useEffect, useState } from 'react';
import { CreditCard as Edit2, Trash2, Filter, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';

type Expense = Database['public']['Tables']['expenses']['Row'] & {
  expense_categories: { name: string } | null;
  profiles: { full_name: string } | null;
};

export function AllExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadExpenses();
  }, [statusFilter]);

  async function loadExpenses() {
    let query = supabase
      .from('expenses')
      .select('*, expense_categories(name), profiles!user_id(full_name)')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data } = await query;
    setExpenses(data || []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this expense?')) {
      await supabase.from('expenses').delete().eq('id', id);
      loadExpenses();
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    await supabase
      .from('expenses')
      .update({ status: newStatus })
      .eq('id', id);
    loadExpenses();
  }

  const filteredExpenses = expenses.filter(expense =>
    expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function getStatusColor(status: string) {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-700';
      case 'submitted': return 'bg-blue-100 text-blue-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'paid': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  if (loading) {
    return <div className="text-slate-500">Loading expenses...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">All Expenses</h2>
        <p className="text-slate-600 mt-1">Manage all expense claims across the organization</p>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title or employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredExpenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-sm text-slate-900">
                  {expense.profiles?.full_name}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">
                  {expense.title}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {expense.expense_categories?.name || 'Uncategorized'}
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                  £{expense.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {new Date(expense.expense_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <select
                    value={expense.status}
                    onChange={(e) => handleStatusChange(expense.id, e.target.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(expense.status)} border-0 outline-none cursor-pointer`}
                  >
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="paid">Paid</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredExpenses.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No expenses found
          </div>
        )}
      </div>
    </div>
  );
}
