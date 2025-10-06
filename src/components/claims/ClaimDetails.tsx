import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Plus, Trash2, FileText, Calendar, Banknote, CheckCircle2, AlertCircle, CreditCard as Edit2 } from 'lucide-react';
import ExpenseForm from '../expenses/ExpenseForm';
import ClaimEditForm from './ClaimEditForm';

interface Expense {
  id: string;
  title: string;
  description: string;
  amount: number;
  expense_date: string;
  category_id: string;
  receipt_url: string | null;
  category?: {
    name: string;
  };
}

interface Claim {
  id: string;
  claimant_name: string;
  start_date: string;
  end_date: string;
  description: string;
  is_chargeable: boolean;
  status: string;
  client?: {
    name: string;
  };
}

interface ClaimDetailsProps {
  claimId: string;
  onBack: () => void;
}

export default function ClaimDetails({ claimId, onBack }: ClaimDetailsProps) {
  const [claim, setClaim] = useState<Claim | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingClaim, setEditingClaim] = useState(false);
  const [showDisclaimerDialog, setShowDisclaimerDialog] = useState(false);
  const [disclaimerText, setDisclaimerText] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    loadClaimAndExpenses();
    loadDisclaimerText();
  }, [claimId]);

  async function loadDisclaimerText() {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'expense_policy_disclaimer')
      .maybeSingle();

    setDisclaimerText(data?.value || '');
  }

  async function loadClaimAndExpenses() {
    const { data: claimData } = await supabase
      .from('expense_claims')
      .select('*, client:clients(name)')
      .eq('id', claimId)
      .maybeSingle();

    const { data: expensesData } = await supabase
      .from('expenses')
      .select('*, category:expense_categories(name)')
      .eq('claim_id', claimId)
      .order('expense_date', { ascending: false });

    setClaim(claimData);
    setExpenses(expensesData || []);
    setLoading(false);
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);

    if (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense');
    } else {
      loadClaimAndExpenses();
    }
  }

  function handleSubmitClaim() {
    setShowDisclaimerDialog(true);
  }

  async function confirmSubmitClaim() {
    setShowDisclaimerDialog(false);

    const { error } = await supabase
      .from('expense_claims')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', claimId);

    if (error) {
      console.error('Error submitting claim:', error);
      alert('Failed to submit claim');
    } else {
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
        loadClaimAndExpenses();
      }, 3000);
    }
  }

  const calculateTotal = () => {
    return expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  };

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

  if (loading) {
    return <div className="text-center py-8">Loading claim details...</div>;
  }

  if (!claim) {
    return <div className="text-center py-8">Claim not found</div>;
  }

  const canEdit = claim.status === 'draft';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Claims
        </button>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
            claim.status
          )}`}
        >
          {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{claim.claimant_name}</h2>
          {canEdit && (
            <button
              onClick={() => setEditingClaim(true)}
              className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit Claim
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Period:</span>
            <div className="flex items-center gap-1 mt-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="font-medium">
                {new Date(claim.start_date).toLocaleDateString()} -{' '}
                {new Date(claim.end_date).toLocaleDateString()}
              </span>
            </div>
          </div>
          {claim.is_chargeable && claim.client && (
            <div>
              <span className="text-gray-600">Client:</span>
              <div className="flex items-center gap-1 mt-1">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{claim.client.name}</span>
              </div>
            </div>
          )}
          <div className="col-span-2">
            <span className="text-gray-600">Description:</span>
            <p className="mt-1 text-gray-900">{claim.description}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Expenses</h3>
          {canEdit && (
            <button
              onClick={() => setShowExpenseForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Expense
            </button>
          )}
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            No expenses added yet
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex justify-between items-center p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{expense.title}</h4>
                  <p className="text-sm text-gray-600">{expense.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>{new Date(expense.expense_date).toLocaleDateString()}</span>
                    {expense.category && <span>{expense.category.name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {expense.category?.name?.toLowerCase() !== 'mileage' && (
                    <>
                      {expense.receipt_url ? (
                        <div className="p-2 bg-green-50 rounded-lg" title="Receipt uploaded">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </div>
                      ) : (
                        <div className="p-2 bg-amber-50 rounded-lg" title="No receipt attached">
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex items-center gap-1 font-semibold text-gray-900">
                    <Banknote className="w-4 h-4" />
                    <span>£{Number(expense.amount).toFixed(2)}</span>
                  </div>
                  {canEdit && (
                    <>
                      <button
                        onClick={() => setEditingExpense(expense)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <span>Total:</span>
                <span>£{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {canEdit && expenses.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleSubmitClaim}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Submit Claim for Approval
          </button>
        </div>
      )}

      {(showExpenseForm || editingExpense) && (
        <ExpenseForm
          claimId={claimId}
          expense={editingExpense}
          onClose={() => {
            setShowExpenseForm(false);
            setEditingExpense(null);
          }}
          onSuccess={() => {
            setShowExpenseForm(false);
            setEditingExpense(null);
            loadClaimAndExpenses();
          }}
        />
      )}

      {editingClaim && claim && (
        <ClaimEditForm
          claim={claim}
          onClose={() => setEditingClaim(false)}
          onSuccess={() => {
            setEditingClaim(false);
            loadClaimAndExpenses();
          }}
        />
      )}

      {showDisclaimerDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 space-y-4">
            <h3 className="text-xl font-semibold text-slate-900">Expense Policy Agreement</h3>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-slate-700 whitespace-pre-line">{disclaimerText}</p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDisclaimerDialog(false)}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmSubmitClaim}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessMessage && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Submitted Successfully</span>
        </div>
      )}
    </div>
  );
}
