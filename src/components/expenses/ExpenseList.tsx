import { useEffect, useState } from 'react';
import { Plus, FileText, Calendar, Banknote, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Database } from '../../lib/database.types';

type Expense = Database['public']['Tables']['expenses']['Row'] & {
  expense_categories: { name: string } | null;
};

interface ExpenseListProps {
  onCreateExpense: () => void;
  onEditExpense: (expense: Expense) => void;
}

export function ExpenseList({ onCreateExpense, onEditExpense }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const { user } = useAuth();

  useEffect(() => {
    loadExpenses();
  }, [user, filter]);

  async function loadExpenses() {
    if (!user) return;

    let query = supabase
      .from('expenses')
      .select('*, expense_categories(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data } = await query;
    setExpenses(data || []);
    setLoading(false);
  }

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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading expenses...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Expenses</h2>
          <p className="text-slate-600 mt-1">Track and manage your expense claims</p>
        </div>
        <button
          onClick={onCreateExpense}
          className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition"
        >
          <Plus className="w-5 h-5" />
          <span>New Expense</span>
        </button>
      </div>

      <div className="flex items-center space-x-2 bg-white p-4 rounded-lg border border-slate-200">
        <Filter className="w-5 h-5 text-slate-400" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 outline-none text-slate-700"
        >
          <option value="all">All Expenses</option>
          <option value="draft">Drafts</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {expenses.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No expenses yet</h3>
          <p className="text-slate-600 mb-6">Get started by creating your first expense claim</p>
          <button
            onClick={onCreateExpense}
            className="inline-flex items-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-lg hover:bg-slate-800 transition"
          >
            <Plus className="w-5 h-5" />
            <span>Create Expense</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              onClick={() => onEditExpense(expense)}
              className="bg-white rounded-lg border border-slate-200 p-6 hover:border-slate-300 hover:shadow-md transition cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">{expense.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(expense.status)}`}>
                      {expense.status}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm mb-3">{expense.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-slate-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(expense.expense_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FileText className="w-4 h-4" />
                      <span>{expense.expense_categories?.name || 'Uncategorized'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-2xl font-bold text-slate-900">
                  <Banknote className="w-6 h-6" />
                  <span>£{expense.amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
