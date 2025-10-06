import { useEffect, useState } from 'react';
import { Check, X, Eye, ChevronDown, ChevronUp, CreditCard as Edit } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Database } from '../../lib/database.types';
import { ReceiptModal } from '../modals/ReceiptModal';
import { ReviewNotesModal } from '../modals/ReviewNotesModal';
import ClaimEditForm from '../claims/ClaimEditForm';
import ExpenseForm from '../expenses/ExpenseForm';

type Claim = Database['public']['Tables']['expense_claims']['Row'] & {
  client: { name: string } | null;
  profiles: { full_name: string; email: string } | null;
};

type Expense = Database['public']['Tables']['expenses']['Row'] & {
  expense_categories: { name: string } | null;
};

export function ApprovalQueue() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);
  const [claimExpenses, setClaimExpenses] = useState<Record<string, Expense[]>>({});
  const [receiptModalUrl, setReceiptModalUrl] = useState<string | null>(null);
  const [reviewModal, setReviewModal] = useState<{ claimId: string; approved: boolean } | null>(null);
  const [editingClaim, setEditingClaim] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadClaims();
  }, []);

  async function loadClaims() {
    const { data } = await supabase
      .from('expense_claims')
      .select('*, client:clients(name), profiles!user_id(full_name, email)')
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: true });

    setClaims(data || []);
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

  async function handleReview(claimId: string, approved: boolean, notes: string) {
    if (!user) return;

    await supabase
      .from('expense_claims')
      .update({
        status: approved ? 'approved' : 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: notes,
      })
      .eq('id', claimId);

    setReviewModal(null);
    loadClaims();
  }

  function handleCloseEditModal() {
    setEditingClaim(null);
    loadClaims();
  }

  function handleCloseExpenseEditModal(claimId: string) {
    setEditingExpense(null);
    setClaimExpenses(prev => {
      const updated = { ...prev };
      delete updated[claimId];
      return updated;
    });
    loadClaimExpenses(claimId);
  }

  if (loading) {
    return <div className="text-slate-500">Loading claims...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Approval Queue</h2>
        <p className="text-slate-600 mt-1">Review and approve pending expense claims</p>
      </div>

      {claims.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <Check className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">All caught up!</h3>
          <p className="text-slate-600">No claims pending approval</p>
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
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      Pending Approval
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
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingClaim(claim.id)}
                    className="flex items-center space-x-1 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
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
              </div>

              {expandedClaim === claim.id && claimExpenses[claim.id] && (
                <div className="border-t border-slate-200 pt-4 mt-4 mb-4 space-y-2">
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
                        <button
                          onClick={() => setEditingExpense(expense)}
                          className="flex items-center space-x-1 text-sm text-slate-600 hover:text-slate-900"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
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

              <div className="flex items-center justify-end space-x-3 border-t border-slate-200 pt-4 mt-4">
                <button
                  onClick={() => setReviewModal({ claimId: claim.id, approved: false })}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  <X className="w-4 h-4" />
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => setReviewModal({ claimId: claim.id, approved: true })}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve</span>
                </button>
              </div>
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

      {reviewModal && (
        <ReviewNotesModal
          approved={reviewModal.approved}
          onConfirm={(notes) => handleReview(reviewModal.claimId, reviewModal.approved, notes)}
          onClose={() => setReviewModal(null)}
        />
      )}

      {editingClaim && (
        <ClaimEditForm
          claim={claims.find(c => c.id === editingClaim)!}
          onClose={() => setEditingClaim(null)}
          onSuccess={handleCloseEditModal}
        />
      )}

      {editingExpense && (
        <ExpenseForm
          expense={editingExpense}
          claimId={editingExpense.claim_id || undefined}
          onClose={() => setEditingExpense(null)}
          onSuccess={() => handleCloseExpenseEditModal(editingExpense.claim_id!)}
        />
      )}
    </div>
  );
}
